#pragma strict

var gs:GameState;
var player:int;
var flashesPerBeat = 1.0;
var explosion:ParticleSystem;

var hearts:Renderer[];

function Start () {
}

function GetNumHearts() : int {
	return gs.GetMaxLosses() - gs.playerLosses[player];
}

function OnLoseHeart() {
	Debug.Log('OnLoseHeart');
	// trigger explosion at last heart
	var lostHeart = hearts[ GetNumHearts() ];
	explosion.transform.position = lostHeart.gameObject.transform.position;
	explosion.Clear();
	explosion.Play();
}

function OnSuccess( p:int ) {
	if( gs.GetDefender() == player
			&& gs.defendMessedUp
			&& gs.GetInputtingPlayer() == gs.GetAttacker() ) {
		OnLoseHeart();
	}
}

function OnMistake() {
	if( gs.GetInputtingPlayer() == player
			&& gs.GetAttacker() == player) {
		// attacker messed up, we lose a heart
		OnLoseHeart();
	}
}

function Update () {

	if( gs.survivalMode ) {
		// just hide all
		for( var h in hearts ) {
			h.enabled = false;
		}
	}
	else {
		Utils.Assert( player < gs.playerLosses.length );

		// enable based on score
		var numHearts = gs.GetMaxLosses() - gs.playerLosses[player];
		for( var i = 0; i < gs.GetMaxLosses(); i++ ) {
			hearts[i].enabled = i < numHearts;
		}

		// flash a heart?
		if( player == gs.GetDefender() ) {
			if( gs.defendMessedUp
					&& !gs.successTriggered
					&& ( gs.state == RCState.DEFEND 
						|| gs.state == RCState.POST_DEFEND
						|| gs.state == RCState.REPEAT )) {
				UpdateFlashing();
			}
		}
		else {
			// we're the attacker
			if( !gs.successTriggered && !gs.repeatMessedUp && (
						gs.state == RCState.POST_DEFEND
						|| gs.state == RCState.REPEAT ) ) {
				UpdateFlashing();
			}
		}
	}

}

function UpdateFlashing()
{
	var p = player;
	var numHearts = gs.GetMaxLosses() - gs.playerLosses[p];

	// They got all the pieces - can't flash the "next" piece
	if( numHearts > hearts.length )
		return;

	// flash last heart
	var h = hearts[ numHearts - 1 ];

	var beats = gs.GetMeasureTime() / gs.GetSecsPerBeat();
	var flashPhase = Mathf.Floor( beats * flashesPerBeat * 2 );
	if( flashPhase % 2 == 0 )
		h.enabled = true;
	else
		h.enabled = false;
}