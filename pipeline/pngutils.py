
#----------------------------------------
#  Requires pypng: http://pypi.python.org/pypi/pypng/0.0.13
#----------------------------------------

import png
import os

def is_png( path ):
  ext = os.path.splitext( path )[1]
  return ext == ".png" or ext == ".PNG"

def yield_all_pngs( dir ):
  for (p, dirs, files) in os.walk( dir ):
    for f in files:
      if is_png( f ):
        yield os.path.join( p, f )

def draw_test_gradient():
  rows = range(10)
  for i in range(10):
    rows[i] = range(4*10)
    for j in range(10):
      rows[i][4*j+0] = j*20
      rows[i][4*j+1] = j*20
      rows[i][4*j+2] = 0
      rows[i][4*j+3] = 255
  return rows

def basename_noext( path ):
  return os.path.splitext( os.path.basename( path ) )[0]

#----------------------------------------
#  Example use:
#----------------------------------------
#		reader = png.Reader( file = open( pngp ) )
#		pnginfo = reader.read()
#		wt = pnginfo[0]
#		ht = pnginfo[1]
#		print '%d %d %s' % ( wt, ht, pngp )
#		
#		rows = list(pnginfo[2])
#		(top, lt, bot, rt) = pngutils.get_alpha_bbox( rows )

def get_alpha_bbox( rows ):
  ht = len( rows )
  wt = len( rows[0] ) / 4
  top = -1
  lt = -1
  bot = -1
  rt = -1

  for i in range( ht ):
    for j in range( wt ):
      # check alpha channel
      if rows[i][4*j+3] > 0:
        # hit the top
        if i < top or top == -1: top = i
        if i > bot or bot == -1: bot = i
        if j < lt or lt == -1: lt = j
        if j > rt or rt == -1: rt = j
  return (top, lt, bot, rt)

def extract_bbox( src, top, lt, bot, rt ):
  """ Gets the sub-image that's just the bounding box. Ie. trims all white pixels. """
  wt = rt - lt + 1
  ht = bot - top + 1
  out = range(ht)
  for i in range( ht ):
    out[i] = range(wt*4)
    for j in range( wt ):
      src_i = top + i
      src_j = lt + j
      for k in range(4):
        out[i][4*j+k] = src[src_i][ 4*src_j + k ]
  return out

def grow_canvas( src, wt, ht ):
	out = range( ht )
	for i in range( ht ):
		out[i] = range(wt*4)
		for j in range( wt ):
			for k in range(4):
				if i < len(src) and 4*j+k < len(src[i]):
					out[i][4*j+k] = src[i][4*j+k]
				else:
					out[i][4*j+k] = 0
	return out

def write_png_rgba( fname, rows ):
  wt = len( rows[0] ) / 4
  ht = len( rows )

  f = open( fname, mode = 'wb' )
  writer = png.Writer( wt, ht, alpha=True, greyscale=False )
  writer.write( f, rows )

