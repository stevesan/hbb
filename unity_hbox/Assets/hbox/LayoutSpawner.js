
import System.Collections.Generic; // for List
import System.IO;	// StringReader

var layoutFile : TextAsset;
var resourceBase : String;
var layerPrefab : GameObject;
var zDelta : float = -0.1;
var outHeight : float = 44.0; // how tall the final rendered layout should be in world space
var objNamePrefix = 'layout_';
var startShown = true;

private var createdElemObjs = new Array();
private var allElemObjs = new Array();

class ElementObjMapping
{
  var elementName : String;
  var obj : GameObject;
}

// This is how you control/script layout elements.
// The game object's rendering will be overridden with the named layout element,
// ie. mesh and texture,
// but everything else, such as other components, will be preserved.
var elementObjMappings : ElementObjMapping[];

function Hide()
{
	for( var i = 0; i < allElemObjs.length; i++ )
		allElemObjs[i].GetComponent(Renderer).enabled = false;
}

function Show()
{
	for( var i = 0; i < allElemObjs.length; i++ )
		allElemObjs[i].GetComponent(Renderer).enabled = true;
}

function FindElementObjMapping( elem:String )
{
  for( var i = 0; i < elementObjMappings.length; i++ )
  {
    if( elementObjMappings[i].elementName == elem )
      return elementObjMappings[i].obj;
  }
  return null;
}

// Name should NOT include prefix - just as it shows up in the layout.txt file
function FindElement( elemName:String ) : GameObject
{
	for( var i = 0; i < allElemObjs.length; i++ )
	{
		var obj = allElemObjs[i];
		if( obj.name == objNamePrefix+elemName )
			return obj;
	}
	return null;
}

function GetElementSize( obj:GameObject ) : Vector2
{
	var pos = obj.transform.position;
	var mf = obj.GetComponent(MeshFilter);
	var mesh = mf.mesh;
	var left = mesh.vertices[0].x;
	var bott = mesh.vertices[0].y;
	var topp = mesh.vertices[2].y;
	var right = mesh.vertices[2].x;
	return Vector2( right-left, topp-bott );
}

function GetElementTopLeft( obj:GameObject ) : Vector2
{
	var pos = obj.transform.position;
	var mf = obj.GetComponent(MeshFilter);
	var mesh = mf.mesh;
	var left = mesh.vertices[0].x + pos.x;
	var topp = mesh.vertices[2].y + pos.y;
	return Vector2( left, topp );
}

function IsElementClicked( obj:GameObject, pt:Vector2 ) : boolean
{
	var pos = obj.transform.position;
	var mf = obj.GetComponent(MeshFilter);
	var mesh = mf.mesh;
	var left = mesh.vertices[0].x + pos.x;
	var bott = mesh.vertices[0].y + pos.y;
	var topp = mesh.vertices[2].y + pos.y;
	var right = mesh.vertices[2].x + pos.x;

	return ( pt.x >= left && pt.x <= right && pt.y <= topp && pt.y >= bott );
}

// The element name should be given with OUT the prefix. Ie. as stated in the export layer sets file
function IsElementClicked( elemName:String, pos:Vector2 ) : boolean
{
	// find the element with the name
	var obj = FindElement( elemName );
	if( obj == null )
		return false;
	else
		return IsElementClicked( obj, pos );
}

function GetClickedElement( pt:Vector2 ) : GameObject
{
	for( var i = 0; i < allElemObjs.length; i++ )
	{
		if( IsElementClicked( allElemObjs[i], pt ) )
			return allElemObjs[i];
	}
	return null;
}

//----------------------------------------
//  
//----------------------------------------
function Awake()
{
	var reader = new StringReader( layoutFile.text );

  // first read full dimensions
  var lsSize = Utils.Str2Vector2( reader.ReadLine() );
  Debug.Log('full layout lsSize = ' +lsSize);

  var wsByLs = outHeight / lsSize.y;
  var zPos = transform.position.z;

  var wsLayoutBotLeft = transform.position - Utils.ToVector3( lsSize/2, 0 ) * wsByLs;

	while( true )
	{
		var elem = reader.ReadLine();
		if( elem == null ) break;

		var res = resourceBase+'/'+elem;
    var lsTopLeft = Utils.Str2Vector2( reader.ReadLine() );
    lsTopLeft.y = lsSize.y-lsTopLeft.y-1; // image-coordinates have Y flipped
    var lsElemSize = Utils.Str2Vector2( reader.ReadLine() );
    var lsTexSize = Utils.Str2Vector2( reader.ReadLine() );
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
			obj.name = elem;
    }
    else
    {
      obj.transform.position = spawnPos;
      obj.transform.rotation = Quaternion.identity;
    }

		allElemObjs.Push( obj );
    obj.transform.localScale = Vector3(1,1,1);
		obj.name = objNamePrefix + elem;

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

	if( !startShown ) Hide();
	else Show();
}

function OnDestroy()
{
	for( var i = 0; i < createdElemObjs.length; i++ )
		Destroy( createdElemObjs[i] as GameObject );
}
