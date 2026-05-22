-- CreateTable
CREATE TABLE "TimerAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timerLogId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "previousTotalSeconds" INTEGER NOT NULL,
    "newTotalSeconds" INTEGER NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimerAuditLog_timerLogId_fkey" FOREIGN KEY ("timerLogId") REFERENCES "TimerLog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
