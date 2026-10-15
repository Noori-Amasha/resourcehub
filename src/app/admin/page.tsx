import Link from "next/link";
import {
  CalendarCheck,
  Package,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function AdminDashboard() {
  const sections = [
    {
      title: "Resource Management",
      description:
        "Manage categories, resource types, physical units and maintenance.",
      href: "/admin/resources",
      icon: Package,
    },
    {
      title: "Reservation Management",
      description:
        "Manage bookings, checkouts, returns and reservation history.",
      href: "/admin/reservations",
      icon: CalendarCheck,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-linear-to-r from-yellow-300 to-amber-100 p-8">
        <div className="mb-4 inline-flex rounded-xl bg-white/70 p-3">
          <ShieldCheck size={26} />
        </div>

        <h2 className="text-3xl font-bold text-stone-900">
          Admin Workspace
        </h2>

        <p className="mt-2 max-w-xl text-stone-700">
          Manage organizational resources and oversee the
          complete reservation lifecycle.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-2xl border border-amber-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 inline-flex rounded-xl bg-amber-100 p-3 text-amber-700">
                <Icon size={25} />
              </div>

              <h3 className="text-xl font-bold">
                {section.title}
              </h3>

              <p className="mt-2 text-sm text-stone-500">
                {section.description}
              </p>

              <div className="mt-6 flex items-center gap-2 text-sm font-bold text-amber-700">
                Open management
                <ArrowRight
                  size={17}
                  className="transition group-hover:translate-x-1"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
