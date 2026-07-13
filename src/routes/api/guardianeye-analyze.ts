import { createFileRoute } from "@tanstack/react-router";

type AnalyzeBody = {
  mode?: "photo" | "voice" | "text";
  text?: string;
  imageBase64?: string;
  imageMime?: string;
  lang?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

function parseAiJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("The AI response did not include a report.");
  return JSON.parse(match[0]) as Record<string, string>;
}

export const Route = createFileRoute("/api/guardianeye-analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return json({ error: "AI is not configured for this demo yet." }, 500);

          const body = (await request.json().catch(() => ({}))) as AnalyzeBody;
          const mode = body.mode ?? "text";
          const lang = body.lang ?? "en-IN";
          const text = (body.text ?? "").trim();

          if (mode === "photo" && (!body.imageBase64 || !body.imageMime)) {
            return json({ error: "Please choose a photo first." }, 400);
          }
          if (mode !== "photo" && !text) {
            return json({ error: "Please describe the issue first." }, 400);
          }

          const wantsVoice = mode === "voice";
          const systemPrompt =
            mode === "photo"
              ? `You are GuardianEye, a civic issue analyzer. Given a photo of a local problem, identify:
1. Category (Sanitation, Road/Infrastructure, Water/Utility, Public Safety, Animal Welfare, Electrical, Other)
2. Severity (Low, Medium, High, Critical) based on visible risk to public safety or health
3. A professional, official-sounding complaint draft (2-3 sentences) describing what is visible, suitable for submission to a municipal authority
Respond ONLY as valid JSON in this exact shape: {"category":"...","severity":"...","draft":"..."}.
If the image does not show a clear civic issue, say so honestly in the draft and use category "Other" and severity "Low" instead of forcing a category.`
              : `You are GuardianEye. Given a spoken or written complaint transcript, possibly informal, short, or in another language, identify:
1. Category (Sanitation, Road/Infrastructure, Water/Utility, Public Safety, Animal Welfare, Electrical, Other)
2. Severity (Low, Medium, High, Critical)
3. A professional, official-sounding complaint draft (2-3 sentences) suitable for submission to a municipal authority, written in English.
${
  wantsVoice
    ? `4. A short, warm, reassuring voice_reply in the SAME LANGUAGE as the user's input (language hint: ${lang}), confirming their issue was logged and will be addressed.`
    : ""
}
Respond ONLY as valid JSON in this exact shape: ${
                  wantsVoice
                    ? `{"category":"...","severity":"...","draft":"...","voice_reply":"..."}`
                    : `{"category":"...","severity":"...","draft":"..."}`
                }.`;

          const userContent =
            mode === "photo"
              ? [
                  { type: "text", text: "Analyze this civic issue photo and draft the report." },
                  {
                    type: "image_url",
                    image_url: { url: `data:${body.imageMime};base64,${body.imageBase64}` },
                  },
                ]
              : text;

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
            },
            body: JSON.stringify({
              model: "openai/gpt-5.5",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent },
              ],
              response_format: { type: "json_object" },
            }),
          });

          if (!response.ok) {
            const message = await response.text().catch(() => "");
            return json({ error: message || `AI request failed with status ${response.status}.` }, response.status);
          }

          const result = (await response.json()) as {
            choices?: Array<{ message?: { content?: unknown } }>;
          };
          const output = parseAiJson(extractText(result.choices?.[0]?.message?.content));
          return json(output);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Something went wrong.";
          return json({ error: message }, 500);
        }
      },
    },
  },
});