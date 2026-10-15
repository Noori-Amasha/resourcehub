export interface ResourceCategory {
  id: string;
  name: string;
  description: string | null;
  resourceTypeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceType {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  totalUnits: number;
  activeUnits: number;
  maintenanceUnits: number;
  inactiveUnits: number;
  createdAt: string;
  updatedAt: string;
}

export type ResourceUnitStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface ResourceUnit {
  id: string;
  unitCode: string;
  name: string | null;
  description: string | null;
  status: ResourceUnitStatus;
  resourceTypeId: string;
  resourceType: {
    id: string;
    name: string;
    categoryId: string;
    category: {
      id: string;
      name: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type ResourceTab = "categories" | "types" | "units";
export type ResourceFormMode = "create" | "edit" | "bulk";

export interface ResourceFormTarget {
  id: string;
  name?: string | null;
  description?: string | null;
  categoryId?: string;
  resourceTypeId?: string;
  unitCode?: string;
}
