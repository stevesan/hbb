#pragma strict

var urlBase = 'http://localhost:8080';
var SecretMD5Salt:TextAsset = null;

class HighScoresStrings
{
	var names : String;
	var values : String;

	//----------------------------------------
	//  
	//----------------------------------------
	function Parse( response:String, currPlayer:String, currValue:int )
	{
		names = '';
		values = '';
		var parts = response.Split(['\n'[0]]);
		Debug.Log('---- '+response);

		var found = false;
		for( var i = 0; i < parts.length; i += 2 )
		{
			if( parts[i] != '' && (i+1) < parts.length )
			{
				var pair = parts[i].Split([','[0]]);
				var name = parts[i];
				var value = parts[i+1];
				names += (i/2+1)+'. ' + name + '\n';
				if( !found && name == currPlayer && parseInt(value) == currValue )
				{
					values += value + ' <-- YOU!\n';
					found = true;
				}
				else
					values += value + '\n';
			}
		}
	}
};

var daily = new HighScoresStrings();
var allTime = new HighScoresStrings();

function Update()
{
}

function OnSurvivalOver( gs:GameState )
{
	// make sure to clear both immediately..
	allTime.names = 'Submitting score..';
	allTime.values = '';
	daily.names = '';
	daily.values = '';

	var song = "song" + (gs.activeSong+1);
	var player = GameState.inst.playerName;
	var value = gs.survivalScore;

	//----------------------------------------
	//  Submit the score
	//----------------------------------------
	if( gs.survivalScoreIncreased && SecretMD5Salt != null )
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

// mainly so we don't show the "YOU" arrow
	if( !gs.survivalScoreIncreased )
		value = -1;
	
	RefreshAllTimeScores(song, player, value);
	RefreshDailyScores(song, player, value);
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
				GUILayout.Label( allTime.names, textStyle );
				GUILayout.Label( allTime.values, textStyle );
				GUILayout.Label( daily.names, textStyle );
				GUILayout.Label( daily.values, textStyle );
			GUILayout.EndHorizontal();
		GUILayout.EndArea();
	}
}

function RefreshAllTimeScores( song:String, currPlayer:String, currValue:int )
{
	allTime.names = 'Loading high scores..';
	allTime.values = '';

	var url = urlBase + '/GetScores?song=' + WWW.EscapeURL(song) + '&limit=10' + '&justtoday=0';
	Debug.Log(url);
	var www = new WWW( url );
	yield www;

	// Loaded, now display them
	allTime.Parse( www.text, currPlayer, currValue );
	allTime.names = 'ALL TIME:\n' + allTime.names;
	allTime.values = '\n' + allTime.values;
}

// copy paste coding... the yield does complicate some things
function RefreshDailyScores( song:String, currPlayer:String, currValue:int )
{
	daily.names = 'Loading daily high scores..';
	daily.values = '';

	var url = urlBase + '/GetScores?song=' + WWW.EscapeURL(song) + '&limit=10' + '&justtoday=1';
	Debug.Log(url);
	var www = new WWW( url );
	yield www;

	// Loaded, now display them
	daily.Parse( www.text, currPlayer, currValue );
	daily.names = 'TODAY:\n' + daily.names;
	daily.values = '\n' + daily.values;

}
