import { NextResponse } from "next/server";
import { COOKIE, checkPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = (await request.json().catch(() => ({}))) as {
    password?: string;
  };

  if (typeof password !== "string" || !checkPassword(password)) {
    // Deliberately vague, and slow enough to make guessing tedious.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const session = await createSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}
