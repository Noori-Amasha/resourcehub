import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/jwt";

async function HomeContent() {
  const session = await getSession();

  if (!session) {
    return redirect("/login");
  }

  if (session.role === "ADMIN") {
    return redirect("/admin");
  }

  return redirect("/employee");
}

export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-sm">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />

        <span className="font-medium text-stone-700">
          Loading ResourceHub...
        </span>
      </div>
    </div>
  );
}