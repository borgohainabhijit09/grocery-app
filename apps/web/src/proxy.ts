import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PROTECTED_PREFIXES = ["/account", "/cart", "/checkout"];
const ADMIN_PREFIX = "/admin";
const ADMIN_LOGIN = "/admin/login";
const DELIVERY_PREFIX = "/delivery";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const path = nextUrl.pathname;

  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (path.startsWith(ADMIN_PREFIX) && !path.startsWith(ADMIN_LOGIN)) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN, nextUrl));
    }
    if (role === "DELIVERY") {
      return NextResponse.redirect(new URL(DELIVERY_PREFIX, nextUrl));
    }
    if (role !== "ADMIN" && role !== "STAFF") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  if (path.startsWith(DELIVERY_PREFIX)) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN, nextUrl));
    }
    if (role !== "DELIVERY" && role !== "ADMIN" && role !== "STAFF") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  if (PROTECTED_PREFIXES.some((p) => path.startsWith(p)) && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
