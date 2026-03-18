import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  // Check for session cookie (lightweight check)
  const sessionCookie = getSessionCookie(request);

  // For protected routes, redirect to home if no session
  // Currently no protected routes, but ready for future use
  // Example: if (request.nextUrl.pathname.startsWith('/dashboard') && !sessionCookie) {
  //   return NextResponse.redirect(new URL('/', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
