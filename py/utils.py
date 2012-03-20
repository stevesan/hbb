
def minGtePowerOf2( n ):
	""" returns the smallest power of 2 still greater than or equal to n """
	p = 1
	while p < n:
		p *= 2
	return p
