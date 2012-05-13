
enum PulseState { Rest, FinishingBeat, Play };

var pulseScale = Vector3(2,2,2);
var loop = true;
var playOnAwake = true;
var upAndDown = false; 	// 1 to 0 vs. 0 to 1 to 0
var squareAlpha = true;

private var state = PulseState.Rest;
private var restScale : Vector3;
private var lastBeatElapsed : float;

// Important to do this on Start, because if we Play, then we refer to GameState.inst
function Start()
{
	restScale = transform.localScale;

	if( playOnAwake )
		Play();
}

function Play() : void
{
	state = PulseState.Play;

	if( !loop )
	{
		Debug.Log('stopping after beat');
		StopAfterBeat();
	}
}

//----------------------------------------
//  Does not restart the pulsating if it's already going
//----------------------------------------
function PlayIdem() : void
{
	if( state != PulseState.Play )
	{
		Play();
	}
}

function Stop() : void
{
	if( state != PulseState.Rest )
	{
		state = PulseState.Rest;
		transform.localScale = restScale;
	}
}

//----------------------------------------
//  Stops when the current beat is up
//----------------------------------------
function StopAfterBeat() : void
{
	if( state == PulseState.Play )
	{
		state = PulseState.FinishingBeat;
		lastBeatElapsed = GameState.inst.GetMeasureTime() % GameState.inst.GetSecsPerBeat();
	}
}

function AlphaFunction( alpha:float ) : float
{
	if( upAndDown )
	{
		if( alpha < 0.5 )
			alpha = (0.5-alpha) * 2.0;
		else
			alpha = (alpha-0.5)*2;
	}
	if( squareAlpha )
		alpha *= alpha;
	return alpha;
}

function Update()
{
	if( state == PulseState.Play )
	{
		var mt = GameState.inst.GetMeasureTime();
		var secsPerBeat = GameState.inst.GetSecsPerBeat();
		var alpha = (mt % secsPerBeat) / secsPerBeat;

		alpha = AlphaFunction( alpha );
		var s = Vector3.Lerp( pulseScale, Vector3(1,1,1), alpha );
		transform.localScale = Vector3.Scale( restScale, s );
	}
	else if( state == PulseState.FinishingBeat )
	{
		if( lastBeatElapsed < GameState.inst.GetSecsPerBeat() )
		{
			alpha = lastBeatElapsed / GameState.inst.GetSecsPerBeat();
			alpha = AlphaFunction( alpha );
			s = Vector3.Lerp( pulseScale, Vector3(1,1,1), alpha );
			transform.localScale = Vector3.Scale( restScale, s );

			lastBeatElapsed += Time.deltaTime;
		}
		else
		{
			state = PulseState.Rest;
		}
	}
	else
	{
		// If you happen to have a MeshCollider, this will kill FPS
		transform.localScale = restScale;
	}
}