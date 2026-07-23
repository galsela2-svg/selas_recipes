import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findCoverImageForTitle } from "@/lib/find-cover-image";

export const maxDuration = 60;

// Used to auto-fill a cover image for a recipe that doesn't have one yet —
// called from the recipe detail page the first time it's opened without an
// image, not tied to any particular import flow.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "יש להתחבר." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title : "";
  if (!title.trim()) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  const image_url = await findCoverImageForTitle(title, supabase);
  return NextResponse.json({ image_url });
}
