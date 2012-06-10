#pragma strict

var spinSecs = 0.0;
var playOnAwake = false;
private var spinStart = -999.0;
var speed = Vector3( 0.0, 360.0, 0.0 );	// degrees per second

private var origAngles:Vector3;

function Play() {
	origAngles = transform.eulerAngles;
	spinStart = Time.time;
}

function Start () {
	origAngles = transform.eulerAngles;
 	if( playOnAwake ) {
		Play();
	}
}

function Update () {
	var elapsed = Time.time - spinStart;
	if( elapsed < spinSecs || spinSecs < 0.0 ) {
		transform.eulerAngles = origAngles + speed * elapsed;
	}
	else {
		transform.eulerAngles = origAngles;
	}
}