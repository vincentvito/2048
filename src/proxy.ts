import { NextResponse, type NextRequest } from "next/server";

export function proxy(_request: NextRequest) {
  // For protected routes, redirect to home if no session
  // Currently no protected routes, but ready for future use
  // Example:
  // import { getSessionCookie } from "better-auth/cookies";
  // const sessionCookie = getSessionCookie(request);
  // if (request.nextUrl.pathname.startsWith('/dashboard') && !sessionCookie) {
  //   return NextResponse.redirect(new URL('/', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
