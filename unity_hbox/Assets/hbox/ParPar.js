#pragma strict

var urlBase = 'http://localhost:8080';

function GetURLResponse( url:String ) : String
{
}

function OnSurvivalOver( gs:GameState )
{
	var song = "song" + (gs.activeSong+1);
	var player = GameState.inst.playerName;
	var value = gs.survivalScore;
	
	Debug.Log('ParPar: submitting score: '+value+ ' to '+song );

	var url = urlBase+'/SaveScore?song='+song+'&player='+player+'&value='+value;
	Debug.Log(url);
	var www = new WWW( url );
	yield www;
	Debug.Log( www.text );

	DisplayScores(song, player, value);
}

private var highscoreNames = '';
private var highscoreValues = '';

function OnGUI()
{
	if( GameState.inst.state == RCState.VICTORY )
	{
		var radius = Screen.height/3;
		var centerX = Screen.width/2;
		var centerY = Screen.height/2;

		var textStyle = new GUIStyle();
		textStyle.fontSize = 18;
		textStyle.normal.textColor = Color.white;

		var rect = Rect( 225, 100, 350, 300 );
		GUI.Box( rect, '');
		GUILayout.BeginArea( rect );
		GUILayout.Label( GameState.inst.GetSongTitle()+'\nHIGH SCOREZ\n', textStyle );
			GUILayout.BeginHorizontal();
				GUILayout.Label( highscoreNames, textStyle );
				GUILayout.Label( highscoreValues, textStyle );
			GUILayout.EndHorizontal();
		GUILayout.EndArea();
	}
}

function DisplayScores( song:String, currPlayer:String, currValue:int )
{
	highscoreNames = 'Loading..';
	highscoreValues = '';

	var url = urlBase + '/GetScores?song=' + song + '&limit=10' + '&days=-1';
	Debug.Log(url);
	var www = new WWW( url );
	yield www;

	// Loaded, now display them

	highscoreNames = '';
	highscoreValues = '';

	var raw = www.text;
	var parts = raw.Split(['|'[0]]);

	var found = false;
	for( var i = 0; i < parts.length; i++ )
	{
		if( parts[i] != '' )
		{
			var pair = parts[i].Split([','[0]]);
			highscoreNames += (i+1)+'. ' + pair[0] + '\n';
			if( !found && pair[0] == currPlayer && parseInt(pair[1]) == currValue )
			{
				highscoreValues += pair[1] + ' <-- YOU!\n';
				found = true;
			}
			else
				highscoreValues += pair[1] + '\n';
		}
	}
}
