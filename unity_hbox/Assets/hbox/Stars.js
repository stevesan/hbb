#pragma strict

var gs:GameState;
var stars:Renderer[];
var starTextPrefab:GameObject;
var textOffset = Vector3(0,0,0);

var starOffTexture:Texture2D;
var starOnTexture:Texture2D;

private var textObjs = new Array();

function OnDestroy() {
	for( var i = 0; i < textObjs.length; i++ )
		Destroy( textObjs[i] );
}

function Start () {
	// spawn text prefabs
	for( var i = 0; i < stars.length; i++ ) {
		var s = stars[i];
		var o = Instantiate( starTextPrefab,
				s.gameObject.transform.position + textOffset,
				starTextPrefab.transform.rotation );
		o.GetComponent(TextMesh).text = ""+gs.stars2score[i+1];
		textObjs.Push(o);
	}
	starTextPrefab.GetComponent(Renderer).enabled = false;

}

function Update () {
	if( gs.survivalMode ) {

		// show stars
		for( var s in stars ) {
			s.enabled = true;
		}

		// show score labels
		for( var i = 0; i < textObjs.length; i++ )
			(textObjs[i] as GameObject).GetComponent(Renderer).enabled = true;

		// choose texture depending on score
		for( i = 0; i < stars.length; i++ ) {
			if( i < gs.numStars ) {
				Utils.SetTexture( stars[i].gameObject, starOnTexture );
			} else { 
				Utils.SetTexture( stars[i].gameObject, starOffTexture );
			}
		}
	}
	else {
		// hide em all
		for( var s in stars ) {
			s.enabled = false;
		}
		for( i = 0; i < textObjs.length; i++ )
			(textObjs[i] as GameObject).GetComponent(Renderer).enabled = false;
	}

}