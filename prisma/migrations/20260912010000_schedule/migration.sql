ALTER TABLE "Settings" ADD COLUMN "scheduleMode" TEXT;
ALTER TABLE "Settings" ADD COLUMN "tuesdayReferenceDate" TEXT;
ALTER TABLE "Settings" ADD COLUMN "tuesdayReferenceType" TEXT NOT NULL DEFAULT 'REMOTE';
