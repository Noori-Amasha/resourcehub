import { ResourceUnitStatus, ReservationStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { resourceRepository as repo } from "./repository";

import type {
  CategoryCreate,
  CategoryUpdate,
  TypeCreate,
  TypeUpdate,
  UnitCreate,
  UnitUpdate,
} from "./validation";

export class ResourceError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "ResourceError";
  }
}

export const resourceService = {
  async listCategories() {
    const categories = await repo.listCategories();

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      resourceTypeCount: category.resourceTypes.length,
    }));
  },

  async createCategory(data: CategoryCreate) {
    return repo.createCategory(data);
  },

  async updateCategory(id: string, data: CategoryUpdate) {
    if (!(await repo.getCategory(id))) {
      throw new ResourceError("Category not found.", 404);
    }

    return repo.updateCategory(id, data);
  },

  async listTypes() {
    const types = await repo.listTypes();

    return types.map((type) => ({
      id: type.id,
      name: type.name,
      description: type.description,
      categoryId: type.categoryId,
      category: {
        id: type.category.id,
        name: type.category.name,
      },
      createdAt: type.createdAt,
      updatedAt: type.updatedAt,
      totalUnits: type.units.length,
      activeUnits: type.units.filter(
        (unit) => unit.status === ResourceUnitStatus.ACTIVE,
      ).length,
      maintenanceUnits: type.units.filter(
        (unit) => unit.status === ResourceUnitStatus.MAINTENANCE,
      ).length,
      inactiveUnits: type.units.filter(
        (unit) => unit.status === ResourceUnitStatus.INACTIVE,
      ).length,
    }));
  },

  async createType(data: TypeCreate) {
    if (!(await repo.getCategory(data.categoryId))) {
      throw new ResourceError("Category not found.", 404);
    }

    return repo.createType(data);
  },

  async updateType(id: string, data: TypeUpdate) {
    if (!(await repo.getType(id))) {
      throw new ResourceError("Resource type not found.", 404);
    }

    if (data.categoryId && !(await repo.getCategory(data.categoryId))) {
      throw new ResourceError("Category not found.", 404);
    }

    return repo.updateType(id, data);
  },

  async listUnits() {
    return repo.listUnits();
  },

  async createUnit(data: UnitCreate) {
    if (!(await repo.getType(data.resourceTypeId))) {
      throw new ResourceError("Resource type not found.", 404);
    }

    return repo.createUnit(data);
  },

  async updateUnit(id: string, data: UnitUpdate) {
    return prisma.$transaction(async (tx) => {
      const unit = await tx.resourceUnit.findUnique({
        where: { id },
      });

      if (!unit) {
        throw new ResourceError("Resource unit not found.", 404);
      }

      if (unit.status === ResourceUnitStatus.MAINTENANCE) {
        if (
          data.status === ResourceUnitStatus.ACTIVE ||
          data.status === ResourceUnitStatus.INACTIVE
        ) {
          throw new ResourceError(
            "Use the maintenance workflow to end maintenance.",
            409,
          );
        }
      }

      if (data.resourceTypeId && data.resourceTypeId !== unit.resourceTypeId) {
        const type = await tx.resourceType.findUnique({
          where: { id: data.resourceTypeId },
        });

        if (!type) {
          throw new ResourceError("Resource type not found.", 404);
        }

        const reservationCount = await tx.reservation.count({
          where: { resourceUnitId: id },
        });

        if (reservationCount > 0) {
          throw new ResourceError(
            "Cannot change the type of a unit with reservation history.",
            409,
          );
        }
      }

      if (data.status === ResourceUnitStatus.INACTIVE) {
        const blockingReservations = await tx.reservation.count({
          where: {
            resourceUnitId: id,
            status: {
              in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_OUT],
            },
          },
        });

        if (blockingReservations > 0) {
          throw new ResourceError(
            "Resolve confirmed and checked-out reservations before deactivating this unit.",
            409,
          );
        }
      }

      return tx.resourceUnit.update({
        where: { id },
        data,
      });
    });
  },
};
