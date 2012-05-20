#pragma strict

//----------------------------------------
//  Very specific code to handle the songs menu, ie. dealing with stars, etc.
//----------------------------------------

// the layout object that will create the visuals
var layout : LayoutSpawner;

private var starInsts = new Array();
private var shown = false;

function Start () {
}

function Show( gs:GameState )
{
	if( shown) return;
	shown = true;
	layout.Show();

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
}

function Hide()
{
	layout.Hide();
	shown = false;

	for( var i = 0; i < starInsts.length; i++ )
		Destroy( starInsts[i] as GameObject );
}

function Update () {

}