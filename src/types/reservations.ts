export interface Reservation {
  id: string;
  employeeId: string;
  resourceUnitId: string;
  startTime: string;
  endTime: string;
  purpose: string | null;
  status: "CONFIRMED" | "CHECKED_OUT" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  isOverdue: boolean;
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  resourceUnit: {
    id: string;
    unitCode: string;
    name: string | null;
    resourceType: {
      id: string;
      name: string;
      category: {
        id: string;
        name: string;
      };
    };
  };
}

export interface AvailableUnit {
  id: string;
  unitCode: string;
  name: string | null;
  status: string;
}

export interface AvailabilityResult {
  resourceType: {
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
    };
  };
  startTime: string;
  endTime: string;
  totalUnits: number;
  availableCount: number;
  availableUnits: AvailableUnit[];
}

export interface ReservationApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
