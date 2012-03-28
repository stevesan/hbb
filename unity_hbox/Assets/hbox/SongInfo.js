#pragma strict

var title = 'song title';
var bpm:int = 90;
var bpMeas:int = 4;
var measures:int = 2;
var sampleVolume:float = 1.0;
var releaseSecs:float = 0.5;

var sampleClips : AudioClip[];

private var wrappers : ADSRWrapper[];

class ADSRWrapper
{
	enum ADSRState { PLAY, RELEASE, STOP };

	private var state = ADSRState.STOP;
	var src:AudioSource = null;
	var releaseDuration:float = 0.2;
	private var releaseStart:float = 0.0;

	function ADSRWrapper( _src:AudioSource )
	{
		src = _src;
	}

	function ADSRWrapper( _clip:AudioClip )
	{
		var obj = new GameObject('ADSR wrapper audiosource');
		src = obj.AddComponent( AudioSource );
		src.clip = _clip;
		src.loop = false;
		src.Stop();
	}

	function OnKeyDown()
	{
		src.volume = 1.0;
		src.Play();
		state = ADSRState.PLAY;
	}

	function OnKeyUp()
	{
		if( state == ADSRState.PLAY )
		{
			state = ADSRState.RELEASE;
			releaseStart = Time.time;
		}
	}

	function FixedUpdate()
	{
		if( state == ADSRState.RELEASE )
		{
			var dt = Time.time - releaseStart;
			var alpha = dt / releaseDuration;

			if( alpha >= 1.0 )
			{
				// done
				src.Stop();
				state = ADSRState.STOP;
			}
			else
				// adjust volume
				src.volume = (1-alpha)*1.0 + alpha*0.0;
		}
	}
}

function Awake()
{
	wrappers = new ADSRWrapper[ sampleClips.length ];

	// create 3 audio sources
	for( var i = 0; i < sampleClips.length; i++ )
		wrappers[i] = new ADSRWrapper( sampleClips[i] );
}

function OnDestroy()
{
	wrappers = null;
}

function GetNumSamples() : int { return sampleClips.length; }

function OnKeyDown( key:int )
{
	if( key < wrappers.length )
		wrappers[key].OnKeyDown();
}

function OnKeyUp( key:int )
{
	if( key < wrappers.length )
		wrappers[key].OnKeyUp();
}

//----------------------------------------
//  We use fixed update for finer time deltas
//----------------------------------------
function FixedUpdate () {
	// update ADSR states
	for( wrapper in wrappers )
		wrapper.FixedUpdate();
}