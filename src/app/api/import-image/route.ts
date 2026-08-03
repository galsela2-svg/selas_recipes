import { NextResponse } from "next/server";
import {
  FetchBlockedError,
  FetchFailedError,
  SsrfBlockedError,
  fetchImage,
} from "@/lib/recipe-scraper";
import { createClient } from "@/lib/supabase/server";

// Downloading + re-uploading a full-size image can take a few seconds on a
// slow source site.
export const maxDuration = 60;

const BUCKET = "recipe-photos";
const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "יש להתחבר." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const sourceUrl = typeof body?.url === "string" ? body.url.trim() : "";
  if (!sourceUrl) {
    return NextResponse.json({ error: "חסרה כתובת תמונה." }, { status: 400 });
  }

  let image: { data: ArrayBuffer; contentType: string };
  try {
    image = await fetchImage(sourceUrl);
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      return NextResponse.json({ error: "כתובת התמונה אינה נתמכת." }, { status: 400 });
    }
    if (err instanceof FetchBlockedError) {
      return NextResponse.json(
        { error: "האתר חוסם גישה לתמונה הזו. נסו תמונה אחרת מהתוצאות." },
        { status: 422 },
      );
    }
    if (err instanceof FetchFailedError && err.status === 415) {
      return NextResponse.json({ error: "הקישור הזה אינו תמונה תקינה." }, { status: 422 });
    }
    return NextResponse.json({ error: "לא הצלחנו להביא את התמונה. נסו תמונה אחרת." }, { status: 502 });
  }

  const ext = EXT_BY_CONTENT_TYPE[image.contentType] ?? "jpg";
  const path = `covers/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, image.data, { upsert: false, contentType: image.contentType });
  if (uploadError) {
    return NextResponse.json({ error: "שמירת התמונה נכשלה. נסו שוב." }, { status: 502 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
