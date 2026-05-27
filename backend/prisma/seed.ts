import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as XLSX from "xlsx";
import * as path from "path";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const filePath = path.join(
    process.cwd(),
    "..",
    "vehiculos_insprotel_2026-05-25.xlsx",
  );

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  for (const row of rows) {
    const patent = String(row["Patente"] || "").trim();

    if (!patent) continue;

    await prisma.vehicle.upsert({
      where: {
        patent,
      },
      update: {
        vehicleType: row["Tipo de vehículo"] || null,
        vehicleModel: row["Modelo"] || null,
        company: row["Empresa"] || null,
      },
      create: {
        patent,
        vehicleType: row["Tipo de vehículo"] || null,
        vehicleModel: row["Modelo"] || null,
        company: row["Empresa"] || null,
      },
    });
  }

  console.log(`✅ ${rows.length} vehículos importados`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });