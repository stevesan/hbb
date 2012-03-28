#pragma strict

import System.Collections.Generic; // for List
import System.IO;
import System.Xml;

class SongSpec
{
	var title:String;
	var bpm:int;
	var bpMeas:int;
	var numMeasures:int;
	var volume:float;
	var samplesVolume:float;
	var releaseSecs:float;

	var samplePlayers : List.<ADSRWrapper>;
	var layerPlayers : List.<AudioSource>;

	function FixedUpdate() : void
	{
		for( wrapper in samplePlayers )
			wrapper.FixedUpdate();
	}

	function PlayLayered( lastLayer:int )
	{
		Debug.Log('layered with n = '+lastLayer);
		for( var i = 0; i < layerPlayers.Count; i++ )
		{
			if( i <= lastLayer )
			{
				layerPlayers[i].Stop();
				layerPlayers[i].Play();
			}
			else
				layerPlayers[i].Stop();
		}
	}

	function PlayFull()
	{
		PlayLayered( layerPlayers.Count );
	}

	function Stop()
	{
		for( layer in layerPlayers )
			layer.Stop();
	}

	function OnKeyDown( key:int )
	{
		if( key < samplePlayers.Count )
			samplePlayers[key].OnKeyDown();
	}

	function GetNumSamples() : int { return samplePlayers.Count; }

	function OnKeyUp( key:int )
	{
		if( key < samplePlayers.Count )
			samplePlayers[key].OnKeyUp();
	}

	//----------------------------------------
	//  Make sure to pass in the sub-tree only, otherwise this will read the whole document
	//----------------------------------------
	function ReadXML( node:XmlReader )
	{
		if( node != null )
		{
			samplePlayers = new List.<ADSRWrapper>();
			layerPlayers = new List.<AudioSource>();

			title = node.GetAttribute('title');
			Debug.Log('reading song spec, title = ' + title);
			bpm = parseInt( node.GetAttribute('bpm') );
			bpMeas = parseInt( node.GetAttribute('bpMeas') );
			numMeasures = parseInt( node.GetAttribute('numMeasures') );
			volume = parseFloat( node.GetAttribute('volume') );
			samplesVolume = parseFloat( node.GetAttribute('samplesVolume') );
			releaseSecs = parseFloat( node.GetAttribute('releaseSecs') );

			var subtree = node.ReadSubtree();

			// now read children
			while( subtree.Read() )
			{
				if( subtree.NodeType == XmlNodeType.Element )
				{
					var res = subtree.GetAttribute('res');
					if( subtree.Name == 'sample' )
					{
						Debug.Log('found sample '+res);
						var clip = Resources.Load( res ) as AudioClip;
						var wrapper = new ADSRWrapper( clip );
						wrapper.releaseDuration = releaseSecs;
						wrapper.src.panLevel = 0.0;	// kill 3D effects
						samplePlayers.Add( wrapper );
					}
					else if( subtree.Name == 'layer' )
					{
						Debug.Log('found layer '+res);
						clip = Resources.Load( res ) as AudioClip;
						var obj = new GameObject('Track playing obj');
						var src = obj.AddComponent( AudioSource );
						src.panLevel = 0.0;	// kill 3d effects
						src.clip = clip;
						src.loop = true;	// do loop, since some layers are twice as short
						src.Stop();
						layerPlayers.Add( src );
					}
				}
			}
			subtree.Close();
		}
		else
			Debug.LogError('given node was null..');
	}
}

var songSpecsXML : TextAsset;
var songSpecs : List.<SongSpec>;

function Start () {

	//----------------------------------------
	//  Load song infos from XML
	//----------------------------------------

	var reader = XmlReader.Create( new StringReader( songSpecsXML.text ) );
	while( reader.ReadToFollowing( 'song' ) )
	{
		Debug.Log('found song title = '+reader.GetAttribute('title') );
		var newSpec = new SongSpec();
		newSpec.ReadXML( reader );
		songSpecs.Add( newSpec );
	}

}

function Update () {
}

//----------------------------------------
//  We use fixed update for finer time deltas
//----------------------------------------
function FixedUpdate () {
	// update ADSR states
	for( spec in songSpecs )
	{
		spec.FixedUpdate();
	}
}