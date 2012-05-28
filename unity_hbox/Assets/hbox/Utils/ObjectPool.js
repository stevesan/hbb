#pragma strict

//----------------------------------------
//  Err kind of a misnomer..actually more of a ring buffer.
//----------------------------------------

var prefab:GameObject;
var count = 100;

private var pool:GameObject[];
private var last = -1;

function Awake()
{
	pool = new GameObject[ count ];
	for( var i = 0; i < count; i++ ) {
		pool[i] = Instantiate( prefab, Vector3(0,0,0), Quaternion.identity );
	}
}

function GetNext() : GameObject
{
	last = (last+1)%count;
	return pool[last];
}
