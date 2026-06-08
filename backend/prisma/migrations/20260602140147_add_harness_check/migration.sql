-- CreateEnum
CREATE TYPE "HarnessCheckStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "HarnessItemStatus" AS ENUM ('SI', 'NO', 'NO_APLICA');

-- CreateTable
CREATE TABLE "HarnessCheck" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contract" TEXT,
    "technicianName" TEXT,
    "mobile" TEXT,
    "supervisorInspectorName" TEXT,
    "zone" TEXT,
    "technicianSignatureUrl" TEXT,
    "supervisorSignatureUrl" TEXT,
    "status" "HarnessCheckStatus" NOT NULL DEFAULT 'PENDIENTE',
    "generalObservation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "HarnessCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarnessCheckItem" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "status" "HarnessItemStatus",
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "harnessCheckId" INTEGER NOT NULL,

    CONSTRAINT "HarnessCheckItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HarnessCheck" ADD CONSTRAINT "HarnessCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarnessCheckItem" ADD CONSTRAINT "HarnessCheckItem_harnessCheckId_fkey" FOREIGN KEY ("harnessCheckId") REFERENCES "HarnessCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
