#pragma strict

//----------------------------------------
//  Very specific code to handle the songs menu, ie. dealing with stars, etc.
//----------------------------------------

// the layout object that will create the visuals
var layout : LayoutSpawner;
var highscores : ParPar;

private var isShowing = false;
private var lockInsts = new Array();

//----------------------------------------
//  Creates 4 copies of the locked element and positions them
//----------------------------------------
function InitLockElements()
{
	if( lockInsts.length > 0 )
		// already done 
		return;

	var lockPrefab = layout.FindElement('locked');

	if( lockPrefab == null )
	{
		Debug.LogError('Could not find locked layout element');
		return;
	}

	var lockSize = layout.GetElementSize( lockPrefab );

	// TEMP TEMP hard coding 4 stars, 5 levels
	for( var i = 0; i < 5; i++ )
	{
		// find the location of the star
		var starobj = layout.FindElement( 'level'+i );
		if( starobj == null )
			Debug.LogError('could not find level'+i );
		var topLeft = layout.GetElementTopLeft( starobj );
		var pos = Vector3( topLeft.x + lockSize.x/2, topLeft.y - lockSize.y/2,
			lockPrefab.transform.position.z);
		var inst = Instantiate( lockPrefab, pos, lockPrefab.transform.rotation );
		lockInsts.Push( inst );
	}

	// hide the prefab
	lockPrefab.GetComponent(Renderer).enabled = false;
}

function Start () {
}

function Show( gs:GameState )
{
	if( isShowing) return;
	isShowing = true;
	layout.Show();

	// hide the prefab
	var lockPrefab = layout.FindElement('locked');
	lockPrefab.GetComponent(Renderer).enabled = false;

	//----------------------------------------
	//  Show/hide locks depending on num stars
	//----------------------------------------
	InitLockElements();

	// go through and figure out how many stars we have
	var song = gs.activeSong;
	var nstars = gs.GetNumStars( song );

	Debug.Log('song '+song+ ' has '+nstars+ ' stars');

	// create locked
	for( var level = 0; level < 5; level++ )
	{
		var unlocked = ( level <= nstars );
		(lockInsts[level] as GameObject).GetComponent(Renderer).enabled = !unlocked;
	}

	//----------------------------------------
	//  Setup song title
	//----------------------------------------
	var title = gs.GetSongTitle();
	var titleObj = layout.FindElement( 'songTitle' );
	titleObj.GetComponent(TextMesh).text = title;

	// update highscores
	highscores.RefreshAllTimeScores( 'song'+(gs.activeSong+1), '', -1 );
	highscores.RefreshDailyScores( 'song'+(gs.activeSong+1), '', -1 );
}

function Hide()
{
	layout.Hide();
	isShowing = false;

	for( var i = 0; i < lockInsts.length; i++ )
		(lockInsts[i] as GameObject).GetComponent(Renderer).enabled = false;
}

function Update () {

}

function OnGUI()
{
	if( isShowing )
	{
		var textStyle = new GUIStyle();
		textStyle.fontSize = 18;
		textStyle.normal.textColor = Color.white;

		var rect = Rect( 275, 75, 500, 350 );
		GUI.Box( rect, '');
		GUILayout.BeginArea( rect );
		GUILayout.Label( 'HIGH SCORES\n', textStyle );
			GUILayout.BeginHorizontal();
				GUILayout.Label( highscores.allTime.names, textStyle );
				GUILayout.Label( highscores.allTime.values, textStyle );
				GUILayout.Label( highscores.daily.names, textStyle );
				GUILayout.Label( highscores.daily.values, textStyle );
			GUILayout.EndHorizontal();
		GUILayout.EndArea();
	}
}