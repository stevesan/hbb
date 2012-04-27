#pragma strict

var urlBase = 'http://localhost:8080';
var highscoreNames : TextMesh;
var highscoreValues : TextMesh;

function GetURLResponse( url:String ) : String
{
}

function OnSurvivalOver( gs:GameState )
{
	var song = "song" + (gs.activeSong+1);
	var player = 'BobTest';
	var value = gs.survivalScore;
	
	Debug.Log('ParPar: submitting score: '+value+ ' to '+song );

	var url = urlBase+'/SaveScore?song='+song+'&player='+player+'&value='+value;
	Debug.Log(url);
	var www = new WWW( url );
	yield www;
	Debug.Log( www.text );

	DisplayScores(song);
}

function DisplayScores( song:String )
{
	highscoreNames.text = 'Loading high scores..';
	highscoreValues.text = '';

	var url = urlBase + '/GetScores?song=' + song;
	Debug.Log(url);
	var www = new WWW( url );
	yield www;

	// Loaded, now display them

	highscoreNames.text = '';
	highscoreValues.text = '';

	var raw = www.text;
	var parts = raw.Split(['|'[0]]);

	for( var i = 0; i < parts.length; i++ )
	{
		if( parts[i] != '' )
		{
			var pair = parts[i].Split([','[0]]);
			highscoreNames.text += (i+1)+'. ' + pair[0] + '\n';
			highscoreValues.text += pair[1] + '\n';
		}
	}
}
