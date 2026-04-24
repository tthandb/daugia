"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Đăng nhập thất bại" }));
        throw new Error(data.error || "Đăng nhập thất bại");
      }

      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-white px-4">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-warm-border bg-white shadow-sm">
        {/* Header */}
        <div className="bg-charcoal px-6 py-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-gold">ĐẤUGIÁ.</h1>
          <p className="mt-2 font-body text-sm text-white/70">
            Đăng nhập vào trang quản trị
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-8">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block font-body text-sm font-medium text-fg"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-md border border-warm-border bg-white px-3 py-2 font-body text-sm text-fg outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold"
              placeholder="admin@daugia.vn"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block font-body text-sm font-medium text-fg"
            >
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-warm-border bg-white px-3 py-2 font-body text-sm text-fg outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold"
              placeholder="********"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 font-body text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-charcoal px-4 py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-gold disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
