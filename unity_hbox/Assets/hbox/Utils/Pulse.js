#pragma strict

var pulseScale = Vector3(2,2,2);
var pulseTime = 0.5;
var upAndDown = false; 	// 1 to 0 vs. 0 to 1 to 0
var squareAlpha = true;

private var origScale : Vector3;
private var pulseRemain:float = 0.0;

function Start () {
	origScale = transform.localScale;
}

function Update () {
	if( pulseRemain > 0 )
	{
		var alpha = 1.0 - pulseRemain/pulseTime;
		if( upAndDown )
		{
			if( alpha < 0.5 )
				alpha = (0.5-alpha) * 2.0;
			else
				alpha = (alpha-0.5)*2;
		}
		if( squareAlpha ) alpha *= alpha;

		transform.localScale = (1-alpha)*pulseScale + alpha*origScale;
		pulseRemain -= Time.deltaTime;
	}
	else
		transform.localScale = origScale;
}

function Play()
{
	pulseRemain = pulseTime;
}

// HACKY this is BJR specific code..
function OnKeyDown( key:int )
{
	Play();
}