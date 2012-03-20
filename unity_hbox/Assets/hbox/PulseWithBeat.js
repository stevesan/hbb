
enum PulseState { Rest, Play };

var pulseScale = Vector3(2,2,2);
var loop = true;
var playOnAwake = true;

private var state = PulseState.Rest;
private var restScale : Vector3;
private var pulseLeft = 0.0;

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
	pulseLeft = GameState.inst.GetSecsPerBeat();
}

function Stop() : void
{
	state = PulseState.Rest;
	transform.localScale = restScale;
}

function OnBeatChange() : void
{
	if( loop )
		Play();
	else
		Stop();
}

function Update ()
{
	if( state == PulseState.Play )
	{
		var alpha = 1 - (pulseLeft / GameState.inst.GetSecsPerBeat());
		var s = Vector3.Lerp( pulseScale, Vector3(1,1,1), alpha );
		transform.localScale = Vector3.Scale( restScale, s );
		pulseLeft -= Time.deltaTime;

		// don't handle looping here, since we should rely on "OnBeatChange" to keep everything sync'd up
	}
	else
	{
		// DO NOT DO THIS EVERY FRAME!!! 
		// If you happen to have a MeshCollider, this will kill FPS
		//transform.localScale = restScale;
	}
}