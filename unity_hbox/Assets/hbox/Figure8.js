

var c1 : Color = Color.yellow;
var c2 : Color = Color.red;
var lengthOfLineRenderer : int = 20;
var debugLasers = false;
var debugLineRenderTrack = false;

private var debugCurrMeasure = -1;
private var lineWidth = 0.30;

private var segLengths : float[];
private var regionLengths : float[];	// there are only 2 regions: left, down and up to right, and the other way

private var rightPoint = Vector2( 707.370, 225 );
private var leftPoint = Vector2( 102.630, 225 );
private var rightPointId:int;
private var leftPointId:int;

private var fig8 = new SvgPathBuilder();

function InitSegDists()
{
	// segLength[i] = Dist( pts[i], pts[i+1] )
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

function Start()
{

	//----------------------------------------
	//  
	//----------------------------------------
	fig8.BeginBuilding();
	fig8.BuildExample();
	fig8.EndBuilding();
	InitSegDists();	// do this before recentering..
	fig8.Recenter();

	if( debugLineRenderTrack )
	{
		// set up line renderer for figure 8 drawing
		var lineRenderer : LineRenderer = gameObject.AddComponent(LineRenderer);
		lineRenderer.material = new Material (Shader.Find("Particles/Alpha Blended"));
		lineRenderer.SetColors(c1, c2);
		lineRenderer.SetWidth(lineWidth,lineWidth);
		fig8.ToLineRenderer( GetComponent(LineRenderer) );
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