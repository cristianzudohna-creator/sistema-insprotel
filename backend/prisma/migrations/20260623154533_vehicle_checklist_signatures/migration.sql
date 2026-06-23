-- AlterEnum
ALTER TYPE "VehicleCheckStatus" ADD VALUE 'PENDIENTE_FIRMAS';

-- AlterTable
ALTER TABLE "VehicleCheckList" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdByRole" "Role",
ADD COLUMN     "preventionName" TEXT,
ADD COLUMN     "preventionSignatureUrl" TEXT,
ADD COLUMN     "preventionSignedAt" TIMESTAMP(3),
ADD COLUMN     "superadminName" TEXT,
ADD COLUMN     "superadminSignatureUrl" TEXT,
ADD COLUMN     "superadminSignedAt" TIMESTAMP(3),
ADD COLUMN     "supervisorSignatureUrl" TEXT,
ADD COLUMN     "supervisorSignedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDIENTE_FIRMAS';
