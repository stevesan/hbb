
// TODO - need to clean up "BeatPlayback" stuff - should be its own sub-statemachine, instead of all these "successTriggered" and "messedup" booleans
enum RCState {
	MENU,
	START,
	ATTACK,
	POST_ATTACK,
	DEFEND,
	POST_DEFEND,
	REPEAT,
	POST_REPEAT,
	VICTORY }

private var maxLosses = 5;
private var aiPlayer = 0;

private var debugInputtingPlayer : int;

var songs : SongsManager = null;
var activeSong : int = 0;
var optionEchoBeat = false;
var horseAI : HorseAI = null;
var useAI = false;
var aiInputs : Array = null;
var debugTestAI = false;
var survivalMode = false;
var survivalScore:int;
var perNoteScore = false;
var debugKeysDown = false;

var timeTolSecs : float = 0.15; // never put this above 0.3..since 190BPM is our fastest song, and that would make it not distinguish between 16th notes
var cameraShake : Shake = null;
var menuText : TextMesh;
var tuteText : TextMesh;

var notePrefab : Note;
var tracks : Figure8[];

var keyScaleTime : float = 0.1;
private var keyScaleTimer : float[,] = new float[2, 3];

var keys : Transform[];

var eventListeners : GameObject[];

//----------------------------------------
// Misc music
//----------------------------------------
var creditsMusic : AudioSource = null;
var titleMusic : AudioSource = null;
var songSelectMusic : AudioSource = null;
var victoryMusic : AudioSource = null;

var audioTest : AudioClip = null;

//----------------------------------------
var p1loseCard : Renderer = null;
var p2loseCard : Renderer = null;

static var inst : GameState = null;

var state : RCState = RCState.MENU;

var measureText : TextMesh = null;

//----------------------------------------
//  Time/music book keeping
//----------------------------------------
private var measureStartTime = 0.0;
private var musicStartTime = 0.0;
private var measure = 0;
private var beatsPassed : int = 0;
private var prevMeasureTime = 0.0;

//----------------------------------------
//  Per-round state
//----------------------------------------
var defendMessedUp = false;
var repeatMessedUp = false;

//----------------------------------------
//  Per-test state
//----------------------------------------
var successTriggered = false;
private var messedUpTriggered : boolean = false;

private var beatNotes = new Array();
private var responseNotes = new Array();

var playerLosses : int[] = new int[2];

// this is always set upon entering ATTACK
private var attacker : int = 0;

function GetMaxLosses() : int { return maxLosses; }

function GetMeasureTime() { return Time.time-measureStartTime; }

//----------------------------------------
//----------------------------------------
function GetEffectiveMeasureTime()
{
	if( IsInPostTolerance() && (
		state == RCState.POST_ATTACK ||
		state == RCState.POST_DEFEND ||
		state == RCState.POST_REPEAT ))
		return GetSecsPerMeasure();
	else if( IsInPreTolerance() && (
		state == RCState.POST_REPEAT ||
		state == RCState.POST_ATTACK ||
		state == RCState.POST_DEFEND ))
		return 0.0;
	else
		return GetMeasureTime();
}

// Returns true if we're just starting a measure, and we have not passed time
// exceeding the tolerance. Ie. if the previous measure was a input-accepting measure,
// this is its "post measure tolerance" period

function IsInPostTolerance() { return GetMeasureTime() <= timeTolSecs; }
function IsInPreTolerance() { return (GetSecsPerMeasure()-GetMeasureTime()) <= timeTolSecs; }
function JustEnteredPreTol()
{
	var rv = (GetSecsPerMeasure()-GetMeasureTime()+Time.deltaTime) > timeTolSecs
		&& IsInPreTolerance();
	return rv;
}

function JustExitedPostTol()
{
	return (prevMeasureTime <= timeTolSecs)
		&& !IsInPostTolerance();
}

function GetBeatsPassed() : int { return beatsPassed; }

function GetAttacker() : int { return attacker; }
function GetDefender() : int { return 1-attacker; }

function PlayRandomSample()
{
	var isong : int = Random.Range( 0, songs.players.Count );
	var ikey : int = Random.Range( 0, songs.players[isong].GetNumSamples() );

	songs.players[isong].OnKeyDown( ikey );
	// but immediately let up - don't hold it
	songs.players[isong].OnKeyUp( ikey );
}

function GetSongPlayer() : SongPlayer
{
	return songs.players[ activeSong ];
}

function RestartSelectedSong()
{
	GetSongPlayer().Restart();
}

function EndTesting()
{
	for( var note:Note in GetBeatNotes() )
	{
		if( !note.downHit )
		{
			// past tolerance - messed up!
			note.type = NoteType.Miss;
			note.OnMiss();
			OnMessedUp();
		}
	}
}

function ResetTesting()
{
	var beat = GetBeatNotes();
  var notesToRemove = new Array();
  var i;
	for(i = 0; i < beat.length; i++ )
	{
		beat[i].downHit = false;
		beat[i].upHit = false;
		beat[i].type = NoteType.Normal;

		// assert( !beat[i].isError )
	}

	Utils.DestroyObjsViaComponent( responseNotes );
	responseNotes.Clear();

	messedUpTriggered = false;
	successTriggered = false;

	// make sure we release all keys..
	for( var key = 0; key < GetSongPlayer().GetNumSamples(); key++ )
		GetSongPlayer().OnKeyUp(key);
}

//----------------------------------------
//  One round is a back-and-forth, ie. attack, defend, repeat
//----------------------------------------
function ResetRound()
{
	defendMessedUp = false;
	repeatMessedUp = false;

	// done for this round, clear the notes immediately
	Utils.DestroyObjsViaComponent(beatNotes);
	beatNotes.Clear();

}

function ResetBeatPlayback()
{
	var beat = GetBeatNotes();
	for( var inote = 0; inote < beat.length; inote++ )
	{
		beat[inote].wasPlayed = false;
	}
}

function Awake() {
	inst = GetComponent(GameState);

	p1loseCard.enabled = false;
	p2loseCard.enabled = false;
}

function GetSecsPerBeat()
{
	return  (1.0/GetSongPlayer().bpm) * 60.0;
}

function GetSecsPerMeasure()
{
	return GetSongPlayer().bpMeas / (GetSongPlayer().bpm / 60.0);
}

function GetBeatsPerMeasure()
{
	return GetSongPlayer().bpMeas;
}

//----------------------------------------
//  Finds the note with the given key with the greatest measure time
//----------------------------------------
function FindLatestNote( beat:Array, key:int ) : int
{
	var latestId:int = -1;

	for( var i = 0; i < beat.length; i++ )
	{
		if( beat[i].key == key )
		{
			if( latestId == -1 || beat[i].measureTime > beat[latestId].measureTime )
			{
				latestId = i;
			}
		}
	}

	return latestId;
}

//----------------------------------------
//  For the given note info, find the note in the beat that matches it
//----------------------------------------
function FindUppedNote( beat : Array,
		measureTime : float,
		endMeasureTime:float,
		key : int,
		tol : float ) : int
{
	for( var i = 0; i < beat.length; i++ )
	{
		var note = beat[i];
		if( note.key == key 
				&& Mathf.Abs( note.measureTime - measureTime ) < tol
				// OK, we will consider a note to be "hit" as long as the end time is AT LEAST the real end time
				// hell we'll even give them the tolerance!
				&& note.endMeasureTime-tol <= endMeasureTime )
			return i;
	}
	return -1;
}

function FindNote( beat : Array, measureTime : float, key : int, tol : float ) : int
{
	for( var i = 0; i < beat.length; i++ )
	{
		var note = beat[i];
		if( Mathf.Abs( note.measureTime - measureTime ) < tol
				&& note.key == key )
			return i;
	}
	return -1;
}

function UpdateMusicState( t : float )
{
	var bps : float = GetSongPlayer().bpm / 60.0;
	var beatsPassedFloat : float = (t * bps);
	
	var prevBeat = beatsPassed;
	beatsPassed = Mathf.Floor( beatsPassedFloat );
	if( prevBeat != beatsPassed )
		OnBeatChange( beatsPassed );

	var prevMeasure = measure;
	measure = Mathf.Floor( beatsPassedFloat / GetSongPlayer().bpMeas );

	var justEnteredMeasure = ( measure != prevMeasure  );

	if( justEnteredMeasure )
	{
		// compute the exact time the measure changed, which isn't necessarily right now
		measureStartTime = musicStartTime + GetSecsPerMeasure()*measure;
	}

	return justEnteredMeasure;
}

//----------------------------------------
//  This is a bit confusing - this "beat" refers to the time count, ie. it fires periodically 4 times per measure (or whatever the meter is)
//----------------------------------------
function OnBeatChange( beatsPassed : int )
{
	measureText.text = ''+ (8 - beatsPassed%8).ToString();

	for( var obj in eventListeners )
	{
		if( obj != null )
			obj.SendMessage( "OnBeatChange", SendMessageOptions.DontRequireReceiver );
	}
}

function OnGameOverCommon()
{
	GetSongPlayer().Stop();
}

function UpdateBeatPlayback( mt : float )
{
	var beat = GetBeatNotes();
	for( var inote = 0; inote < beat.length; inote++ )
	{
		if( !beat[inote].wasPlayed && beat[inote].measureTime < mt )
		{
			var key = beat[inote].key;
			GetSongPlayer().OnKeyDown(key);
			beat[inote].wasPlayed = true;
		}
	}
}

private var player2keyInputNames = [
	['Sample0', 'Sample1', 'Sample2'],
	['Sample0B', 'Sample1B', 'Sample2B'] ];


//----------------------------------------
//  This returns the player whose input should currently be used
//----------------------------------------
function GetInputtingPlayer()
{
	if( state == RCState.ATTACK || state == RCState.REPEAT )
		return attacker;
	else if( state == RCState.POST_ATTACK )
	{
		if( IsInPostTolerance() || JustExitedPostTol() )
			return attacker;
		else
			return 1-attacker;
	}
	else if( state == RCState.DEFEND )
		return 1-attacker;
	else if( state == RCState.POST_DEFEND )
	{
		if( IsInPostTolerance() || JustExitedPostTol() )
			return 1-attacker;
		else
			return attacker;
	}
	else if( state == RCState.POST_REPEAT )
	{
		// Are we about to start attack phase for the other player?
    if( IsInPostTolerance() || JustExitedPostTol() )
      return attacker;
    else
			return 1-attacker;
	}
}

function GetNonInputtingPlayer()
{
	return 1-GetInputtingPlayer();
}

function GetAI() : HorseAI { return horseAI; }

function IsAiInputting()
{
	return( useAI && horseAI != null && GetInputtingPlayer() == aiPlayer );
}

//----------------------------------------
//  See what keys the active player has down
//----------------------------------------
function GetKeysDown(mt:float) : Array
{
	var keys = new Array();

	debugInputtingPlayer = GetInputtingPlayer();

	if( IsAiInputting() )
	{
		if( aiInputs != null )
		{
		// use the AI's current beat
		for( var i = 0; i < aiInputs.length; i++ )
		{
			// did we just pass this note?
			if( Utils.IsBetween( aiInputs[i].measureTime, mt-Time.deltaTime, mt ) )
			{
				// register a down
				keys.Push( aiInputs[i].key );
				// play animation
				// TODO - would be nice to put this elsewhere
				keyScaleTimer[ GetInputtingPlayer(), aiInputs[i].key ] = keyScaleTime;
			}
		}
		}
	}
	else
	{
		var inNames = player2keyInputNames[ GetInputtingPlayer() ];
		for( var key = 0; key < inNames.length; key++ )
		{
			if( Input.GetButtonDown( inNames[key] ) )
			{
				keys.Push( key );

				// play animation
				// TODO - would be nice to put this elsewhere
				keyScaleTimer[ GetInputtingPlayer(), key ] = keyScaleTime;
			}
		}
	}

	return keys;
}

function GetKeysUp(mt:float) : Array
{
	var keys = new Array();

	debugInputtingPlayer = GetInputtingPlayer();

			// or did we just release?
	if( IsAiInputting() )
	{
		if( aiInputs != null )
		{
			// use the AI's current beat
			for( var i = 0; i < aiInputs.length; i++ )
			{
				// did we just release this note?
				if( Utils.IsBetween( aiInputs[i].measureTime+aiInputs[i].duration,
							mt-Time.deltaTime, mt ) )
				{
					keys.Push( aiInputs[i].key );
				}
			}
		}
	}
	else
	{
		var inNames = player2keyInputNames[ GetInputtingPlayer() ];
		for( var key = 0; key < inNames.length; key++ )
		{
			if( Input.GetButtonUp( inNames[key] ) )
			{
				keys.Push( key );
			}
		}
	}

	return keys;
}


function GetBeatNotes() : Array
{
	return beatNotes;
}

function OnMessedUp()
{
	if( !messedUpTriggered )
	{
		messedUpTriggered = true;

		if( GetInputtingPlayer() == GetAttacker() )
		{
			//----------------------------------------
			//  Attacker messed up on repeat phase - immediately update scores
			//----------------------------------------
			repeatMessedUp = true;
			if( !debugTestAI )
			{
				if( !defendMessedUp )
					playerLosses[ GetInputtingPlayer() ]++;
				else
					// punish the aggressor for being a total jerk
					playerLosses[ GetInputtingPlayer() ]++;
			}
			else
				// prevent index issues
				playerLosses[ GetInputtingPlayer() ] = 1;
		}
		else if( GetInputtingPlayer() == GetDefender() )
		{
			defendMessedUp = true;

			if(survivalMode)
				playerLosses[ GetInputtingPlayer() ]++;
		}

		// update score..

		for( var obj in eventListeners )
		{
			if( obj != null )
				obj.SendMessage( "OnMessedUp", SendMessageOptions.DontRequireReceiver );
		}
	}
}

function OnSuccess()
{
	if( GetInputtingPlayer()==GetAttacker() && defendMessedUp )
	{
		// attacker successfully repeated and defender messed up
		// defender gets a piece
		if( !debugTestAI )
			playerLosses[ GetNonInputtingPlayer() ]++;
		else
			// prevent indexing issues
			playerLosses[ GetNonInputtingPlayer() ] = 1;
	}

	if( survivalMode && GetInputtingPlayer()==1 && !perNoteScore ) {
		survivalScore++;
		horseAI.SendMessage( "OnScoreChange", survivalScore, SendMessageOptions.DontRequireReceiver );
	}

	for( var obj in eventListeners )
	{
		if( obj != null )
			obj.SendMessage( "OnSuccess", GetInputtingPlayer(), SendMessageOptions.DontRequireReceiver );
	}
}

//----------------------------------------
//  mt is the measure time that should be assigned to created notes.
//	inputMt is used for playing back player inputs, or polling AI inputs
//	These are usually the same, except for the case when we want to fudge the note MTs (ie. for pre/post tolerance cases)
//----------------------------------------
function UpdateTesting( mt : float, inputMt:float )
{
	// do nothing if player has already hit the notes. Don't let them screw themselves up.
	if( successTriggered ) return;

	//----------------------------------------
	//  Did we hit any of the notes?
	//----------------------------------------
	for( var key in GetKeysDown(inputMt) )
	{
		// play it no matter waht..
		GetSongPlayer().OnKeyDown(key);
		// SHAKE
		cameraShake.DoShake();

		// hit an existing note?
		var noteType = NoteType.Hit;
		var noteMt = mt;

		var hitNote = FindNote( GetBeatNotes(), mt, key, timeTolSecs );
		if( hitNote != -1 && GetBeatNotes()[hitNote].downHit == false )
		{
			// yes! register the hit
			noteType = NoteType.Hit;
			noteMt = GetBeatNotes()[hitNote].measureTime;
			GetBeatNotes()[hitNote].downHit = true;
		}
		else
		{
			// Didn't find any within range - messed up!
			noteType = NoteType.Miss;
			OnMessedUp();
		}

		// create the note
		var noteObj:GameObject = Instantiate( notePrefab.gameObject, Vector3(0,0,0), notePrefab.transform.rotation );
		noteObj.GetComponent(Note).zPos -= 0.1;
		noteObj.GetComponent(Note).OnDown(
				noteMt, key, false, tracks[key] );
		responseNotes.Push( noteObj.GetComponent(Note) );
		// offset the Z so the response notes show up above the beat notes

		if( noteType == NoteType.Hit )
			noteObj.GetComponent(Note).OnHit();
		else
			noteObj.GetComponent(Note).OnMiss();
	}

	for( key in GetKeysUp(inputMt) )
	{
		GetSongPlayer().OnKeyUp(key);

		var noteId = FindLatestNote( responseNotes, key );
		if( noteId != -1 )
		{
			var note:Note = responseNotes[noteId];
			note.OnUp( mt );

			hitNote = FindUppedNote( beatNotes,
					note.measureTime, note.endMeasureTime,
					key, timeTolSecs );
			
			if( hitNote == -1 )
			{
				note.type = NoteType.Miss;
				note.OnMiss();
				OnMessedUp();
			}
			else
			{
				// was the target note already hit?
				if( !beatNotes[hitNote].upHit )
				{
					// the note wasn't already hit (ie. by the auto-up logic below), so we got it
					// got the note fully. yay
					GetBeatNotes()[hitNote].upHit = true;
					if( survivalMode && perNoteScore )
					{
						survivalScore++;
						horseAI.SendMessage( "OnScoreChange", survivalScore, SendMessageOptions.DontRequireReceiver );
					}
				}

				// always use the actual note end time..
				note.endMeasureTime = beatNotes[hitNote].endMeasureTime;
			}
		}
		else
		{
			// probably player just held down a key when they weren't active.Just ignore.
		}
	}

	// Did we miss any notes and the tolerance has passed?
	var notesRemain = false;
	for( var i = 0; i < beatNotes.length; i++ )
	{
		note = beatNotes[i];

		if( !note.downHit )
		{
			// wasn't hit - opportunity past?
			if( (note.measureTime+timeTolSecs) < mt )
			{
				// yep..didn't get it
				if( note.type != NoteType.Miss )
				{
					// freshly missed one
					note.OnMiss();
					OnMessedUp();
				}
			}
			else
				// not hit, but still has chance
				notesRemain = true;
		}
		else
		{
			// the down was hit, but what about the up?

			if( !note.upHit )
			{
				// a bit complex here: If the end time is up, we want to just count this as a hit anyway.
				// Note that we use the real time here...so during the post tolerance, we will register the hit
				if( (note.endMeasureTime+timeTolSecs) < inputMt )
				{
					// end time has passed
					if( note.type != NoteType.Miss )
					{
						// OK just pretend the player released it at the right time
						note.upHit = true;
						if( survivalMode && perNoteScore )
						{
							survivalScore++;
							horseAI.SendMessage( "OnScoreChange", survivalScore, SendMessageOptions.DontRequireReceiver );
						}

						// also, stop playing the sample
						GetSongPlayer().OnKeyUp( note.key );

						// find the response note for this key, and just pretend it's up
						var testNoteId = FindLatestNote( responseNotes, note.key );

						if( testNoteId != -1 )
						{
							var testNote:Note = responseNotes[testNoteId];
							testNote.OnUp(mt);

							// force the end measure time to be perfect
							testNote.endMeasureTime = note.endMeasureTime;
						}
					}
				}
				else
					// not hit, but still has chance
					notesRemain = true;
			}
		}
	}

	// see if we should fire the OnSuccess event
	if( beatNotes.length > 0 )
	{
		if( !successTriggered && !notesRemain && !messedUpTriggered )
		{
			successTriggered = true;
			OnSuccess();
		}
	}
}


function UpdateRecording( mt : float, inputMt:float )
{
	for( var key in GetKeysDown(inputMt) )
	{
		var noteObj:GameObject = Instantiate( notePrefab.gameObject, Vector3(0,0,0), notePrefab.transform.rotation );
		noteObj.GetComponent(Note).OnDown( mt, key, false, tracks[key] );
		beatNotes.Push( noteObj.GetComponent(Note) );
		GetSongPlayer().OnKeyDown(key);
		cameraShake.DoShake();
	}

	for( key in GetKeysUp(inputMt) )
	{
		GetSongPlayer().OnKeyUp(key);
		
		var noteId = FindLatestNote( beatNotes, key );
		if( noteId != -1 )
		{
			var note:Note = beatNotes[noteId];
			// register the key-up. But, if the hold-time is within tolerance, pretend it was instantly let up
			if( mt - note.measureTime <= timeTolSecs )
				beatNotes[noteId].OnUp( note.measureTime );
			else
				beatNotes[noteId].OnUp( mt );
		}
		else
		{
			// probably player just held down a key when they weren't active.Just ignore.
		}
	}
}

function EndRecording()
{
	// make all the notes "go up"
	for( var note:Note in beatNotes )
	{
		if( note.state == NoteState.Downed )
		{
			GetSongPlayer().OnKeyUp( note.key );
			note.OnUp( GetSecsPerMeasure() );
		}
	}
}

function UpdateKeyPopping() {
	for( var p = 0; p < 2; p++ )
	{
		for( var key = 0; key < 3; key++ )
		{
			keyScaleTimer[p,key] -= Time.deltaTime;
			if (keyScaleTimer[p,key] > 0.0) {
				var alpha = keyScaleTimer[p,key] / keyScaleTime;
				var s = (1-alpha)*4.0 + alpha*1.0;
				keys[p*3+key].transform.localScale = Vector3(s, s, s);
			} else {
				keys[p*3+key].transform.localScale = Vector3(1.0, 1.0, 1.0);
			}
		}
	}
}


enum MenuState { MAIN, CREDITS, MODE, SONGS, TUTE }
var menuState : MenuState = MenuState.MAIN;

function UpdateMenuMode()
{
	tuteText.text = '';

	if( menuState == MenuState.MAIN )
	{
		if( !titleMusic.isPlaying ) titleMusic.Play();

		menuText.text = 'B E A T    J U I C E    R A D I O\n\n'
			+ 'SPACE BAR :: start game \n'
			+ 'J :: credits \n'
			+ 'ESCAPE :: quit \n';
		// handle player input
		if( Input.GetButtonDown('menuback') )
		{
			PlayRandomSample();
			return 'quit';
		}
		else if( Input.GetButtonDown('Start') )
		{
			menuState = MenuState.MODE;
			PlayRandomSample();
			titleMusic.Stop();
		}
		else if( Input.GetButtonDown('Sample0B') )
		{
			PlayRandomSample();
			menuState = MenuState.CREDITS;
			titleMusic.Stop();
		}
	}
	else if( menuState == MenuState.CREDITS )
	{
		if( !creditsMusic.isPlaying ) creditsMusic.Play();

		menuText.text = ''
			+ 'ART :: Zak Ayles \n'
			+ 'DESIGN :: Joshua Raab \n'
			+ 'AUDIO :: Mark Anderson \n'
			+ 'CODE/DESIGN :: Steven An \n\n'
			+ 'Originally made for the 2012 Global Game Jam (NYU)\n'
      + 'Original Additional Visual Design: Joffre Molina \n'
      + 'Original Additional Code: Robert Dionne \n\n'
			+ 'ESCAPE :: back';

		if( Input.GetButtonDown('menuback') )
		{
			PlayRandomSample();
			menuState = MenuState.MAIN;
			creditsMusic.Stop();
		}
	}
  else if( menuState == MenuState.MODE )
  {
		if( !songSelectMusic.isPlaying ) songSelectMusic.Play();

    menuText.text = 'SELECT MODE: \n\n';
    menuText.text += 'PRESS 1 :: Beat Bronco (1 player survival)\n';
    menuText.text += 'PRESS 2 :: Beat Battle (2 player versus)\n';
    menuText.text += '\n';
    menuText.text += 'ESC :: back';

    if( Input.GetButtonDown( 'Song1' ) )
    {
      PlayRandomSample();
      useAI = true;
      survivalMode = true;
      menuState = MenuState.SONGS;
    }
    else if( Input.GetButtonDown( 'Song2' ) )
    {
      PlayRandomSample();
      useAI = false;
      survivalMode = false;
      menuState = MenuState.SONGS;
    }

		if( Input.GetButtonDown('menuback') )
		{
			PlayRandomSample();
			songSelectMusic.Stop();
			menuState = MenuState.MAIN;
		}
  }
	else if( menuState == MenuState.SONGS )
	{
		if( !songSelectMusic.isPlaying ) songSelectMusic.Play();

		var text = 'SELECT SONG: \n\n';
		for( var s = 0; s < songs.players.Count; s++ )
		{
			text = text + 'PRESS ' +(s+1) + ' :: ' + songs.players[s].title + '\n';
		}
		text = text + '\nESCAPE :: back';
		menuText.text = text;

		// check for keys
		for( s = 0; s < songs.players.Count; s++ )
		{
			var inputCode = 'Song'+(s+1);
			if( Input.GetButtonDown( inputCode ) )
			{
				PlayRandomSample();
				activeSong = s;
				songSelectMusic.Stop();
				menuState = MenuState.TUTE;
				break;
			}
		}

		if( Input.GetButtonDown('menuback') )
		{
			PlayRandomSample();
			menuState = MenuState.MODE;
		}
	}
	else if( menuState == MenuState.TUTE )
	{
		menuText.text = '';

/*
		tuteText.text = 'Morgan Freeman says:\n'
			+ '- When green lasers go over your keys, make up a beat! \n'
			+ '- For yellow lasers, play the incoming notes! \n'
			+ '- If you mess up your own beat, you get a piece of horse \n'
			+ '- If the other player messes it up but you get it, they get a piece \n'
			+ '- First one to full horse LOSES \n\n'
			+ 'SPACE BAR TO CONTINUE';
			*/

			/*
		tuteText.text = 'Morgan Freeman says:\n'
			+ '- P1 (left), make up a beat for P2 (right)!\n'
+ '- P2, try to play it! If you succeed, P1 makes up another one.\n'
+ '- If you fail, then P1 has to play it...\n'
+ '- If P1 succeeds, P2 gets a piece of horse (bad!).\n'
+ '- Otherwise, P1 gets a piece.\n'
+ '- SWITCH AND REPEAT\n\n'
			+ 'SPACE BAR TO CONTINUE';
			*/

		tuteText.text = 'Morgan Freeman says...\n\n'
+ 'When it\'s your turn, play a difficult beat for your opponent to repeat.\n'
+ 'But not too difficult - you have to repeat the beat, too!\n'
+ '\n'
+ 'SPACE BAR TO CONTINUE';

		if( Input.GetButtonDown('Start') )
		{
			// make sure we return to the songs menu
			menuState = MenuState.SONGS;
			return 'start';
		}
	}
}

function OnEnterMeasure()
{
	if( state == RCState.ATTACK )
		state = RCState.POST_ATTACK;
	else if( state == RCState.POST_ATTACK )
		state = RCState.DEFEND;
	else if( state == RCState.DEFEND )
		state = RCState.POST_DEFEND;
	else if( state == RCState.POST_DEFEND )
	{
		if( survivalMode )
			state = RCState.ATTACK;
		else
			state = RCState.REPEAT;
	}
	else if( state == RCState.REPEAT )
		state = RCState.POST_REPEAT;
	else if( state == RCState.POST_REPEAT )
		state = RCState.ATTACK;
}

function StartGameRitual1()
{
  state = RCState.START;

  // reset game state, so nothing shows
  ResetRound();

  // reset scores now so the displays don't show anything
  if( survivalMode )
  {
    playerLosses[0] = 0;
    // instant death!
    playerLosses[1] = 4;
		survivalScore = 0;
  }
	else
	{
		for( var p = 0; p < playerLosses.length; p++ )
			playerLosses[p] = 0;
	}

	if( horseAI != null )
		horseAI.Reset( GetSongPlayer().broncoAI );

	for( var obj in eventListeners )
	{
		if( obj != null )
			obj.SendMessage( "OnBattleReset", SendMessageOptions.DontRequireReceiver );
	}
}

function StartGameRitual2()
{
  // go to the post-prove state so we have one free measure before improv
  state = RCState.POST_REPEAT;
  attacker = 1;	// this will get flipped, so we start with player 0 attacking
  measure = 0;
  measureStartTime = Time.time;
  beatsPassed = 0;
  RestartSelectedSong();
  if( horseAI != null && survivalMode )
    GetSongPlayer().SetLastLayer( horseAI.GetCurrentLevel() );
  else
    GetSongPlayer().UseAllLayers();
  musicStartTime = Time.time;

}

function Update()
{
  UpdateKeyPopping();

	var musicTime : float = Time.time - musicStartTime;

	var justEnteredMeasure = false;

	if( state != RCState.START
		&& state != RCState.MENU
		&& state != RCState.VICTORY )
	{
		// common stuff to all ingame states
		justEnteredMeasure = UpdateMusicState(musicTime);

		if( justEnteredMeasure )
		{
			OnEnterMeasure();

			// update layers - no need to wait til next "cycle"
			if( horseAI != null && survivalMode )
				GetSongPlayer().SetLastLayer( horseAI.GetCurrentLevel() );

			var loopback = (measure%GetSongPlayer().numMeasures == 0 );
			if( loopback )
			{
				RestartSelectedSong();
				// and update how many layers we want
				if( horseAI != null && survivalMode )
					GetSongPlayer().SetLastLayer( horseAI.GetCurrentLevel() );
				else
					GetSongPlayer().UseAllLayers();
			}
		}
	}

	var mt = GetMeasureTime();
	
	if( state == RCState.MENU )
	{
		var result = UpdateMenuMode();
		if( result == 'quit' )
			Application.Quit();
		else if( result == 'start' )
		{
      cameraShake.MoveToStartScreen();
      StartGameRitual1();
		}
	}
	else if( state == RCState.START )
	{
		if( Input.GetButtonDown('Start') )
		{
      StartGameRitual2();
		}
	}
	else if( state == RCState.ATTACK )
	{
		if( justEnteredMeasure )
		{
			if( survivalMode )
				attacker = 0;
			else
				// switch attackers upon entering
				attacker = 1-attacker;
		}

		UpdateRecording(mt, mt);
	}
	else if( state == RCState.POST_ATTACK )
	{
		if( optionEchoBeat )
		{
			if( justEnteredMeasure )
				ResetBeatPlayback();

			UpdateBeatPlayback(mt);
		}

		if( IsInPostTolerance() )
			// if they add any notes, assume they're on the last beat
			UpdateRecording( GetSecsPerMeasure(), GetSecsPerMeasure()+mt );
		else if( JustExitedPostTol() )
		{
			// do one more..
			UpdateRecording( GetSecsPerMeasure(), GetSecsPerMeasure()+mt );
			EndRecording();
			// make the notes all blue immediately
			ResetTesting();
		}
		if( JustEnteredPreTol() )
		{
			// AI defending?
			if( IsAiInputting() )
				aiInputs = horseAI.RepeatBeat(this);
		}
		if( IsInPreTolerance() )
			// no need to pass in the "real" mt for the input - AIs will never do that
			UpdateTesting( 0.0, 0.0 );
	}
	else if( state == RCState.DEFEND )
	{
		UpdateTesting( mt, mt );

	}
	else if( state == RCState.POST_DEFEND )
	{
		if( optionEchoBeat )
		{
			if( justEnteredMeasure )
				ResetBeatPlayback();
			UpdateBeatPlayback(mt);
		}

		if( IsInPostTolerance() )
			UpdateTesting( GetSecsPerMeasure(), GetSecsPerMeasure() + mt );
		else if( JustExitedPostTol() ) {
			// do one final update, to register success/fail
			UpdateTesting( GetSecsPerMeasure(), GetSecsPerMeasure() + mt );
			// Reset for next phase
			EndTesting();
			ResetTesting();

			if( survivalMode )
			{
				// reset round
				ResetRound();

				// check for victory
				if( playerLosses[0] == maxLosses || playerLosses[1] == maxLosses )
				{
					// victory!
					state = RCState.VICTORY;
					GetSongPlayer().Stop();
				}
			}
		}

		// AI repeating?
		if( JustEnteredPreTol() && IsAiInputting() )
		{
			if( survivalMode )
			{
				aiInputs = horseAI.CreateBeat( this );
				if( debugKeysDown )
				{
					var s = '';
					for( var j = 0; j < aiInputs.length; j++ )
					{
						s += '| '+aiInputs[j].key + ','+aiInputs[j].measureTime;
					}
					Debug.Log(s);
				}
			}
			else
				aiInputs = horseAI.RepeatBeat(this);
		}

		if( IsInPreTolerance() )
		{
			if( IsAiInputting() && survivalMode )
				UpdateRecording( 0.0, 0.0 );
			else
				UpdateTesting( 0.0, 0.0 );
		}
	}
	else if( state == RCState.REPEAT )
	{
		UpdateTesting(mt, mt);
	}
	else if( state == RCState.POST_REPEAT )
	{
		if( IsInPostTolerance() )
			UpdateTesting( GetSecsPerMeasure(), GetSecsPerMeasure() + mt );

		if( JustExitedPostTol() ) {
			// do one final update, to register success/fail
			UpdateTesting( GetSecsPerMeasure(), GetSecsPerMeasure() + mt );
			// reset round
			EndTesting();
			ResetRound();
			ResetTesting();

			// check for victory
			if( playerLosses[0] == maxLosses || playerLosses[1] == maxLosses )
			{
				// victory!
				state = RCState.VICTORY;
				GetSongPlayer().Stop();
			}

		}

		if( JustEnteredPreTol() && IsAiInputting() )
			aiInputs = horseAI.CreateBeat(this);
		if( IsInPreTolerance() )
		{
			UpdateRecording( 0.0, 0.0 );
		}
	}
	else if( state == RCState.VICTORY )
	{
		if( !victoryMusic.isPlaying ) victoryMusic.Play();

		// cards
		if( playerLosses[0] == maxLosses )
		{
			p1loseCard.enabled = true;
			p2loseCard.enabled = false;
		}
		else
		{
			p1loseCard.enabled = false;
			p2loseCard.enabled = true;
		}

		if( Input.GetButtonDown('Start') )
		{
      // Restart
			GetSongPlayer().Stop();
			PlayRandomSample();
			//cameraShake.MoveToMenu();
			musicStartTime = 0.0;
			victoryMusic.Stop();
      StartGameRitual1();
      StartGameRitual2();
    }
    // NOTE: the ESC key is already handled
	}

	if( state != RCState.VICTORY )
	{
		p1loseCard.enabled = false;
		p2loseCard.enabled = false;
	}

	// put this at the end..so the escape key doesn't get registered twice.
	if( state != RCState.MENU )
	{
		if( Input.GetButtonDown('menuback') )
		{
			state = RCState.MENU;
			GetSongPlayer().Stop();
			PlayRandomSample();
			cameraShake.MoveToMenu();
			musicStartTime = 0.0;
			victoryMusic.Stop();
		}
	}

	prevMeasureTime = GetMeasureTime();
}

function GetWinningPlayer()
{
	if( playerLosses[0] == maxLosses ) return 1;
	else return 0;
}

