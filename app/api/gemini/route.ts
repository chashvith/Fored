import { NextResponse } from "next/server";

type ReaderAction = "Explain" | "Summarize" | "Translate";

const ACTION_PROMPTS: Record<ReaderAction, string> = {
  Explain:
    "Explain the selected sentence in simple language. Keep it concise and focused on meaning.",
  Summarize:
    "Summarize the selected sentence in one short sentence.",
  Translate:
    "Translate the selected sentence into plain, natural English if needed; otherwise restate it clearly.",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: ReaderAction;
      text?: string;
    };

    if (!body.action || !body.text) {
      return NextResponse.json(
        { error: "action and text are required." },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          result:
            `${body.action}: ${body.text}`,
          note:
            "GEMINI_API_KEY is not set, so this endpoint returned a local fallback.",
        },
        { status: 200 },
      );
    }

    const prompt = `${ACTION_PROMPTS[body.action]}\n\nText: ${body.text}`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 180,
          },
        }),
      },
    );

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json(
        { error: `Gemini request failed: ${message}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const result =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Gemini returned no text.";

    return NextResponse.json({ result });
  } catch {
    return NextResponse.json(
      { error: "Unable to process the Gemini request." },
      { status: 500 },
    );
  }
}