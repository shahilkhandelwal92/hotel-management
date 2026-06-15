BEGIN;

ALTER TABLE "UserRole"
    ADD COLUMN IF NOT EXISTS "hotelId" TEXT;

ALTER TABLE "AmenityBooking"
    ADD COLUMN IF NOT EXISTS "reservationId" TEXT;

ALTER TABLE "FolioTransaction"
    ADD COLUMN IF NOT EXISTS "paymentMode" TEXT;

ALTER TABLE "GuestRequest"
    ADD COLUMN IF NOT EXISTS "reservationId" TEXT;

ALTER TABLE "PosOrder"
    ADD COLUMN IF NOT EXISTS "reservationId" TEXT;

ALTER TABLE "GuestRequest"
    ALTER COLUMN "guestId" DROP NOT NULL;

UPDATE "UserRole" AS assignment
SET "hotelId" = app_user."hotelId"
FROM "User" AS app_user, "Role" AS role
WHERE assignment."userId" = app_user."id"
  AND assignment."roleId" = role."id"
  AND assignment."hotelId" IS NULL
  AND app_user."hotelId" IS NOT NULL
  AND role."name" NOT IN ('SUPER_ADMIN', 'OWNER');

DROP INDEX IF EXISTS "UserRole_userId_roleId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "UserRole_userId_roleId_hotelId_key"
    ON "UserRole"("userId", "roleId", "hotelId");

CREATE INDEX IF NOT EXISTS "GuestRequest_reservationId_createdAt_idx"
    ON "GuestRequest"("reservationId", "createdAt");

ALTER TABLE "GuestRequest"
    DROP CONSTRAINT IF EXISTS "GuestRequest_guestId_fkey";

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserRole_hotelId_fkey'
    ) THEN
        ALTER TABLE "UserRole"
            ADD CONSTRAINT "UserRole_hotelId_fkey"
            FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AmenityBooking_reservationId_fkey'
    ) THEN
        ALTER TABLE "AmenityBooking"
            ADD CONSTRAINT "AmenityBooking_reservationId_fkey"
            FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GuestRequest_guestId_fkey'
    ) THEN
        ALTER TABLE "GuestRequest"
            ADD CONSTRAINT "GuestRequest_guestId_fkey"
            FOREIGN KEY ("guestId") REFERENCES "Guest"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GuestRequest_reservationId_fkey'
    ) THEN
        ALTER TABLE "GuestRequest"
            ADD CONSTRAINT "GuestRequest_reservationId_fkey"
            FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PosOrder_reservationId_fkey'
    ) THEN
        ALTER TABLE "PosOrder"
            ADD CONSTRAINT "PosOrder_reservationId_fkey"
            FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

COMMIT;
