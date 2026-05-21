import { createClient, LiveTranscriptionEvents, type LiveClient } from '@deepgram/sdk';

export function createDeepgramStream(
  onTranscript: (transcript: string, words: DeepgramWord[], isFinal: boolean) => void,
  onUtteranceEnd: () => void,
  onError: (err: Error) => void,
  onClose: () => void,
): LiveClient {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

  const connection = deepgram.listen.live({
    model: 'nova-2',
    language: 'es',
    punctuate: true,
    smart_format: true,
    encoding: 'opus',
    container: 'webm',
    interim_results: true,
    utterance_end_ms: 1200,
  });

  // Track the last is_final transcript so UtteranceEnd can finalize it
  // if speech_final never fires for that utterance.
  let pendingTranscript = '';
  let pendingWords: DeepgramWord[] = [];
  let speechFinalSent = false;

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log('[Deepgram] Connection open');
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const alt = data.channel?.alternatives?.[0];
    if (!alt?.transcript) return;

    const isSpeechFinal = (data.speech_final ?? false) as boolean;

    if ((data.is_final ?? false) as boolean) {
      pendingTranscript = alt.transcript;
      pendingWords = (alt.words ?? []) as DeepgramWord[];
    }

    if (isSpeechFinal) {
      speechFinalSent = true;
    }

    // Always forward transcript events for live display.
    // isFinal here means speech_final — used for transcript display only.
    // Response generation is gated on UtteranceEnd, not speech_final.
    onTranscript(alt.transcript, (alt.words ?? []) as DeepgramWord[], isSpeechFinal);
  });

  // UtteranceEnd fires after utterance_end_ms of silence — this is the real
  // end-of-turn signal. If speech_final never fired, emit the pending transcript first.
  connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
    if (!speechFinalSent && pendingTranscript) {
      onTranscript(pendingTranscript, pendingWords, true);
    }
    pendingTranscript = '';
    pendingWords = [];
    speechFinalSent = false;

    onUtteranceEnd();
  });

  connection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error('[Deepgram] Error:', err);
    onError(err instanceof Error ? err : new Error(String(err)));
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log('[Deepgram] Connection closed');
    onClose();
  });

  return connection;
}

export interface DeepgramWord {
  word: string;
  speaker?: number;
  start: number;
  end: number;
}
