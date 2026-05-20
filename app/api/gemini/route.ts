import { NextResponse } from "next/server";

type ReaderAction = "Explain" | "Summarize" | "Translate";

const ACTION_PROMPTS: Record<ReaderAction, string> = {
  Explain:
    "Explain the selected text in simple language. Return only the explanation. Do not add a preface or repeat the prompt.",
  Summarize:
    "Summarize the selected text in one short sentence. Return only the summary. Do not add a preface or repeat the prompt.",
  Translate:
    "Translate the selected text to Spanish. Return only the translation. Do not add a preface or repeat the prompt.",
};

type ProviderResponse = {
  result?: string;
  error?: string;
  details?: string;
  retryable?: boolean;
};

function localFallback(action: ReaderAction, text: string) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const words = trimmed.split(" ");

  if (action === "Summarize") {
    const short = words.slice(0, 18).join(" ");
    return {
      result: short.endsWith(".") ? short : `${short}.`,
    } satisfies ProviderResponse;
  }

  if (action === "Translate") {
    // Simple translation fallback - just return the text as-is with a note
    return {
      result: `[Spanish translation not available - AI required] ${trimmed}`,
    } satisfies ProviderResponse;
  }

  const preview = words.slice(0, 28).join(" ");
  return {
    result: `In simple terms, ${preview}${words.length > 28 ? "..." : "."}`,
  } satisfies ProviderResponse;
}

async function callGemini(prompt: string, apiKey: string): Promise<ProviderResponse> {
  const models = [
    process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
    process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-2.5-flash-lite",
  ].filter((model, index, list) => model.length > 0 && list.indexOf(model) === index);

  let lastError = "Gemini request failed.";

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 180 },
            }),
          },
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          const message = await response.text();
          lastError = `Gemini ${response.status}`;
          if ((response.status === 503 || response.status === 429) && attempt < 2) {
            continue;
          }
          return {
            error: "Gemini request failed. Check key validity, API access, and model permissions.",
            details: message,
            retryable: response.status === 503 || response.status === 429,
          };
        }

        const data = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };

        return {
          result:
            data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
            "Gemini returned no text.",
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Network error";
      }
    }
  }

  return { error: lastError, details: lastError, retryable: true };
}

async function callGroq(prompt: string, apiKey: string): Promise<ProviderResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 180,
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        error: "Groq request failed. Check key validity and model permissions.",
        details: await response.text(),
        retryable: response.status === 503 || response.status === 429,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return {
      result: data.choices?.[0]?.message?.content?.trim() || "Groq returned no text.",
    };
  } catch (error) {
    return {
      error: "Unable to reach Groq right now.",
      details: error instanceof Error ? error.message : "Network error",
      retryable: true,
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: ReaderAction; text?: string };

    if (!body.action || !body.text) {
      return NextResponse.json({ error: "action and text are required." }, { status: 400 });
    }

    const prompt = `${ACTION_PROMPTS[body.action]}\n\nSelected text: ${body.text}`;
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
    const groqApiKey = process.env.GROQ_API_KEY?.trim();

    if (!geminiApiKey && !groqApiKey) {
      return NextResponse.json(localFallback(body.action, body.text));
    }

    if (geminiApiKey) {
      const geminiResult = await callGemini(prompt, geminiApiKey);
      if (geminiResult.result) {
        return NextResponse.json({ result: geminiResult.result });
      }

      if (groqApiKey) {
        const groqResult = await callGroq(prompt, groqApiKey);
        if (groqResult.result) {
          return NextResponse.json({ result: groqResult.result });
        }

        return NextResponse.json(
          {
            error: groqResult.error || geminiResult.error || "AI request failed.",
            details: groqResult.details || geminiResult.details,
            retryable: Boolean(groqResult.retryable || geminiResult.retryable),
          },
          { status: groqResult.retryable ? 503 : 500 },
        );
      }

      return NextResponse.json(
        {
          error: geminiResult.error || "Gemini request failed.",
          details: geminiResult.details,
          retryable: Boolean(geminiResult.retryable),
        },
        { status: geminiResult.retryable ? 503 : 500 },
      );
    }

    if (groqApiKey) {
      const groqResult = await callGroq(prompt, groqApiKey);
      if (groqResult.result) {
        return NextResponse.json({ result: groqResult.result });
      }

      return NextResponse.json(
        {
          error: groqResult.error || "Groq request failed.",
          details: groqResult.details,
          retryable: Boolean(groqResult.retryable),
        },
        { status: groqResult.retryable ? 503 : 500 },
      );
    }

    return NextResponse.json(localFallback(body.action, body.text));
  } catch (error) {
    return NextResponse.json({
      result: localFallback("Explain", "The request could not be processed right now.").result,
      error: "Invalid request or server error.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
