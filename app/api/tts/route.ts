import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string };
    const text = body?.text?.toString().trim();
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const apiKey = (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ""
    ).trim();
    // Development fallback: if no API key or explicitly requested, return a generated WAV tone
    if (!apiKey || process.env.DEV_TTS_FAKE === "1") {
      const wav = generateSineWaveWav(text, 1.1);
      return new Response(wav, { status: 200, headers: { "Content-Type": "audio/wav" } });
    }

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "en-US", name: "en-US-Wavenet-D" },
        audioConfig: { audioEncoding: "MP3" },
      }),
    });

    if (!res.ok) {
      const message = await res.text();
      console.error("Text-to-Speech error:", res.status, message);
      // As a fallback for provider errors, return a generated WAV so dev testing can continue
      const wav = generateSineWaveWav(text, 1.1);
      return new Response(wav, { status: 200, headers: { "Content-Type": "audio/wav" } });
    }

    const data = await res.json();
    const audioContent = data?.audioContent;
    if (!audioContent) {
      const wav = generateSineWaveWav(text, 1.1);
      return new Response(wav, { status: 200, headers: { "Content-Type": "audio/wav" } });
    }

    const buffer = Buffer.from(audioContent, "base64");
    return new Response(buffer, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("TTS route error:", err);
    const wav = generateSineWaveWav("error", 0.8);
    return new Response(wav, { status: 200, headers: { "Content-Type": "audio/wav" } });
  }
}
}
function generateSineWaveWav(text: string, durationSeconds = 1) {
  const sampleRate = 22050;
  const channels = 1;
  const samples = Math.floor(sampleRate * durationSeconds);
  // vary frequency with text length so different inputs sound slightly different
  const baseFreq = 220 + (text.length % 200);
  const blockAlign = channels * 2; // 16-bit
  const byteRate = sampleRate * blockAlign;

  const buffer = Buffer.alloc(44 + samples * 2);
  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVE", 8);
  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // audio format PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample
  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const freq = baseFreq + 80 * Math.sin((i / samples) * Math.PI * 2);
    const sample = Math.round(Math.sin(2 * Math.PI * freq * t) * 32767 * 0.25);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  return buffer;
}
