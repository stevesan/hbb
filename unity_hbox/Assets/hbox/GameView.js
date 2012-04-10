//----------------------------------------
//  Handles the "view" of the game, ie. audio/visual output when stuff happens
//	This is mostly for more incidental things, like small one-off cues.
//----------------------------------------

var mainText : TextMesh = null;
var	prompts : TextMesh[];
var successAnims : FadeAnim[];
var scoreDisplays : GameObject[];
var messupSound : AudioSource = null;

var avatars : Renderer[];

function Start()
{
	// force the success anim fades to be exactly one beat
	var gs = GameState.inst;

	if( gs != null )
	{
		var dt = gs.GetSecsPerBeat();

		for( var i = 0; i < successAnims.length; i++ )
		{
			successAnims[i].holdDuration = dt/4.0;
			successAnims[i].fadeDuration = dt/4.0;
		}
	}

	prompts[0].text ='';
	prompts[1].text ='';
}

function OnMessedUp()
{
	messupSound.Play();
}

function OnSuccess( player:int )
{
	successAnims[ player ].Play();
}

function UpdateCountdown( gs:GameState, msg:String, player:int )
{
	var bpM = gs.GetBeatsPerMeasure();
	var b = gs.GetBeatsPassed();
	var countNumber = (bpM - (b%bpM));

	prompts[ player  ].text = msg + "\n" + countNumber;
	prompts[ 1-player ].text = '';
}

function Update () {
	var gs = GameState.inst;

	mainText.text = '';

	var survivedText = 'EARNED $' + gs.survivalScore + ' / ' + gs.GetAI().GetNextMilestone();

	if( GameState.inst.state == RCState.START )
		mainText.text = 'PRESS SPACE BAR TO START';
	else if( gs.state == RCState.VICTORY )
	{
		if( gs.survivalMode )
			mainText.text = 'FINAL: $'+gs.survivalScore;
		else
			mainText.text = 'P' +(gs.GetWinningPlayer()+1) + ' WON! Press SPACE BAR.';
	}
	else
	{
		if( gs.state == RCState.POST_ATTACK )
			UpdateCountdown( gs, "Repeat in", gs.GetDefender() );
		else if( gs.state == RCState.POST_DEFEND )
		{
			if( gs.survivalMode )
				UpdateCountdown( gs, "Play in", gs.GetAttacker() );
			else
				UpdateCountdown( gs, "Repeat in", gs.GetAttacker() );
		}
		else if( gs.state == RCState.POST_REPEAT )
			// we prompt the defender here, who will soon become the attacker
			UpdateCountdown( gs, "Play in", gs.GetDefender() );
		else
		{
			prompts[ 0 ].text = '';
			prompts[ 1 ].text = '';
		}

		if( gs.state != RCState.MENU && gs.survivalMode )
			mainText.text = survivedText;
	}

	for( var i = 0; i < avatars.length; i++ )
	{
		if( i == gs.GetInputtingPlayer() )
			avatars[i].GetComponent(PulseWithBeat).PlayIdem();
		else
			avatars[i].GetComponent(PulseWithBeat).Stop();
	}
	
}