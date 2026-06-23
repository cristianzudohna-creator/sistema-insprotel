-- AlterTable
ALTER TABLE "VehicleCheckList" ADD COLUMN     "driverSignedAt" TIMESTAMP(3),
ADD COLUMN     "driverUserId" INTEGER,
ADD COLUMN     "inspectorSignedAt" TIMESTAMP(3);
