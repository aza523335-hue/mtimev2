-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "currentDayType" TEXT NOT NULL,
    "autoDayTypeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "onSiteDays" TEXT NOT NULL DEFAULT '',
    "remoteDays" TEXT NOT NULL DEFAULT '',
    "tuesdayMode" TEXT NOT NULL DEFAULT 'FIXED_ON_SITE',
    "tuesdayOddWeekType" TEXT NOT NULL DEFAULT 'ON_SITE',
    "tuesdayEvenWeekType" TEXT NOT NULL DEFAULT 'REMOTE',
    "adminPasswordHash" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Period" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dayType" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Term" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Period_dayType_order_key" ON "Period"("dayType", "order");
