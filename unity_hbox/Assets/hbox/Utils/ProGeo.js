#pragma strict

//----------------------------------------
//  Various procedural geometry tools
//----------------------------------------

class MeshBuffer
{
	var vertices:Vector3[] = null;
	var uv:Vector2[] = null;
	var normals:Vector3[] = null;
	var triangles:int[];

	function Allocate( numVerts:int, numTris:int )
	{
		vertices = new Vector3[ numVerts ];
		uv = new Vector2[ numVerts ];
		normals = new Vector3[ numVerts ];
		triangles = new int[ 3*numTris ];
	}
}

//----------------------------------------
//  Works in the XY plane, and basically uses XY position as UVs
//	TODO - have two radii - left and right radius
//----------------------------------------
static function Stroke2D(
		ctrlPts:Vector2[],
		ctrlPtTexVs:float[],
		firstCtrl:int, lastCtrl:int,	// use first/lastCtrl to select a sub-array of ctrlPts.
		width:float, mesh:MeshBuffer,
		firstVert:int, firstTri:int	// use firstVert/Tri to tell Stroke2D where to output in the mesh. firstTri should be the index/3
		)
{
	if( lastCtrl <= firstCtrl )
	{
		Debug.LogError('need at least 2 points to build stroke geometry!');
		return;
	}

	var nctrls = lastCtrl-firstCtrl+1;
	var radius : float = width/2.0;
	var ntris = 2*(nctrls-1);

	// make sure buffers are large enough
	if( (firstVert + 2*nctrls) > mesh.vertices.length )
	{
		Debug.LogError('not enough vertices allocated in mesh for '+nctrls+' control points!');
		return;
	}

	if( 3*(firstTri + ntris) > mesh.triangles.length )
	{
		Debug.LogError('not enough triangle space allocated in mesh for '+nctrls+' control points!');
		return;
	}

	var a = ctrlPts[firstCtrl];
	var b = ctrlPts[firstCtrl+1];
	var e0 = b-a;
	var n = Utils.PerpCCW( e0 ).normalized;
	mesh.vertices[firstVert+0] = a + n*radius;
	mesh.vertices[firstVert+1] = a - n*radius;
	var v = ctrlPtTexVs[ firstCtrl ];
	mesh.uv[ firstVert+0 ] = Vector2( 0, v );
	mesh.uv[ firstVert+1 ] = Vector2( 1, v );

	for( var i = firstCtrl+1; i < lastCtrl; i++ )
	{
		var p0 = ctrlPts[i-1];
		var p1 = ctrlPts[i];
		var p2 = ctrlPts[i+1];
		e0 = p1-p0;
		var e1 = p2-p1;

		var e0n = e0.normalized;
		var e1n = e1.normalized;
		var theta0 = Mathf.Atan2( e0n.y, e0n.x );
		var theta1 = Mathf.Atan2( e1n.y, e1n.x );

		// make sure we're getting the positive CCW angle from e0 to e1
		if( theta1 < theta0 )
			theta1 += 2*Mathf.PI;

		var dtheta = theta1 - theta0;
		var alpha = radius * Mathf.Tan( dtheta/2.0 );

		n = Utils.PerpCCW( e0 ).normalized;
		mesh.vertices[ firstVert+2*i+0 ] = p1+radius*n - alpha*e0n;
		mesh.vertices[ firstVert+2*i+1 ] = p1-radius*n + alpha*e0n;

		v = ctrlPtTexVs[ i ];
		mesh.uv[ firstVert+2*i+0 ] = Vector2( 0, v );
		mesh.uv[ firstVert+2*i+1 ] = Vector2( 1, v );
	}

	// last one
	a = ctrlPts[ lastCtrl-1 ];
	b = ctrlPts[ lastCtrl ];
	e0 = b-a;
	n = Utils.PerpCCW( e0 ).normalized;
	mesh.vertices[ firstVert+2*nctrls-2 ] = b + n*radius;
	mesh.vertices[ firstVert+2*nctrls-1 ] = b - n*radius;
	v = ctrlPtTexVs[ lastCtrl ];
	mesh.uv[ firstVert+2*nctrls-2 ] = Vector2( 0, v );
	mesh.uv[ firstVert+2*nctrls-1 ] = Vector2( 1, v );

	//----------------------------------------
	//  Triangles
	//----------------------------------------
	for( i = 0; i < (nctrls-1); i++ )
	{
		mesh.triangles[ 3*firstTri + 6*i + 0 ] = 2 * i + 0;
		mesh.triangles[ 3*firstTri + 6*i + 1 ] = 2 * i + 2;
		mesh.triangles[ 3*firstTri + 6*i + 2 ] = 2 * i + 1;

		mesh.triangles[ 3*firstTri + 6*i + 3 ] = 2 * i + 1;
		mesh.triangles[ 3*firstTri + 6*i + 4 ] = 2 * i + 2;
		mesh.triangles[ 3*firstTri + 6*i + 5 ] = 2 * i + 3;
	}

}

//----------------------------------------
//  pts - the ordered points of a closed polygon
//----------------------------------------
static function ClipByLine(
		pts:Vector2[],
		l0:Vector2,
		l1:Vector2,
		keepRight:boolean )
		: Array
{
	var npts = pts.length;

	if( !keepRight )
	{
		// just swap the two
		var temp = l0;
		l0 = l1;
		l1 = temp;
	}

	var lineDir = (l1-l0).normalized;
	var rightDir = -1 * Utils.PerpCCW( lineDir ).normalized;

	// figure out which line segs cross the line
	var ptIsOnRight = new boolean[ npts ];
	
	for( var i = 0; i < npts; i++ )
	{
		var toPt = (pts[i] - l0).normalized;
		ptIsOnRight[i] = (Vector2.Dot( toPt, rightDir ) > 0 );
	}

	var segCrosses = new boolean[npts];
	for( i = 0; i < npts; i++ )
	{
		if( ptIsOnRight[i] != ptIsOnRight[(i+1)%npts] )
			segCrosses[i] = true;
		else
			segCrosses[i] = false;
	}

	//----------------------------------------
	//  Now perform the generation of the new polygon
	//	Pretty simple logic.
	//----------------------------------------
	var newPts = new Array();

	for( i = 0; i < npts; i++ )
	{
		if( ptIsOnRight[i] )
			newPts.Push( pts[i] );

		if( segCrosses[i] )
		{
			// add the intersection point
			var p0 = pts[i];
			var p1 = pts[(i+1)%npts];
			var intx = Utils.Intersect2DLines( l0, l1, p0, p1 );
			newPts.Push(intx);
		}
	}

	return newPts;
}

class Mesh2D
{
	var pts : Vector2[] = null;
	var edgeA : int[] = null;
	var edgeB : int[] = null;

	function Duplicate() : Mesh2D
	{
		var dupe = new Mesh2D();
		dupe.pts = Utils.Duplicate( pts );
		dupe.edgeA = Utils.Duplicate( edgeA );
		dupe.edgeB = Utils.Duplicate( edgeB );
		return dupe;
	}

	function DebugDraw( color:Color, dur:float )
	{
		for( var e = 0; e < edgeA.length; e++ )
		{
			var a = edgeA[e];
			var b = edgeB[e];
			Debug.DrawLine( Utils.ToVector3( pts[a]), Utils.ToVector3(pts[b]), color, dur, false );
		}
	}

	function Reflect( l0:Vector2, l1:Vector2, keepRight:boolean )
	{
		var npts = pts.length;

		if( !keepRight )
		{
			// just swap the two
			var temp = l0;
			l0 = l1;
			l1 = temp;
		}
		var lineDir = (l1-l0).normalized;
		var rightDir = -1 * Utils.PerpCCW( lineDir ).normalized;

		// see which points are on the right side
		var ptIsOnRight = new boolean[ npts ];
		for( var i = 0; i < npts; i++ )
		{
			var toPt = (pts[i] - l0).normalized;
			ptIsOnRight[i] = (Vector2.Dot( toPt, rightDir ) > 0 );
		}

		// keep right points and add their reflections
		var newPts = new Array();
		var pt2refl = new int[ npts ];
		var old2new = new int[ npts ];
		for( i = 0; i < npts; i++ )
		{
			if( ptIsOnRight[i] )
			{
				newPts.Push( pts[i] );
				old2new[i] = newPts.length-1;

				// add reflection
				newPts.Push( Utils.Reflect2D( pts[i], l0, l1 ) );
				pt2refl[i] = newPts.length-1;
			}
		}

		// go through edges
		var newA = new Array();
		var newB = new Array();

		for( i = 0; i < edgeA.length; i++ )
		{
			var a = edgeA[i];
			var b = edgeB[i];

			if( ptIsOnRight[a] && ptIsOnRight[b] )
			{
				// yay add both this one and its reflection, going in the opposite direction
				newA.Push( old2new[a] );
				newB.Push( old2new[b] );

				// note the opposite direction
				newA.Push( pt2refl[b] );
				newB.Push( pt2refl[a] );
			}
			else if( ptIsOnRight[a] && !ptIsOnRight[b] )
			{
				// add the intersection point
				var intx = Utils.Intersect2DLines( l0, l1, pts[a], pts[b] );
				newPts.Push( intx );
				var c = newPts.length-1;

				// register new edges
				newA.Push( old2new[a] );
				newB.Push( c );

				// now its reflection with opposite direction
				newA.Push( c );
				newB.Push( pt2refl[a] );
			}
			else if( !ptIsOnRight[a] && ptIsOnRight[b] )
			{
				// add the intersection point
				intx = Utils.Intersect2DLines( l0, l1, pts[a], pts[b] );
				newPts.Push( intx );
				c = newPts.length-1;

				// register new edges
				newA.Push( pt2refl[b] );
				newB.Push( c );

				// now its reflection with opposite direction
				newA.Push( c );
				newB.Push( old2new[b] );
			}
			else
			{
				// edge is completely on left side - ignore
			}
		}

		pts = newPts.ToBuiltin(Vector2);
		edgeA = newA.ToBuiltin(int);
		edgeB = newB.ToBuiltin(int);
	}
}

static function BuildBeltMesh(
		pts:Vector2[],
		edgeA:int[], edgeB:int[],
		zMin:float, zMax:float,
		normalPointingRight:boolean,
		mesh:Mesh )
{
	var npts = pts.length;

	var vertices = new Vector3[ 2*npts ];
	for( var i = 0; i < npts; i++ )
	{
		var p = pts[i];
		vertices[2*i+0] = Vector3( p.x, p.y, zMin );
		vertices[2*i+1] = Vector3( p.x, p.y, zMax );
	}

	var ntris = 2 * edgeA.length;
	var triangles = new int[ ntris * 3 ];

	for( i = 0; i < edgeA.length; i++ )
	{
		var a = edgeA[i];
		var b = edgeB[i];

		if( normalPointingRight )
		{
			triangles[ 6*i + 0 ] = 2 * a + 0;
			triangles[ 6*i + 1 ] = 2 * b + 0;
			triangles[ 6*i + 2 ] = 2 * a + 1;

			triangles[ 6*i + 3 ] = 2 * b + 0;
			triangles[ 6*i + 4 ] = 2 * b + 1;
			triangles[ 6*i + 5 ] = 2 * a + 1;
		}
		else
		{
			triangles[ 6*i + 0 ] = 2 * a + 0;
			triangles[ 6*i + 1 ] = 2 * a + 1;
			triangles[ 6*i + 2 ] = 2 * b + 0;

			triangles[ 6*i + 3 ] = 2 * b + 0;
			triangles[ 6*i + 4 ] = 2 * a + 1;
			triangles[ 6*i + 5 ] = 2 * b + 1;
		}
	}

	// finalize
	// TODO - UVs
	mesh.vertices = vertices;
	mesh.triangles = triangles;
	mesh.RecalculateNormals();
}