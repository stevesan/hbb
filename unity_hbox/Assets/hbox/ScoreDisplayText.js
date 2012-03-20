
var playerNum = 0;

static var HorseLetters : String[] = ['H', 'O', 'R', 'S', 'E'];

function GetStringForLosses( losses : int ) : String
{
	var s = '';
	for( var i = 0; i < losses; i++ )
		s += HorseLetters[i];
	return s;
}

function Update () {
	var gs = GameState.inst;
	if( gs != null )
	{
		var losses = Mathf.Clamp( gs.playerLosses[playerNum], 0, HorseLetters.length );
		GetComponent(TextMesh).text = GetStringForLosses( losses );
	}
}