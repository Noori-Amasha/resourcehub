-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "ResourceUnitStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ReservationEventType" AS ENUM ('CREATED', 'CHECKED_OUT', 'RETURNED', 'CANCELLED', 'MARKED_NO_SHOW', 'REASSIGNED', 'MAINTENANCE_STARTED', 'MAINTENANCE_ENDED');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('USER_REQUEST', 'ADMIN_REQUEST', 'RESOURCE_MAINTENANCE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceCategory" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ResourceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceType" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ResourceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceUnit" (
    "id" UUID NOT NULL,
    "resourceTypeId" UUID NOT NULL,
    "unitCode" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120),
    "description" TEXT,
    "status" "ResourceUnitStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ResourceUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "resourceUnitId" UUID NOT NULL,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "purpose" TEXT,
    "checkedOutAt" TIMESTAMPTZ(3),
    "returnedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledById" UUID,
    "cancellationReason" "CancellationReason",
    "noShowAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationEvent" (
    "id" UUID NOT NULL,
    "reservationId" UUID,
    "resourceUnitId" UUID,
    "actorId" UUID NOT NULL,
    "eventType" "ReservationEventType" NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceCategory_name_key" ON "ResourceCategory"("name");

-- CreateIndex
CREATE INDEX "ResourceType_categoryId_idx" ON "ResourceType"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceType_categoryId_name_key" ON "ResourceType"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceUnit_unitCode_key" ON "ResourceUnit"("unitCode");

-- CreateIndex
CREATE INDEX "ResourceUnit_resourceTypeId_idx" ON "ResourceUnit"("resourceTypeId");

-- CreateIndex
CREATE INDEX "ResourceUnit_status_idx" ON "ResourceUnit"("status");

-- CreateIndex
CREATE INDEX "ResourceUnit_resourceTypeId_status_idx" ON "ResourceUnit"("resourceTypeId", "status");

-- CreateIndex
CREATE INDEX "Reservation_employeeId_startTime_idx" ON "Reservation"("employeeId", "startTime");

-- CreateIndex
CREATE INDEX "Reservation_resourceUnitId_startTime_endTime_idx" ON "Reservation"("resourceUnitId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Reservation_status_startTime_idx" ON "Reservation"("status", "startTime");

-- CreateIndex
CREATE INDEX "Reservation_cancelledAt_idx" ON "Reservation"("cancelledAt");

-- CreateIndex
CREATE INDEX "Reservation_noShowAt_idx" ON "Reservation"("noShowAt");

-- CreateIndex
CREATE INDEX "ReservationEvent_reservationId_createdAt_idx" ON "ReservationEvent"("reservationId", "createdAt");

-- CreateIndex
CREATE INDEX "ReservationEvent_resourceUnitId_createdAt_idx" ON "ReservationEvent"("resourceUnitId", "createdAt");

-- CreateIndex
CREATE INDEX "ReservationEvent_actorId_idx" ON "ReservationEvent"("actorId");

-- CreateIndex
CREATE INDEX "ReservationEvent_eventType_idx" ON "ReservationEvent"("eventType");

-- AddForeignKey
ALTER TABLE "ResourceType" ADD CONSTRAINT "ResourceType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ResourceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceUnit" ADD CONSTRAINT "ResourceUnit_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_resourceUnitId_fkey" FOREIGN KEY ("resourceUnitId") REFERENCES "ResourceUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationEvent" ADD CONSTRAINT "ReservationEvent_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationEvent" ADD CONSTRAINT "ReservationEvent_resourceUnitId_fkey" FOREIGN KEY ("resourceUnitId") REFERENCES "ResourceUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationEvent" ADD CONSTRAINT "ReservationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =========================================
-- RESOURCEHUB DATABASE CONSTRAINTS
-- =========================================

-- Enable PostgreSQL GiST support
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Validate reservation time range
ALTER TABLE "Reservation"
ADD CONSTRAINT "reservation_valid_time_range"
CHECK ("endTime" > "startTime");

-- Prevent double booking of physical units
ALTER TABLE "Reservation"
ADD CONSTRAINT "reservation_prevent_double_booking"
EXCLUDE USING gist (
    "resourceUnitId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
)
WHERE (
    "status" IN (
        'CONFIRMED'::"ReservationStatus",
        'CHECKED_OUT'::"ReservationStatus",
        'COMPLETED'::"ReservationStatus"
    )
);

-- Prevent multiple active checkouts
CREATE UNIQUE INDEX "reservation_one_active_checkout_per_unit"
ON "Reservation" ("resourceUnitId")
WHERE "status" = 'CHECKED_OUT'::"ReservationStatus";