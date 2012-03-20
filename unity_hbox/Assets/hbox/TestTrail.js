#pragma strict

var fig8 : Figure8;
var width = 0.3;
private var inited = false;

function Start () {
}

function Update () {
	if( !inited )
	{
		var npts = 50;
		var pts = new Vector2[npts];
		for( var i = 0; i < npts; i++ )
		{
			var mt = 2.0/npts * i;
			pts[i] = Utils.ToVector2( fig8.GetPositionForMTime( mt, 0 ) );
		}
		ProGeo.Stroke2D( pts, width, GetComponent(MeshFilter).mesh );

		// inited = true;
	}
}