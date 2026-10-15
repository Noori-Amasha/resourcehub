"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  CalendarPlus,
  ChartNoAxesCombined,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Bell,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import type { AuthUser } from "@/types/auth";

interface DashboardShellProps {
  user: AuthUser;
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isAdmin = user.role === "ADMIN";

  const navigation = isAdmin
    ? [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Resource Management", href: "/admin/resources", icon: Package },
        { label: "Reservation Management", href: "/admin/reservations", icon: CalendarCheck },
      ]
    : [
        { label: "Dashboard", href: "/employee", icon: LayoutDashboard },
        { label: "Resource Booking", href: "/employee/book", icon: CalendarPlus },
        { label: "My Reservations", href: "/employee/reservations", icon: CalendarCheck },
      ];

  const comingSoon = [
    { label: "Analytics", icon: ChartNoAxesCombined },
    { label: "Notifications", icon: Bell },
    { label: "Settings", icon: Settings },
  ];

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await apiClient("/api/auth/logout", {
        method: "POST",
      });

      toast.success("Signed out successfully.");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Unable to sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  const currentPage =
    navigation.find((item) => item.href === pathname)?.label ??
    navigation.find(
      (item) => pathname.startsWith(`${item.href}/`),
    )?.label ??
    "Dashboard";

  return (
    <div className="min-h-screen bg-[#FFFCF5] text-stone-900">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-stone-900/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-amber-100 bg-white/95 shadow-lg backdrop-blur-xl transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-amber-100 px-6">
          <Link href={isAdmin ? "/admin" : "/employee"} className="flex items-center gap-3">
            <div className="rounded-xl bg-yellow-400 p-2.5">
              <Package size={23} />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              ResourceHub
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-2 px-4 py-6">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-stone-400">
            Workspace
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-yellow-400 text-stone-900 shadow-sm"
                    : "text-stone-600 hover:bg-amber-50"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={19} />
                  {item.label}
                </span>

                {active && <ChevronRight size={17} />}
              </Link>
            );
          })}

          <p className="mb-3 mt-9 px-3 text-xs font-bold uppercase tracking-widest text-stone-400">
            More
          </p>

          {comingSoon.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                aria-disabled="true"
                title="Not available in this version"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-stone-400 opacity-60"
              >
                <Icon size={19} />
                {item.label}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-amber-100 p-4">
          <div className="mb-3 rounded-xl bg-amber-50 p-4">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-xs text-stone-500">{user.email}</p>
            <p className="mt-2 text-xs font-bold text-amber-700">
              {user.role}
            </p>
          </div>

          <button
            type="button"
            disabled={loggingOut}
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut size={18} />
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-amber-100 bg-white/85 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-2 hover:bg-amber-50 lg:hidden"
            >
              <Menu size={23} />
            </button>

            <div>
              <p className="text-xs font-medium text-stone-400">
                Workspace / {currentPage}
              </p>
              <h1 className="text-xl font-bold sm:text-2xl">
                {currentPage}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 sm:inline-flex">
              {isAdmin ? "Administrator" : "Employee"}
            </span>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="w-full flex-1 p-5 sm:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

        <footer className="border-t border-amber-100 bg-white px-6 py-5 text-center text-xs text-stone-500 sm:flex sm:justify-between sm:text-left">
          <span>© {new Date().getFullYear()} ResourceHub</span>
          <span>Resource Reservation Management System</span>
        </footer>
      </div>
    </div>
  );
}