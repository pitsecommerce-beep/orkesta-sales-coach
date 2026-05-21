import { createClient } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY ?? '');

export async function synthesizeSpeech(text: string, voice = 'aura-asteria-es'): Promise<Buffer> {
  const response = await deepgram.speak.request(
    { text },
    { model: voice, encoding: 'mp3' },
  );

  const stream = await response.getStream();
  if (!stream) throw new Error('Deepgram TTS returned no audio stream');

  const chunks: Buffer[] = [];
  const reader = (stream as ReadableStream<Uint8Array>).getReader();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks);
}
