import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { BulkCreateUnitsInput } from "./bulk-validation";
import { ResourceError } from "./service";

export async function bulkCreateUnits(input: BulkCreateUnitsInput) {
  const resourceType = await prisma.resourceType.findUnique({
    where: { id: input.resourceTypeId },
  });

  if (!resourceType) {
    throw new ResourceError("Resource type not found.", 404);
  }

  const units = Array.from({ length: input.quantity }, (_, index) => {
    const number = input.startNumber + index;
    const serial = String(number).padStart(3, "0");

    return {
      resourceTypeId: input.resourceTypeId,
      unitCode: `${input.codePrefix}-${serial}`,
      name: input.namePrefix
        ? `${input.namePrefix} ${number}`
        : `${resourceType.name} ${number}`,
    };
  });

  const codes = units.map((unit) => unit.unitCode);

  if (codes.some((code) => code.length > 80)) {
    throw new ResourceError("Generated unit code is too long.", 400);
  }

  try {
    await prisma.resourceUnit.createMany({
      data: units,
      skipDuplicates: false,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ResourceError(
        "One or more unit codes already exist. Choose another start number.",
        409,
      );
    }

    throw error;
  }

  return {
    message: `${input.quantity} physical units created successfully.`,
    quantity: input.quantity,
    resourceTypeId: input.resourceTypeId,
    unitCodes: codes,
  };
}
