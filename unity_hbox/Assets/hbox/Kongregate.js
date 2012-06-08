#pragma strict

//----------------------------------------
//  Mostly stuff copied from:
//	http://www.kongregate.com/developer_center/docs/zh/using-the-api-with-unity3d
//----------------------------------------

var gs : GameState;

private var isKongregate = false;
private var userId = 0;
private var username = "Guest";
private var gameAuthToken = "";

function Start () {
	// Begin the API loading process if it is available
	Application.ExternalEval(
			"if(typeof(kongregateUnitySupport) != 'undefined'){" +
			" kongregateUnitySupport.initAPI('"+name+"', 'OnKongregateAPILoaded');" +
			"};"
			);
}

function OnKongregateAPILoaded(userInfoString:String){
  // We now know we're on Kongregate
  isKongregate = true;
 
  // Split the user info up into tokens
  var params = userInfoString.Split("|"[0]);
  userId = parseInt(params[0]);
  username = params[1];
  gameAuthToken = params[2];

	// transfer username to game state
	gs.playerName = username;
}

function SubmitStat( name:String, value:int ) {
	Application.ExternalCall("kongregate.stats.submit",name,value);
}

function OnSuccess( player:int ) {
	if( gs.survivalMode ) {
		SubmitStat( "song"+gs.activeSong+".topScore", gs.survivalScore );
	}
}

function OnStarsChanged() {
	SubmitStat( "song"+gs.activeSong+".numStars", gs.numStars );
}

function Update () {

}