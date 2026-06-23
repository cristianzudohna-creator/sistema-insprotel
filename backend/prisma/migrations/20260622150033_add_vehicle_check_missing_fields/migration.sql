-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'NO_APLICA';

-- AlterTable
ALTER TABLE "VehicleCheckList" ADD COLUMN     "inspectorName" TEXT,
ADD COLUMN     "inspectorSignatureUrl" TEXT,
ADD COLUMN     "padron" TEXT;
