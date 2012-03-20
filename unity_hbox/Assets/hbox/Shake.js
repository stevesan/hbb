
var menuOffset = Vector3(0,10,0);
var maxRange = Vector3 (1.0, 1.0, 1.0);
var shakeTime = 0.1;
var moveTime = 1.0;

//private var noise = new Perlin();
private var origPosition : Vector3;
private var shakeTimer : float;
private var moveTimer : float;

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
	moveTimer = moveTime;
}

function MoveToMenu()
{
	moveTimer = moveTime;
}

function Update () {
	var gs : GameState = GameState.inst;

	shakeTimer -= Time.deltaTime;
	moveTimer -= Time.deltaTime;

	if( gs.state == RCState.MENU )
	{
		if( moveTimer > 0.0 )
		{
			var alpha = 1 - moveTimer/moveTime;
			transform.position = Vector3.Lerp( origPosition, origPosition+menuOffset, alpha );
		}
		else
			transform.position = origPosition + menuOffset;
	}
	else
	{
		if( moveTimer > 0.0 )
		{
			alpha = 1 - moveTimer/moveTime;
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
