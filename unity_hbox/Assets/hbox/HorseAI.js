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

class RepeatStats
{
	var spacings : float[];
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

function Time2Quant( mt:float, secsPerMeas:float ) : int
{
	return Mathf.RoundToInt( (mt/secsPerMeas) * stats.numQuants );
}

function Note2NoteSpec( note:Note ) : NoteSpec
{
	var spec = new NoteSpec();
	spec.measureTime = note.measureTime;
	spec.key = note.key;
	spec.duration = note.endMeasureTime-note.measureTime;
	return spec;
}

//----------------------------------------
//  Creates a beat that is the AI's attempt at repeating the given beat
//	Simulates messing up basically.
//----------------------------------------
function RepeatBeat( gs:GameState  ) : Array
{
	var numKeys = gs.GetSongInfo().GetNumSamples();

	var repeat = new Array();

	var prevNote : Note = null;

	Debug.Log('--');

	for( var i = 0; i < gs.GetBeatNotes().length; i++ )
	{
		var note = (gs.GetBeatNotes()[i] as Note);

		if( prevNote != null )
		{
			var p = Time2Quant( prevNote.measureTime, gs.GetSecsPerMeasure() );
			var q = Time2Quant( note.measureTime, gs.GetSecsPerMeasure() );
			var space = q-p;

			Debug.Log('space = '+space);

			if( space >= repStats.spacings.length
					|| Random.value < repStats.spacings[space] )
			{
				// Slow enough for us to get
				repeat.Push( Note2NoteSpec(note) );
			}
			else
			{
				Debug.Log('TOO FAST!');
				// too fast for us!
				// pretend we messed up 
				if( Random.value < 0.5 )
				{
					// hit the wrong note
					var wrong = Note2NoteSpec(note);
					wrong.key = RandomKeyExcluding( numKeys, note.key );
				}
				// or we just didn't hit anything
			}
		}
		else
		{
			// always get the first note
			repeat.Push( Note2NoteSpec(note) );
		}

		prevNote = note;
	}

	return repeat;
}
