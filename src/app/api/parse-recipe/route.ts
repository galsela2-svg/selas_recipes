import { NextResponse } from "next/server";
import {
  FetchBlockedError,
  FetchFailedError,
  fetchHtml,
  parseRecipeFromHtml,
} from "@/lib/recipe-scraper";

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "::1"]);

function isPrivateHostname(hostname: string): boolean {
  if (BLOCKED_HOSTNAMES.has(hostname)) return true;

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  return hostname.endsWith(".local");
}

function validateUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (isPrivateHostname(url.hostname)) return null;

  return url;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";

  if (!rawUrl) {
    return NextResponse.json({ error: "יש להזין כתובת URL." }, { status: 400 });
  }

  const url = validateUrl(rawUrl);
  if (!url) {
    return NextResponse.json({ error: "כתובת ה-URL אינה תקינה." }, { status: 400 });
  }

  let html: string;
  try {
    html = await fetchHtml(url.toString());
  } catch (err) {
    if (err instanceof FetchBlockedError) {
      return NextResponse.json(
        {
          error:
            "האתר הזה חוסם גישה אוטומטית לתוכן שלו. פתחו את הקישור בדפדפן והזינו את המתכון ידנית.",
        },
        { status: 422 },
      );
    }
    if (err instanceof FetchFailedError) {
      return NextResponse.json(
        { error: `הדף החזיר סטטוס ${err.status}.` },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: "לא הצלחנו להגיע לכתובת הזו. בדקו את הקישור ונסו שוב." },
      { status: 502 },
    );
  }

  const recipe = parseRecipeFromHtml(html, url.toString());

  if (!recipe) {
    return NextResponse.json(
      {
        error:
          "לא נמצאו נתוני מתכון בדף הזה. נסו קישור אחר או הזינו את המתכון ידנית.",
      },
      { status: 422 },
    );
  }

  return NextResponse.json(recipe);
}
