"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Search,
  Clock3,
  Package,
  CheckCircle2,
  LoaderCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import type { ApiResponse, ResourceType } from "@/types/resources";
import type {
  AvailabilityResult,
  AvailableUnit,
  ReservationApiResponse,
} from "@/types/reservations";

const COLOMBO_OFFSET = "+05:30";

const bookingSchema = z.object({
  resourceTypeId: z.string().uuid(),
  resourceUnitId: z.string().uuid(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  purpose: z.string().trim().max(2000),
});

function formatSriLankaNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatTime(date: string, time: string) {
  return `${date}T${time}:00${COLOMBO_OFFSET}`;
}

const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

export function EmployeeBooking() {
  const router = useRouter();

  const [types, setTypes] = useState<ResourceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [selectedType, setSelectedType] =
    useState<ResourceType | null>(null);

  const [date, setDate] = useState(formatSriLankaNow);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const [availability, setAvailability] =
    useState<AvailabilityResult | null>(null);

  const [selectedUnit, setSelectedUnit] =
    useState<AvailableUnit | null>(null);

  const [checking, setChecking] = useState(false);
  const [booking, setBooking] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    apiClient<ApiResponse<ResourceType[]>>("/api/resource-types")
      .then((response) => {
        if (!cancelled) {
          setTypes(response.data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Unable to load resources.",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = Array.from(
    new Set(types.map((type) => type.category.name)),
  );

  const filteredTypes = types.filter((type) => {
    const matchesSearch =
      `${type.name} ${type.category.name}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "ALL" ||
      type.category.name === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  function selectType(type: ResourceType) {
    setSelectedType(type);
    setAvailability(null);
    setSelectedUnit(null);
  }

  function changeDate(value: string) {
    setDate(value);
    setAvailability(null);
    setSelectedUnit(null);
  }

  function changeStart(value: string) {
    setStartTime(value);
    setAvailability(null);
    setSelectedUnit(null);
  }

  function changeEnd(value: string) {
    setEndTime(value);
    setAvailability(null);
    setSelectedUnit(null);
  }

  function validateInterval() {
    if (!selectedType) {
      throw new Error("Select a resource type first.");
    }

    if (!date || !startTime || !endTime) {
      throw new Error("Choose a date and time.");
    }

    const start = formatTime(date, startTime);
    const end = formatTime(date, endTime);

    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = Date.now();

    if (
      !Number.isFinite(startDate.getTime()) ||
      !Number.isFinite(endDate.getTime())
    ) {
      throw new Error("Invalid date or time.");
    }

    const duration = endDate.getTime() - startDate.getTime();

    if (duration < 30 * 60 * 1000) {
      throw new Error("Minimum booking duration is 30 minutes.");
    }

    if (startDate.getTime() <= now) {
      throw new Error("Start time must be in the future.");
    }

    if (endDate.getTime() > now + 48 * 60 * 60 * 1000) {
      throw new Error("Booking must finish within the next 48 hours.");
    }

    return { start, end };
  }

  async function checkAvailability() {
    if (!selectedType) return;

    let interval: { start: string; end: string };

    try {
      interval = validateInterval();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Invalid booking time.",
      );
      return;
    }

    setChecking(true);
    setAvailability(null);
    setSelectedUnit(null);

    try {
      const params = new URLSearchParams({
        resourceTypeId: selectedType.id,
        startTime: interval.start,
        endTime: interval.end,
      });

      const result = await apiClient<
        ReservationApiResponse<AvailabilityResult>
      >(`/api/availability?${params.toString()}`);

      setAvailability(result.data);

      if (result.data.availableCount === 0) {
        toast.info("No physical units available for this time.");
      } else {
        toast.success(
          `${result.data.availableCount} units available.`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Availability check failed.",
      );
    } finally {
      setChecking(false);
    }
  }

  async function bookResource() {
    if (!selectedType || !selectedUnit || !availability) return;

    let values: z.infer<typeof bookingSchema>;

    try {
      const interval = validateInterval();

      if (
        interval.start !== availability.startTime.replace(".000Z", "Z") &&
        new Date(interval.start).getTime() !==
          new Date(availability.startTime).getTime()
      ) {
        throw new Error("Please check availability again.");
      }

      values = bookingSchema.parse({
        resourceTypeId: selectedType.id,
        resourceUnitId: selectedUnit.id,
        startTime: interval.start,
        endTime: interval.end,
        purpose,
      });
    } catch (err) {
      toast.error(
        err instanceof z.ZodError
          ? err.issues[0]?.message ?? "Invalid booking."
          : err instanceof Error
            ? err.message
            : "Invalid booking.",
      );
      return;
    }

    if (
      !window.confirm(
        `Confirm reservation?\n\n` +
          `${selectedType.name} — ${selectedUnit.unitCode}\n` +
          `${date} | ${startTime}–${endTime}\n\n` +
          "Your reservation will be confirmed immediately.",
      )
    ) {
      return;
    }

    setBooking(true);

    try {
      await apiClient<ReservationApiResponse<unknown>>(
        "/api/reservations",
        {
          method: "POST",
          body: JSON.stringify({
            resourceUnitId: values.resourceUnitId,
            startTime: values.startTime,
            endTime: values.endTime,
            ...(values.purpose
              ? { purpose: values.purpose }
              : {}),
          }),
        },
      );

      toast.success("Reservation confirmed successfully!");
      router.push("/employee/reservations");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Booking failed.",
      );

      // Unit may have been booked by someone else.
      setAvailability(null);
      setSelectedUnit(null);
    } finally {
      setBooking(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100";

  return (
    <div className="space-y-7">
      <div className="rounded-3xl bg-linear-to-r from-yellow-300 via-amber-100 to-white p-7">
        <div className="mb-3 inline-flex rounded-xl bg-white/70 p-3">
          <CalendarDays size={25} />
        </div>
        <h2 className="text-3xl font-extrabold text-stone-900">
          Book a Resource
        </h2>
        <p className="mt-2 text-stone-600">
          Discover resources, check real-time availability, and
          reserve individual units.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Operating Hours", "8:00 AM – 5:00 PM"],
          ["Booking Window", "Next 48 hours"],
          ["Time Slots", "30-minute intervals"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-stone-500">{label}</p>
            <p className="mt-2 text-lg font-bold text-stone-900">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-100 bg-white p-5">
        <h3 className="mb-4 text-xl font-bold">
          1. Choose a resource
        </h3>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-3 text-stone-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search resource types..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className={inputClass}
            aria-label="Filter resource category"
          >
            <option value="ALL">All Categories</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>

        {loadError && (
          <p role="alert" className="mb-4 text-red-600">
            {loadError}
          </p>
        )}

        {loading ? (
          <p className="animate-pulse text-stone-500">
            Loading resources...
          </p>
        ) : filteredTypes.length === 0 ? (
          <p className="rounded-xl bg-stone-50 p-6 text-center text-stone-500">
            No matching resources found.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => selectType(type)}
                className={`rounded-2xl border p-5 text-left transition hover:shadow-md ${
                  selectedType?.id === type.id
                    ? "border-yellow-400 bg-amber-50 ring-2 ring-yellow-300"
                    : "border-stone-200 bg-white"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-xl bg-yellow-100 p-3">
                    <Package size={23} className="text-amber-700" />
                  </div>
                  {selectedType?.id === type.id && (
                    <CheckCircle2 size={20} className="text-green-600" />
                  )}
                </div>
                <h4 className="font-bold text-stone-900">
                  {type.name}
                </h4>
                <p className="mt-1 text-xs text-stone-500">
                  {type.category.name}
                </p>
                <p className="mt-3 text-sm text-stone-600">
                  {type.totalUnits} physical units · {type.activeUnits} active
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedType && (
        <div className="rounded-2xl border border-amber-100 bg-white p-6">
          <h3 className="mb-5 text-xl font-bold">
            2. Check availability — {selectedType.name}
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Date (Sri Lanka)
              </label>
              <input
                type="date"
                value={date}
                min={formatSriLankaNow()}
                onChange={(event) => changeDate(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Start Time
              </label>
              <select
                value={startTime}
                onChange={(event) => changeStart(event.target.value)}
                className={inputClass}
              >
                {TIME_SLOTS.slice(0, -1).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                End Time
              </label>
              <select
                value={endTime}
                onChange={(event) => changeEnd(event.target.value)}
                className={inputClass}
              >
                {TIME_SLOTS.slice(1).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void checkAvailability()}
            disabled={checking}
            className="mt-5 flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 font-semibold text-stone-900 hover:bg-yellow-500 disabled:opacity-50"
          >
            {checking ? (
              <LoaderCircle size={19} className="animate-spin" />
            ) : (
              <Clock3 size={19} />
            )}
            {checking ? "Checking..." : "Check Availability"}
          </button>
        </div>
      )}

      {availability && (
        <div className="rounded-2xl border border-amber-100 bg-white p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">
                3. Select a physical unit
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                {availability.availableCount} of{" "}
                {availability.totalUnits} units available
              </p>
            </div>

            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
              Live Check
            </span>
          </div>

          {availability.availableUnits.length === 0 ? (
            <p className="rounded-xl bg-amber-50 p-5 text-amber-800">
              No units are available for the selected period.
              Try another time.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {availability.availableUnits.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setSelectedUnit(unit)}
                  className={`flex items-center justify-between rounded-xl border p-4 text-left ${
                    selectedUnit?.id === unit.id
                      ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-300"
                      : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <div>
                    <p className="font-bold">{unit.unitCode}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {unit.name || "Resource unit"}
                    </p>
                  </div>
                  <CheckCircle2
                    size={20}
                    className={
                      selectedUnit?.id === unit.id
                        ? "text-green-600"
                        : "text-stone-300"
                    }
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedUnit && (
        <div className="rounded-2xl border border-amber-100 bg-white p-6">
          <h3 className="text-xl font-bold">
            4. Confirm your reservation
          </h3>

          <div className="mt-4 rounded-xl bg-amber-50 p-5">
            <p className="font-semibold">
              {selectedType?.name} — {selectedUnit.unitCode}
            </p>
            <p className="mt-2 text-sm text-stone-600">
              {date} · {startTime} to {endTime} (Sri Lanka)
            </p>
          </div>

          <label className="mb-2 mt-5 block text-sm font-semibold">
            Purpose (optional)
          </label>

          <textarea
            rows={3}
            value={purpose}
            maxLength={2000}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="Why do you need this resource?"
            className={inputClass}
          />

          <button
            type="button"
            onClick={() => void bookResource()}
            disabled={booking}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50 sm:w-auto"
          >
            {booking ? (
              <LoaderCircle size={19} className="animate-spin" />
            ) : (
              <ArrowRight size={19} />
            )}
            {booking ? "Confirming..." : "Confirm Reservation"}
          </button>
        </div>
      )}
    </div>
  );
}