
var menuOffset = Vector3(0,10,0);
var maxRange = Vector3 (1.0, 1.0, 1.0);
var shakeTime = 0.1;
var moveDuration = 1.0;

//private var noise = new Perlin();
private var origPosition : Vector3;
private var shakeTimer : float = 0.0;
private var moveRemain : float = 0.0;

function Start()
{
	origPosition = transform.position;
}

function DoShake()
{
	shakeTimer = shakeTime;
}

function MoveToStartScreen()
{
	moveRemain = moveDuration;
}

function MoveToMenu()
{
	moveRemain = moveDuration;
}

function Update () {
	var gs : GameState = GameState.inst;

	shakeTimer -= Time.deltaTime;
	moveRemain -= Time.deltaTime;

	if( gs.state == RCState.MENU )
	{
		if( moveRemain > 0.0 ) {
			var alpha = Tween.Bounce( moveDuration-moveRemain, moveDuration );
			transform.position = Vector3.Lerp( origPosition, origPosition+menuOffset, alpha );
		}
		else
			transform.position = origPosition + menuOffset;
	}
	else
	{
		if( moveRemain > 0.0 ) {
			alpha = Tween.Bounce( moveDuration-moveRemain, moveDuration );
			transform.position = Vector3.Lerp( origPosition+menuOffset, origPosition, alpha );
		}
		else
		{
			if( shakeTimer > 0.0 )
			{
				var decayScale = shakeTimer / shakeTime;
				transform.position = origPosition +
					Vector3.Scale(Random.insideUnitSphere, maxRange * decayScale );
			}
			else
				transform.position = origPosition;
		}
	}
}
