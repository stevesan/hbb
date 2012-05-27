#pragma strict
import System.IO;
import System.Xml;

var aiStatsXML : TextAsset;

class AIPhaseSpec
{
	var numQuants = 16;

	var dexterity = 0.5;
	var rhythm = 0.5;
	var chords = 0.5;
	var sustain = 0.5;

	var maxScore:int = 0;

	var noteValuePdf:float[];

	private var noteValuePdfSampler : PdfSampler = new PdfSampler();

	function RandomMusicalLength( secsPerMeasure:float ) : float
	{
		var noteValue:int = noteValuePdfSampler.Sample()+1;
		//var s = secsPerMeasure / Mathf.Pow( 2, noteValue );
		var s = secsPerMeasure / numQuants * noteValue;
		return s;
	}

	function Awake()
	{
		noteValuePdfSampler.Reset( noteValuePdf );
	}

	function Randomize()
	{
		dexterity = Random.value;
		rhythm = Random.value;
		chords = Random.value;
		sustain = Random.value;

		//----------------------------------------
		//  Randomize note value PDF
		//----------------------------------------
		for( var i = 0; i < noteValuePdf.length; i++ )
			noteValuePdf[i] = 0.0;

		// 
		noteValuePdfSampler.Reset( noteValuePdf );
	}

	//----------------------------------------
	//  Assumes that the reader is currently at an "recordStats" element
	//----------------------------------------
	function ReadXML( r:XmlReader )
	{
		if( r != null )
		{
			numQuants = parseInt( r.GetAttribute("numQuants") );
			chords = parseFloat( r.GetAttribute("chords") );
			dexterity = parseFloat( r.GetAttribute("dexterity") );
			sustain = parseFloat( r.GetAttribute("sustain") );
			rhythm = parseFloat( r.GetAttribute("rhythm") );
			noteValuePdf = Utils.ParseFloatArray( r.GetAttribute("noteValuePdf"), ','[0] );
			noteValuePdfSampler.Reset( noteValuePdf );
			maxScore = parseInt( r.GetAttribute('maxScore') );
		}
		else
			Debug.LogError('given node was null..');
	}
}

class AISpec
{
	var name:String;
	var phases = new List.<AIPhaseSpec>();

	function ReadXML( r:XmlReader )
	{
		if( r != null )
		{
			name = r.GetAttribute('name');

			var subtree = r.ReadSubtree();

			while( subtree.ReadToFollowing('phase') )
			{
				var newPhase = new AIPhaseSpec();
				newPhase.ReadXML( subtree );
				phases.Add( newPhase );
			}
			subtree.Close();
			Debug.Log('OK Found ' + phases.Count + ' phases for AI ' + name );
		}
		else
			Debug.LogError('null xml reader was given');
	}
}

var testAI:AIPhaseSpec;
var debugUseTestAIPhase = false;
var debugOverrideAIName:String = null;

private var AIs = new List.<AISpec>();
var currAI:int = 0;
var currPhase:int = 0;

function GetPhase() : AIPhaseSpec
{
	if( debugUseTestAIPhase )
		return testAI;
	else
		return (AIs[currAI].phases[currPhase] as AIPhaseSpec);
}

function OnScoreChange( score:int )
{
	while( GetPhase().maxScore <= score )
	{
		if( currPhase == AIs[currAI].phases.Count-1 )
		{
			Debug.Log('Maxed out levelAIs');
			break;
		}
		currPhase++;
	}
}

function Reset( aiName:String )
{
	if( debugOverrideAIName != null && debugOverrideAIName != "" )
	{
		Debug.LogError('WARNING: Forcing the use of AI name = '+debugOverrideAIName);
		aiName = debugOverrideAIName;
	}

	var found = false;
	for( var i = 0; i < AIs.Count; i++ )
	{
		if( AIs[i].name == aiName )
		{
			Debug.Log('Using AI named '+aiName);
			currAI = i;
			found = true;
			break;
		}
	}

	if( !found )
	{
		Debug.LogError('Could not find AI named ' + aiName + ' defaulting to first one');
		currAI = 0;
	}

	currPhase = 0;
}

function GetCurrentLevel() : int { return currPhase; }

class RepeatStats
{
	var chordSize : float[];
	var spacings : float[];

	function Randomize()
	{
		var i:int;
		for( i = 0; i < chordSize.length; i++ )
			chordSize[i] = Random.value;
		for( i = 0; i < spacings.length; i++ )
			spacings[i] = Random.value;
	}
}

var repStats = new RepeatStats();

//----------------------------------------
//  Unlike Note, which is the game object with gameplay state,
//	this just specifies the time, key, and duration
//----------------------------------------
class NoteSpec
{
	var measureTime : float;
	var key : int;
	var duration : float;
}

class Chord
{
	var measureTime : float;
	var key2down : boolean[];
	var key2mt : float[];
	var duration : float;

	function Chord( numKeys:int )
	{
		measureTime = 0.0;
		duration = 0.0;

		key2down = new boolean[numKeys];
		for( var i = 0; i < numKeys; i++ )
			key2down[i] = false;

		key2mt = new float[numKeys];
	}

	//----------------------------------------
	//  Size is just number of keys down in the chord
	//----------------------------------------
	function GetSize() : int
	{
		var n = 0;
		for( var i = 0; i < key2down.length; i++ )
		{
			if( key2down[i] )
				n++;
		}
		return n;
	}

	function IsSameKeys( other:Chord ) : boolean
	{
		for( var i = 0; i < key2down.length; i++ )
		{
			if( other.key2down[i] != key2down[i] )
				return false;
		}
		return true;
	}

	function AddNote( note:Note ) : void 
	{
		key2down[ note.key ] = true;
		// for now, don't allow multi-sustain chords
		duration = Mathf.Max( duration, note.GetDuration() );
		key2mt[ note.key ] = note.measureTime;
	}
}


function Awake()
{
	// Parse the first AI and use it
	var reader = XmlReader.Create( new StringReader( aiStatsXML.text ) );

	if( reader == null )
	{
		Debug.LogError('could not create XML reader for ai specs!');
	}
	else
	{
		while( reader.ReadToFollowing('AI') )
		{
			Debug.Log('OK Found AI, name = '+reader.GetAttribute('name') );
			var newSpec = new AISpec();
			newSpec.ReadXML( reader );
			AIs.Add( newSpec );
		}

		Debug.Log('OK read '+AIs.Count+' AIs from XML');
	}
}

function RandomUnusedKey( keyUsed:boolean[] ) : int
{
	var k = Random.Range( 0, keyUsed.length-1 );
	while( keyUsed[k] ) {
		k = (k+1)%keyUsed.length;
	}
	return k;
}

function GetLevel() : int
{
	return currPhase;
}

function GetNextMilestone() : int
{
	return GetPhase().maxScore;
}

//----------------------------------------
//  Looks for instances of key which end at endMt, and makes them end earlier
//----------------------------------------
function HalvePreviousSustains( notes:Array, key:int, endMt:float )
{
	for( var i = 0; i < notes.length; i++ )
	{
		var note = (notes[i] as NoteSpec);
		if( note.key == key &&
				Mathf.Abs(endMt-(note.measureTime+note.duration)) < 1e-4 )
		{
			note.duration /= 2.0;
		}
	}
}

//----------------------------------------
//  Same as above, except it does it for all keys..
//----------------------------------------
function HalvePreviousSustains( notes:Array, endMt:float )
{
	for( var i = 0; i < notes.length; i++ )
	{
		var note = (notes[i] as NoteSpec);
		if( Mathf.Abs(endMt-(note.measureTime+note.duration)) < 1e-4 )
		{
			note.duration /= 2.0;
		}
	}
}

function CreateBeat(gs:GameState) : Array
{
	//Debug.Log('create beat called, using AI phase # '+currPhase);

	var beat = new Array();
	var numKeys = gs.GetSongPlayer().GetNumSamples();

	var mt = 0.0;
	var prevSustained = false;
	var prevSpacing:float;
	var prevKeyUsed:boolean[] = [ false, false, false ];

	while( mt <= gs.GetSecsPerMeasure()+1e-4 )
	{
		var prevNote:NoteSpec = null;
		if( beat.length > 0 ) prevNote = beat[ beat.length-1 ];

		var note = new NoteSpec();

		var keyUsed:boolean[] = [ false, false, false ];
		note.measureTime = mt;

		//----------------------------------------
		//  Choose pitch (key is kind of misnomer)
		//----------------------------------------
		if( prevNote == null ) {
			note.key = Random.Range( 0, numKeys );
		}
		else if( Random.value <= GetPhase().dexterity || prevSustained )
		{
			// if previous note was sustained, do not stay on it - very awkward
			// switch pitch
			note.key = RandomUnusedKey( prevKeyUsed );
		}
		else
		{
			// use previous note's key
			note.key = prevNote.key;
		}
		keyUsed[note.key] = true;

		//----------------------------------------
		//  Rhythm
		//----------------------------------------
		var sustained = false;

		if( prevNote != null && Random.value > GetPhase().rhythm )
		{
			// no creativity this note, use the previous note's duration and spacing
			note.duration = prevNote.duration;
			mt += prevSpacing;
			sustained = prevSustained;
		}
		else
		{
			if( Random.value < GetPhase().sustain )
			{
				// sustain it
				note.duration = GetPhase().RandomMusicalLength( gs.GetSecsPerMeasure() );
				sustained = true;

				// make the next note come right after the sustained time
				mt += note.duration;
			}
			else
			{
				sustained = false;
				// non-sustained note
				// make it last a little bit, to simulate what the player's inputs are like
				note.duration = 0;

				// next note comes after some random time
				mt += GetPhase().RandomMusicalLength( gs.GetSecsPerMeasure() );
			}
			prevSpacing = mt - note.measureTime;
		}

		beat.Push( note );

		//----------------------------------------
		//  Chords
		//	Add another note?
		//----------------------------------------
		if( Random.value <= GetPhase().chords )
		{
			var second = new NoteSpec();
			second.measureTime = note.measureTime;
			second.key = RandomUnusedKey( keyUsed );
			second.duration = note.duration;
			beat.Push( second );
			keyUsed[ second.key ] = true;
		}

		//----------------------------------------
		//  Handle "note collisions"
		//	If we have any notes in common and the previous note was sustained,
		//	cut-short all previous notes.
		//----------------------------------------
		if( prevSustained ) {
			for( var key = 0; key < numKeys; key++ ) {
				if( keyUsed[key] && prevKeyUsed[key] ) {
					HalvePreviousSustains( beat, note.measureTime );
					break;
				}
			}
		}

		// update vars
		prevSustained = sustained;
		prevKeyUsed = keyUsed;
	}


	return beat;
}

function Time2Quant( mt:float, secsPerMeas:float ) : int
{
	return Mathf.RoundToInt( (mt/secsPerMeas) * GetPhase().numQuants );
}

function AddChordToNoteSpecs( chord:Chord, notespecs:Array ) 
{
	for( var key = 0; key < chord.key2down.length; key++ )
	{
		if( chord.key2down[key] )
		{
			var spec = new NoteSpec();
			spec.measureTime = chord.key2mt[key];
			spec.key = key;
			spec.duration = chord.duration;
			notespecs.Push( spec );
		}
	}
}

function Beat2Chords( gs:GameState, beat:Array ) : Array
{
	var numKeys = gs.GetSongPlayer().GetNumSamples();
	var chords = new Array();

	var prevNote : Note = null;

	for( var i = 0; i < beat.length; i++ )
	{
		var note = (beat[i] as Note);

		if( prevNote != null )
		{
			var p = Time2Quant( prevNote.measureTime, gs.GetSecsPerMeasure() );
			var q = Time2Quant( note.measureTime, gs.GetSecsPerMeasure() );
			var space = q-p;

			if( space == 0 )
			{
				// use previous chord
				var chord = (chords[ chords.length-1 ] as Chord);
				chord.AddNote( note );
			}
			else
			{
				// new chord
				chord = new Chord(numKeys);
				chord.measureTime = note.measureTime;
				chord.AddNote( note );
				chords.Push( chord );
			}
		}
		else
		{
			chord = new Chord(numKeys);
			chord.measureTime = note.measureTime;
			chord.AddNote( note );
			chords.Push( chord );
		}

		prevNote = note;
	}

	return chords;
}

//----------------------------------------
//  Creates a beat that is the AI's attempt at repeating the given beat
//	Simulates messing up basically.
//----------------------------------------
function RepeatBeat( gs:GameState  ) : Array
{
	var numKeys = gs.GetSongPlayer().GetNumSamples();

	var notespecs = new Array();
	var chords = Beat2Chords( gs, gs.GetBeatNotes() );
	var prevChord : Chord = null;

	var debugSpacings = "";

	for( var i = 0; i < chords.length; i++ )
	{
		var chord = (chords[i] as Chord);

		// first, see if we fail cuz it's a chord
		if( Random.value > repStats.chordSize[ chord.GetSize() ]  )
		{
			Debug.Log('chord too complex');
		}
		else if( prevChord != null )
		{
			var p = Time2Quant( prevChord.measureTime, gs.GetSecsPerMeasure() );
			var q = Time2Quant( chord.measureTime, gs.GetSecsPerMeasure() );
			var space = q-p;

			debugSpacings = debugSpacings + ', '+space;

			if( space >= repStats.spacings.length
					|| Random.value < repStats.spacings[space] )
			{
				// Slow enough for us to get
				AddChordToNoteSpecs( chord, notespecs );
			}
			else
			{
				Debug.Log('TOO FAST!');
				// too fast for us!
				// pretend we messed up 
				// or we just didn't hit anything
			}
		}
		else
		{
			// always get the first note
			AddChordToNoteSpecs( chord, notespecs );
		}

		prevChord = chord;
	}

	Debug.Log('spacings = '+debugSpacings);

	return notespecs;
}
