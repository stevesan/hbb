
//----------------------------------------
//  Handles the 'pieces of horse' displays
//----------------------------------------

var playerPiecePrefabs : GameObject[];
var pieceOffTextures : Texture2D[];
var pieceOnTextures : Texture2D[];
var flashesPerBeat = 1.0;

private var playerPieces : GameObject[,];

function Start()
{
	var gs = GameState.inst;
	if( gs == null ) return;	// just in case

	// create however many cards we need
	playerPieces = new GameObject[ 2, gs.GetMaxLosses() ];
	for( var p = 0; p < 2; p++ )
	{
		for( i = 0; i < gs.GetMaxLosses(); i++ )
		{
			playerPieces[p,i] = Instantiate( playerPiecePrefabs[p],
					playerPiecePrefabs[p].transform.position,
					playerPiecePrefabs[p].transform.rotation );
			playerPieces[p,i].transform.localScale = playerPiecePrefabs[p].transform.localScale;

		}
		// hide the original prefab
		playerPiecePrefabs[p].renderer.enabled = false;
	}

	OnScoreChanged( gs );
}

function OnScoreChanged( gs:GameState ) : void
{
	// update overall score board
	for( var p = 0; p < 2; p++ )
	{
		for( i = 0; i < gs.GetMaxLosses(); i++ )
		{
			SetPieceColor( p, i, Color.white );
			if( gs.playerLosses[p] > i )
			{
				Utils.SetTexture( playerPieces[p,i], pieceOnTextures[i] );
			}
			else
				Utils.SetTexture( playerPieces[p,i], pieceOffTextures[i] );
		}
	}
}

function OnBattleReset()
{
	var gs = GameState.inst;
	for( p = 0; p < 2; p++ )
		for( l = 0; l < gs.GetMaxLosses(); l++ )
			playerPieces[p,l].renderer.enabled = false;
}

function OnSuccess( player:int )
{
	var gs = GameState.inst;
	if( player == gs.GetAttacker() && gs.defendMessedUp )
	{
		// defender got a piece
		// pop the horse piece that's gonna be added
		// the score should be updated already
		var defender = 1-player;
		piece = gs.playerLosses[defender]-1;
		if( playerPieces[defender, piece].GetComponent(PulseWithBeat) )
		{
			playerPieces[defender, piece].GetComponent(PulseWithBeat).Play();
		}

		OnScoreChanged(gs);
	}
}

function OnMessedUp()
{
	var gs = GameState.inst;
	var p = gs.GetInputtingPlayer();
	if( p == gs.GetAttacker() )
	{
		// pop the horse piece that's gonna be added
		// the score should be updated already
		piece = gs.playerLosses[p]-1;
		if( playerPieces[p, piece].GetComponent(PulseWithBeat) )
		{
			playerPieces[p, piece].GetComponent(PulseWithBeat).Play();
		}

		OnScoreChanged(gs);
	}
}

function UpdateFlashing( gs : GameState, p : int )
{
	var numPieces = gs.playerLosses[p];

	// They got all the pieces - can't flash the "next" piece
	if( numPieces >= pieceOnTextures.length )
		return;

	beats = gs.GetMeasureTime() / gs.GetSecsPerBeat();
	flashPhase = Mathf.Floor( beats * flashesPerBeat * 2 );
	if( flashPhase % 2 == 0 )
		Utils.SetTexture( playerPieces[p,numPieces], pieceOnTextures[numPieces] );
	else
		Utils.SetTexture( playerPieces[p,numPieces], pieceOffTextures[numPieces] );
	
	// put a red tint on it
	SetPieceColor( p, numPieces, Color.red );
}

function SetPieceColor( p:int, i:int, c:Color )
{
	playerPieces[p,i].renderer.material.SetColor( "_TintColor", c );
}

function Update () {

	var gs = GameState.inst;

	if( !gs.survivalMode )
	{
		// do piece flashing for active player
		var attacker = gs.GetAttacker();
		var defender = gs.GetDefender();

		// by default, turn off the next piece so it doesn't get left on by the flashing
		for( var p = 0; p < 2; p++ )
		{
			var l = gs.playerLosses[p];
			if( l < pieceOffTextures.length )
				Utils.SetTexture( playerPieces[p, l], pieceOffTextures[l] );
		}

		// flash immediately if defender messed up
		if( gs.state == RCState.DEFEND && gs.defendMessedUp )
			UpdateFlashing( gs, defender );
		else if( gs.state == RCState.POST_DEFEND )
		{
			// always warn the attacker
			UpdateFlashing( gs, attacker );

			if( gs.defendMessedUp )
				UpdateFlashing( gs, defender );
		}
		else if( gs.state == RCState.REPEAT )
		{
			if( !gs.successTriggered && !gs.repeatMessedUp )
			{
				UpdateFlashing( gs, attacker );
				if( gs.defendMessedUp )
					UpdateFlashing( gs, defender );
			}
		}

		for( p = 0; p < 2; p++ )
			for( l = 0; l < gs.GetMaxLosses(); l++ )
				playerPieces[p,l].renderer.enabled = true;
	}
	else
	{
		for( p = 0; p < 2; p++ )
			for( l = 0; l < gs.GetMaxLosses(); l++ )
				playerPieces[p,l].renderer.enabled = false;
	}
}