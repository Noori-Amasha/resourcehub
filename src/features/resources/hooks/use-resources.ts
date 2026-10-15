"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";

import type {
  ApiResponse,
  ResourceCategory,
  ResourceType,
  ResourceUnit,
} from "@/types/resources";

interface ResourceData {
  categories: ResourceCategory[];
  types: ResourceType[];
  units: ResourceUnit[];
}

async function fetchResources(): Promise<ResourceData> {
  const [categoryResult, typeResult, unitResult] = await Promise.all([
    apiClient<ApiResponse<ResourceCategory[]>>("/api/categories"),
    apiClient<ApiResponse<ResourceType[]>>("/api/resource-types"),
    apiClient<ApiResponse<ResourceUnit[]>>("/api/resource-units"),
  ]);

  return {
    categories: categoryResult.data,
    types: typeResult.data,
    units: unitResult.data,
  };
}

export function useResources() {
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [types, setTypes] = useState<ResourceType[]>([]);
  const [units, setUnits] = useState<ResourceUnit[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyData = useCallback((data: ResourceData) => {
    setCategories(data.categories);
    setTypes(data.types);
    setUnits(data.units);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchResources();
      applyData(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load resources.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  useEffect(() => {
    let cancelled = false;

    fetchResources().then(
      (data) => {
        if (cancelled) return;

        setCategories(data.categories);
        setTypes(data.types);
        setUnits(data.units);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;

        const message =
          err instanceof Error ? err.message : "Unable to load resources.";

        setError(message);
        setLoading(false);
        toast.error(message);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const mutate = useCallback(
    async (
      endpoint: string,
      method: "POST" | "PATCH",
      body: Record<string, unknown>,
    ) => {
      const result = await apiClient<ApiResponse<unknown>>(endpoint, {
        method,
        body: JSON.stringify(body),
      });

      if (!result.success) {
        throw new Error(result.message ?? "Operation failed.");
      }

      toast.success(result.message ?? "Saved successfully.");

      await refresh();

      return result.data;
    },
    [refresh],
  );

  return {
    categories,
    types,
    units,
    loading,
    error,
    refresh,
    mutate,
  };
}
