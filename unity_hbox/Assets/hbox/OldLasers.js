//----------------------------------------
//  Draws the notes flying on the track
//	And the lasers
//----------------------------------------

private var lasersColor1 : Color = Color.green;
private var lasersColor2 : Color = Color.black;

function GetNoteWorldPos(
    measureTime : float, sample : int,
		gs : GameState, group : int)
{
  var measureFrac = (gs.GetSecsPerMeasure() + gs.GetMeasureTime() - measureTime)
    / gs.GetSecsPerMeasure();

  if ( measureFrac > 1.0 ) {
    group = (group+1)%4;
    measureFrac -= 1.0;
  }

	var pos = gs.tracks[ sample ].GetPositionForMTime( measureFrac, group );
  return pos;
}

function Start() {
  var lineRenderer : LineRenderer = gameObject.AddComponent(LineRenderer);
  lineRenderer.material = new Material(Shader.Find("Particles/Alpha Blended"));
  lineRenderer.SetColors(lasersColor1, lasersColor2);
  lineRenderer.SetWidth(0.5, 0.5);
}

function UpdateLasers( gs:GameState ) {
  var lineRenderer : LineRenderer = GetComponent(LineRenderer);

	if( gs.hasMessedUp )
		lasersColor1 = Color.red;
	else if( gs.state == RCState.ATTACK || gs.state == RCState.POST_DEFEND || gs.state == RCState.POST_REPEAT )
		lasersColor1 = Color.green;
	else if( gs.state == RCState.START )
		lasersColor1 = Color.cyan;
	else
		lasersColor1 = Color.yellow;
	lineRenderer.SetColors(lasersColor1, lasersColor2);
		
  var measureLength = gs.GetSecsPerMeasure();
  lineRenderer.SetVertexCount(7);
  var group = gs.tracks[0].GetCurrentTrackMeasure(gs);
	var pos0 = GetNoteWorldPos(0, 0, gs, group);
	var pos1 = GetNoteWorldPos(0, gs.GetSongInfo().GetNumSamples()-1, gs, group);
	var pos2 = GetNoteWorldPos(measureLength, 0, gs, group);
	var pos3 = GetNoteWorldPos(measureLength, gs.GetSongInfo().GetNumSamples()-1, gs, group);
  var origin = Vector3(0, 10, 0);
  lineRenderer.SetPosition(0, origin);
  lineRenderer.SetPosition(1, pos0);
  lineRenderer.SetPosition(2, pos1);
  lineRenderer.SetPosition(3, origin);
  lineRenderer.SetPosition(4, pos2);
  lineRenderer.SetPosition(5, pos3);
  lineRenderer.SetPosition(6, origin);
}

function Update()
{
	var gs : GameState = GameState.inst;
  UpdateLasers( gs );
}
