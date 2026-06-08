-- CreateEnum
CREATE TYPE "LadderCheckStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "LadderItemStatus" AS ENUM ('BUENO', 'MALO', 'NO_APLICA');

-- CreateTable
CREATE TABLE "LadderCheck" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contract" TEXT,
    "technicianName" TEXT,
    "mobile" TEXT,
    "inspectorName" TEXT,
    "zone" TEXT,
    "technicianSignatureUrl" TEXT,
    "inspectorSignatureUrl" TEXT,
    "status" "LadderCheckStatus" NOT NULL DEFAULT 'PENDIENTE',
    "generalObservation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "LadderCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LadderCheckItem" (
    "id" SERIAL NOT NULL,
    "section" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "LadderItemStatus",
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ladderCheckId" INTEGER NOT NULL,

    CONSTRAINT "LadderCheckItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LadderCheck" ADD CONSTRAINT "LadderCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LadderCheckItem" ADD CONSTRAINT "LadderCheckItem_ladderCheckId_fkey" FOREIGN KEY ("ladderCheckId") REFERENCES "LadderCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
