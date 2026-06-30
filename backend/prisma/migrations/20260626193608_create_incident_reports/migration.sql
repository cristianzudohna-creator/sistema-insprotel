-- CreateEnum
CREATE TYPE "IncidentEventType" AS ENUM ('INCIDENTE', 'HALLAZGO');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('LABORAL', 'INDUSTRIAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTADO', 'REVISADO');

-- CreateTable
CREATE TABLE "IncidentReport" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "eventType" "IncidentEventType" NOT NULL,
    "category" "IncidentCategory" NOT NULL,
    "address" TEXT,
    "commune" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "area" TEXT,
    "company" TEXT,
    "description" TEXT NOT NULL,
    "cgedNumber" TEXT,
    "supervisor" TEXT,
    "cgeResponsible" TEXT,
    "prodityNumber" TEXT,
    "hasPhotographs" BOOLEAN NOT NULL DEFAULT false,
    "notifiedSupervisor" BOOLEAN NOT NULL DEFAULT false,
    "reporterName" TEXT NOT NULL,
    "brigadeNumber" TEXT,
    "vehiclePatent" TEXT,
    "phone" TEXT,
    "rut" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentReportPhoto" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentReportId" INTEGER NOT NULL,

    CONSTRAINT "IncidentReportPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReportPhoto" ADD CONSTRAINT "IncidentReportPhoto_incidentReportId_fkey" FOREIGN KEY ("incidentReportId") REFERENCES "IncidentReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
