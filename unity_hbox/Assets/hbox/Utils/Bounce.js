#pragma strict

var startOffset = Vector3(0,1,0);

var playOnAwake = false;
var duration = 1.0;

private var remain = 0.0;
private var origPos:Vector3;

function Awake()
{
	origPos = transform.position;
	if( playOnAwake ) Play();
}

function Play()
{
	remain = duration;
}

function Update()
{
	if( remain > 0.0 ) {
		var alpha = Tween.Bounce( duration-remain, duration );
		transform.position = Vector3.Lerp( startOffset+origPos, origPos, alpha );
		remain -= Time.deltaTime;
	}
	else
		transform.position = origPos;
}
