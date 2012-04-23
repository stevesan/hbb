
import System.Collections.Generic; // for List
import System.IO;	// StringReader

var layoutFile : TextAsset;
var resourceBase : String;
var layerPrefab : GameObject;
var zDelta : float = -0.1;
var outHeight : float = 44.0; // how tall the final rendered layout should be in world space

private var createdElemObjs = new Array();

class ElementObjMapping
{
  var elementName : String;
  var obj : GameObject;
}

var elementObjMappings : ElementObjMapping[];

function FindElementObjMapping( elem:String )
{
  for( var i = 0; i < elementObjMappings.length; i++ )
  {
    if( elementObjMappings[i].elementName == elem )
      return elementObjMappings[i].obj;
  }
  return null;
}

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

  // first read full dimensions
  var lsSize = ParseVector2( reader.ReadLine() );
  Debug.Log('full layout lsSize = ' +lsSize);

  var wsByLs = outHeight / lsSize.y;
  var zPos = transform.position.z;

  var wsLayoutBotLeft = transform.position - Utils.ToVector3( lsSize/2, 0 ) * wsByLs;

	while( true )
	{
		var elem = reader.ReadLine();
		if( elem == null ) break;

		var res = resourceBase+'/'+elem;
    var lsTopLeft = ParseVector2( reader.ReadLine() );
    lsTopLeft.y = lsSize.y-lsTopLeft.y-1; // image-coordinates have Y flipped
    var lsElemSize = ParseVector2( reader.ReadLine() );
    var lsTexSize = ParseVector2( reader.ReadLine() );
    var lsBotLeft = Vector2( lsTopLeft.x, lsTopLeft.y-lsElemSize.y );

    var obj = FindElementObjMapping( elem );

    // Position all objects at their center so scaling works well
    // the actual mesh vertex positions will enforce the proper positions
    var spawnPos = wsLayoutBotLeft
      + lsBotLeft*wsByLs
      + lsElemSize/2*wsByLs;
    spawnPos.z = zPos;
		Debug.Log('spawning layout elem '+res+ ' at ' + spawnPos);
    
    if( obj == null )
    {
      obj = Instantiate(
          layerPrefab, spawnPos,
          Quaternion.identity );
      createdElemObjs.Push( obj );
    }
    else
    {
      obj.transform.position = spawnPos;
      obj.transform.rotation = Quaternion.identity;
    }

    obj.transform.localScale = Vector3(1,1,1);

    var tex = Resources.Load( res, Texture2D );

    var m = obj.GetComponent(MeshFilter).mesh;
    m.vertices = [
    Vector3( -lsElemSize.x/2.0*wsByLs, -lsElemSize.y/2.0*wsByLs, 0 ),
    Vector3( lsElemSize.x/2.0*wsByLs, -lsElemSize.y/2.0*wsByLs, 0 ),
    Vector3( lsElemSize.x/2.0*wsByLs, lsElemSize.y/2.0*wsByLs, 0 ),
    Vector3( -lsElemSize.x/2.0*wsByLs, lsElemSize.y/2.0*wsByLs, 0 ) ];
    m.triangles = [ 0, 2, 1, 0, 3, 2 ];
    m.RecalculateNormals();
    var u = lsElemSize.x / lsTexSize.x;
    var v = lsElemSize.y / lsTexSize.y;
    m.uv = [ Vector2(0,1-v), Vector2(u,1-v), Vector2(u,1), Vector2(0,1) ];

		Utils.SetTexture( obj, tex );

		zPos += zDelta;
	}
}
