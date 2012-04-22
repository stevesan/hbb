
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

  inspecf = open( inspec, 'r' )
  layoutf = open( os.path.join( outdir, 'layout.txt' ), 'w' )

  state = 'readblank'
  first = True

  for line in [ line.rstrip() for line in inspecf.readlines()]:
    if state == 'readblank':
      pngf = line + '.png'
      state = 'inset'
    elif state == 'inset':
      if line == '':
        state = 'readblank'
      continue

    print 'reading', pngf
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
    crop_wt = rt-lt+1
    crop_ht = bot-top+1
    p2_wt = utils.pow2_gte( crop_wt )
    p2_ht = utils.pow2_gte( crop_ht )
    
    pow2 = pngutils.grow_canvas( cropped, p2_wt, p2_ht )

    outp = os.path.join( outdir, pngf )
    pngutils.write_png_rgba( outp, pow2 )

    if first:
      # write screen dimensions
      layoutf.write( '%d %d\n' % (wt, ht) )
      first = False
    layoutf.write( '%s\n%d %d\n%d %d\n%d %d\n' % (line, lt, top, crop_wt, crop_ht, p2_wt, p2_ht ) )

  inspecf.close()
  layoutf.close()
