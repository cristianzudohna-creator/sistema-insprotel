-- CreateEnum
CREATE TYPE "ToolsDriverCheckStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "ToolsDriverItemStatus" AS ENUM ('BUENO', 'MALO', 'NO_APLICA');

-- CreateTable
CREATE TABLE "ToolsDriverCheck" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contract" TEXT,
    "driverName" TEXT,
    "mobile" TEXT,
    "supervisorInspectorName" TEXT,
    "zone" TEXT,
    "heightExamExpiration" TEXT,
    "driverSignatureUrl" TEXT,
    "inspectorSignatureUrl" TEXT,
    "status" "ToolsDriverCheckStatus" NOT NULL DEFAULT 'PENDIENTE',
    "generalObservation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ToolsDriverCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolsDriverCheckItem" (
    "id" SERIAL NOT NULL,
    "number" INTEGER,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "status" "ToolsDriverItemStatus",
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toolsDriverCheckId" INTEGER NOT NULL,

    CONSTRAINT "ToolsDriverCheckItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ToolsDriverCheck" ADD CONSTRAINT "ToolsDriverCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolsDriverCheckItem" ADD CONSTRAINT "ToolsDriverCheckItem_toolsDriverCheckId_fkey" FOREIGN KEY ("toolsDriverCheckId") REFERENCES "ToolsDriverCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
