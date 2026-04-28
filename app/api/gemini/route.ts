import { NextResponse } from "next/server";

type ReaderAction = "Explain" | "Summarize";

const ACTION_PROMPTS: Record<ReaderAction, string> = {
  Explain:
    "Explain the selected text in simple language. Return only the explanation. Do not add a preface or repeat the prompt.",
  Summarize:
    "Summarize the selected text in one short sentence. Return only the summary. Do not add a preface or repeat the prompt.",
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

    const apiKey =
      process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in environment." },
        { status: 500 },
      );
    }

    const prompt = `${ACTION_PROMPTS[body.action]}\n\nSelected text: ${body.text}`;
    const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    const fallbackModel =
      process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-2.5-flash-lite";
    const modelCandidates = [primaryModel, fallbackModel].filter(
      (model, index, list) => model.length > 0 && list.indexOf(model) === index,
    );

    const primaryAttempts = 2;
    const fallbackAttempts = 1;
    let response: Response | null = null;
    let lastStatus = 500;
    let lastMessage = "";

    for (const model of modelCandidates) {
      let attempt = 0;
      const maxAttempts =
        model === primaryModel ? primaryAttempts : fallbackAttempts;

      while (attempt < maxAttempts) {
        attempt += 1;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          try {
            response = await fetch(
              `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
              {
                method: "POST",
                signal: controller.signal,
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
                    temperature: 0.2,
                    maxOutputTokens: 180,
                  },
                }),
              },
            );
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (err) {
          console.error(
            `Gemini fetch failed for ${model} attempt ${attempt}:`,
            err,
          );
          response = null;
          lastStatus = 504;
          lastMessage = "Request timed out. Please try again.";
        }

        if (response?.ok) {
          break;
        }

        lastStatus = response?.status || 500;
        lastMessage = response ? await response.text() : "Network error";

        if (lastStatus === 503 || lastStatus === 429) {
          const delayMs = 250 * Math.pow(2, attempt - 1);
          console.warn(
            `Gemini transient ${lastStatus} for ${model} on attempt ${attempt}, retrying after ${delayMs}ms`,
          );
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        break;
      }

      if (response?.ok) {
        break;
      }

      if (lastStatus !== 503 && lastStatus !== 429) {
        break;
      }
    }

    if (!response?.ok) {
      let providerMessage = lastMessage;
      try {
        const parsed = JSON.parse(lastMessage) as {
          error?: { message?: string };
        };
        providerMessage = parsed.error?.message || lastMessage;
      } catch {
        // Keep plain text when body is not JSON.
      }

      console.error("Gemini API Error:", {
        status: lastStatus,
        body: providerMessage,
      });

      const retryable = lastStatus === 503 || lastStatus === 429;
      const userError = retryable
        ? "AI is busy right now. Please tap Retry."
        : "Gemini request failed. Check key validity, API access, and model permissions.";

      return NextResponse.json(
        {
          error: userError,
          details: providerMessage,
          retryable,
        },
        { status: lastStatus },
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
