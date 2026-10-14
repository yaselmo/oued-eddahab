CREATE TABLE "ResourceView" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourceView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResourceView_resourceId_userId_key"
  ON "ResourceView"("resourceId", "userId");
CREATE INDEX "ResourceView_userId_idx" ON "ResourceView"("userId");

ALTER TABLE "ResourceView"
  ADD CONSTRAINT "ResourceView_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "StudyResource"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ResourceView_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Historical StudyResource.views values counted detail-page visits and cannot
-- be attributed to authenticated users. Start the unique-view metric at zero
-- only after the new tracking table and constraints have been created.
UPDATE "StudyResource" SET "views" = 0;
