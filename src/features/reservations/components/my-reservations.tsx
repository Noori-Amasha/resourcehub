"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Clock3,
  Search,
  RefreshCw,
  History,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import type {
  Reservation,
  ReservationApiResponse,
} from "@/types/reservations";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Colombo",
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string) {
  return DATE_FORMATTER.format(new Date(value));
}

export function MyReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [historyMode, setHistoryMode] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiClient<
        ReservationApiResponse<Reservation[]>
      >("/api/reservations?history=true");

      setReservations(result.data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load reservations.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    apiClient<ReservationApiResponse<Reservation[]>>(
      "/api/reservations?history=true",
    ).then(
      (result) => {
        if (active) {
          setReservations(result.data);
          setLoading(false);
        }
      },
      (err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load reservations.",
          );
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return reservations.filter((reservation) => {
      const historical = [
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
      ].includes(reservation.status);

      if (historyMode !== historical) return false;

      const text = [
        reservation.resourceUnit.unitCode,
        reservation.resourceUnit.resourceType.name,
        reservation.resourceUnit.resourceType.category.name,
        reservation.purpose ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const effectiveStatus = reservation.isOverdue
        ? "OVERDUE"
        : reservation.status;

      return (
        text.includes(search.toLowerCase()) &&
        (statusFilter === "ALL" ||
          effectiveStatus === statusFilter)
      );
    });
  }, [reservations, search, statusFilter, historyMode]);

  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const activeCount = reservations.filter(
    (reservation) =>
      reservation.status === "CONFIRMED" ||
      reservation.status === "CHECKED_OUT",
  ).length;

  const completedCount = reservations.filter(
    (reservation) => reservation.status === "COMPLETED",
  ).length;

  async function cancelReservation(reservation: Reservation) {
    if (
      !window.confirm(
        `Cancel reservation for ${reservation.resourceUnit.unitCode}?\n\n` +
        "This action cannot be undone.",
      )
    ) {
      return;
    }

    setBusyId(reservation.id);

    try {
      await apiClient(
        `/api/reservations/${reservation.id}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({
            reason: "USER_REQUEST",
          }),
        },
      );

      toast.success("Reservation cancelled.");
      await loadReservations();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Cancellation failed.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function switchView(history: boolean) {
    setHistoryMode(history);
    setStatusFilter("ALL");
    setSearch("");
    setPage(1);
  }

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-blue-100 text-blue-700",
    CHECKED_OUT: "bg-purple-100 text-purple-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-stone-200 text-stone-700",
    OVERDUE: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-7">
      <div className="rounded-3xl bg-linear-to-r from-yellow-300 to-amber-100 p-7">
        <h2 className="text-3xl font-extrabold">
          My Reservations
        </h2>
        <p className="mt-2 text-stone-600">
          View bookings, track resource usage, and review history.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Reservations", value: reservations.length, icon: CalendarCheck },
          { label: "Active Reservations", value: activeCount, icon: Clock3 },
          { label: "Completed", value: completedCount, icon: History },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm"
            >
              <Icon
                size={25}
                className="mb-4 text-amber-600"
              />
              <p className="text-3xl font-extrabold">
                {loading ? "—" : stat.value}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => switchView(false)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                !historyMode
                  ? "bg-yellow-400 text-stone-900"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              Current
            </button>
            <button
              type="button"
              onClick={() => switchView(true)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                historyMode
                  ? "bg-yellow-400 text-stone-900"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              History
            </button>
          </div>

          <button
            type="button"
            onClick={() => void loadReservations()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-3 p-5 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-3 text-stone-400"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search reservations..."
              className="w-full rounded-xl border border-stone-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-amber-400"
            />
          </div>

          <select
            aria-label="Filter reservation status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm"
          >
            <option value="ALL">All statuses</option>
            {(historyMode
              ? ["COMPLETED", "CANCELLED", "NO_SHOW"]
              : ["CONFIRMED", "CHECKED_OUT", "OVERDUE"]
            ).map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div role="alert" className="mx-5 mb-4 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-stone-500">
            Loading reservations...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-amber-50 text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-5 py-4">Resource</th>
                  <th className="px-5 py-4">Start</th>
                  <th className="px-5 py-4">End</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100">
                {visible.map((reservation) => {
                  const effectiveStatus = reservation.isOverdue
                    ? "OVERDUE"
                    : reservation.status;

                  return (
                    <tr
                      key={reservation.id}
                      className="hover:bg-amber-50/40"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {reservation.resourceUnit.resourceType.name}
                        </p>
                        <p className="text-xs text-stone-500">
                          {reservation.resourceUnit.unitCode}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {formatDate(reservation.startTime)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {formatDate(reservation.endTime)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            statusColors[effectiveStatus] ??
                            "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {effectiveStatus.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {reservation.status === "CONFIRMED" && (
                          <button
                            type="button"
                            disabled={busyId === reservation.id}
                            onClick={() =>
                              void cancelReservation(reservation)
                            }
                            className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            {busyId === reservation.id
                              ? "Cancelling..."
                              : "Cancel"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center text-stone-500"
                    >
                      No reservations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-stone-100 p-4">
          <p className="text-xs text-stone-500">
            {filtered.length} results · Page {safePage} of {pages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border border-stone-200 px-3 py-2 disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={safePage === pages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border border-stone-200 px-3 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}