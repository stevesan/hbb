
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

var playerName = "Morgan Freeman";

var songs : SongsManager = null;
var activeSong : int = 0;
var optionEchoBeat = false;
var horseAI : HorseAI = null;
var useAI = false;
var aiInputs : Array = null;
var debugTestAI = false;
var survivalMode = false;
var survivalScore:int;
var survivalScoreIncreased = false;	// the player can start at any star, giving a non-zero score. This is set to true if the player actually got more points by playing.
var perNoteScore = false;
var debugKeysDown = false;
var debugClearPlayerPrefs = false;	// this only does it in the editor

var cameraShake : Shake = null;
var menuText : TextMesh;
var tuteText : TextMesh;

var notePrefabs : Note[];
var explosionsPool : ObjectPool;
var tracks : Figure8[];
var keyDownHandlers : GameObject[];

var eventListeners : GameObject[];

var mainCam : Camera;

var debugStars2score:int[] = [ 0, 25, 50, 100, 200 ];
var stars2score:int[] = [ 0, 25, 50, 100, 200 ];
var starsToUnlockNext = 2;
var numStars = 0;
var startingStars = 0;
private var prevStars = 0;
var getStarSounds : AudioSource[];

//----------------------------------------
//  Menu hooks
//----------------------------------------
var modeMenu : LayoutSpawner;
var startMenu : LayoutSpawner;
var songsMenu : SongsMenu;
var broncoMenu : BroncoSetupMenu;

//----------------------------------------
// Misc music/sounds
//----------------------------------------
var creditsMusic : AudioSource = null;
var titleMusic : AudioSource = null;
var songSelectMusic : AudioSource = null;
var victoryMusic : AudioSource = null;

var beatBattleAnno : AudioSource = null;
var beatBroncoAnno : AudioSource = null;

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

function GetSongTitle() : String {
	return songs.players[ activeSong ].title;
}

function GetNumSongs() : int { return songs.players.Count; }

function PollLayoutClicked( layout:LayoutSpawner, elemName:String )
{
	if( Input.GetButtonDown( 'menuClick' ) )
	{
		var pos = Utils.GetMouseXYWorldPos( mainCam );
		Debug.Log('click at '+pos );
		return layout.IsElementClicked( elemName, pos );
	}
}

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

function GetTolSecs() : float
{
	return GetSongPlayer().timeTolSecs;
}

function IsInPostTolerance() { return GetMeasureTime() <= GetTolSecs(); }
function IsInPreTolerance() { return (GetSecsPerMeasure()-GetMeasureTime()) <= GetTolSecs(); }
function JustEnteredPreTol()
{
	var rv = (GetSecsPerMeasure()-GetMeasureTime()+Time.deltaTime) > GetTolSecs()
		&& IsInPreTolerance();
	return rv;
}

function JustExitedPostTol()
{
	return (prevMeasureTime <= GetTolSecs())
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
			Debug.Log('MISTAKE: note passed, not hit, very end');
			OnMistake();
		}
	}

	for( var key = 0; key < GetSongPlayer().GetNumSamples(); key++ ) {
		key2downNote[key] = null;
	}
}

function HideNotes(notes:Array) {
	for( note in notes ) {
		note.Hide();
	}
}

function ResetTesting()
{
	// reset note state
	var beat = GetBeatNotes();
  var i;
	for(i = 0; i < beat.length; i++ )
	{
		beat[i].downHit = false;
		beat[i].upHit = false;
		beat[i].type = NoteType.Normal;
	}

	// clear response notes
	if( responseNotes.length > 0 ) {
		Utils.DestroyObjsViaComponent( responseNotes );
		responseNotes.Clear();
	}

	messedUpTriggered = false;
	successTriggered = false;

	// make sure we release all keys..
	for( var key = 0; key < GetSongPlayer().GetNumSamples(); key++ ) {
		GetSongPlayer().OnKeyUp(key);
		key2downNote[key] = null;
	}
}

//----------------------------------------
//  One round is a back-and-forth, ie. attack, defend, repeat
//	Should be idempotent
//----------------------------------------
function ResetRound()
{
	defendMessedUp = false;
	repeatMessedUp = false;

	// done for this round, clear the notes immediately
	if( beatNotes.length > 0 ) {
		Utils.DestroyObjsViaComponent(beatNotes);
		beatNotes.Clear();
	}
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

	// Let Kongregate take care of the playerName string
	//playerName = PlayerPrefs.GetString('playerName');
	//Debug.Log('player name = '+playerName);

	p1loseCard.enabled = false;
	p2loseCard.enabled = false;

	if( debugClearPlayerPrefs )
	{
		#if UNITY_EDITOR
		Debug.Log('WARNING: Clearing player prefs');
		PlayerPrefs.DeleteAll();
		#endif
	}

	#if UNITY_EDITOR
	// use the debug values
	stars2score = debugStars2score;
	#endif
}

function OnGUI()
{
	if( state != RCState.MENU || menuState != MenuState.ENTER_NAME )
		return;

	var radius = Screen.height/2;
	var centerX = Screen.width/2;
	var centerY = Screen.height/2;

	var textStyle = new GUIStyle();
	textStyle.fontSize = 14;
	textStyle.normal.textColor = Color.white;

	GUILayout.BeginArea( Rect( 200, 200, 400, 200 ));
	GUILayout.Label('Kindly enter your name for leaderboards. And FBI monitoring.', textStyle);

	// Need to check this event before text field
	if( Event.current.type == EventType.KeyDown
			&& Event.current.keyCode == KeyCode.Return )
	{
		// Done
		Debug.Log(playerName);
		PlayerPrefs.SetString('playerName', playerName);
		menuState = MenuState.MODE;
		modeMenu.Show();
		titleMusic.Stop();
	}
	else if( Event.current.type == EventType.KeyDown
			&& Event.current.keyCode == KeyCode.Escape )
	{
		menuState = MenuState.MAIN;
		startMenu.Show();
	}
	else
	{
		GUI.SetNextControlName('nameTextBox');
		playerName = GUILayout.TextField( playerName, 16 );
		GUI.FocusControl('nameTextBox');
		GUILayout.Label('Press ENTER when done', textStyle);
	}
	GUILayout.EndArea();
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

function FindUnpressedNote( beat : Array, measureTime : float, key : int, tol : float ) : int
{
	for( var i = 0; i < beat.length; i++ )
	{
		var note = beat[i];
		if( !note.downHit
				&& Mathf.Abs( note.measureTime - measureTime ) < tol
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

function NotifyStarsChanged() {
	for( var obj in eventListeners ) {
		if( obj != null )
			obj.SendMessage( "OnStarsChanged", SendMessageOptions.DontRequireReceiver );
	}
}

function OnSurvivalOver()
{
	// this means we lost, so success was never triggered.
	// but if they got a new star, before the failed, play the sound
	// play star sound?
	if( numStars != prevStars ) {
		// got new stars - play the sound
		getStarSounds[ numStars-1 ].Play();
		NotifyStarsChanged();
	}

	// save num stars achieved
	if( GetNumStars(activeSong) < numStars )
		PlayerPrefs.SetInt( GetNumStarsKey(), numStars );
	startingStars = numStars;
	prevStars = numStars;

	for( var obj in eventListeners ) {
		if( obj != null )
			obj.SendMessage( "OnSurvivalOver", GetComponent(GameState),
					SendMessageOptions.DontRequireReceiver );
	}
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

function OnMistake()
{
	if( !messedUpTriggered )
	{
		messedUpTriggered = true;

		cameraShake.DoShake();

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

			// immediately register score change if in survival mode
			if(survivalMode)
				playerLosses[ GetInputtingPlayer() ]++;
		}

		// update score..

		for( var obj in eventListeners )
		{
			if( obj != null )
				obj.SendMessage( "OnMistake", SendMessageOptions.DontRequireReceiver );
		}
	}
}

function OnSurvivalScoreIncreased()
{
	// increase star count, but do NOT play the sound here - it can be distracting
	if( numStars+1 < stars2score.length )
	{
		if( survivalScore >= stars2score[ numStars+1 ] )
			numStars++;
	}
	
	survivalScoreIncreased = true;
}

function MakeNoteExplosions()
{
	// spawn explosions before destroy beats..
	for( var i = 0; i < beatNotes.length; i++ ) {
		var fx = explosionsPool.GetNext().GetComponent(ParticleSystem);
		fx.transform.position = beatNotes[i].transform.position;
		fx.Clear();
		fx.Play();
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
		OnSurvivalScoreIncreased();
		horseAI.SendMessage( "OnScoreChange", survivalScore, SendMessageOptions.DontRequireReceiver );
	}

	// play star sound?
	if( numStars != prevStars ) {
		// got new stars - play the sound
		getStarSounds[ numStars-1 ].Play();
		prevStars = numStars;
		NotifyStarsChanged();
	}

	// do this after we send the message..
	MakeNoteExplosions();
	cameraShake.DoShake();

	if( survivalMode || GetInputtingPlayer()==GetAttacker() ) {
		// make main beat go away 
		Debug.Log('hiding beat '+beatNotes.length);
		HideNotes( beatNotes );
	}
	// immediately reset response notes so they go away with the explosions
		Debug.Log('hiding response '+responseNotes.length);
	HideNotes( responseNotes );

	for( var obj in eventListeners )
	{
		if( obj != null )
			obj.SendMessage( "OnSuccess", GetInputtingPlayer(), SendMessageOptions.DontRequireReceiver );
	}
}

private var key2downNote : Note[] = [ null as Note, null as Note, null as Note ];
private var key2matchedNote : Note[] = [ null as Note, null as Note, null as Note ];

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
		if( key2downNote[ key ] != null )
			Debug.LogError('key up did not register BEFORE key down..');

		// play it no matter waht..
		GetSongPlayer().OnKeyDown(key);
		// trigger pulse
		keyDownHandlers[ GetInputtingPlayer() ].SendMessage('OnKeyDown', key);

		// hit an existing note?
		var noteType = NoteType.Hit;
		var noteMt = mt;

		var hitNoteId = FindUnpressedNote( GetBeatNotes(), mt, key, GetTolSecs() );
		if( hitNoteId != -1 && GetBeatNotes()[hitNoteId].downHit == false )
		{
			// yes! register the hit
			noteType = NoteType.Hit;
			// make it visually line up with the original note, so change the time here
			noteMt = GetBeatNotes()[hitNoteId].measureTime;
			GetBeatNotes()[hitNoteId].downHit = true;
			// remember that this is the note we matched to, for releasing
			key2matchedNote[key] = GetBeatNotes()[hitNoteId];
		}
		else
		{
			// Didn't find any within range - messed up!
			noteType = NoteType.Miss;
			Debug.Log('MISTAKE: on down, none found');
			OnMistake();
		}

		// create the note
		Debug.Log('creating response note');
		var noteObj:GameObject = Instantiate( notePrefabs[key].gameObject, Vector3(0,0,0), notePrefabs[key].transform.rotation );
		noteObj.GetComponent(Note).zPos -= 0.1;
		noteObj.GetComponent(Note).OnDown(
				noteMt, key, false, tracks[key] );
		responseNotes.Push( noteObj.GetComponent(Note) );
		// offset the Z so the response notes show up above the beat notes

		// remember that this is the active note. We can't rely on the measure time alone, cuz that gets fudged a bit
		key2downNote[key] = noteObj.GetComponent(Note);
		//Debug.Log('pressed note mt = '+noteObj.GetComponent(Note).measureTime);

		if( noteType == NoteType.Hit )
			noteObj.GetComponent(Note).OnHit();
		else
			noteObj.GetComponent(Note).OnMiss();
	}

	//----------------------------------------
	//  Handle key releases
	//----------------------------------------
	for( key in GetKeysUp(inputMt) )
	{
		GetSongPlayer().OnKeyUp(key);

		var respNote:Note = key2downNote[key];
		if( respNote != null )
		{
			respNote.OnUp( mt );
			key2downNote[key] = null;	// no longer active
			//Debug.Log('released repeat respNote mt = '+mt);

			var matchedNote = key2matchedNote[key];
			if( matchedNote != null ) {
				// we hit a note - did we release in at the right time?
				if( matchedNote.key != respNote.key )
					Debug.LogError('hit respNote key is not same as test note..???');

				//----------------------------------------
				//  Check if we released too early
				//----------------------------------------
				if( matchedNote.endMeasureTime-GetTolSecs() > mt ) {
					Debug.Log('MISTAKE: released too early');
					respNote.type = NoteType.Miss;
					respNote.OnMiss();
					OnMistake();
				}
				else {
					if( !matchedNote.upHit ) {
						// we got it before the auto-release!
						matchedNote.upHit = true;
						GetSongPlayer().OnKeyUp( respNote.key );

						if( survivalMode && perNoteScore ) {
							survivalScore++;
							OnSurvivalScoreIncreased();
							horseAI.SendMessage( "OnScoreChange", survivalScore, SendMessageOptions.DontRequireReceiver );
						}
					}

					// always use the actual note end time..
					respNote.endMeasureTime = matchedNote.endMeasureTime;
				}
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
		var testNote = beatNotes[i] as Note;

		if( !testNote.downHit )
		{
			// wasn't hit - opportunity past?
			if( (testNote.measureTime+GetTolSecs()) < mt )
			{
				// yep..didn't get it
				if( testNote.type != NoteType.Miss )
				{
					// freshly missed one
					testNote.OnMiss();
					Debug.Log('MISTAKE: note passed, not hit');
					OnMistake();
				}
			}
			else
				// not hit, but still has chance
				notesRemain = true;
		}
		else {
			// the down was hit, but what about the up?
			if( !testNote.upHit )
			{
				// a bit complex here: If the end time is up, we want to just count this as a hit anyway.
				// Don't use the tolerance, otherwise you get the weird effect of the trail getting long then getting cut short again
				// Note that we use the real time here...so during the post tolerance, we will register the hit
				if( (testNote.endMeasureTime) < inputMt )
				{
					// end time has passed
					if( testNote.type != NoteType.Miss )
					{
						// OK just pretend the player released it at the right time
						testNote.upHit = true;
						if( survivalMode && perNoteScore )
						{
							survivalScore++;
							OnSurvivalScoreIncreased();
							horseAI.SendMessage( "OnScoreChange", survivalScore, SendMessageOptions.DontRequireReceiver );
						}

						// also, stop playing the sample
						GetSongPlayer().OnKeyUp( testNote.key );

						// update the bookkeeping for this key
						respNote = key2downNote[ testNote.key ];
						if( respNote != null ) {
							respNote.OnUp(mt);

							// force the end time to be perfect
							respNote.endMeasureTime = testNote.endMeasureTime;
						}
						key2downNote[ testNote.key ] = null;
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
		//Debug.Log('recording, note pressed mt = '+mt+' key = '+key);

		var noteObj:GameObject = Instantiate( notePrefabs[key].gameObject, Vector3(0,0,0), notePrefabs[key].transform.rotation );
		noteObj.GetComponent(Note).OnDown( mt, key, false, tracks[key] );
		beatNotes.Push( noteObj.GetComponent(Note) );
		GetSongPlayer().OnKeyDown(key);

		if( key2downNote[key] != null )
			Debug.Log('while recording, key was not released before it was down again??');
		key2downNote[key] = noteObj.GetComponent(Note);

		// trigger pulse
		keyDownHandlers[ GetInputtingPlayer() ].SendMessage('OnKeyDown', key);

	}

	for( key in GetKeysUp(inputMt) )
	{
		//Debug.Log('recording, note released mt = '+mt+' key = '+key);

		GetSongPlayer().OnKeyUp(key);

		var note = key2downNote[key];
		if( note != null ) {
			// register the key-up. But, if the hold-time is within tolerance, pretend it was instantly let up
			if( mt - note.measureTime <= GetTolSecs() )
				note.OnUp( note.measureTime );
			else
				note.OnUp( mt );
			key2downNote[key] = null;
		}
		else
		{
			// probably player just held down a key when they weren't active.Just ignore.
			Debug.Log('unmatched release!');
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

	for( var key = 0; key < GetSongPlayer().GetNumSamples(); key++ ) {
		key2downNote[key] = null;
	}
}

enum MenuState { MAIN, ENTER_NAME, CREDITS, MODE, SONGS, BRONCO_SETUP, TUTE }
var menuState : MenuState = MenuState.MAIN;

function UpdateMenuMode()
{
	tuteText.text = '';

	if( menuState == MenuState.MAIN )
	{
		if( !titleMusic.isPlaying ) titleMusic.Play();

		menuText.text = '';

		// handle player input
		if( Input.GetButtonDown('menuback') )
		{
			PlayRandomSample();
			return 'quit';
		}
		else if( Input.GetButtonDown('Start') 
				|| PollLayoutClicked( startMenu, 'startbtn' ) )
		{
			menuState = MenuState.MODE;
			startMenu.Hide();
			modeMenu.Show();
			titleMusic.Stop();
			PlayRandomSample();
		}
		else if( Input.GetButtonDown('Sample0B') )
		{
			PlayRandomSample();
			menuState = MenuState.CREDITS;
			titleMusic.Stop();
			startMenu.Hide();
		}
	}
	else if( menuState == MenuState.ENTER_NAME )
	{
		menuText.text = '';
		// OnGUI handles stuff here
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
			startMenu.Show();
			creditsMusic.Stop();
		}
		else if( Input.GetButtonDown('Sample1B') ) {
			Debug.Log('WARNING: Clearing player prefs');
			PlayerPrefs.DeleteAll();
		}
	}
  else if( menuState == MenuState.MODE )
  {
		menuText.text = '';

		if( !songSelectMusic.isPlaying ) songSelectMusic.Play();

    if( Input.GetButtonDown( 'Song1' ) 
				|| PollLayoutClicked( modeMenu, 'broncobtn' ) )
    {
      PlayRandomSample();
      useAI = true;
      survivalMode = true;
			beatBroncoAnno.Play();
      menuState = MenuState.SONGS;
			modeMenu.Hide();
    }
    else if( Input.GetButtonDown( 'Song2' )
			|| PollLayoutClicked( modeMenu, 'battlebtn' ) )
    {
      PlayRandomSample();
      useAI = false;
      survivalMode = false;
			beatBattleAnno.Play();
      menuState = MenuState.SONGS;
			modeMenu.Hide();
    }

		if( Input.GetButtonDown('menuback')
			|| PollLayoutClicked( modeMenu, 'backbtn' ) )
		{
			PlayRandomSample();
			songSelectMusic.Stop();
			modeMenu.Hide();

			titleMusic.Play();
			menuState = MenuState.MAIN;
			startMenu.Show();
		}
  }
	else if( menuState == MenuState.SONGS )
	{
		songsMenu.Show(GetComponent(GameState));

		if( !songSelectMusic.isPlaying )
			songSelectMusic.Play();

		menuText.text = '';

		// check for keys
		for( s = 0; s < songs.players.Count; s++ )
		{
			var inputCode = 'Song'+(s+1);
			if( Input.GetButtonDown( inputCode ) 
					// we have it set up so that the element names are 'Song%d'
					|| PollLayoutClicked( songsMenu.layout, inputCode ) )
			{
				if( !survivalMode || GetIsSongUnlocked( s ) ) {
					PlayRandomSample();
					activeSong = s;
					songsMenu.Hide();

					if( survivalMode ) {
						menuState = MenuState.BRONCO_SETUP;
					}
					else {
						songSelectMusic.Stop();
						menuState = MenuState.TUTE;
					}
				}
				else
				{
					// play error sound
					PlayRandomSample();
				}
				break;
			}
		}

		if( Input.GetButtonDown('menuback') 
			|| PollLayoutClicked( songsMenu.layout, 'backbtn' ) )
		{
			PlayRandomSample();
			menuState = MenuState.MODE;
			songsMenu.Hide();
			modeMenu.Show();
		}
	}
	else if( menuState == MenuState.BRONCO_SETUP ) {
		if( !songSelectMusic.isPlaying )
			songSelectMusic.Play();

		broncoMenu.Show(GetComponent(GameState));

		//----------------------------------------
		//  Check for difficulty click
		//----------------------------------------
		var nstars = GetNumStars( activeSong );
		for( var level = 0; level < songs.players.Count; level++ )
		{
			// don't let players start on a level they haven't gotten yet
			if( level > nstars ) continue;

			var keyPressed = Input.GetButtonDown('Song'+(level+1));
			var btnClicked = PollLayoutClicked( broncoMenu.layout, 'level'+level );

			// pressing space triggers the highest star number
			if( level == nstars && Input.GetButtonDown( 'Start' ) )
				keyPressed = true;

			if( keyPressed || btnClicked )
			{
				PlayRandomSample();
				broncoMenu.Hide();
				songSelectMusic.Stop();
				menuState = MenuState.TUTE;

				// make sure we start with the checkpointed score
				startingStars = level;
				break;
			}
		}

		if( Input.GetButtonDown('menuback') 
			|| PollLayoutClicked( broncoMenu.layout, 'backbtn' ) )
		{
			PlayRandomSample();
			menuState = MenuState.SONGS;
			broncoMenu.Hide();
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

		if( survivalMode )
		{
			tuteText.text = 'Morgan Freeman says...\n\n'
				+ 'The computer, P1, will lay down some fresh beats.\n'
				+ 'Play them correctly using the JKL keys!\n'
				+ 'Try to survive as long as you can!\n'
				+ '\n'
				+ 'SPACE BAR TO CONTINUE';
		}
		else
		{
			tuteText.text = 'Morgan Freeman says...\n\n'
				+ 'When it\'s your turn, play a difficult beat\nfor your opponent to repeat.\n'
				+ 'But not too difficult - you have to repeat it, too!\n'
				+ '\n'
				+ 'SPACE BAR TO CONTINUE';
		}

		if( Input.GetButtonDown('Start') )
		{
			// make sure we return to the songs menu when game is over
			if( survivalMode )
				menuState = MenuState.BRONCO_SETUP;
			else
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

function GetNumStarsKey(songNum:int):String
{
	var starsKey = 'song'+songNum+'.numStars';
	return starsKey;
}

function GetNumStarsKey():String
{
	return GetNumStarsKey( activeSong );
}

function GetNumStars( songNum:int ) : int
{

#if UNITY_EDITOR
	return 4;
#else
	var key = GetNumStarsKey( songNum );
	return PlayerPrefs.GetInt( key );
#endif
}

function GetIsSongUnlocked( songNum:int ) : boolean
{
	if( songNum == 0 ) return true;
	return GetNumStars( songNum-1 ) >= starsToUnlockNext;
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

		// how many changes are allowed?
    playerLosses[1] = GetMaxLosses() - GetSongPlayer().broncoLives;

		// update stars
		numStars = startingStars;
		prevStars = numStars;
		survivalScore = stars2score[ numStars ];
		survivalScoreIncreased = false;

		// make sure we start with the checkpointed AI
		if( horseAI != null )
			horseAI.Reset( GetSongPlayer().broncoAI );
		horseAI.SendMessage( "OnScoreChange", survivalScore, SendMessageOptions.DontRequireReceiver );
  }
	else
	{
		playerLosses[0] = 0;
		playerLosses[1] = 0;
	}


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

		//----------------------------------------
		//  
		//----------------------------------------
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

		//----------------------------------------
		//  
		//----------------------------------------
		if( JustEnteredPreTol() )
		{

			// AI defending?
			if( IsAiInputting() )
				aiInputs = horseAI.RepeatBeat(this);
		}

		if( IsInPreTolerance() )
			// no need to pass in the "real" mt for the input - AIs will never do that
			UpdateTesting( 0.0, 0.0 );
		else {
			// kinda wasteful..whatever
			if( survivalMode ) {
				prevStars = numStars;
			}
		}
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
				// check for lose condition
				// reset round
				ResetRound();

				// check for victory
				if( playerLosses[0] == maxLosses || playerLosses[1] == maxLosses )
				{
					// victory!
					state = RCState.VICTORY;
					GetSongPlayer().Stop();
					OnSurvivalOver();
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
			victoryMusic.Stop();	// just in case

			if( survivalMode )
				// make sure we save the stars, etc.
				OnSurvivalOver();
		}
	}

	prevMeasureTime = GetMeasureTime();
}

function GetWinningPlayer()
{
	if( playerLosses[0] == maxLosses ) return 1;
	else return 0;
}

