/*
  Warnings:

  - You are about to drop the column `observations` on the `SafetyTalk` table. All the data in the column will be lost.
  - You are about to drop the column `reporterName` on the `SafetyTalk` table. All the data in the column will be lost.
  - You are about to drop the column `reporterRut` on the `SafetyTalk` table. All the data in the column will be lost.
  - You are about to drop the column `reporterSignatureUrl` on the `SafetyTalk` table. All the data in the column will be lost.
  - You are about to drop the column `sectionOrWork` on the `SafetyTalk` table. All the data in the column will be lost.
  - You are about to drop the column `topicDetails` on the `SafetyTalk` table. All the data in the column will be lost.
  - You are about to drop the column `topicTitle` on the `SafetyTalk` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `SafetyTalk` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `SafetyTalkParticipant` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SafetyTalkStatus" AS ENUM ('BORRADOR', 'PENDIENTE_FIRMAS', 'COMPLETADA', 'ENVIADA_REVISION');

-- CreateEnum
CREATE TYPE "SafetyTalkCreatorRole" AS ENUM ('TECNICO', 'CONDUCTOR');

-- AlterTable
ALTER TABLE "SafetyTalk" DROP COLUMN "observations",
DROP COLUMN "reporterName",
DROP COLUMN "reporterRut",
DROP COLUMN "reporterSignatureUrl",
DROP COLUMN "sectionOrWork",
DROP COLUMN "topicDetails",
DROP COLUMN "topicTitle",
DROP COLUMN "type",
ADD COLUMN     "analyzedAccident" TEXT,
ADD COLUMN     "areaLocationInstallation" TEXT,
ADD COLUMN     "controlMeasure1" TEXT,
ADD COLUMN     "controlMeasure10" TEXT,
ADD COLUMN     "controlMeasure11" TEXT,
ADD COLUMN     "controlMeasure12" TEXT,
ADD COLUMN     "controlMeasure2" TEXT,
ADD COLUMN     "controlMeasure3" TEXT,
ADD COLUMN     "controlMeasure4" TEXT,
ADD COLUMN     "controlMeasure5" TEXT,
ADD COLUMN     "controlMeasure6" TEXT,
ADD COLUMN     "controlMeasure7" TEXT,
ADD COLUMN     "controlMeasure8" TEXT,
ADD COLUMN     "controlMeasure9" TEXT,
ADD COLUMN     "createdByName" TEXT,
ADD COLUMN     "createdByRut" TEXT,
ADD COLUMN     "createdBySignatureUrl" TEXT,
ADD COLUMN     "creatorRole" "SafetyTalkCreatorRole",
ADD COLUMN     "foremanCompany" TEXT,
ADD COLUMN     "foremanOrBrigadeName" TEXT,
ADD COLUMN     "meetingTime" TEXT,
ADD COLUMN     "peopleCount" INTEGER,
ADD COLUMN     "sentToPreventionAt" TIMESTAMP(3),
ADD COLUMN     "sentToSupervisorAt" TIMESTAMP(3),
ADD COLUMN     "significantRisks" TEXT,
ADD COLUMN     "status" "SafetyTalkStatus" NOT NULL DEFAULT 'PENDIENTE_FIRMAS',
ADD COLUMN     "workOrderProject" TEXT,
ADD COLUMN     "workPermitActivity" TEXT,
ADD COLUMN     "workTypes" TEXT,
ADD COLUMN     "worksToDo" TEXT;

-- AlterTable
ALTER TABLE "SafetyTalkParticipant" DROP COLUMN "position",
ADD COLUMN     "compliesRest" BOOLEAN,
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "SafetyTalkParticipant" ADD CONSTRAINT "SafetyTalkParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
