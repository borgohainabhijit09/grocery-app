import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";
import { auth } from "@/auth";

const PROTECTED_PREFIXES = ["/account", "/cart", "/checkout"];
const ADMIN_PREFIX = "/admin";
const ADMIN_LOGIN = "/admin/login";
const DELIVERY_PREFIX = "/delivery";

// Matches both the plain and __Secure- variants, including chunked cookies
// such as `authjs.session-token.0` used for large JWTs.
const SESSION_COOKIE = /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?$/;

/**
 * Auth.js cannot clear an undecryptable JWT cookie while rendering a server
 * component, so the browser keeps sending it on every request. Delete it from
 * the outgoing response once the request has been resolved as unauthenticated,
 * otherwise the stale cookie causes a JWTSessionError on every render.
 */
function finalize(req: NextAuthRequest, response: NextResponse) {
  if (!req.auth) {
    for (const cookie of req.cookies.getAll()) {
      if (SESSION_COOKIE.test(cookie.name)) {
        response.cookies.delete(cookie.name);
      }
    }
  }
  return response;
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const path = nextUrl.pathname;

  const next = () => finalize(req, NextResponse.next());
  const redirectTo = (target: string) =>
    finalize(req, NextResponse.redirect(new URL(target, nextUrl)));

  if (path.startsWith("/api/auth")) {
    // Never touch Auth.js's own cookies here: the sign-in callback sets a new
    // session cookie on the same response and a delete would clobber it.
    return NextResponse.next();
  }

  if (path.startsWith(ADMIN_PREFIX) && !path.startsWith(ADMIN_LOGIN)) {
    if (!isLoggedIn) {
      return redirectTo(ADMIN_LOGIN);
    }
    if (role === "DELIVERY") {
      return redirectTo(DELIVERY_PREFIX);
    }
    if (role !== "ADMIN" && role !== "STAFF") {
      return redirectTo("/");
    }
  }

  if (path.startsWith(DELIVERY_PREFIX)) {
    if (!isLoggedIn) {
      return redirectTo(ADMIN_LOGIN);
    }
    if (role !== "DELIVERY" && role !== "ADMIN" && role !== "STAFF") {
      return redirectTo("/");
    }
  }

  if (PROTECTED_PREFIXES.some((p) => path.startsWith(p)) && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("next", path);
    return finalize(req, NextResponse.redirect(loginUrl));
  }

  return next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
