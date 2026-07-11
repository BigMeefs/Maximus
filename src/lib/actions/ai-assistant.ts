"use server";

export type AiAssistantState = {
  result?: string;
  error?: string;
};

const MODEL = "claude-sonnet-5";

export async function runAiAssistant(
  contextSummary: string,
  _prevState: AiAssistantState,
  formData: FormData,
): Promise<AiAssistantState> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      error:
        "The AI Assistant isn't configured yet. Add an ANTHROPIC_API_KEY environment variable (and redeploy) to enable it.",
    };
  }

  const instruction = formData.get("instruction")?.toString().trim() ?? "";
  const input = formData.get("input")?.toString().trim() ?? "";

  if (!instruction) {
    return { error: "Choose or describe what you'd like help with." };
  }

  const prompt = [
    "You are a Self Employment Advisor Assistant embedded in a case management",
    "tool for the Restart Scheme. Advisors use you to prepare participants for",
    "their Universal Credit Gateway appointment, where UC decides whether they",
    "are Gainfully Self Employed (GSE) or not (NGSE) — that decision is never",
    "made by the advisor. Be concise, practical, and specific to the",
    "participant's context below. Use British English and UK",
    "self-employment/HMRC conventions.",
    "",
    "Participant context:",
    contextSummary,
    "",
    `Advisor request: ${instruction}`,
    input ? `\nAdditional details from the advisor:\n${input}` : "",
  ].join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { error: `AI request failed (${response.status}): ${text.slice(0, 300)}` };
    }

    const data = await response.json();
    const text = data?.content?.find(
      (block: { type: string; text?: string }) => block.type === "text",
    )?.text;

    return { result: text || "The assistant didn't return a response." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI request failed." };
  }
}
