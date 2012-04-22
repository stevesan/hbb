
# standard python
import os, sys
from glob import glob

# my modules, should be in same dir
import utils, config

class Piece:
  x = 0
  y = 0
  display_name = ''
  fname = ''
  id = '' # for filenames and javascript variable name

def path2codename( path ):
  """ May need to add more chars here. We need the leading _ incase it starts with a number """
  return 'c_' + path.replace('-', '_').replace(os.sep, '__').replace(' ', '_').replace('.', '_').replace('+','_').replace('%', '_').replace('!','_')

if __name__ == '__main__':

  pieces = []

  for pngp in utils.yield_all_pngs( config.pieces_in_dir ):
    reader = png.Reader( file = open( pngp ) )
    pnginfo = reader.read()
    wt = pnginfo[0]
    ht = pnginfo[1]
    print '%d %d %s' % ( wt, ht, pngp )

    rows = list(pnginfo[2])
    (top, lt, bot, rt) = pngutils.get_alpha_bbox( rows )

    sub = extract_bbox( rows, top, lt, bot, rt )

    png_outp = os.path.join( config.asset_out_dir, os.path.basename(pngp) )
    pngutils.write_png_rgba( png_outp, sub )

    piece = Piece()
    piece.x = lt
    piece.y = top
    piece.display_name = utils.basename_noext( pngp )
    piece.fname = os.path.basename( pngp )
    piece.id = path2codename( pngp )
    pieces += [piece]

  # write the script
  scriptf = open( os.path.join(config.as_out_dir, 'Pieces.as'), mode = 'w' )

  classes_code = ''
  pieces_code = []
  asset_reldir = os.path.relpath( config.asset_out_dir, config.as_out_dir )

  for p in pieces:
    asset_relpath = os.path.join( asset_reldir, p.fname )

    classes_code += """
    [Embed(source="%s")]
      private static var %s:Class;
      """ % ( asset_relpath, p.id )

    pieces_code += ["new Piece( new Point( %d, %d ), %s, \"%s\" )" % (p.x, p.y, p.id, p.display_name)]

  scriptf.write( """
package geohero {
  import flash.geom.*;
  public class Pieces
  {
  """ + classes_code + """
    public static var all:Array = new Array(
  """ + (',\n').join(pieces_code) + """
      );
  }
}
""")

  scriptf.close()