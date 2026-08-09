import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/join"];

// Pages a signed-in but not-yet-in-any-family user should still be able to
// reach without being bounced to /family: /family itself (else an infinite
// redirect loop), and /shared/[token], since viewing a cross-family recipe
// share doesn't require a family — only importing it does, and that RPC
// enforces its own "you need a family" check server-side.
const FAMILY_GATE_EXEMPT_PATHS = ["/family", "/shared"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && path === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // A freshly-created account (from /join, or one that navigated away
  // before finishing family setup) has no family_members row yet, and
  // every family-scoped page would otherwise just render empty — send
  // them to /family, which already handles both "create your own" and
  // "you were invited" cases.
  if (
    user &&
    !isPublicPath &&
    !FAMILY_GATE_EXEMPT_PATHS.some((p) => path.startsWith(p))
  ) {
    const { data: membership } = await supabase
      .from("family_members")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/family";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
