"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import type { LoginResponse } from "@/types/auth";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    const result = loginSchema.safeParse({
      email,
      password,
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient<LoginResponse>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify(result.data),
        },
      );

      toast.success("Welcome to ResourceHub!");

      router.replace(response.redirectTo);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-semibold text-stone-700"
        >
          Email address
        </label>

        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-semibold text-stone-700"
        >
          Password
        </label>

        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 pr-12 text-stone-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-4 top-3.5 text-stone-500 hover:text-stone-900"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-stone-900 shadow-sm transition hover:bg-yellow-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <LoaderCircle size={19} className="animate-spin" />
        ) : (
          <LogIn size={19} />
        )}

        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}