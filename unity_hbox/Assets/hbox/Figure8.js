

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

// HACK: hard coding Y-offsets for the left/right points..
private var leftPoint = Vector2( 198.370, (450-220.50)+602.36 );
private var rightPoint = Vector2( 600.71, (450-220.50)+602.36 );
private var rightPointId:int;
private var leftPointId:int;

private var builder = new SvgPathBuilder();

function InitSegDists()
{
	var npts = builder.GetPoints().length;
	segLengths = new float[ npts ];
	var i;
	for( i = 0; i < npts; i++ )
	{
		var a = builder.GetPoints()[i];
		var b = builder.GetPoints()[ (i+1) % npts ];
		segLengths[i] = Vector2.Distance( a, b );
	}

	// init segment IDs
	leftPointId = Utils.Nearest( builder.GetPoints(), leftPoint );
	rightPointId = Utils.Nearest( builder.GetPoints(), rightPoint );

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
		i1 += builder.GetPoints().length;
	
	var j;
	for( var i = i0; i <= i1; i++ )
	{
		j = (i % builder.GetPoints().length);
		dist -= segLengths[j];

		if( dist < 0.0 )
			break;
	}
	// figure out the interpolation coef
	// draw it out..
	var alpha = (segLengths[j] + dist)/segLengths[j];
	var pt0 = builder.GetPoints()[j];
	var pt1 = builder.GetPoints()[(j+1)%builder.GetPoints().length];
	var v3 = Utils.ToVector3( Vector2.Lerp( pt0, pt1, alpha ), transform.position.z );
	return transform.TransformPoint(v3);
}

function InitFigure8()
{
	builder.SetCubicDivs( cubicDivs );
	builder.BeginBuilding();

builder.Move( Vector2(198.571430,802.362180), true );
builder.CubicBezier( Vector2(-1.892210,59.521390), Vector2(15.365920,141.428010), Vector2(70.000000,141.428570), true );
builder.CubicBezier( Vector2(65.114140,0.000670), Vector2(108.989830,-76.783260), Vector2(134.285710,-138.571430), true );
builder.CubicBezier( Vector2(27.072850,-66.128630), Vector2(80.031330,-143.777650), Vector2(130.714290,-140.000000), true );
builder.CubicBezier( Vector2(60.901150,4.539260), Vector2(65.112410,80.087700), Vector2(67.142860,131.428580), true );
builder.CubicBezier( Vector2(3.643830,92.136000), Vector2(-16.815160,147.167220), Vector2(-69.285720,147.857140), true );
builder.CubicBezier( Vector2(-59.523260,0.782650), Vector2(-113.754800,-99.959250), Vector2(-127.857140,-140.000000), true );
builder.CubicBezier( Vector2(-11.542870,-32.773640), Vector2(-67.114480,-142.309960), Vector2(-130.714290,-139.285720), true );
builder.CubicBezier( Vector2(-65.131870,3.097090), Vector2(-72.633770,85.179230), Vector2(-74.285710,137.142860), true );
builder.Close();


	builder.EndBuilding();
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
		builder.ToLineRenderer( GetComponent(LineRenderer) );
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

		Debug.DrawLine( Utils.ToVector3(builder.GetPoints()[leftPointId],0), Utils.ToVector3(builder.GetPoints()[rightPointId],0), Color.red, 0 );
	}
}