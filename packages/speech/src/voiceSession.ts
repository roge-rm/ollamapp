/**
 * Who has the floor in a voice conversation. Pure: every function returns a new session.
 *
 *  - stopped  nobody; the mic is shut and nothing plays
 *  - listen   the person; the mic may be open
 *  - speak    the assistant; it transcribes, thinks and talks, and audio may play
 *
 * In hands-free the floor goes back to the person by itself when the assistant finishes.
 */
export type VoiceSessionState = 'stopped' | 'listen' | 'speak';

/** What a person is shown inside a state. */
export type VoiceSessionPhase =
  | 'idle'
  | 'listening'
  | 'recording'
  | 'transcribing'
  | 'speaking'
  | 'replay';

export type VoiceSessionEvent =
  /** The person asked for the floor (a tap, or entering hands-free). */
  | 'userStart'
  /** A deliberate stop. Ends the session, hands-free included. */
  | 'userStop'
  /** The mic heard a voice. */
  | 'speechHeard'
  /** The recording ended with audio to work on; the assistant takes the floor. */
  | 'turnCaptured'
  /** The turn produced nothing. In hands-free the second one in a row stops the session. */
  | 'nothingHeard'
  /** Chat dictation finished or was cancelled; it never starts an assistant turn. */
  | 'dictationFinished'
  /** The assistant's spoken reply began playing. */
  | 'replyStarted'
  /** The assistant is done, spoken or not. */
  | 'replyFinished'
  /** A saved message is being played back; it takes the floor until replayEnded. */
  | 'replayStarted'
  | 'replayEnded';

export interface VoiceSession {
  state: VoiceSessionState;
  phase: VoiceSessionPhase;
  handsFree: boolean;
  /** Empty turns in a row. */
  strikes: number;
  /** Set while a replay holds the floor: where the floor goes when it ends. */
  replayReturnsTo?: 'listen' | 'stopped';
}

/** Empty turns in a row that stop a hands-free session. */
const MAX_STRIKES = 2;

const stopped = (handsFree: boolean): VoiceSession => ({
  state: 'stopped',
  phase: 'idle',
  handsFree,
  strikes: 0,
});

const listening = (handsFree: boolean, strikes = 0): VoiceSession => ({
  state: 'listen',
  phase: 'listening',
  handsFree,
  strikes,
});

/** Hands-free starts with the mic open; the other modes wait for a tap. */
export function initialVoiceSession(handsFree: boolean): VoiceSession {
  return handsFree ? listening(true) : stopped(false);
}

export function nextVoiceSession(
  session: VoiceSession,
  event: VoiceSessionEvent,
  handsFree: boolean,
): VoiceSession {
  const same = session.handsFree === handsFree ? session : { ...session, handsFree };
  // While a replay holds the floor only its end, or a deliberate start or stop, moves it.
  if (session.replayReturnsTo && !['replayEnded', 'userStart', 'userStop'].includes(event)) {
    return same;
  }

  switch (event) {
    case 'userStart':
      return session.state === 'listen' && !session.replayReturnsTo
        ? { ...same, strikes: 0 }
        : listening(handsFree);

    case 'userStop':
      return stopped(handsFree);

    case 'speechHeard':
      return session.state === 'listen' ? { ...same, phase: 'recording', strikes: 0 } : same;

    case 'turnCaptured':
      return session.state === 'listen'
        ? { ...same, state: 'speak', phase: 'transcribing' }
        : same;

    case 'nothingHeard': {
      if (session.state === 'stopped') return same;
      const strikes = session.strikes + 1;
      return handsFree && strikes < MAX_STRIKES ? listening(true, strikes) : stopped(handsFree);
    }

    case 'dictationFinished':
      return session.state === 'stopped' ? same : stopped(handsFree);

    case 'replyStarted':
      return session.state === 'speak' ? { ...same, phase: 'speaking', strikes: 0 } : same;

    case 'replyFinished':
      if (session.state !== 'speak') return same;
      return handsFree ? listening(true) : stopped(false);

    case 'replayStarted':
      return {
        ...same,
        state: 'speak',
        phase: 'replay',
        replayReturnsTo: handsFree && session.state !== 'stopped' ? 'listen' : 'stopped',
      };

    case 'replayEnded':
      if (!session.replayReturnsTo) return same;
      return session.replayReturnsTo === 'listen' ? listening(handsFree) : stopped(handsFree);

    default:
      return same;
  }
}

/** The mic may be open only while the person has the floor. */
export function micShouldBeOpen(session: VoiceSession): boolean {
  return session.state === 'listen';
}

/** Audio may play only while the assistant has the floor, so a reply after a stop stays silent. */
export function speechMayPlay(session: VoiceSession): boolean {
  return session.state === 'speak';
}
