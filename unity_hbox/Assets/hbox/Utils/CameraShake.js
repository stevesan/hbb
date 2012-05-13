#pragma strict

var shaking = true;
var shakeScale = Vector3(1,1,1);
var targetChangeTime:float = 0.1;

private var origPos : Vector3;
private var targetPos : Vector3;
private var timeToChange = 0.0;

function Start () {
	origPos = transform.position;
}

function Update () {

	if( timeToChange <= 0.0 )
	{
		// change target pos
		targetPos = origPos +
			Vector3.Scale( Random.insideUnitSphere, shakeScale );
		timeToChange = targetChangeTime;
	}

	// smoothly change towards target pos
	var alpha = 1.0 - timeToChange/targetChangeTime;
	transform.position = (1-alpha)*origPos + alpha*targetPos;
	timeToChange -= Time.deltaTime;
}