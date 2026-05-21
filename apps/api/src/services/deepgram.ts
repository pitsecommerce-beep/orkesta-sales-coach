import { createClient, LiveTranscriptionEvents, type LiveClient } from '@deepgram/sdk';

export function createDeepgramStream(
  onTranscript: (transcript: string, words: DeepgramWord[], isFinal: boolean) => void,
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
    utterance_end_ms: 1000,
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

    const isFinal = (data.speech_final ?? false) as boolean;

    if ((data.is_final ?? false) as boolean) {
      pendingTranscript = alt.transcript;
      pendingWords = (alt.words ?? []) as DeepgramWord[];
    }

    if (isFinal) {
      speechFinalSent = true;
    }

    onTranscript(alt.transcript, (alt.words ?? []) as DeepgramWord[], isFinal);
  });

  // Deepgram fires UtteranceEnd after utterance_end_ms of silence.
  // If speech_final never fired for the last utterance, emit it now.
  connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
    if (!speechFinalSent && pendingTranscript) {
      onTranscript(pendingTranscript, pendingWords, true);
    }
    pendingTranscript = '';
    pendingWords = [];
    speechFinalSent = false;
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
