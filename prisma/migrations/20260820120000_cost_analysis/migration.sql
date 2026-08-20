-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Contact";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Deal";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "IncomeSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'OTHER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "IncomeSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "occurredOn" DATETIME NOT NULL,
    "category" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT,
    CONSTRAINT "Entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Entry_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IncomeSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IncomeSource_userId_active_idx" ON "IncomeSource"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeSource_userId_name_key" ON "IncomeSource"("userId", "name");

-- CreateIndex
CREATE INDEX "Entry_userId_occurredOn_idx" ON "Entry"("userId", "occurredOn");

-- CreateIndex
CREATE INDEX "Entry_userId_type_occurredOn_idx" ON "Entry"("userId", "type", "occurredOn");

-- CreateIndex
CREATE INDEX "Entry_sourceId_idx" ON "Entry"("sourceId");

