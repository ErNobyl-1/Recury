-- DropIndex
DROP INDEX "TaskInstance_templateId_date_key";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'app',
    "password" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en'
);
INSERT INTO "new_AppSettings" ("id", "password") SELECT "id", "password" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TaskInstance_templateId_date_idx" ON "TaskInstance"("templateId", "date");
