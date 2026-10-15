"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import type {
  Reservation,
  ReservationApiResponse,
} from "@/types/reservations";

type Action = "checkout" | "return" | "cancel" | "no-show";

interface AuditEvent {
  id: string;
  eventType?: string;
  type?: string;
  createdAt: string;
  details?: unknown;
  metadata?: unknown;
  actor?: {
    id: string;
    name: string;
    role?: string;
  } | null;
}

const PAGE_SIZE = 8;

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Colombo",
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string) {
  return formatter.format(new Date(value));
}

const statusColors: Record<string, string> = {
  CONFIRMED: "bg-blue-100 text-blue-700",
  CHECKED_OUT: "bg-purple-100 text-purple-700",
  OVERDUE: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-stone-200 text-stone-700",
};

function displayStatus(
  reservation: Reservation,
  now: number,
) {
  if (
    reservation.status === "CHECKED_OUT" &&
    new Date(reservation.endTime).getTime() < now
  ) {
    return "OVERDUE";
  }

  return reservation.status;
}

function getAvailableActions(
  reservation: Reservation,
  now: number,
): Action[] {
  const start = new Date(reservation.startTime).getTime();
  const end = new Date(reservation.endTime).getTime();

  if (reservation.status === "CHECKED_OUT") {
    return ["return"];
  }

  if (reservation.status !== "CONFIRMED") {
    return [];
  }

  const actions: Action[] = [];

  if (now >= start && now < end) {
    actions.push("checkout");
  }

  if (now >= start) {
    actions.push("no-show");
  }

  actions.push("cancel");

  return actions;
}

export function AdminReservations() {
  const [reservations, setReservations] = useState<
    Reservation[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [historyMode, setHistoryMode] = useState(false);
  const [page, setPage] = useState(1);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const [selected, setSelected] =
    useState<Reservation | null>(null);

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiClient<
        ReservationApiResponse<Reservation[]>
      >("/api/reservations?history=true");

      setReservations(response.data);
      setNow(Date.now());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load reservations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    apiClient<ReservationApiResponse<Reservation[]>>(
      "/api/reservations?history=true",
    ).then(
      (response) => {
        if (!active) return;

        setReservations(response.data);
        setNow(Date.now());
        setLoading(false);
      },
      (err: unknown) => {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load reservations.",
        );

        setLoading(false);
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

      if (historyMode !== historical) {
        return false;
      }

      const searchable = [
        reservation.employee?.name ?? "",
        reservation.employee?.email ?? "",
        reservation.resourceUnit.unitCode,
        reservation.resourceUnit.resourceType.name,
        reservation.resourceUnit.resourceType.category.name,
        reservation.purpose ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return (
        searchable.includes(search.trim().toLowerCase()) &&
        (status === "ALL" ||
          displayStatus(reservation, now) === status)
      );
    });
  }, [reservations, search, status, historyMode, now]);

  const pages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE),
  );

  const safePage = Math.min(page, pages);

  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const stats = [
    {
      label: "Total Reservations",
      count: reservations.length,
      icon: ClipboardList,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Confirmed",
      count: reservations.filter(
        (item) => item.status === "CONFIRMED",
      ).length,
      icon: CalendarCheck,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "Checked Out",
      count: reservations.filter(
        (item) => item.status === "CHECKED_OUT",
      ).length,
      icon: Clock3,
      color: "bg-purple-100 text-purple-700",
    },
    {
      label: "Overdue",
      count: reservations.filter(
        (item) => displayStatus(item, now) === "OVERDUE",
      ).length,
      icon: AlertTriangle,
      color: "bg-orange-100 text-orange-700",
    },
    {
      label: "Completed",
      count: reservations.filter(
        (item) => item.status === "COMPLETED",
      ).length,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-700",
    },
  ];

  async function viewEvents(reservation: Reservation) {
    setSelected(reservation);
    setEvents([]);
    setEventsError("");
    setEventsLoading(true);

    try {
      const response = await apiClient<
        ReservationApiResponse<AuditEvent[]>
      >(`/api/reservations/${reservation.id}/events`);

      setEvents(response.data);
    } catch (err) {
      setEventsError(
        err instanceof Error
          ? err.message
          : "Unable to load audit events.",
      );
    } finally {
      setEventsLoading(false);
    }
  }

  async function performAction(
    reservation: Reservation,
    action: Action,
  ) {
    const labels: Record<Action, string> = {
      checkout: "Check out",
      return: "Return",
      cancel: "Cancel",
      "no-show": "Mark no-show",
    };

    const confirmed = window.confirm(
      `${labels[action]} ${reservation.resourceUnit.unitCode}?\n\n` +
        `Employee: ${reservation.employee?.name ?? "Unknown"}\n` +
        `Starts: ${formatDate(reservation.startTime)}\n\n` +
        "Confirm this action?",
    );

    if (!confirmed) {
      return;
    }

    setBusyId(reservation.id);

    try {
      await apiClient(
        `/api/reservations/${reservation.id}/${action}`,
        {
          method: "POST",
          ...(action === "cancel"
            ? {
                body: JSON.stringify({}),
              }
            : {}),
        },
      );

      toast.success(`${labels[action]} successful.`);

      await loadReservations();

      if (selected?.id === reservation.id) {
        await viewEvents(reservation);
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Action failed.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function switchView(history: boolean) {
    setHistoryMode(history);
    setStatus("ALL");
    setSearch("");
    setPage(1);
  }

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <div className="rounded-3xl bg-linear-to-r from-yellow-300 via-amber-100 to-white p-7">
        <div className="mb-3 inline-flex rounded-xl bg-white/70 p-3">
          <CalendarCheck size={26} />
        </div>

        <h2 className="text-3xl font-extrabold text-stone-900">
          Reservation Management
        </h2>

        <p className="mt-2 text-stone-600">
          Monitor employee bookings, manage checkouts and returns,
          and review reservation audit activity.
        </p>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm"
            >
              <span
                className={`mb-4 inline-flex rounded-xl p-3 ${stat.color}`}
              >
                <Icon size={22} />
              </span>

              <p className="text-3xl font-extrabold">
                {loading ? "—" : stat.count}
              </p>

              <p className="mt-1 text-sm text-stone-500">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Reservation table */}
      <section className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => switchView(false)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                !historyMode
                  ? "bg-yellow-400 text-stone-900"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
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
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              History
            </button>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => void loadReservations()}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        {/* Search and filtering */}
        <div className="flex flex-col gap-3 p-5 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-3 text-stone-400"
            />

            <input
              aria-label="Search reservations"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search employee, unit code, resource..."
              className="w-full rounded-xl border border-stone-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-amber-400"
            />
          </div>

          <select
            aria-label="Filter reservation status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm"
          >
            <option value="ALL">All statuses</option>

            {(historyMode
              ? ["COMPLETED", "CANCELLED", "NO_SHOW"]
              : ["CONFIRMED", "CHECKED_OUT", "OVERDUE"]
            ).map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div
            role="alert"
            className="mx-5 mb-4 rounded-xl bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-16 text-stone-500">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading reservations...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-amber-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-5 py-4">Employee</th>
                  <th className="px-5 py-4">Resource</th>
                  <th className="px-5 py-4">Schedule</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100">
                {visible.map((reservation) => {
                  const currentStatus = displayStatus(
                    reservation,
                    now,
                  );

                  const actions = getAvailableActions(
                    reservation,
                    now,
                  );

                  return (
                    <tr
                      key={reservation.id}
                      className="hover:bg-amber-50/40"
                    >
                      {/* Employee */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-stone-900">
                          {reservation.employee?.name ?? "Unknown"}
                        </p>

                        <p className="text-xs text-stone-500">
                          {reservation.employee?.email ?? "—"}
                        </p>
                      </td>

                      {/* Resource */}
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {
                            reservation.resourceUnit.resourceType
                              .name
                          }
                        </p>

                        <p className="text-xs text-stone-500">
                          {reservation.resourceUnit.unitCode}
                        </p>

                        <p className="text-xs text-stone-400">
                          {
                            reservation.resourceUnit.resourceType
                              .category.name
                          }
                        </p>
                      </td>

                      {/* Schedule */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <p>
                          {formatDate(reservation.startTime)}
                        </p>

                        <p className="mt-1 text-xs text-stone-500">
                          To {formatDate(reservation.endTime)}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            statusColors[currentStatus] ??
                            "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {currentStatus.replaceAll("_", " ")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void viewEvents(reservation)
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <History size={14} />
                            Audit
                          </button>

                          {actions.map((action) => (
                            <button
                              key={action}
                              type="button"
                              disabled={busyId !== null}
                              onClick={() =>
                                void performAction(
                                  reservation,
                                  action,
                                )
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                                action === "checkout"
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : action === "return"
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : action === "cancel"
                                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                                      : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              }`}
                            >
                              {busyId === reservation.id
                                ? "Processing..."
                                : action === "checkout"
                                  ? "Check Out"
                                  : action === "return"
                                    ? "Return"
                                    : action === "no-show"
                                      ? "No Show"
                                      : "Cancel"}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-16 text-center text-stone-500"
                    >
                      No reservations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-stone-100 p-4">
          <p className="text-xs text-stone-500">
            {filtered.length} results · Page {safePage} of{" "}
            {pages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() =>
                setPage((value) => value - 1)
              }
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={safePage >= pages}
              onClick={() =>
                setPage((value) => value + 1)
              }
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Audit Trail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-title"
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3
                  id="audit-title"
                  className="text-xl font-bold"
                >
                  Reservation Audit Trail
                </h3>

                <p className="mt-1 text-sm text-stone-500">
                  {selected.resourceUnit.unitCode}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close audit trail"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 hover:bg-stone-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {eventsLoading ? (
                <p className="text-stone-500">
                  Loading audit events...
                </p>
              ) : eventsError ? (
                <p
                  role="alert"
                  className="text-red-600"
                >
                  {eventsError}
                </p>
              ) : events.length === 0 ? (
                <p className="text-stone-500">
                  No audit events found.
                </p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="border-l-4 border-yellow-400 bg-amber-50/60 p-4"
                  >
                    <p className="font-bold">
                      {(
                        event.eventType ??
                        event.type ??
                        "EVENT"
                      ).replaceAll("_", " ")}
                    </p>

                    <p className="mt-1 text-xs text-stone-500">
                      {formatDate(event.createdAt)}
                    </p>

                    <p className="mt-2 text-sm">
                      By {event.actor?.name ?? "System"}
                    </p>

                    {(event.details ?? event.metadata) != null && (
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs text-stone-600">
                        {JSON.stringify(
                          event.details ?? event.metadata,
                          null,
                          2,
                        )}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-6 w-full rounded-xl bg-yellow-400 px-4 py-3 font-semibold hover:bg-yellow-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}