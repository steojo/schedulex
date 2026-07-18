// Next 16 names middleware `proxy.ts`. Gates everything behind the session
// cookie except the login surface and static assets.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifySession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  if (await verifySession(request.cookies.get(COOKIE)?.value)) {
    return NextResponse.next();
  }

  // API calls get a 401 rather than an HTML redirect they can't parse.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};
