
#----------------------------------------
#  Requires pypng: http://pypi.python.org/pypi/pypng/0.0.13
#----------------------------------------

import png
import os

def pow2_gte( n ):
	return minGtePowerOf2(n)

def minGtePowerOf2( n ):
	""" returns the smallest power of 2 still greater than or equal to n """
	p = 1
	while p < n:
		p *= 2
	return p

