import { NextResponse, type NextRequest } from "next/server";

// Duplicated from src/lib/auth.ts on purpose: that module imports Prisma and
// `server-only`, neither of which can load in the proxy runtime.
const SESSION_COOKIE = "crm_session";

/**
 * A cheap gate, not the authorisation check. It only asks whether a session
 * cookie is present — the cookie's validity is verified against the database
 * in src/app/(app)/layout.tsx, which is what actually protects the pages.
 */
export function proxy(request: NextRequest) {
  const hasCookie = request.cookies.has(SESSION_COOKIE);
  // The whole subtree, not just /login: password recovery and QR sign-in live
  // under it and are by definition reachable without a session.
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");

  if (!hasCookie && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // /approve/<id> is deliberately *not* public: scanning a QR while signed out
  // should land on /login, because an approval is only meaningful from a device
  // that is already the account.
  if (hasCookie && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
