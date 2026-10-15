import { Suspense } from "react";
import { redirect } from "next/navigation";

import { authService } from "@/server/modules/auth/service";
import { getSession } from "@/server/auth/jwt";
import { DashboardShell } from "@/components/layout/dashboard-shell";

async function EmployeeContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "EMPLOYEE") {
    redirect("/admin");
  }

  const user = await authService.getCurrentUser(session.userId);

  if (!user || user.role !== "EMPLOYEE") {
    redirect("/login");
  }

  return (
    <DashboardShell user={user}>
      {children}
    </DashboardShell>
  );
}

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <EmployeeContent>{children}</EmployeeContent>
    </Suspense>
  );
}

function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-sm">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
        <span className="font-medium text-stone-700">
          Loading your workspace...
        </span>
      </div>
    </div>
  );
}