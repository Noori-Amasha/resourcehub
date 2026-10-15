import Link from "next/link";
import {
  CalendarDays,
  CalendarCheck,
  ArrowRight,
} from "lucide-react";

export default function EmployeeDashboard() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-linear-to-r from-yellow-300 to-amber-100 p-8">
        <CalendarDays size={32} className="mb-5" />

        <h2 className="text-3xl font-bold">
          Your Resource Workspace
        </h2>

        <p className="mt-3 max-w-xl text-stone-700">
          Discover shared resources, check availability,
          and manage your reservations in one place.
        </p>

        <Link
          href="/employee/book"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
        >
          Browse resources
          <ArrowRight size={18} />
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Link
          href="/employee/book"
          className="rounded-2xl border border-amber-100 bg-white p-7 shadow-sm transition hover:shadow-md"
        >
          <CalendarDays className="mb-4 text-amber-600" size={28} />
          <h3 className="text-xl font-bold">Book a Resource</h3>
          <p className="mt-2 text-sm text-stone-500">
            Find available resources and make a reservation.
          </p>
        </Link>

        <Link
          href="/employee/reservations"
          className="rounded-2xl border border-amber-100 bg-white p-7 shadow-sm transition hover:shadow-md"
        >
          <CalendarCheck className="mb-4 text-amber-600" size={28} />
          <h3 className="text-xl font-bold">My Reservations</h3>
          <p className="mt-2 text-sm text-stone-500">
            View upcoming bookings and reservation history.
          </p>
        </Link>
      </div>
    </div>
  );
}
