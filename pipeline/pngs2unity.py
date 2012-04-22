
#----------------------------------------
#  Converts a list of photoshop-exported PNGs into alpha-cropped and properly sized Unity-friendly textures
#  Also exports a text file spec of the original positions
#----------------------------------------

import os, sys
import glob
import pngutils, png, utils

if __name__=='__main__':
  if len(sys.argv) < 3:
    sys.exit(1)
  
  inspec = sys.argv[1]
  outdir = sys.argv[2]

  try:
    os.mkdir( outdir )
  except: pass

  for pngf in glob.glob('*.png'):
    png_reader = png.Reader( file = open( pngf ) )
    png_info = png_reader.asRGBA()
    wt = png_info[0]
    ht = png_info[1]
    print '%d %d %s' % ( wt, ht, pngf )

    # alpha crop
    rows = list(png_info[2])
    (top, lt, bot, rt) = pngutils.get_alpha_bbox( rows )
    cropped = pngutils.extract_bbox( rows, top, lt, bot, rt )

    # make it power of two
    wt = utils.pow2_gte( rt-lt+1 )
    ht = utils.pow2_gte( bot-top+1 )
    
    pow2 = pngutils.grow_canvas( cropped, wt, ht )

    outp = os.path.join( outdir, pngf )
    pngutils.write_png_rgba( outp, pow2 )
