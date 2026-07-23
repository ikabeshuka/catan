import { GeminiActionResponse, GeminiBoardSnapshot } from './geminiTypes';

const SYSTEM_INSTRUCTION = `You are an expert Catan & Seafarers AI Bot player.
Your goal is to win the game by reaching 10-12 Victory Points.

Rules and Strategy:
1. Priority: Cities > Settlements > Ships/Roads > Development Cards.
2. Seafarers & Fog Island Rules:
   - Building ships towards hidden FOG tiles reveals new resource tiles and grants exploration advantages.
   - Reaching secondary islands (islandId > 1) awards bonus victory points.
3. Always return a valid JSON matching the exact required schema. Do not output markdown code blocks outside JSON.

Response Schema:
{
  "thought": "Short English summary of strategy",
  "reasoningInHebrew": "תקציר בעברית של שיקול הדעת שיוצג ביומן המשחק",
  "action": "BUILD_SETTLEMENT" | "BUILD_CITY" | "BUILD_ROAD" | "BUILD_SHIP" | "BUY_DEV_CARD" | "END_TURN",
  "targetId": "string (vertex or edge ID if applicable)"
}`;

export async function getGeminiMove(
  apiKey: string,
  snapshot: GeminiBoardSnapshot,
  modelName: string = 'gemini-2.5-flash'
): Promise<GeminiActionResponse> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const promptText = `Current Catan Board State:\n${JSON.stringify(snapshot, null, 2)}\n\nSelect your best action from the available legalActions.`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }],
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('No content returned from Gemini API.');
    }

    const parsed: GeminiActionResponse = JSON.parse(candidateText);
    return parsed;
  } catch (error) {
    console.error('Gemini Service Failed:', error);
    return {
      thought: 'Fallback due to API error',
      reasoningInHebrew: 'תקלה בתקשורת עם Gemini, מפעיל לוגיקה מקומית',
      action: 'END_TURN',
    };
  }
}