/*
  Warnings:

  - The values [REVISADO] on the enum `IncidentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IncidentStatus_new" AS ENUM ('REPORTADO', 'EN_REVISION', 'SOLUCIONADO');
ALTER TABLE "public"."IncidentReport" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "IncidentReport" ALTER COLUMN "status" TYPE "IncidentStatus_new" USING ("status"::text::"IncidentStatus_new");
ALTER TYPE "IncidentStatus" RENAME TO "IncidentStatus_old";
ALTER TYPE "IncidentStatus_new" RENAME TO "IncidentStatus";
DROP TYPE "public"."IncidentStatus_old";
ALTER TABLE "IncidentReport" ALTER COLUMN "status" SET DEFAULT 'REPORTADO';
COMMIT;

-- AlterTable
ALTER TABLE "IncidentReport" ADD COLUMN     "solutionDescription" TEXT,
ADD COLUMN     "solvedAt" TIMESTAMP(3),
ADD COLUMN     "solvedById" INTEGER;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_solvedById_fkey" FOREIGN KEY ("solvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
