"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
} from "lucide-react";

import type {
  ResourceCategory,
  ResourceType,
  ResourceUnit,
  ResourceTab,
  ResourceFormTarget,
} from "@/types/resources";

interface Props {
  tab: ResourceTab;
  categories: ResourceCategory[];
  types: ResourceType[];
  units: ResourceUnit[];
  onEdit: (item: ResourceFormTarget) => void;
  onToggleStatus: (unit: ResourceUnit) => void;
  onMaintenance: (unit: ResourceUnit) => void;
}

type TableRow = ResourceCategory | ResourceType | ResourceUnit;

const PAGE_SIZE = 8;

export function ResourceTable({
  tab,
  categories,
  types,
  units,
  onEdit,
  onToggleStatus,
  onMaintenance,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [descending, setDescending] = useState(false);

  const data: TableRow[] =
    tab === "categories"
      ? categories
      : tab === "types"
        ? types
        : units;

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    const result = data.filter((item) => {
      const text = [
        item.name,
        item.description,
        "unitCode" in item ? item.unitCode : "",
        "category" in item ? item.category.name : "",
        "resourceType" in item ? item.resourceType.name : "",
      ]
        .join(" ")
        .toLowerCase();

      if (!text.includes(query)) return false;

      if (tab === "units" && filter !== "ALL") {
        return "status" in item && item.status === filter;
      }

      return true;
    });

    return [...result].sort((a, b) => {
      const first =
        "unitCode" in a ? a.unitCode : a.name ?? "";
      const second =
        "unitCode" in b ? b.unitCode : b.name ?? "";

      const order = first.localeCompare(second);
      return descending ? -order : order;
    });
  }, [data, search, tab, filter, descending]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);

  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
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
            placeholder="Search resources..."
            aria-label="Search resources"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
        </div>

        <div className="flex gap-2">
          {tab === "units" && (
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
                }}
              aria-label="Filter by status"
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          )}

          <button
            type="button"
            onClick={() => {
                setDescending((value) => !value);
                setPage(1);
                }}
            className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm hover:bg-amber-50"
          >
            <ArrowUpDown size={16} />
            Sort
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-amber-50/70 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-5 py-4">
                {tab === "units" ? "Unit code" : "Name"}
              </th>
              <th className="px-5 py-4">
                {tab === "categories"
                  ? "Description"
                  : tab === "types"
                    ? "Category"
                    : "Resource type"}
              </th>
              <th className="px-5 py-4">
                {tab === "categories"
                  ? "Types"
                  : tab === "types"
                    ? "Total units"
                    : "Status"}
              </th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {visible.map((item) => {
              const category =
                tab === "categories"
                  ? (item as ResourceCategory)
                  : null;
              const type =
                tab === "types" ? (item as ResourceType) : null;
              const unit =
                tab === "units" ? (item as ResourceUnit) : null;

              return (
                <tr key={item.id} className="hover:bg-amber-50/40">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-stone-900">
                      {unit ? unit.unitCode : item.name}
                    </p>
                    {unit && (
                      <p className="mt-1 text-xs text-stone-500">
                        {unit.name || "Unnamed unit"}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4 text-stone-600">
                    {category
                      ? category.description || "—"
                      : type
                        ? type.category.name
                        : unit?.resourceType.name}
                  </td>

                  <td className="px-5 py-4">
                    {category?.resourceTypeCount ??
                      type?.totalUnits ??
                      (unit ? (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            unit.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : unit.status === "MAINTENANCE"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {unit.status}
                        </span>
                      ) : null)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onEdit({
                            id: item.id,
                            name: item.name,
                            description: item.description,
                            categoryId: type?.categoryId,
                            resourceTypeId: unit?.resourceTypeId,
                            unitCode: unit?.unitCode,
                          })
                        }
                        className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Edit
                      </button>

                      {unit && unit.status !== "MAINTENANCE" && (
                        <>
                          <button
                            type="button"
                            onClick={() => onToggleStatus(unit)}
                            className="rounded-lg bg-stone-100 px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-200"
                          >
                            {unit.status === "ACTIVE"
                              ? "Deactivate"
                              : "Activate"}
                          </button>

                          {unit.status === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => onMaintenance(unit)}
                              className="rounded-lg bg-amber-100 px-3 py-1.5 font-medium text-amber-800 hover:bg-amber-200"
                            >
                              Maintenance
                            </button>
                          )}
                        </>
                      )}

                      {unit?.status === "MAINTENANCE" && (
                        <button
                          type="button"
                          onClick={() => onMaintenance(unit)}
                          className="rounded-lg bg-green-100 px-3 py-1.5 font-medium text-green-700 hover:bg-green-200"
                        >
                          End maintenance
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-16 text-center text-stone-500"
                >
                  No matching resources found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-stone-100 p-4">
        <p className="text-xs text-stone-500">
          {filtered.length} results · Page {safePage} of {pages}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setPage((value) => value - 1)}
            aria-label="Previous page"
            className="rounded-lg border border-stone-200 p-2 disabled:opacity-40"
          >
            <ChevronLeft size={17} />
          </button>

          <button
            type="button"
            disabled={safePage === pages}
            onClick={() => setPage((value) => value + 1)}
            aria-label="Next page"
            className="rounded-lg border border-stone-200 p-2 disabled:opacity-40"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}