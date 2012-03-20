
var restIntensity = 4.0;
var pulseIntensity = 10.0;
var restColor : Color = Color.white;
var pulseColor : Color = Color.red;

private var pulseLeft = 0.0;

function Awake()
{
}

function OnBeatChange() : void
{
	pulseLeft = GameState.inst.GetSecsPerBeat();
}

function LateUpdate () {
	if( pulseLeft > 0.0 )
	{
		var alpha = 1 - (pulseLeft / GameState.inst.GetSecsPerBeat());
		GetComponent(Light).intensity = alpha*pulseIntensity + (1-alpha)*restIntensity;
		GetComponent(Light).color = Color.Lerp( pulseColor, restColor, alpha );
		pulseLeft -= Time.deltaTime;
	}
	else
	{
		GetComponent(Light).intensity = restIntensity;
		GetComponent(Light).color = restColor;
	}
}