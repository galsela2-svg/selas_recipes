import { GoogleGenAI } from "@google/genai";

// "gemini-2.0-flash" turned out to have zero free-tier quota for new API
// keys (Google's rolled it toward retirement) — "gemini-flash-latest" is a
// stable alias that always points at the current default flash model and
// does have free quota, so new model generations won't need this changed.
export const GEMINI_MODEL = "gemini-flash-latest";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
