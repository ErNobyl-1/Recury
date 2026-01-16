-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "carryPolicy" TEXT NOT NULL DEFAULT 'CARRY_OVER_STACK',
    "scheduleType" TEXT NOT NULL,
    "startDate" DATETIME,
    "anchorDate" DATETIME,
    "intervalUnit" TEXT,
    "intervalValue" INTEGER,
    "weeklyDays" TEXT,
    "monthlyDay" INTEGER,
    "monthlyMode" TEXT,
    "yearlyMonth" INTEGER,
    "yearlyDay" INTEGER,
    "dueTime" TEXT,
    "tags" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "TaskInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customTitle" TEXT,
    "customNotes" TEXT,
    CONSTRAINT "TaskInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'app',
    "password" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "TaskTemplate_isActive_idx" ON "TaskTemplate"("isActive");

-- CreateIndex
CREATE INDEX "TaskTemplate_scheduleType_idx" ON "TaskTemplate"("scheduleType");

-- CreateIndex
CREATE INDEX "TaskInstance_date_idx" ON "TaskInstance"("date");

-- CreateIndex
CREATE INDEX "TaskInstance_status_idx" ON "TaskInstance"("status");

-- CreateIndex
CREATE INDEX "TaskInstance_templateId_idx" ON "TaskInstance"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskInstance_templateId_date_key" ON "TaskInstance"("templateId", "date");
