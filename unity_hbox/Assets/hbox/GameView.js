//----------------------------------------
//  Handles the "view" of the game, ie. audio/visual output when stuff happens
//	This is mostly for more incidental things, like small one-off cues.
//----------------------------------------

var mainText : TextMesh = null;
var	prompts : TextMesh[];
var successAnims : FadeAnim[];
var scoreDisplays : GameObject[];
var messupSound : AudioSource = null;

var turnIndicators : Renderer[];
var avatars : Renderer[];
var auras : Renderer[];

function Start()
{
	// force the success anim fades to be exactly one beat
	var gs = GameState.inst;

	if( gs != null )
	{
		var dt = gs.GetSecsPerBeat();

		for( var i = 0; i < successAnims.length; i++ )
		{
			successAnims[i].holdDuration = dt/1.0;
			successAnims[i].fadeDuration = dt/4.0;
		}
	}

	prompts[0].text ='';
	prompts[1].text ='';
}

function OnMistake()
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

	var broncoText = 'SCORE: ' + gs.survivalScore;
	if( (gs.numStars+1) < gs.stars2score.length )
		broncoText += ' - NEXT STAR: ' + gs.stars2score[ gs.numStars+1 ];
	else
		broncoText += ' - GOT ALL STARS!';
	broncoText += '\n STARS: ' + gs.numStars;
	prompts[ 0 ].text = '';
	prompts[ 1 ].text = '';

	if( GameState.inst.state == RCState.START )
		mainText.text = 'PRESS SPACE BAR TO START';
	else if( gs.state == RCState.VICTORY )
	{
		if( gs.survivalMode )
			mainText.text = 'FINAL: '+gs.survivalScore + '. SPACE :: Retry';
		else
			mainText.text = 'P' +(gs.GetWinningPlayer()+1) + ' won! SPACE :: Retry.';
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

		if( gs.state != RCState.MENU && gs.survivalMode )
			mainText.text = broncoText;
	}

	if( gs.state == RCState.VICTORY )
	{
		if( gs.p1loseCard.enabled )
			avatars[0].renderer.enabled = false;
		if( gs.p2loseCard.enabled )
			avatars[1].renderer.enabled = false;

		turnIndicators[0].GetComponent(PulseWithBeat).StopAfterBeat();
		turnIndicators[1].GetComponent(PulseWithBeat).StopAfterBeat();
	}
	else
	{
		avatars[0].renderer.enabled = true;
		avatars[1].renderer.enabled = true;

		for( var i = 0; i < turnIndicators.length; i++ )
		{
			if( i == gs.GetInputtingPlayer() )
				turnIndicators[i].GetComponent(PulseWithBeat).PlayIdem();
			else
				turnIndicators[i].GetComponent(PulseWithBeat).StopAfterBeat();
		}
	}
	
}