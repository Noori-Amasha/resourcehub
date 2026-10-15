"use client";

import { useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type {
  ResourceCategory,
  ResourceType,
  ResourceTab,
  ResourceFormMode,
  ResourceFormTarget,
} from "@/types/resources";

interface Props {
  tab: ResourceTab;
  mode: ResourceFormMode;
  target?: ResourceFormTarget | null;
  categories: ResourceCategory[];
  types: ResourceType[];
  onClose: () => void;
  onSave: (
    endpoint: string,
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
  ) => Promise<unknown>;
}

const nameSchema = z.string().trim().min(2).max(120);
const descriptionSchema = z.string().trim().max(2000);
const uuidSchema = z.string().uuid();

const unitCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens.");

export function ResourceForm({
  tab,
  mode,
  target,
  categories,
  types,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(target?.name ?? "");
  const [description, setDescription] = useState(
    target?.description ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    target?.categoryId ?? categories[0]?.id ?? "",
  );
  const [resourceTypeId, setResourceTypeId] = useState(
    target?.resourceTypeId ?? types[0]?.id ?? "",
  );
  const [unitCode, setUnitCode] = useState(target?.unitCode ?? "");
  const [quantity, setQuantity] = useState("1");
  const [codePrefix, setCodePrefix] = useState("");
  const [startNumber, setStartNumber] = useState("1");
  const [namePrefix, setNamePrefix] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isBulk = mode === "bulk";
  const isEdit = mode === "edit";

  const title = isBulk
    ? "Bulk Create Resource Units"
    : `${isEdit ? "Edit" : "Add"} ${
        tab === "categories"
          ? "Category"
          : tab === "types"
            ? "Resource Type"
            : "Resource Unit"
      }`;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    let endpoint = "";
    let method: "POST" | "PATCH" = isEdit ? "PATCH" : "POST";
    let body: Record<string, unknown> = {};

    try {
      if (isBulk) {
        const schema = z.object({
          resourceTypeId: uuidSchema,
          quantity: z.number().int().min(1).max(100),
          codePrefix: z
            .string()
            .trim()
            .min(2)
            .max(20)
            .regex(/^[A-Za-z0-9-]+$/),
          startNumber: z.number().int().min(1).max(999999),
          namePrefix: z.string().trim().max(100),
        });

        const values = schema.parse({
          resourceTypeId,
          quantity: Number(quantity),
          codePrefix,
          startNumber: Number(startNumber),
          namePrefix,
        });

        endpoint = "/api/resource-units/bulk";
        method = "POST";

        body = {
          resourceTypeId: values.resourceTypeId,
          quantity: values.quantity,
          codePrefix: values.codePrefix.toUpperCase(),
          startNumber: values.startNumber,
          ...(values.namePrefix
            ? { namePrefix: values.namePrefix }
            : {}),
        };
      } else if (tab === "categories") {
        body = z
          .object({
            name: nameSchema,
            description: descriptionSchema,
          })
          .parse({ name, description });

        endpoint = isEdit
          ? `/api/categories/${target?.id}`
          : "/api/categories";
      } else if (tab === "types") {
        body = z
          .object({
            name: nameSchema,
            description: descriptionSchema,
            categoryId: uuidSchema,
          })
          .parse({ name, description, categoryId });

        endpoint = isEdit
          ? `/api/resource-types/${target?.id}`
          : "/api/resource-types";
      } else {
        const values = z
          .object({
            resourceTypeId: uuidSchema,
            unitCode: unitCodeSchema,
            name: z.string().trim().max(120),
            description: descriptionSchema,
          })
          .parse({
            resourceTypeId,
            unitCode,
            name,
            description,
          });

        body = {
          ...values,
          unitCode: values.unitCode.toUpperCase(),
        };

        endpoint = isEdit
          ? `/api/resource-units/${target?.id}`
          : "/api/resource-units";
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message ?? "Invalid input.");
      } else {
        setError("Please check your form values.");
      }
      return;
    }

    setSaving(true);

    try {
      await onSave(endpoint, method, body);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100";

  const labelClass =
    "mb-1.5 block text-sm font-semibold text-stone-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resource-form-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2
            id="resource-form-title"
            className="text-xl font-bold text-stone-900"
          >
            {title}
          </h2>

          <button
            type="button"
            aria-label="Close form"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 hover:bg-stone-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isBulk && tab !== "units" && (
            <>
              <div>
                <label htmlFor="resource-name" className={labelClass}>
                  Name *
                </label>
                <input
                  id="resource-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass}
                  placeholder="Enter name"
                  required
                  maxLength={120}
                />
              </div>

              <div>
                <label htmlFor="resource-description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="resource-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  className={inputClass}
                  rows={3}
                  maxLength={2000}
                  placeholder="Optional description"
                />
              </div>
            </>
          )}

          {tab === "types" && !isBulk && (
            <div>
              <label htmlFor="category-id" className={labelClass}>
                Category *
              </label>
              <select
                id="category-id"
                value={categoryId}
                onChange={(event) =>
                  setCategoryId(event.target.value)
                }
                className={inputClass}
                required
              >
                {categories.length === 0 && (
                  <option value="">Create a category first</option>
                )}
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(tab === "units" || isBulk) && (
            <div>
              <label htmlFor="resource-type-id" className={labelClass}>
                Resource Type *
              </label>
              <select
                id="resource-type-id"
                value={resourceTypeId}
                onChange={(event) =>
                  setResourceTypeId(event.target.value)
                }
                className={inputClass}
                required
              >
                {types.length === 0 && (
                  <option value="">Create a resource type first</option>
                )}
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} — {type.category.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tab === "units" && !isBulk && (
            <>
              <div>
                <label htmlFor="unit-code" className={labelClass}>
                  Unique Unit Code *
                </label>
                <input
                  id="unit-code"
                  value={unitCode}
                  onChange={(event) =>
                    setUnitCode(event.target.value.toUpperCase())
                  }
                  className={inputClass}
                  required
                  maxLength={80}
                  placeholder="LAPTOP-001"
                />
              </div>

              <div>
                <label htmlFor="unit-name" className={labelClass}>
                  Unit Name
                </label>
                <input
                  id="unit-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass}
                  maxLength={120}
                  placeholder="Dell Laptop 1"
                />
              </div>

              <div>
                <label htmlFor="unit-description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="unit-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  className={inputClass}
                  rows={2}
                  maxLength={2000}
                />
              </div>
            </>
          )}

          {isBulk && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="quantity" className={labelClass}>
                    Quantity *
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="start-number" className={labelClass}>
                    Start Number *
                  </label>
                  <input
                    id="start-number"
                    type="number"
                    min="1"
                    max="999999"
                    value={startNumber}
                    onChange={(event) =>
                      setStartNumber(event.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="code-prefix" className={labelClass}>
                  Unit Code Prefix *
                </label>
                <input
                  id="code-prefix"
                  value={codePrefix}
                  onChange={(event) =>
                    setCodePrefix(event.target.value.toUpperCase())
                  }
                  className={inputClass}
                  required
                  maxLength={20}
                  placeholder="LAPTOP"
                />
                <p className="mt-1 text-xs text-stone-500">
                  Example: LAPTOP-001, LAPTOP-002...
                </p>
              </div>

              <div>
                <label htmlFor="name-prefix" className={labelClass}>
                  Unit Name Prefix
                </label>
                <input
                  id="name-prefix"
                  value={namePrefix}
                  onChange={(event) =>
                    setNamePrefix(event.target.value)
                  }
                  className={inputClass}
                  maxLength={100}
                  placeholder="Office Laptop"
                />
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-stone-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-stone-200 px-5 py-2.5 font-medium hover:bg-stone-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                ((tab === "units" || isBulk) && types.length === 0) ||
                (tab === "types" && categories.length === 0)
              }
              className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 font-semibold text-stone-900 hover:bg-yellow-500 disabled:opacity-50"
            >
              {saving && (
                <LoaderCircle size={17} className="animate-spin" />
              )}
              {saving
                ? "Saving..."
                : isBulk
                  ? "Create Units"
                  : isEdit
                    ? "Save Changes"
                    : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}