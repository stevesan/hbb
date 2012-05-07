#pragma strict

private var builder : SvgPathBuilder = new SvgPathBuilder();

function Start()
{
	builder.BuildFigure8Example();
	builder.Recenter();
	builder.ToLineRenderer( GetComponent(LineRenderer) );
}

function Update () {

}