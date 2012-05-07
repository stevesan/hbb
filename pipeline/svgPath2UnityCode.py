import parseSvgPath
import sys

def vec2str( d ): return 'Vector2(%f,%f)' % (d[0], d[1])

if __name__=='__main__':
	instName = 'builder'
	# for cmd in parseSvgPath.parser.parseString( "M402.063,225   c49.517,87.256,99.718,175.135,198.748,175.135c0,0,106.559,12.224,106.559-175.134S600.816,49.865,600.816,49.865   c-198.767,0-198.767,350.271-397.533,350.271c0,0-100.653,12.223-100.653-175.135s100.65-175.135,100.65-175.135   c97.91,0,147.591,84.994,196.558,171.247L402.063,225z"):
	for cmd in parseSvgPath.parser.parseString( sys.argv[1] ):
		code = cmd[0]
		#print cmd
		if code == 'c':
			for i in range( len(cmd[1])/3 ):
				print '%s.CubicBezier( %s, %s, %s, true );' % (instName, vec2str(cmd[1][3*i+0]), vec2str(cmd[1][3*i+1]), vec2str(cmd[1][3*i+2]) )
		elif code == 'C':
			for i in range( len(cmd[1])/3 ):
				print '%s.CubicBezier( %s, %s, %s, false );' % (instName, vec2str(cmd[1][3*i+0]), vec2str(cmd[1][3*i+1]), vec2str(cmd[1][3*i+2]) )
		elif code == 's':
			for i in range( len(cmd[1][0])/2 ):
				print '%s.CubicBezierShort( %s, %s, true );' % (instName, vec2str(cmd[1][0][2*i+0]), vec2str(cmd[1][0][2*i+1]) )
		elif code == 'S':
			for i in range( len(cmd[1][0])/2 ):
				print '%s.CubicBezierShort( %s, %s, false );' % (instName, vec2str(cmd[1][0][2*i+0]), vec2str(cmd[1][0][2*i+1]) )
		elif code == 'm':
			for i in range( len(cmd[1])/1 ):
				print '%s.Move( %s, true );' % ( instName, vec2str(cmd[1][i+0]) )
		elif code == 'M':
			for i in range( len(cmd[1])/1 ):
				print '%s.Move( %s, false );' % ( instName, vec2str(cmd[1][i+0]) )
		elif code == 'l':
			for i in range( len(cmd[1])/1 ):
				print '%s.Line( %s, true );' % ( instName, vec2str(cmd[1][i+0]) )
		elif code == 'L':
			for i in range( len(cmd[1])/1 ):
				print '%s.Line( %s, false );' % ( instName, vec2str(cmd[1][i+0]) )
		elif code == 'z' or code == 'Z':
			print '%s.Close();' % instName
