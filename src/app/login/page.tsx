import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { getSession } from "@/server/auth/jwt";
import { LoginForm } from "@/features/auth/login-form";

async function LoginContent() {
  const session = await getSession();

  if (session) {
    redirect(
      session.role === "ADMIN" ? "/admin" : "/employee"
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-amber-50 via-white to-yellow-100 px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-2xl shadow-amber-100/60 md:grid-cols-2">

        {/* Branding panel */}
        <section className="hidden flex-col justify-between bg-yellow-400 p-12 text-stone-900 md:flex">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/80 p-3">
              <CalendarDays size={28} />
            </div>

            <span className="text-2xl font-bold">
              ResourceHub
            </span>
          </div>

          <div>
            <Sparkles size={36} className="mb-6" />

            <h1 className="text-4xl font-bold leading-tight">
              Your workspace,
              <br />
              perfectly organized.
            </h1>

            <p className="mt-5 max-w-sm text-stone-700">
              Manage shared resources, discover availability,
              and reserve with confidence.
            </p>
          </div>

          <p className="text-sm text-stone-700">
            Smart resource reservation management
          </p>
        </section>

        {/* Login form panel */}
        <section className="flex flex-col justify-center p-8 sm:p-12">
          <div className="mb-8">
            <div className="mb-5 inline-flex rounded-xl bg-yellow-100 p-3 text-amber-700 md:hidden">
              <CalendarDays />
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-stone-900">
              Welcome back
            </h2>

            <p className="mt-2 text-stone-500">
              Sign in to access your ResourceHub workspace.
            </p>
          </div>

          <LoginForm />

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-stone-400">
            <ShieldCheck size={15} />
            Secure role-based access
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-amber-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}