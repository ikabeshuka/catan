import { GeminiStrategyPlan, GeminiBoardSnapshot, GeminiActionResponse } from './geminiTypes';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';

const SYSTEM_INSTRUCTION = `You are an expert Catan & Seafarers AI Bot player.
Your goal is to formulate a high-level strategic plan for the next 4-6 turns to win the game (reaching 10-12 VPs).

Strategy Principles:
1. Priority: Cities & Settlements > Roads/Ships > Development Cards.
2. Seafarers & Fog Island: Expand towards FOG tiles and settle secondary islands for VP bonuses.

Always return a valid JSON matching the exact required schema. Do not output markdown code blocks outside JSON.

Response Schema:
{
  "thought": "Short English summary of long-term strategy",
  "reasoningInHebrew": "תקציר בעברית של התוכנית האסטרטגית ל-5 התורות הקרובות ליומן המשחק",
  "goal": "EXPAND_TO_FOG_ISLAND" | "UPGRADE_CITIES" | "BUILD_ROAD_NETWORK" | "BUY_DEV_CARDS",
  "targetVertexId": "string (target vertex ID if applicable, or null)",
  "targetEdgeId": "string (target edge ID if applicable, or null)",
  "ttlTurns": 5
}`;

export async function getGeminiStrategy(
  apiKey: string,
  snapshot: GeminiBoardSnapshot,
  modelName: string = DEFAULT_GEMINI_MODEL
): Promise<GeminiStrategyPlan> {
  const activeModel = modelName.trim() || DEFAULT_GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

  const promptText = `Current Catan Board State:\n${JSON.stringify(snapshot, null, 2)}\n\nFormulate your high-level strategy plan for the upcoming turns.`;

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
      if (response.status === 404) {
        throw new Error(`MODEL_404: המודל '${activeModel}' אינו נתמך עוד. יש לעדכן את שם המודל בהגדרות.`);
      }
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('No content returned from Gemini API.');
    }

    return JSON.parse(candidateText) as GeminiStrategyPlan;
  } catch (error: any) {
    console.error('Gemini Service Failed:', error);
    const is404 = error?.message?.includes('MODEL_404');
    
    return {
      thought: 'Fallback due to API error',
      reasoningInHebrew: is404 
        ? `⚠️ דגם Gemini (${activeModel}) אינו זמין (404). עברו להגדרות לעדכון הדגם. מפעיל לוגיקה מקומית.`
        : 'תקלה בתקשורת עם Gemini API, מפעיל לוגיקה מקומית.',
      goal: 'BUILD_ROAD_NETWORK',
      ttlTurns: 3,
    };
  }
}

// מעטפת תאימות לפונקציה הישנה במידת הצורך
export async function getGeminiMove(
  apiKey: string,
  snapshot: GeminiBoardSnapshot,
  modelName: string = DEFAULT_GEMINI_MODEL
): Promise<GeminiActionResponse> {
  const strategy = await getGeminiStrategy(apiKey, snapshot, modelName);
  return {
    thought: strategy.thought,
    reasoningInHebrew: strategy.reasoningInHebrew,
    action: 'END_TURN',
  };
}