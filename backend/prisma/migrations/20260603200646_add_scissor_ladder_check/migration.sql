-- CreateEnum
CREATE TYPE "ScissorLadderCheckStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "ScissorLadderItemStatus" AS ENUM ('BUENO', 'MALO', 'NO_APLICA');

-- CreateTable
CREATE TABLE "ScissorLadderCheck" (
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
    "status" "ScissorLadderCheckStatus" NOT NULL DEFAULT 'PENDIENTE',
    "generalObservation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ScissorLadderCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScissorLadderCheckItem" (
    "id" SERIAL NOT NULL,
    "section" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ScissorLadderItemStatus",
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scissorLadderCheckId" INTEGER NOT NULL,

    CONSTRAINT "ScissorLadderCheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScissorLadderCheckPhoto" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scissorLadderCheckId" INTEGER NOT NULL,

    CONSTRAINT "ScissorLadderCheckPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ScissorLadderCheck" ADD CONSTRAINT "ScissorLadderCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScissorLadderCheckItem" ADD CONSTRAINT "ScissorLadderCheckItem_scissorLadderCheckId_fkey" FOREIGN KEY ("scissorLadderCheckId") REFERENCES "ScissorLadderCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScissorLadderCheckPhoto" ADD CONSTRAINT "ScissorLadderCheckPhoto_scissorLadderCheckId_fkey" FOREIGN KEY ("scissorLadderCheckId") REFERENCES "ScissorLadderCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
