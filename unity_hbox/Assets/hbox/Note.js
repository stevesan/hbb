//----------------------------------------
//  One note. Not really meant to be used in the editor, except to set up the prefab
//	This draws the note procedurally as stroked-geometry
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
var trailWidth : float = 2.0;

var normalTrailMat : Material = null;
var hitTrailMat : Material = null;
var missTrailMat : Material = null;

// Extra data for the game model to use
var downHit : boolean;
var upHit : boolean;
var wasPlayed : boolean;	// for playback
var wasMissed : boolean;
var isError : boolean;

//----------------------------------------
//  The trail is made up of two end caps and then a stretch-able mid section
//	"trailMidsPerMeasure" is the number of control points for the midsection
//	The mid-section needs to have at least 2 control points.
//	Also, 2 more for the beginning and end
//----------------------------------------
private var trail : GameObject = null;
private var trailMidsPerMeas:int = 30;
private var trailCtrls = new Vector2[trailMidsPerMeas+2];
// tell the stroke-geo tool what V tex coords to use
private var trailCtrlTexVs = new float[ trailMidsPerMeas+2 ];

var meshBuf:MeshBuffer = new MeshBuffer();

function GetDuration() : float { return endMeasureTime-measureTime; }

function Start () {

	// create a trail child mesh
	trail = new GameObject();
	var mesh = trail.AddComponent( MeshFilter ).mesh;
	trail.AddComponent( MeshRenderer );
	trail.renderer.material = normalTrailMat;

	// allocate for maximum number of possible 
	var numCtrls = trailCtrls.length;
	meshBuf.Allocate( 2*numCtrls, 2*(numCtrls-1) );

	// set all normals to -Z
	for( var i = 0; i < meshBuf.normals.length; i++ )
		meshBuf.normals[i] = Vector3( 0, 0, 1 );
	UpdateMeshFromBuffer();
	mesh.normals = meshBuf.normals;
}

function Hide()
{
	if( trail != null )
		trail.GetComponent(Renderer).enabled = false;
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
	//missAnim.Play();
}

function OnHit()
{
	type = NoteType.Hit;
	//hitAnim.Play();
}

function UpdateRenderedCard()
{
}

function UpdateMeshFromBuffer()
{
	var mesh = trail.GetComponent(MeshFilter).mesh;
	mesh.vertices = meshBuf.vertices;
	mesh.uv = meshBuf.uv;
	mesh.triangles = meshBuf.triangles;
	// no need to update normals
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

		var region = track.GetCurrentTrackMeasure(gs);
		var deltaMt = endMt - measureTime;
		var numMids = 0;

		if( deltaMt > 0.0 )
		{
			// we don't want the trail to go all the way..leave some room for the tail cap
			// compute distance/measure time


			// figure out the number of segments to tesselate into
			var measureFrac:float = deltaMt / gs.GetSecsPerMeasure();
			numMids = Mathf.Ceil( trailMidsPerMeas * measureFrac );
			numMids = Mathf.Clamp( numMids, 2, trailMidsPerMeas );

			// generate tesselation points
			// but leave beginning and end for the caps
			var secsPerSection = deltaMt / (numMids-1);
			var currCtrlMt = measureTime;

			for( var i = 1; i <= numMids; i++ )
			{
				var worldPos = GetNoteWorldPos( currCtrlMt, gs, region );
				trailCtrls[i] = Utils.ToVector2( worldPos );
				trailCtrlTexVs[i] = 0.5;
				currCtrlMt += secsPerSection;
			}

			// add the caps
			// use trailWidth/2.0
			var headDelta = trailWidth/2.0 * (trailCtrls[1]-trailCtrls[2]).normalized;
			trailCtrls[0] = trailCtrls[1] + headDelta;
			trailCtrlTexVs[0] = 0;
			var tailDelta = trailWidth/2.0 * (trailCtrls[numMids]-trailCtrls[numMids-1]).normalized;
			trailCtrls[numMids+1] = trailCtrls[numMids]+tailDelta;
			trailCtrlTexVs[numMids+1] = 1;
		}
		else
		{
			// just create a w-by-w square centered on the MT
			var c = Utils.ToVector2( GetNoteWorldPos( measureTime, gs, region ) );
			trailCtrls[0] = Vector2( c.x, c.y+trailWidth/2.0 );
			trailCtrls[1] = Vector2( c.x, c.y-trailWidth/2.0 );
			trailCtrlTexVs[0] = 0;
			trailCtrlTexVs[1] = 1;
			numMids = 0;
		}

		// regenerate geometry

		// degenerate triangles by default
		for( i = 0; i < meshBuf.triangles.length; i++ )
			meshBuf.triangles[i] = 0;

		// generate new geom
		ProGeo.Stroke2D( trailCtrls, trailCtrlTexVs, 0, numMids+1,
				trailWidth,
				meshBuf, 0, 0 );

		// update mesh..which, for whatever reason, we can't update directly
		UpdateMeshFromBuffer();

		// select correct material
		if( type == NoteType.Normal )
			trail.renderer.material = normalTrailMat;
		else if( type == NoteType.Hit )
			trail.renderer.material = hitTrailMat;
		else if( type == NoteType.Miss )
			trail.renderer.material = missTrailMat;

		// draw at correct Z position
		trail.transform.position.z = transform.position.z + trailOffsetZ;
	}
}

function Update () {
	UpdatePosition();
	UpdateRenderedCard();
	UpdateTrail();
}