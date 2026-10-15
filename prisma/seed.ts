import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.DEMO_USER_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error(
      "Add DEMO_USER_PASSWORD to .env with at least 12 characters.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const users = [
    {
      name: "System Admin",
      email: "admin@resourcehub.local",
      role: UserRole.ADMIN,
    },
    {
      name: "Employee One",
      email: "employee1@resourcehub.local",
      role: UserRole.EMPLOYEE,
    },
    {
      name: "Employee Two",
      email: "employee2@resourcehub.local",
      role: UserRole.EMPLOYEE,
    },
    {
      name: "Employee Three",
      email: "employee3@resourcehub.local",
      role: UserRole.EMPLOYEE,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: true,
      },
      create: {
        ...user,
        passwordHash,
      },
    });
  }

  const electronics = await prisma.resourceCategory.upsert({
    where: { name: "Electronics" },
    update: {},
    create: {
      name: "Electronics",
      description: "Electronic equipment",
    },
  });

  const meeting = await prisma.resourceCategory.upsert({
    where: { name: "Meeting Equipment" },
    update: {},
    create: {
      name: "Meeting Equipment",
      description: "Meeting and presentation resources",
    },
  });

  const projector = await prisma.resourceType.upsert({
    where: {
      categoryId_name: {
        categoryId: electronics.id,
        name: "Projector",
      },
    },
    update: {},
    create: {
      categoryId: electronics.id,
      name: "Projector",
      description: "Portable projectors",
    },
  });

  const laptop = await prisma.resourceType.upsert({
    where: {
      categoryId_name: {
        categoryId: electronics.id,
        name: "Laptop",
      },
    },
    update: {},
    create: {
      categoryId: electronics.id,
      name: "Laptop",
      description: "Shared employee laptops",
    },
  });

  const room = await prisma.resourceType.upsert({
    where: {
      categoryId_name: {
        categoryId: meeting.id,
        name: "Conference Room",
      },
    },
    update: {},
    create: {
      categoryId: meeting.id,
      name: "Conference Room",
      description: "Bookable conference rooms",
    },
  });

  const units = [
    {
      unitCode: "PRJ-001",
      name: "Projector 1",
      resourceTypeId: projector.id,
    },
    {
      unitCode: "PRJ-002",
      name: "Projector 2",
      resourceTypeId: projector.id,
    },
    {
      unitCode: "LAP-001",
      name: "Laptop 1",
      resourceTypeId: laptop.id,
    },
    {
      unitCode: "LAP-002",
      name: "Laptop 2",
      resourceTypeId: laptop.id,
    },
    {
      unitCode: "ROOM-001",
      name: "Conference Room 1",
      resourceTypeId: room.id,
    },
  ];

  for (const unit of units) {
    await prisma.resourceUnit.upsert({
      where: { unitCode: unit.unitCode },
      update: {},
      create: unit,
    });
  }

  console.log("ResourceHub seed completed successfully!");

  console.log({
    users: await prisma.user.count(),
    categories: await prisma.resourceCategory.count(),
    types: await prisma.resourceType.count(),
    units: await prisma.resourceUnit.count(),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
