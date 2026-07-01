-- AlterTable
ALTER TABLE "IncidentReport" ADD COLUMN     "preventionUserId" INTEGER;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_preventionUserId_fkey" FOREIGN KEY ("preventionUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
