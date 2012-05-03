//----------------------------------------
//  One note. Not really meant to be used in the editor, except to set up the prefab
//----------------------------------------
#pragma strict

enum NoteState { Downed, Upped };
enum NoteType { Normal, Hit, Miss };

var state : NoteState = NoteState.Downed;
var type : NoteType = NoteType.Normal;
var measureTime : float;
var endMeasureTime : float;
var key : int;
var zPos:float = -12;
var trailOffsetZ:float = 0.01;	// put trail slightly behind note
var track : Figure8 = null;

var normalRender : Renderer = null;
var missRender : Renderer = null;
var hitRender : Renderer = null;
var hitAnim : UVAnim = null;
var missAnim : UVAnim = null;

var normalTrailMat : Material = null;
var hitTrailMat : Material = null;
var missTrailMat : Material = null;

// Extra data for the game model to use
var downHit : boolean;
var upHit : boolean;
var wasPlayed : boolean;	// for playback
var wasMissed : boolean;
var isError : boolean;

private var trail : GameObject = null;
private var trailPtsPerMeasure:int = 16;
private var trailPts = new Vector2[trailPtsPerMeasure];

function GetDuration() : float { return endMeasureTime-measureTime; }

function Start () {

	// create a trail child mesh
	trail = new GameObject();
	var mesh = trail.AddComponent( MeshFilter ).mesh;
	trail.AddComponent( MeshRenderer );
	trail.renderer.material = normalTrailMat;

	// allocate for maximum number of possible 
	mesh.vertices = new Vector3[ 2*trailPtsPerMeasure ];
	mesh.uv = new Vector2[ 2*trailPtsPerMeasure ];
	mesh.normals = new Vector3[ 2*trailPtsPerMeasure ];
	mesh.triangles = new int[ 3*2*(trailPtsPerMeasure-1) ];
}

function OnDestroy()
{
	if( trail != null )
		Destroy(trail);
}

// Call this after creating an instance
function OnDown( mt:float, _key:int, _isError:boolean, _track:Figure8 )
{
	measureTime = mt;
	key = _key;
	wasPlayed = false;
	downHit = false;
	wasMissed = false;
	isError = _isError;
	track = _track;
	state = NoteState.Downed;

	UpdatePosition();
}

function OnUp( mt:float )
{
	endMeasureTime = mt;
	state = NoteState.Upped;
}

function GetNoteWorldPos(
    measureTime : float, 
		gs : GameState, region : int)
{
  var measureFrac = (gs.GetSecsPerMeasure() + gs.GetMeasureTime() - measureTime)
    / gs.GetSecsPerMeasure();

  if ( measureFrac > 1.0 ) {
    region = (region+1)%4;
    measureFrac -= 1.0;
  }

	var pos = track.GetPositionForMTime( measureFrac, region );
	pos.z = zPos;
  return pos;
}

function UpdatePosition()
{
	if( track != null )
	{
		var gs : GameState = GameState.inst;
		var region = track.GetCurrentTrackMeasure(gs);
		var pos = GetNoteWorldPos( measureTime, gs, region );
		transform.position = pos;
	}
}

function OnMiss()
{
	type = NoteType.Miss;
	missAnim.Play();
}

function OnHit()
{
	type = NoteType.Hit;
	hitAnim.Play();
}

function UpdateRenderedCard()
{
	normalRender.enabled = false;
	missRender.enabled = false;
	hitRender.enabled = false;
	missAnim.renderer.enabled = false;
	hitAnim.renderer.enabled = false;

	if( type == NoteType.Miss )
	{
		missRender.enabled = !missAnim.IsPlaying();
		missAnim.renderer.enabled = missAnim.IsPlaying();
	}
	else if( type == NoteType.Hit )
	{
		hitRender.enabled = !hitAnim.IsPlaying();
		hitAnim.renderer.enabled = hitAnim.IsPlaying();
	}
	else
		normalRender.enabled = true;
}

function UpdateTrail()
{
	if( trail != null && track != null)
	{
		var gs : GameState = GameState.inst;

		var endMt = endMeasureTime;
		if( state == NoteState.Downed )
		{
			// don't have the end of the trail yet - draw it as if it just ended
			endMt = gs.GetEffectiveMeasureTime();
		}

		var deltaMt = endMt - measureTime;

		if( deltaMt > 0.0 )
		{
			var measureFrac:float = deltaMt / gs.GetSecsPerMeasure();
			var numPts:int = Mathf.Ceil( trailPtsPerMeasure * measureFrac );
			numPts = Mathf.Clamp( numPts, 2, trailPts.length );

			var mtStep = deltaMt / (numPts-1);

			// update the tesselation positions for the trail
			var region = track.GetCurrentTrackMeasure(gs);

			for( var i = 0; i < numPts; i++ )
			{
				var mt = measureTime + mtStep*i;
				var worldPos = GetNoteWorldPos( mt, gs, region );
				trailPts[i] = Utils.ToVector2( worldPos );
			}

			// degenerate all triangles by default
			var mesh = trail.GetComponent(MeshFilter).mesh;
			var tris = mesh.triangles;
			for( i = 0; i < tris.length; i++ )
				tris[i] = 0;
			mesh.triangles = tris;

			ProGeo.Stroke2D( trailPts, 0, numPts-1, 2.0,
					mesh, 0, 0 );

			// select correct material
			if( type == NoteType.Normal )
				trail.renderer.material = normalTrailMat;
			else if( type == NoteType.Hit )
				trail.renderer.material = hitTrailMat;
			else if( type == NoteType.Miss )
				trail.renderer.material = missTrailMat;

			// draw at correct Z position
			trail.renderer.enabled = true;
			trail.transform.position.z = transform.position.z + trailOffsetZ;
		}
		else
			trail.renderer.enabled = false;
	}
}

function Update () {
	UpdatePosition();
	UpdateRenderedCard();
	UpdateTrail();
}