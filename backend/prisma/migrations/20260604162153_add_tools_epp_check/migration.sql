-- CreateEnum
CREATE TYPE "ToolsEppCheckStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "ToolsEppItemStatus" AS ENUM ('BUENO', 'MALO', 'NO_APLICA');

-- CreateTable
CREATE TABLE "ToolsEppCheck" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contract" TEXT,
    "technicianName" TEXT,
    "mobile" TEXT,
    "supervisorInspectorName" TEXT,
    "zone" TEXT,
    "technicianSignatureUrl" TEXT,
    "inspectorSignatureUrl" TEXT,
    "status" "ToolsEppCheckStatus" NOT NULL DEFAULT 'PENDIENTE',
    "generalObservation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ToolsEppCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolsEppCheckItem" (
    "id" SERIAL NOT NULL,
    "number" INTEGER,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "status" "ToolsEppItemStatus",
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toolsEppCheckId" INTEGER NOT NULL,

    CONSTRAINT "ToolsEppCheckItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ToolsEppCheck" ADD CONSTRAINT "ToolsEppCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolsEppCheckItem" ADD CONSTRAINT "ToolsEppCheckItem_toolsEppCheckId_fkey" FOREIGN KEY ("toolsEppCheckId") REFERENCES "ToolsEppCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
