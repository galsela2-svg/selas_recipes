import { GoogleGenAI } from "@google/genai";

// Fast, cheap, and (as of this writing) free-tier eligible — good fit for
// short structured-extraction calls like these instead of a heavier model.
export const GEMINI_MODEL = "gemini-2.0-flash";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
