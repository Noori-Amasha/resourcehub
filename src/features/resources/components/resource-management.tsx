"use client";

import { useState } from "react";
import {
  Boxes,
  Layers3,
  PackageCheck,
  Plus,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { useResources } from "@/features/resources/hooks/use-resources";
import { ResourceTable } from "./resource-table";
import { ResourceForm } from "./resource-form";

import type {
  ResourceTab,
  ResourceFormMode,
  ResourceFormTarget,
  ResourceUnit,
} from "@/types/resources";

export function ResourceManagement() {
  const {
    categories,
    types,
    units,
    loading,
    error,
    refresh,
    mutate,
  } = useResources();

  const [tab, setTab] = useState<ResourceTab>("categories");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<ResourceFormMode>("create");
  const [target, setTarget] = useState<ResourceFormTarget | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const activeUnits = units.filter(
    (unit) => unit.status === "ACTIVE",
  ).length;

  const maintenanceUnits = units.filter(
    (unit) => unit.status === "MAINTENANCE",
  ).length;

  const stats = [
    {
      label: "Categories",
      value: categories.length,
      icon: Layers3,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Resource Types",
      value: types.length,
      icon: Boxes,
      color: "bg-purple-100 text-purple-700",
    },
    {
      label: "Total Units",
      value: units.length,
      icon: PackageCheck,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Active Units",
      value: activeUnits,
      icon: Wrench,
      color: "bg-amber-100 text-amber-700",
    },
  ];

  function openForm(
    mode: ResourceFormMode,
    item: ResourceFormTarget | null = null,
  ) {
    setTarget(item);
    setFormMode(mode);
    setFormOpen(true);
  }

  async function toggleStatus(unit: ResourceUnit) {
    const nextStatus =
      unit.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    if (
      !window.confirm(
        `Are you sure you want to mark ${unit.unitCode} as ${nextStatus}?`,
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      await mutate(
        `/api/resource-units/${unit.id}`,
        "PATCH",
        { status: nextStatus },
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Status update failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleMaintenance(unit: ResourceUnit) {
    if (unit.status === "MAINTENANCE") {
      if (
        !window.confirm(
          `End maintenance for ${unit.unitCode}?`,
        )
      ) {
        return;
      }

      setBusy(true);

      try {
        await apiClient(
          `/api/resource-units/${unit.id}/maintenance/end`,
          { method: "POST" },
        );

        toast.success("Maintenance completed.");
        await refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Operation failed.",
        );
      } finally {
        setBusy(false);
      }

      return;
    }

    const strategy = window.prompt(
      `Start maintenance for ${unit.unitCode}.\n\n` +
      "Existing reservations may be affected.\n" +
      "Enter REASSIGN to reassign affected reservations, or CANCEL to cancel them:",
      "REASSIGN",
    );

    if (strategy === null) return;

    const selected = strategy.trim().toUpperCase();

    if (selected !== "REASSIGN" && selected !== "CANCEL") {
      toast.error("Choose REASSIGN or CANCEL.");
      return;
    }

    if (
      !window.confirm(
        `Confirm maintenance for ${unit.unitCode} using ${selected}?\n\n` +
        (selected === "CANCEL"
          ? "Affected reservations may be cancelled."
          : "The system will attempt to reassign affected reservations."),
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      await apiClient(
        `/api/resource-units/${unit.id}/maintenance`,
        {
          method: "POST",
          body: JSON.stringify({ strategy: selected }),
        },
      );

      toast.success("Maintenance started successfully.");
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Maintenance failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  const tabs: { label: string; value: ResourceTab }[] = [
    { label: "Categories", value: "categories" },
    { label: "Resource Types", value: "types" },
    { label: "Physical Units", value: "units" },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">
            Resource Management
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Manage resource categories, types, physical units,
            and maintenance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm"
            >
              <div
                className={`mb-4 inline-flex rounded-xl p-3 ${stat.color}`}
              >
                <Icon size={22} />
              </div>

              <p className="text-3xl font-extrabold text-stone-900">
                {loading ? "—" : stat.value}
              </p>

              <p className="mt-1 text-sm text-stone-500">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  tab === item.value
                    ? "bg-yellow-400 text-stone-900"
                    : "bg-stone-50 text-stone-600 hover:bg-amber-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {tab === "units" && (
              <button
                type="button"
                onClick={() => openForm("bulk")}
                disabled={busy || types.length === 0}
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                Bulk Create
              </button>
            )}

            <button
              type="button"
              disabled={
                busy ||
                (tab === "types" && categories.length === 0) ||
                (tab === "units" && types.length === 0)
              }
              onClick={() => openForm("create")}
              className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-stone-900 hover:bg-yellow-500 disabled:opacity-50"
            >
              <Plus size={17} />
              Add{" "}
              {tab === "categories"
                ? "Category"
                : tab === "types"
                  ? "Type"
                  : "Unit"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
        >
          {error}
          <button
            type="button"
            onClick={() => void refresh()}
            className="ml-3 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {busy && (
        <p role="status" className="text-sm text-amber-700">
          Processing resource action...
        </p>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4 rounded-2xl bg-white p-6">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-12 rounded-xl bg-stone-100"
            />
          ))}
        </div>
      ) : (
        <ResourceTable
          
          key={tab}
          tab={tab}
          categories={categories}
          types={types}
          units={units}
          onEdit={(item) => openForm("edit", item)}
          onToggleStatus={(unit) => void toggleStatus(unit)}
          onMaintenance={(unit) => void handleMaintenance(unit)}
        />
      )}

      <p className="text-xs text-stone-400">
        {maintenanceUnits} units currently under maintenance.
        All changes are saved through ResourceHub APIs.
      </p>

      {formOpen && (
        <ResourceForm
          key={`${tab}-${formMode}-${target?.id ?? "new"}`}
          tab={tab}
          mode={formMode}
          target={target}
          categories={categories}
          types={types}
          onClose={() => setFormOpen(false)}
          onSave={mutate}
        />
      )}
    </div>
  );
}