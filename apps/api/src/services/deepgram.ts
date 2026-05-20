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
    diarize: true,
    punctuate: true,
    smart_format: true,
    encoding: 'opus',
    container: 'webm',
    interim_results: true,
    utterance_end_ms: 1000,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log('[Deepgram] Connection open');
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const alt = data.channel?.alternatives?.[0];
    if (!alt?.transcript) return;

    onTranscript(alt.transcript, alt.words ?? [], data.speech_final ?? false);
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
