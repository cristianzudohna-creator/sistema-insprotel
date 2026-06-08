-- CreateEnum
CREATE TYPE "SafetyTalkType" AS ENUM ('CHARLA_5_MINUTOS', 'CHARLA_OPERACIONAL', 'REINDUCCION', 'DIFUSION_PROCEDIMIENTOS');

-- CreateTable
CREATE TABLE "SafetyTalk" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sectionOrWork" TEXT,
    "reporterName" TEXT NOT NULL,
    "reporterRut" TEXT,
    "reporterSignatureUrl" TEXT,
    "type" "SafetyTalkType" NOT NULL,
    "topicTitle" TEXT NOT NULL,
    "topicDetails" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "SafetyTalk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyTalkParticipant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rut" TEXT,
    "position" TEXT,
    "signatureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "safetyTalkId" INTEGER NOT NULL,

    CONSTRAINT "SafetyTalkParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyTalkPhoto" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "safetyTalkId" INTEGER NOT NULL,

    CONSTRAINT "SafetyTalkPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SafetyTalk" ADD CONSTRAINT "SafetyTalk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyTalkParticipant" ADD CONSTRAINT "SafetyTalkParticipant_safetyTalkId_fkey" FOREIGN KEY ("safetyTalkId") REFERENCES "SafetyTalk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyTalkPhoto" ADD CONSTRAINT "SafetyTalkPhoto_safetyTalkId_fkey" FOREIGN KEY ("safetyTalkId") REFERENCES "SafetyTalk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
