import { prisma } from "@/server/db/prisma";

import type {
  CategoryCreate,
  CategoryUpdate,
  TypeCreate,
  TypeUpdate,
  UnitCreate,
  UnitUpdate,
} from "./validation";

export const resourceRepository = {
  listCategories() {
    return prisma.resourceCategory.findMany({
      include: {
        resourceTypes: {
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    });
  },

  getCategory(id: string) {
    return prisma.resourceCategory.findUnique({
      where: { id },
    });
  },

  createCategory(data: CategoryCreate) {
    return prisma.resourceCategory.create({ data });
  },

  updateCategory(id: string, data: CategoryUpdate) {
    return prisma.resourceCategory.update({
      where: { id },
      data,
    });
  },

  listTypes() {
    return prisma.resourceType.findMany({
      include: {
        category: true,
        units: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  },

  getType(id: string) {
    return prisma.resourceType.findUnique({
      where: { id },
    });
  },

  createType(data: TypeCreate) {
    return prisma.resourceType.create({ data });
  },

  updateType(id: string, data: TypeUpdate) {
    return prisma.resourceType.update({
      where: { id },
      data,
    });
  },

  listUnits() {
    return prisma.resourceUnit.findMany({
      include: {
        resourceType: {
          include: { category: true },
        },
      },
      orderBy: { unitCode: "asc" },
    });
  },

  getUnit(id: string) {
    return prisma.resourceUnit.findUnique({
      where: { id },
    });
  },

  createUnit(data: UnitCreate) {
    return prisma.resourceUnit.create({ data });
  },

  updateUnit(id: string, data: UnitUpdate) {
    return prisma.resourceUnit.update({
      where: { id },
      data,
    });
  },
};
