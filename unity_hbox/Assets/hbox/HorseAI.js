#pragma strict

class AiStats
{
	var dexterity = 0.5;
	var rhythm = 0.5;
	var chords = 0.5;
	var sustain = 0.5;
	var numQuants = 16;
	var minSpacingQuants = 2;
	var maxSpacingQuants = 8;

	var usePdfs = true;

	var noteValuePdf:float[];

	private var noteValuePdfSampler : PdfSampler = new PdfSampler();

	function RandomMusicalLength( secsPerMeasure:float ) : float
	{
		// top out at 16th notes for now, 2^(5-1) = 4
		var noteValue:int = noteValuePdfSampler.Sample();
		var s = secsPerMeasure / Mathf.Pow( 2, noteValue );
		return s;
	}

	function Awake()
	{
		noteValuePdfSampler.Reset( noteValuePdf );
	}
}

var stats = new AiStats();

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

function Awake()
{
	stats.Awake();
}

function RandomKeyExcluding( numKeys:int, exclude:int ) : int
{
	var k = Random.Range( 0, numKeys-1 );
	if( k >= exclude )
		k++;

	return k;
}

function CreateBeat( gs:GameState ) : Array
{
	if( stats.usePdfs )
		return CreateBeatPdfs( gs );
	else
		return CreateBeatQuant( gs );
}

function CreateBeatQuant( gs:GameState ) : Array
{
	//----------------------------------------
	//  Using the algo that Josh wrote up
	//----------------------------------------
	var spm = gs.GetSecsPerMeasure();
	var spq = spm / stats.numQuants;
	var numKeys = gs.GetSongInfo().GetNumSamples();

	// initial note conditions
	var mt = Random.Range( 0, stats.maxSpacingQuants ) * spq;
	var space = Random.Range( stats.minSpacingQuants, stats.maxSpacingQuants ) * spq;

	var beat = new Array();

	while( mt <= spm )
	{
		var note = new NoteSpec();
		beat.Push( note );

		note.measureTime = mt;

		if( beat.length == 1 )
			note.key = Random.Range( 0, numKeys );
		else if( Random.value <= stats.dexterity )
		{
			// switch key
			var prevNote : NoteSpec = beat[ beat.length-2 ];
			note.key = RandomKeyExcluding( numKeys, prevNote.key );
		}
		else
		{
			// use previous note's key
			prevNote = beat[ beat.length-2 ];
			note.key = prevNote.key;
		}
		
		// make it last a little bit, to simulate what the player's inputs are like
		note.duration = gs.timeTolSecs/2;

		// chord?
		if( Random.value <= stats.chords )
		{
			var other = new NoteSpec();
			beat.Push( other );
			other.measureTime = mt;
			other.key = RandomKeyExcluding( numKeys, note.key );
			other.duration = note.duration;
		}

		// update state for next note
		mt += space;

		if( Random.value <= stats.rhythm )
			// use different spacing
			space = Random.Range( stats.minSpacingQuants, stats.maxSpacingQuants ) * spq;
			
	}

	return beat;
}

function CreateBeatPdfs(gs:GameState) : Array
{
	Debug.Log('create beat called');

	var beat = new Array();
	var numKeys = gs.GetSongInfo().GetNumSamples();

	var mt = 0.0;

	while( mt <= gs.GetSecsPerMeasure() )
	{
		var note = new NoteSpec();
		beat.Push( note );

		note.measureTime = mt;

		if( beat.length == 1 )
			note.key = Random.Range( 0, numKeys );
		else if( Random.value <= stats.dexterity )
		{
			// switch key
			var prevNote : NoteSpec = beat[ beat.length-2 ];
			note.key = RandomKeyExcluding( numKeys, prevNote.key );
		}
		else
		{
			// use previous note's key
			prevNote = beat[ beat.length-2 ];
			note.key = prevNote.key;
		}

		// make it last a little bit, to simulate what the player's inputs are like
		note.duration = gs.timeTolSecs/2;

		// chord?
		if( Random.value <= stats.chords )
		{
			var other = new NoteSpec();
			beat.Push( other );
			other.measureTime = mt;
			other.key = RandomKeyExcluding( numKeys, note.key );
			other.duration = note.duration;
		}

		mt += stats.RandomMusicalLength( gs.GetSecsPerMeasure() );
	}


	return beat;
}

//----------------------------------------
//  Creates a beat that is the AI's attempt at repeating the given beat
//	Simulates messing up basically.
//----------------------------------------
function RepeatBeat( gs:GameState  ) : Array
{
	var repeat = new Array();

	for( var i = 0; i < gs.GetBeatNotes().length; i++ )
	{
		var note = (gs.GetBeatNotes()[i] as Note);
		if( Random.value < 0.8 )
		{
			var mine = new NoteSpec();
			repeat.Push( mine );
			mine.measureTime = note.measureTime;
			mine.key = note.key;
			mine.duration = note.endMeasureTime-note.measureTime;
		}
	}

	return repeat;
}
