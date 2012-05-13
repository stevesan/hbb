#pragma strict

var urlBase = 'http://localhost:8080';
var SecretMD5Salt:TextAsset = null;

private var highscoreNames = '';
private var highscoreValues = '';
private var dailyHighscoreNames = '';
private var dailyHighscoreValues = '';


function GetURLResponse( url:String ) : String
{
}

function OnSurvivalOver( gs:GameState )
{
	highscoreNames = 'Submitting score..';
	highscoreValues = '';
	// make sure to clear both immediately..
	dailyHighscoreNames = '';
	dailyHighscoreValues = '';

	var song = "song" + (gs.activeSong+1);
	var player = GameState.inst.playerName;
	var value = gs.survivalScore;
	
	//----------------------------------------
	//  Submit the score
	//----------------------------------------
	if( value > 0 && SecretMD5Salt != null )
	{

		Debug.Log('ParPar: submitting score: '+value+ ' to '+song );

		// compute MD5 sum
		var md5input = song+player+value+SecretMD5Salt.text;
		var digest = Utils.Md5Sum( md5input );

		var url = urlBase
			+'/SaveScore?song='+WWW.EscapeURL(song)
			+'&player='+WWW.EscapeURL(player)
			+'&value='+value
			+'&hexdigest='+WWW.EscapeURL(digest);
		Debug.Log(url);
		var www = new WWW( url );
		yield www;
		Debug.Log( www.text );
	}

	DisplayAlltimeScores(song, player, value);
	DisplayDailyScores(song, player, value);
}

function OnGUI()
{
	if( GameState.inst.state == RCState.VICTORY && GameState.inst.survivalMode )
	{
		var radius = Screen.height/3;
		var centerX = Screen.width/2;
		var centerY = Screen.height/2;

		var textStyle = new GUIStyle();
		textStyle.fontSize = 18;
		textStyle.normal.textColor = Color.white;

		var rect = Rect( 100, 100, 600, 300 );
		GUI.Box( rect, '');
		GUILayout.BeginArea( rect );
		GUILayout.Label( GameState.inst.GetSongTitle() + ' HIGH SCORES\n', textStyle );
			GUILayout.BeginHorizontal();
				GUILayout.Label( highscoreNames, textStyle );
				GUILayout.Label( highscoreValues, textStyle );
				GUILayout.Label( dailyHighscoreNames, textStyle );
				GUILayout.Label( dailyHighscoreValues, textStyle );
			GUILayout.EndHorizontal();
		GUILayout.EndArea();
	}
}

function DisplayAlltimeScores( song:String, currPlayer:String, currValue:int )
{
	highscoreNames = 'Loading high scores..';
	highscoreValues = '';

	var url = urlBase + '/GetScores?song=' + WWW.EscapeURL(song) + '&limit=10' + '&justtoday=0';
	Debug.Log(url);
	var www = new WWW( url );
	yield www;

	// Loaded, now display them

	highscoreNames = 'ALL TIME:\n';
	highscoreValues = '\n';

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

// copy paste coding... the yield does complicate some things
function DisplayDailyScores( song:String, currPlayer:String, currValue:int )
{
	dailyHighscoreNames = 'Loading daily high scores..';
	dailyHighscoreValues = '';

	var url = urlBase + '/GetScores?song=' + WWW.EscapeURL(song) + '&limit=10' + '&justtoday=1';
	Debug.Log(url);
	var www = new WWW( url );
	yield www;

	// Loaded, now display them

	dailyHighscoreNames = 'TODAY:\n';
	dailyHighscoreValues = '\n';

	var raw = www.text;
	var parts = raw.Split(['|'[0]]);

	var found = false;
	for( var i = 0; i < parts.length; i++ )
	{
		if( parts[i] != '' )
		{
			var pair = parts[i].Split([','[0]]);
			dailyHighscoreNames += (i+1)+'. ' + pair[0] + '\n';
			if( !found && pair[0] == currPlayer && parseInt(pair[1]) == currValue )
			{
				dailyHighscoreValues += pair[1] + ' <-- YOU!\n';
				found = true;
			}
			else
				dailyHighscoreValues += pair[1] + '\n';
		}
	}
}
