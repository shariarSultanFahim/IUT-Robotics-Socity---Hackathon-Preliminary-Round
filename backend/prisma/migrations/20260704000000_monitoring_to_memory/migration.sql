-- Move all simulated monitoring data to in-memory backend state.
-- This migration drops ONLY the obsolete monitoring tables and enums.
-- It preserves authentication: "User", "RefreshSession", the "Role" enum and
-- the Prisma migration metadata ("_prisma_migrations") are untouched.
--
-- Drop order respects foreign keys: Alert and DeviceStateHistory reference
-- Device, so they are dropped first. `IF EXISTS` keeps it safe to run against a
-- database where a table was already removed manually.

-- DropTable (FK-dependent tables first)
DROP TABLE IF EXISTS "Alert";
DROP TABLE IF EXISTS "DeviceStateHistory";
DROP TABLE IF EXISTS "PowerSnapshot";
DROP TABLE IF EXISTS "Device";

-- DropEnum (no longer referenced by any model)
DROP TYPE IF EXISTS "AlertType";
DROP TYPE IF EXISTS "ChangeSource";
DROP TYPE IF EXISTS "DeviceStatus";
DROP TYPE IF EXISTS "DeviceType";
DROP TYPE IF EXISTS "Room";
