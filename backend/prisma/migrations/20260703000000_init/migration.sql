-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('FAN', 'LIGHT');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ON', 'OFF');

-- CreateEnum
CREATE TYPE "Room" AS ENUM ('DRAWING', 'WORK1', 'WORK2');

-- CreateEnum
CREATE TYPE "ChangeSource" AS ENUM ('SIMULATOR', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('AFTER_HOURS', 'ALL_DEVICES_ON_TOO_LONG');

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "room" "Room" NOT NULL,
    "label" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'OFF',
    "wattage" INTEGER NOT NULL,
    "lastChanged" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceStateHistory" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "previousStatus" "DeviceStatus" NOT NULL,
    "newStatus" "DeviceStatus" NOT NULL,
    "source" "ChangeSource" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceStateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PowerSnapshot" (
    "id" TEXT NOT NULL,
    "totalWatts" INTEGER NOT NULL,
    "drawingWatts" INTEGER NOT NULL,
    "work1Watts" INTEGER NOT NULL,
    "work2Watts" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PowerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "activeKey" TEXT,
    "type" "AlertType" NOT NULL,
    "room" "Room",
    "deviceId" TEXT,
    "message" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Device_room_idx" ON "Device"("room");

-- CreateIndex
CREATE INDEX "Device_status_idx" ON "Device"("status");

-- CreateIndex
CREATE INDEX "Device_type_idx" ON "Device"("type");

-- CreateIndex
CREATE INDEX "DeviceStateHistory_deviceId_changedAt_idx" ON "DeviceStateHistory"("deviceId", "changedAt");

-- CreateIndex
CREATE INDEX "DeviceStateHistory_changedAt_idx" ON "DeviceStateHistory"("changedAt");

-- CreateIndex
CREATE INDEX "DeviceStateHistory_source_idx" ON "DeviceStateHistory"("source");

-- CreateIndex
CREATE INDEX "PowerSnapshot_recordedAt_idx" ON "PowerSnapshot"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_activeKey_key" ON "Alert"("activeKey");

-- CreateIndex
CREATE INDEX "Alert_active_idx" ON "Alert"("active");

-- CreateIndex
CREATE INDEX "Alert_type_idx" ON "Alert"("type");

-- CreateIndex
CREATE INDEX "Alert_triggeredAt_idx" ON "Alert"("triggeredAt");

-- CreateIndex
CREATE INDEX "Alert_dedupeKey_idx" ON "Alert"("dedupeKey");

-- AddForeignKey
ALTER TABLE "DeviceStateHistory" ADD CONSTRAINT "DeviceStateHistory_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

