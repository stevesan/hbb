

var c1 : Color = Color.yellow;
var c2 : Color = Color.red;
var debugLasers = false;
var debugLineRenderTrack = false;
var strokeWidth:float = 0.5;
var cubicDivs:int = 5;

private var debugCurrMeasure = -1;
private var lineWidth = 0.30;

private var segLengths : float[];
private var regionLengths : float[];	// there are only 2 regions: left, down and up to right, and the other way

private var leftPoint = Vector2( 198.370, 220.50+602.36-45 );
private var rightPoint = Vector2( 600.71, 220.50+602.36-45 );
private var rightPointId:int;
private var leftPointId:int;

private var fig8 = new SvgPathBuilder();

function InitSegDists()
{
	var npts = fig8.GetPoints().length;
	segLengths = new float[ npts ];
	var i;
	for( i = 0; i < npts; i++ )
	{
		var a = fig8.GetPoints()[i];
		var b = fig8.GetPoints()[ (i+1) % npts ];
		segLengths[i] = Vector2.Distance( a, b );
	}

	// init segment IDs
	leftPointId = Utils.Nearest( fig8.GetPoints(), leftPoint );
	rightPointId = Utils.Nearest( fig8.GetPoints(), rightPoint );

	regionLengths = new float[2];
	for( i = leftPointId; i != rightPointId; i = (i+1)%npts )
		regionLengths[0] += segLengths[i];
	for( i = rightPointId; i != leftPointId; i = (i+1)%npts )
		regionLengths[1] += segLengths[i];
}

function GetCurrentTrackMeasure( gs : GameState ) : int
{
	var m = 0;
	if( gs.state == RCState.ATTACK )
		m = 3;
	else if( gs.state == RCState.POST_ATTACK )
		m = 0;
	else if( gs.state == RCState.DEFEND )
		m = 1;
	else if( gs.state == RCState.POST_DEFEND )
		m = 2;
	else if( gs.state == RCState.REPEAT )
		m = 3;
	else if( gs.state == RCState.POST_REPEAT )
		m = 0;

	if( gs.GetAttacker() == 1 )
		m = (m+2) % 4;

	return m;
}

function GetPositionForMTime( measureFraction : float, measure : int ) : Vector3
{
	var region:int = measure/2;

	if( measure % 2 == 1 )
		measureFraction += 1.0;
	var dist = regionLengths[region]/2.0 * measureFraction;

	var i0;
	var i1;

	if( region == 0 ) {
		i0 = leftPointId;
		i1 = rightPointId;
	}
	else {
		i0 = rightPointId;
		i1 = leftPointId;
	}

	if( i1 < i0 )
		i1 += fig8.GetPoints().length;
	
	var j;
	for( var i = i0; i <= i1; i++ )
	{
		j = (i % fig8.GetPoints().length);
		dist -= segLengths[j];

		if( dist < 0.0 )
			break;
	}
	// figure out the interpolation coef
	// draw it out..
	var alpha = (segLengths[j] + dist)/segLengths[j];
	var pt0 = fig8.GetPoints()[j];
	var pt1 = fig8.GetPoints()[(j+1)%fig8.GetPoints().length];
	var v3 = Utils.ToVector3( Vector2.Lerp( pt0, pt1, alpha ), transform.position.z );
	return transform.TransformPoint(v3);
}

function InitFigure8()
{
	fig8.SetCubicDivs( cubicDivs );
	fig8.BeginBuilding();
	/*
		fig8.Move( Vector2(400,225), false );
		fig8.CubicBezier( Vector2(49.517000,87.256000), Vector2(99.718000,175.135000), Vector2(198.748000,175.135000), true );
		fig8.CubicBezier( Vector2(0.000000,0.000000), Vector2(106.559000,12.224000), Vector2(106.559000,-175.134000), true );
		fig8.CubicBezierShort( Vector2(600.816000,49.865000), Vector2(600.816000,49.865000), false );
		fig8.CubicBezier( Vector2(-198.767000,0.000000), Vector2(-198.767000,350.271000), Vector2(-397.533000,350.271000), true );
		fig8.CubicBezier( Vector2(0.000000,0.000000), Vector2(-100.653000,12.223000), Vector2(-100.653000,-175.135000), true );
		fig8.CubicBezierShort( Vector2(100.650000,-175.135000), Vector2(100.650000,-175.135000), true );
		fig8.CubicBezier( Vector2(97.910000,0.000000), Vector2(147.591000,84.994000), Vector2(196.558000,171.247000), true );
		//fig8.Line( Vector2(402.063000,225.000000), false );;
		fig8.Close();
		*/

fig8.Move( Vector2(198.571430,802.362180), true );
fig8.CubicBezier( Vector2(1.651940,-51.963630), Vector2(9.153840,-134.045770), Vector2(74.285710,-137.142860), true );
fig8.CubicBezier( Vector2(63.599810,-3.024240), Vector2(119.171420,106.512080), Vector2(130.714290,139.285720), true );
fig8.CubicBezier( Vector2(14.102340,40.040750), Vector2(68.333880,140.782650), Vector2(127.857140,140.000000), true );
fig8.CubicBezier( Vector2(52.470560,-0.689920), Vector2(72.929550,-55.721140), Vector2(69.285720,-147.857140), true );
fig8.CubicBezier( Vector2(-2.030450,-51.340880), Vector2(-6.241710,-126.889320), Vector2(-67.142860,-131.428580), true );
fig8.CubicBezier( Vector2(-50.682960,-3.777650), Vector2(-103.641440,73.871370), Vector2(-130.714290,140.000000), true );
fig8.CubicBezier( Vector2(-25.295880,61.788170), Vector2(-69.171570,138.572100), Vector2(-134.285710,138.571430), true );
fig8.CubicBezier( Vector2(-54.634080,-0.000560), Vector2(-71.892210,-81.907180), Vector2(-70.000000,-141.428570), true );
fig8.Close();

	fig8.EndBuilding();
}

function Start()
{

	//----------------------------------------
	//  
	//----------------------------------------
	InitFigure8();
	InitSegDists();	// do this before recentering..TODO - why??

	if( debugLineRenderTrack )
	{
		// set up line renderer for figure 8 drawing
		var lineRenderer : LineRenderer = gameObject.AddComponent(LineRenderer);
		lineRenderer.material = new Material (Shader.Find("Particles/Alpha Blended"));
		lineRenderer.SetColors(c1, c2);
		lineRenderer.SetWidth(lineWidth,lineWidth);
		fig8.ToLineRenderer( GetComponent(LineRenderer) );
	}

	var meshc = GetComponent(MeshFilter);
	if( meshc != null )
	{
		var m = meshc.mesh;
		var ctrls = fig8.GetPoints();
		var n = ctrls.length;
		m.vertices = new Vector3[ 2*n ];
		m.uv = new Vector2[ 2*n ];
		m.normals = new Vector3[ 2*n ];
		m.triangles = new int[ 3*(2*(n-1)) ];
		var ctrlTexVs = new float[ n ];
		for( var i = 0; i < n; i++ )
			ctrlTexVs[i] = (i+0.0)/(i-1.0);
		ProGeo.Stroke2D(
				ctrls, ctrlTexVs, 0, n-1,
				strokeWidth,
				m, 0, 0 );
	}
}

function Update()
{
	if( debugLasers )
	{
		var gs : GameState = GameState.inst;
		var mt = gs.GetMeasureTime();
		var measureFrac = mt / gs.GetSecsPerMeasure();
		var b = GetPositionForMTime( measureFrac, GetCurrentTrackMeasure(gs) );
		Debug.DrawLine( Vector2(0,0), b, Color.green, 0.1 );
		debugCurrMeasure = GetCurrentTrackMeasure(gs);

		Debug.DrawLine( Utils.ToVector3(fig8.GetPoints()[leftPointId],0), Utils.ToVector3(fig8.GetPoints()[rightPointId],0), Color.red, 0 );
	}
}