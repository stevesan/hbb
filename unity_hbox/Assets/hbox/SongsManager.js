#pragma strict

import System.Collections.Generic; // for List
import System.IO;
import System.Xml;

class SongPlayer
{
	var title:String;
	var bpm:int;
	var bpMeas:int;
	var numMeasures:int;
	var volume:float;
	var samplesVolume:float;
	var releaseSecs:float;
	var layerFadeDuration:float = 2.0;

	var samplePlayers : List.<ADSRWrapper>;
	var layerPlayers : List.<AudioSource>;
	var layer2volume : float[];

	function FixedUpdate() : void
	{
		for( wrapper in samplePlayers )
			wrapper.FixedUpdate();

		// update layer volumes for fading in newly activated tracks
		for( var i = 0; i < layerPlayers.Count; i++ )
		{
			// only fade in layers with non-zero volume
			if( layer2volume[i] > 0.0 )
			{
				layer2volume[i] += Time.deltaTime * (1.0/layerFadeDuration);
				layer2volume[i] = Mathf.Min( 1.0, layer2volume[i] );
			}

			// actually set the volume, modulated by the master song volume
			layerPlayers[i].volume = layer2volume[i] * volume;
		}
	}

	function SetLastLayer( lastLayer:int )
	{
		for( var i = 0; i < layerPlayers.Count; i++ )
		{
			if( i <= lastLayer )
			{
				// layer should be on
				if( layer2volume[i] == 0.0 )
				{
					// give it a non-zero value, so it'll get faded in on the updates
					layer2volume[i] = 1e-8;
				}
			}
			else
				// layer should be off
				layer2volume[i] = 0.0;
		}
	}

	function UseAllLayers()
	{
		SetLastLayer( layerPlayers.Count-1 );
	}

	function Restart()
	{
		for( layer in layerPlayers )
		{
			layer.Stop();
			layer.Play();
		}
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
						var clip = Resources.Load( res ) as AudioClip;
						var wrapper = new ADSRWrapper( clip );
						wrapper.releaseDuration = releaseSecs;
						wrapper.src.panLevel = 0.0;	// kill 3D effects
						samplePlayers.Add( wrapper );
					}
					else if( subtree.Name == 'layer' )
					{
						clip = Resources.Load( res ) as AudioClip;
						if( clip == null )
							Debug.LogError('ERROR - Could not load song layer '+res);
						else
						{
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
			}
			subtree.Close();

			Debug.Log('Found ' +samplePlayers.Count+ ' samples and ' + layerPlayers.Count + ' layers');
			// allocate
			layer2volume = new float[ layerPlayers.Count ];
		}
		else
			Debug.LogError('given node was null..');
	}
}

var songSpecsXML : TextAsset;
var players : List.<SongPlayer>;

function Start () {

	//----------------------------------------
	//  Load song infos from XML
	//----------------------------------------

	var reader = XmlReader.Create( new StringReader( songSpecsXML.text ) );
	while( reader.ReadToFollowing( 'song' ) )
	{
		Debug.Log('found song title = '+reader.GetAttribute('title') );
		var newSpec = new SongPlayer();
		newSpec.ReadXML( reader );
		players.Add( newSpec );
	}

}

function Update () {
}

//----------------------------------------
//  We use fixed update for finer time deltas
//----------------------------------------
function FixedUpdate () {
	// update ADSR states
	for( spec in players )
	{
		spec.FixedUpdate();
	}
}