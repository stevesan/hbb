#pragma strict

import System.Collections.Generic; // for List

//----------------------------------------
//  Very specific code to handle the songs menu, ie. dealing with stars, etc.
//----------------------------------------

// the layout object that will create the visuals
var layout : LayoutSpawner;

private var starInsts = new Array();
private var lockInsts = new List.<GameObject>();
private var isShowing = false;

//----------------------------------------
//  Creates copies of the locked element and positions them over songs
//----------------------------------------
function InitLockElements( gs:GameState )
{
	if( lockInsts.Count > 0 )
		// already done 
		return;

	var lockPrefab = layout.FindElement('locked');

	if( lockPrefab == null )
	{
		Debug.LogError('Could not find locked layout element');
		return;
	}

	var lockSize = layout.GetElementSize( lockPrefab );

	for( var i = 1; i < gs.GetNumSongs(); i++ )
	{
		// find the location of the song button
		var songElm = layout.FindElement( 'Song'+(i+1) );
		if( songElm == null )
			Debug.LogError('could not find song'+(i+1) );
		var topLeft = layout.GetElementTopLeft( songElm );
		var pos = Vector3( topLeft.x + lockSize.x/2, topLeft.y - lockSize.y/2,
			lockPrefab.transform.position.z);
		var inst = Instantiate( lockPrefab, pos, lockPrefab.transform.rotation );
		lockInsts.Add( inst );
	}
}

function Start () {
}

function Show( gs:GameState )
{
	if( isShowing) return;
	isShowing = true;

	InitLockElements( gs );

	layout.Show();

	// hide the prefab
	var lockPrefab = layout.FindElement('locked');
	lockPrefab.GetComponent(Renderer).enabled = false;

	var starOnPrefab = layout.FindElement('staron');
	var starOffPrefab = layout.FindElement('staroff');

	if( starOnPrefab == null || starOffPrefab == null )
	{
		Debug.LogError('Could not find staron and/or staroff');
		return;
	}

	// hide prefabs
	starOnPrefab.GetComponent(Renderer).enabled = false;
	starOffPrefab.GetComponent(Renderer).enabled = false;

	// go through and figure out how many stars we have
	for( var song = 0; song < gs.GetNumSongs(); song++ )
	{
		// get the location of this song's stars
		var markerName = 'song'+(song+1)+'stars';
		var markerObj = layout.FindElement( markerName );
		if( markerObj != null )
		{
			// hide marker
			markerObj.GetComponent(Renderer).enabled = false;

			if( gs.survivalMode )
			{
				// spit out stars
				var topLeft = layout.GetElementTopLeft( markerObj );

				// need to know how much to space out the stars
				var size = layout.GetElementSize( starOnPrefab );

				// create stars
				var nstars = gs.GetNumStars( song );
				Debug.Log('got '+nstars+' for song '+song);
				var pos = Vector2( topLeft.x + size.x/2, topLeft.y - size.y/2 );
				for( var i = 0; i < 4; i++ )
				{
					var starObj = Instantiate(
							( i < nstars ? starOnPrefab : starOffPrefab ),
							pos,
							starOnPrefab.transform.rotation );
					starObj.GetComponent(Renderer).enabled = true;
					starInsts.Push( starObj );
					pos.x += size.x;
				}
			}
		}
		else
		{
			Debug.LogError('could not find '+markerName);
			return;
		}
	}

	// toggle lock elements
	for( song = 1; song < gs.GetNumSongs(); song++ )
	{
		if( gs.survivalMode && !gs.GetIsSongUnlocked(song) ) {
			lockInsts[song-1].GetComponent(Renderer).enabled = true;
		}
		else
			lockInsts[song-1].GetComponent(Renderer).enabled = false;
	}
}

function Hide()
{
	layout.Hide();
	isShowing = false;

	for( var i = 0; i < starInsts.length; i++ )
		Destroy( starInsts[i] as GameObject );

	for( i = 0; i < lockInsts.Count; i++ )
		lockInsts[i].GetComponent(Renderer).enabled = false;
}

function Update () {

}