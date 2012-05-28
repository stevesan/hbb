#pragma strict

//----------------------------------------
//	Returns a value between 0 and 1, indicating the linear interp parameter
//  t : elapsed time
//	d : total duration
//----------------------------------------
static function Bounce( t:float, d:float ) : float
{
	t = t/d;
	if (t < (1/2.75)) {
		return (7.5625*t*t);
	} else if (t < (2/2.75)) {
		t -= 1.5 / 2.75;
		return (7.5625*t*t + .75);
	} else if (t < (2.5/2.75)) {
		t -= 2.25 / 2.75;
		return (7.5625*t*t + .9375);
	} else {
		t -= 2.625 / 2.75;
		return (7.5625*t*t + .984375);
	}
};

