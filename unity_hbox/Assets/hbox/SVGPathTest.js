#pragma strict

private var builder : SvgPathBuilder = new SvgPathBuilder();

function Start () {
	
	builder.BuildExample();
	builder.Recenter();
	builder.ToLineRenderer( GetComponent(LineRenderer) );

}

function Update () {

}