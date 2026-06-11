-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('VIGENTE', 'VENCIDA');

-- AlterTable
ALTER TABLE "VehicleCheckList" ADD COLUMN     "circulationPermitStatus" "DocumentStatus",
ADD COLUMN     "driverLicenseStatus" "DocumentStatus",
ADD COLUMN     "gasEmissionReviewStatus" "DocumentStatus",
ADD COLUMN     "mandatoryInsuranceStatus" "DocumentStatus",
ADD COLUMN     "technicalReviewStatus" "DocumentStatus";
