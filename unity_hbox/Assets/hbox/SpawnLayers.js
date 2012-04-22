//----------------------------------------
//  Draws the notes flying on the track
//	And the lasers
//----------------------------------------

import System.Collections.Generic; // for List
import System.IO;	// StringReader

var layersFile : TextAsset;
var resourceBase : String;
var layerPrefab : GameObject;
var zDelta : float = -0.1;

private var layerObjs = new Array();

function Awake()
{
	var reader = new StringReader( layersFile.text );
	var spawnPos = layerPrefab.transform.position;
	while( true )
	{
		var line = reader.ReadLine();
		if( line == null ) break;
		var res = resourceBase+'/'+line;
		Debug.Log('spawning layer '+res);


		var obj = Instantiate(
				layerPrefab, spawnPos,
				layerPrefab.transform.rotation );
		var tex = Resources.Load( res, Texture2D );
		obj.transform.parent = transform;
		layerObjs.Push( obj );

		// TODO get blend mode and opacity
		// var r = obj.GetComponent( Renderer );
		// r.material = new Material( Shader.Find("Particles/Particles Multiply") );
		// Utils.SetOpacity( obj, opacity );
		Utils.SetTexture( obj, tex );

		spawnPos.z += zDelta;
	}
}
