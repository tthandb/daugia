import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  // Protect /admin/* routes (but not /login)
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Basic JWT structure check (3 base64 parts)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Check expiry from payload
    try {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("token");
        return response;
      }
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect /login to /admin if already authenticated
  if (request.nextUrl.pathname === "/login" && token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      }
    } catch {
      // Invalid token, let them see login
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
