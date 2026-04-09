/**
 * CardSnap — analyze-card Netlify Function
 *
 * POST /api/analyze-card
 * Body: { base64: string, mime: string }
 *
 * Calls Claude vision API server-side (API key never touches the client).
 * Set ANTHROPIC_API_KEY in Netlify → Site → Environment Variables.
 *
 * To use Gemini instead:
 *   1. Set GEMINI_API_KEY in environment variables
 *   2. Set AI_PROVIDER=gemini in environment variables
 */

const PROMPT = `You are a sports card expert. Analyze this card image and return ONLY valid JSON — no markdown, no explanation, no extra text.

{
  "player_name": string or null,
  "year": string or null,
  "brand": string or null,
  "set_name": string or null,
  "card_number": string or null,
  "parallel": string or null,
  "sport": "football" or "basketball" or "baseball" or "hockey" or "soccer" or null,
  "team": string or null,
  "is_rookie_card": boolean,
  "has_autograph": boolean,
  "has_patch": boolean,
  "is_graded": boolean,
  "grading_company": "PSA" or "BGS" or "SGC" or "CGC" or "CSG" or "HGA" or null,
  "grade": string or null,
  "suggested_title": string,
  "confidence": {
    "player_name": number 0-1,
    "year": number 0-1,
    "set_name": number 0-1,
    "parallel": number 0-1,
    "grade": number 0-1
  }
}

Rules:
- suggested_title max 80 chars: [YEAR] [Brand] [Set] [Player] #[Number] [Parallel] [RC] [Grade]
- If card is in a PSA/BGS/SGC slab, read the label carefully for company and grade
- RC logo or the word Rookie on the card = is_rookie_card true
- confidence is 0.0 to 1.0 for each field based on how clearly you can read it`;

async function callClaude(base64, mime) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mime, data: base64 } },
          { type: "text", text: PROMPT },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(`Claude error: ${data.error.message}`);

  const text = data.content?.[0]?.text || "";
  return text;
}

async function callGemini(base64, mime) {
  const key = process.env.GEMINI_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mime, data: base64 } },
        ]}],
        generationConfig: { response_mime_type: "application/json" },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

function extractJSON(text) {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in AI response");
  return JSON.parse(match[0]);
}

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // CORS headers so the frontend can call this
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const { base64, mime } = JSON.parse(event.body);

    if (!base64 || !mime) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing base64 or mime" }) };
    }

    const provider = process.env.AI_PROVIDER || "gemini";
    let rawText;

    if (provider === "gemini") {
      if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set in environment");
      rawText = await callGemini(base64, mime);
    } else {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set in environment");
      rawText = await callClaude(base64, mime);
    }

    const cardData = extractJSON(rawText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, card: cardData }),
    };

  } catch (err) {
    console.error("analyze-card error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
