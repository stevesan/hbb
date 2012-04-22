//----------------------------------------
//  Draws the notes flying on the track
//	And the lasers
//----------------------------------------

import System.Collections.Generic; // for List
import System.IO;	// StringReader

var layoutFile : TextAsset;
var resourceBase : String;
var layerPrefab : GameObject;
var zDelta : float = -0.1;
var outHeight : float = 44.0; // how tall the final rendered layout should be in world space

private var layerObjs = new Array();

function ParseVector2( s:String ) : Vector2
{
  var parts = s.Split([' '], System.StringSplitOptions.RemoveEmptyEntries);
  return Vector2( parseFloat(parts[0]), parseFloat(parts[1]) );
}

//----------------------------------------
//  Takes a 2D scale and turns it into a 3D scale appropriate for after the 90/180/0 rotation
//----------------------------------------
function ToRotatedScale( s:Vector2 ) : Vector3
{
  return Vector3( s.x, s.y, 1.0 );
}

function CreateNegZPlane( mesh:Mesh )
{
}

function Awake()
{
	var reader = new StringReader( layoutFile.text );
	var spawnPos = layerPrefab.transform.position;

  // first read full dimensions
  var dims = ParseVector2( reader.ReadLine() );
  Debug.Log('full layout dims = ' +dims);

  var scale = outHeight / dims.y;

	while( true )
	{
		var line = reader.ReadLine();
		if( line == null ) break;

		var res = resourceBase+'/'+line;
    var topleft = ParseVector2( reader.ReadLine() );
    topleft.y = dims.y-topleft.y-1;
    var realsize = ParseVector2( reader.ReadLine() );
    var texsize = ParseVector2( reader.ReadLine() );
		Debug.Log('spawning layer '+res+ ' at ' + topleft);

		var obj = Instantiate(
				layerPrefab, transform.position-dims*scale/2,
				Quaternion.identity );
		var tex = Resources.Load( res, Texture2D );
		layerObjs.Push( obj );

    var m = obj.GetComponent(MeshFilter).mesh;
    var z = spawnPos.z;
    m.vertices = [
    Vector3( (topleft.x)*scale, (topleft.y-realsize.y)*scale, z ),
    Vector3( (topleft.x+realsize.x)*scale, (topleft.y-realsize.y)*scale, z ),
    Vector3( (topleft.x+realsize.x)*scale, (topleft.y)*scale, z ),
    Vector3( (topleft.x)*scale, (topleft.y)*scale, z ) ];
    m.triangles = [ 0, 2, 1, 0, 3, 2 ];
    m.RecalculateNormals();
    var u = realsize.x / texsize.x;
    var v = realsize.y / texsize.y;
    m.uv = [ Vector2(0,1-v), Vector2(u,1-v), Vector2(u,1), Vector2(0,1) ];

		// TODO get blend mode and opacity
		// var r = obj.GetComponent( Renderer );
		// r.material = new Material( Shader.Find("Particles/Particles Multiply") );
		// Utils.SetOpacity( obj, opacity );
		Utils.SetTexture( obj, tex );

		spawnPos.z += zDelta;
	}
}
