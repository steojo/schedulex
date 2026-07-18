"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setError("Incorrect password");
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-xs">
        <h1 className="text-2xl font-bold tracking-tight">schedulex</h1>
        <p className="mt-1 text-sm text-muted">Personal X scheduler</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="mt-6 w-full rounded-full border border-edge bg-transparent px-4 py-2.5 text-[15px] outline-none placeholder:text-muted focus:border-accent"
        />

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy || !password}
          className="mt-4 w-full rounded-full bg-accent px-4 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "…" : "Enter"}
        </button>
      </form>
    </main>
  );
}
