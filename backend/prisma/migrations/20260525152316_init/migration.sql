-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'PREVENCION', 'CONDUCTOR');

-- CreateEnum
CREATE TYPE "VehicleCheckStatus" AS ENUM ('PENDIENTE', 'COMPLETADO', 'OBSERVADO');

-- CreateEnum
CREATE TYPE "CheckItemStatus" AS ENUM ('BUENO', 'MALO', 'NO_APLICA');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCheckList" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "patent" TEXT NOT NULL,
    "mileage" INTEGER,
    "vehicleType" TEXT,
    "vehicleModel" TEXT,
    "driverName" TEXT NOT NULL,
    "supervisorName" TEXT,
    "technicalReview" TIMESTAMP(3),
    "gasEmissionReview" TIMESTAMP(3),
    "driverLicenseExpiration" TIMESTAMP(3),
    "circulationPermitExpiration" TIMESTAMP(3),
    "mandatoryInsuranceExpiration" TIMESTAMP(3),
    "generalObservation" TEXT,
    "status" "VehicleCheckStatus" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "VehicleCheckList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCheckItem" (
    "id" SERIAL NOT NULL,
    "itemName" TEXT NOT NULL,
    "status" "CheckItemStatus",
    "observation" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleCheckListId" INTEGER NOT NULL,

    CONSTRAINT "VehicleCheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCheckPhoto" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleCheckListId" INTEGER NOT NULL,

    CONSTRAINT "VehicleCheckPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "VehicleCheckList" ADD CONSTRAINT "VehicleCheckList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheckItem" ADD CONSTRAINT "VehicleCheckItem_vehicleCheckListId_fkey" FOREIGN KEY ("vehicleCheckListId") REFERENCES "VehicleCheckList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheckPhoto" ADD CONSTRAINT "VehicleCheckPhoto_vehicleCheckListId_fkey" FOREIGN KEY ("vehicleCheckListId") REFERENCES "VehicleCheckList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
