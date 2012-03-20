import pygame
import sys, os
import utils
import math

def main():
	fnameFmt = sys.argv[1]
	lastFrame = int( sys.argv[2] )
	frames = []
	for frame in range(0,lastFrame+1):
		fname = fnameFmt % frame
		if os.path.exists(fname):
			surf = pygame.image.load( fname )
			frames.append( surf )
			print '%d by %d, %s' % ( surf.get_width(), surf.get_height(), fname )

			# make sure dims are the same
			if len(frames) > 1:
				wSame = frames[-1].get_width() == frames[-2].get_width()
				hSame = frames[-1].get_height() == frames[-2].get_height()
				if (not wSame) or (not hSame):
					print 'ERROR: Dimensions of %s was not the same as previous ones! Cannot continue.' % fname
					return 1
		else:
			print 'ERROR: Could not find %s, assuming we are done.' % fname
			break
	
	print '-- read in %d images, creating atlas' % len(frames)

	# figure out how large our atlas needs to be..
	# Make it as square as possible to minimize texture max-length. Unity3D degrades in quality for textures of size 4096 for some reason..so avoid that
	# We're just gonna make a single row
	# TODO - the single row approach is probably way wasteful. Do something smarter later..
	frameW = frames[0].get_width()
	frameH = frames[0].get_height()
	ncols = int(math.ceil( math.sqrt(frameH/frameW * len(frames) ) ))
	nrows = int(math.ceil( frameW/frameH * ncols ))
	assert( nrows * ncols >= len(frames) )

	atlasW = utils.minGtePowerOf2( ncols*frameW )
	atlasH = utils.minGtePowerOf2( nrows*frameH )

	print 'Atlas will be %d by %d pixels, %d by %d frames' % (atlasW, atlasH, ncols, nrows)
	# create atlas surface, and pass in the first frame to make sure we use the same pixel format (alphas, etc.)
	atlasSurf = pygame.Surface( (atlasW, atlasH), 0, frames[0] )

	# blit frames onto atlas, row-major
	for i in range(nrows):
		for j in range(ncols):
			x = j*frameW
			y = i*frameH
			frame = i*ncols+j
			if frame < len(frames):
				atlasSurf.blit( frames[frame], (x,y) )

	# save
	pygame.image.save( atlasSurf, 'atlas.png' )

if __name__=='__main__':
	main()
