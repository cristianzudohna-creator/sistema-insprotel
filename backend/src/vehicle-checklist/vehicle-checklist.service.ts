import { Injectable, NotFoundException } from "@nestjs/common";
import type { Response } from "express";
import PDFDocument = require("pdfkit");
import * as fs from "fs";
import * as path from "path";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VehicleChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  private toDate(value: any) {
    if (!value) return null;
    return new Date(value);
  }

  private parseItems(value: any) {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }

  private formatDate(value: any) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleDateString("es-CL");
    } catch {
      return "—";
    }
  }

  private text(value: any) {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
  }

  private formatMaintenance(value: any) {
    const normalized = String(value || "").trim().toUpperCase();

    if (normalized === "SI" || normalized === "SÍ" || normalized === "YES") {
      return "Sí";
    }

    if (normalized === "NO") {
      return "No";
    }

    return "—";
  }

  async searchVehicles(query: string) {
    return this.prisma.vehicle.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            patent: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      take: 10,
      orderBy: {
        patent: "asc",
      },
    });
  }

  async create(
    data: any,
    files: Express.Multer.File[] = [],
    driverSignature?: Express.Multer.File | null,
  ) {
    const user = await this.prisma.user.upsert({
      where: {
        email: "admin@insprotel.cl",
      },
      update: {},
      create: {
        name: "Administrador",
        email: "admin@insprotel.cl",
        password: "dev-password",
        role: "ADMIN",
      },
    });

    const items = this.parseItems(data.items);

    const lastChecklist = await this.prisma.vehicleCheckList.findFirst({
      orderBy: {
        id: "desc",
      },
    });

    const nextNumber = (lastChecklist?.id || 0) + 1;

    const generatedFolio = `CL-${new Date().getFullYear()}-${String(
      nextNumber,
    ).padStart(4, "0")}`;

    return this.prisma.vehicleCheckList.create({
      data: {
        folio: generatedFolio,
        date: this.toDate(data.date) || new Date(),
        patent: data.patent || "SIN_PATENTE",
        mileage: Number(data.mileage || 0),
        maintenanceUpToDate: data.maintenanceUpToDate || null,
        vehicleType: data.vehicleType || null,
        vehicleModel: data.vehicleModel || null,
        driverName: data.driverName || "Sin conductor",
        supervisorName: data.supervisorName || null,
        driverSignatureUrl: driverSignature
          ? `/uploads/vehicle-checklist/${driverSignature.filename}`
          : null,
        technicalReview: this.toDate(data.technicalReview),
        gasEmissionReview: this.toDate(data.gasReview),
        driverLicenseExpiration: this.toDate(data.driverLicense),
        circulationPermitExpiration: this.toDate(data.circulationPermit),
        mandatoryInsuranceExpiration: this.toDate(data.insurance),
        generalObservation: data.observations || null,
        status: data.status || "PENDIENTE",
        userId: user.id,

        items: {
          create: items.map((item: any) => ({
            itemName: item.itemName,
            status: item.status || null,
            observation: item.observation || null,
            photoUrl: null,
          })),
        },

        photos: {
          create: files.map((file) => ({
            imageUrl: `/uploads/vehicle-checklist/${file.filename}`,
          })),
        },
      },
      include: {
        items: true,
        photos: true,
        user: true,
      },
    });
  }

  async findAll() {
    return this.prisma.vehicleCheckList.findMany({
      include: {
        items: true,
        photos: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findOne(id: number) {
    const checklist = await this.prisma.vehicleCheckList.findUnique({
      where: { id },
      include: {
        items: true,
        photos: true,
        user: true,
      },
    });

    if (!checklist) {
      throw new NotFoundException("Check list no encontrado");
    }

    return checklist;
  }

  async generatePdf(id: number, res: Response) {
    const checklist = await this.findOne(id);

    const doc = new PDFDocument({
      size: "A4",
      margin: 18,
      bufferPages: true,
    });

    const safePatent = String(checklist.patent || "sin-patente").replace(
  /[^a-zA-Z0-9-_]/g,
  "_",
);

const safeDriver = String(
  checklist.driverName || "usuario",
).replace(/[^a-zA-Z0-9-_]/g, "_");

const today = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");

res.setHeader(
  "Content-Disposition",
  `inline; filename="CHECKLIST_${safePatent}_${safeDriver}_${today}.pdf"`,
);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const black = "#111827";
    const gray = "#f3f4f6";
    const bottomLimit = pageHeight - 24;

    const drawCell = (
      x: number,
      y: number,
      w: number,
      h: number,
      text = "",
      options: any = {},
    ) => {
      if (options.fill) {
        doc.rect(x, y, w, h).fillAndStroke(options.fill, black);
      } else {
        doc.rect(x, y, w, h).stroke(black);
      }

      doc
        .fillColor(black)
        .font(options.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(options.fontSize || 6.5)
        .text(text, x + 3, y + 4, {
          width: w - 6,
          height: h - 4,
          align: options.align || "left",
        });
    };

    const drawX = (x: number, y: number, w: number, h: number) => {
      doc
        .moveTo(x + 5, y + 5)
        .lineTo(x + w - 5, y + h - 5)
        .moveTo(x + w - 5, y + 5)
        .lineTo(x + 5, y + h - 5)
        .stroke(black);
    };

    const normalizeStatus = (value: any) =>
      String(value || "").trim().toUpperCase();

    const getPhotoPath = (photo: any) => {
      const relativePath = String(photo?.imageUrl || "").replace(/^\/+/, "");
      return path.join(process.cwd(), relativePath);
    };

    const getPathFromUrl = (url: any) => {
      const relativePath = String(url || "").replace(/^\/+/, "");
      return path.join(process.cwd(), relativePath);
    };

    const logoCandidates = [
      path.join(process.cwd(), "uploads", "branding", "logo-insprotel.png"),
      path.join(process.cwd(), "uploads", "logo-insprotel.png"),
      path.join(process.cwd(), "uploads", "branding", "insprotel.png"),
    ];

    const logoPath = logoCandidates.find((item) => fs.existsSync(item));

    const drawPhotoClean = (
      x: number,
      yStart: number,
      w: number,
      h: number,
      photo: any,
    ) => {
      if (!photo) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#6b7280")
          .text("Sin foto adjunta", x, yStart + h / 2 - 4, {
            width: w,
            align: "center",
          });
        return;
      }

      const imagePath = getPhotoPath(photo);

      if (!fs.existsSync(imagePath)) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#6b7280")
          .text("Imagen no encontrada", x, yStart + h / 2 - 4, {
            width: w,
            align: "center",
          });
        return;
      }

      try {
        doc.image(imagePath, x + 6, yStart + 6, {
          width: w - 12,
          height: h - 12,
          fit: [w - 12, h - 12],
          align: "center",
          valign: "center",
        });
      } catch {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#6b7280")
          .text("No se pudo cargar imagen", x, yStart + h / 2 - 4, {
            width: w,
            align: "center",
          });
      }
    };

    const drawSignatureImage = (
      x: number,
      yStart: number,
      w: number,
      h: number,
      signatureUrl: any,
    ) => {
      if (!signatureUrl) return;

      const signaturePath = getPathFromUrl(signatureUrl);

      if (!fs.existsSync(signaturePath)) return;

      try {
        const signatureBoxW = w - 80;
        const signatureBoxH = h;

        doc.image(signaturePath, x + 40, yStart, {
          width: signatureBoxW,
          height: signatureBoxH,
          fit: [signatureBoxW, signatureBoxH],
          align: "center",
          valign: "center",
        });
      } catch {
        // No romper PDF si falla firma
      }
    };

    const headerY = 18;
    const headerH = 48;
    const logoW = 180;
    const titleW = contentWidth - logoW;

    drawCell(margin, headerY, logoW, headerH, "");

    if (logoPath) {
      try {
        doc.image(logoPath, margin + 14, headerY + 6, {
  width: 150,
  height: 38,
});
      } catch {
        doc
          .font("Helvetica-Bold")
          .fontSize(14)
          .fillColor(black)
          .text("INSPROTEL", margin + 18, headerY + 18);
      }
    } else {
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(black)
        .text("INSPROTEL", margin + 18, headerY + 18);
    }

    drawCell(margin + logoW, headerY, titleW, headerH, "", {
  bold: true,
});

doc
  .font("Helvetica-Bold")
  .fontSize(18)
  .fillColor(black)
  .text(
    "CHECK LIST VEHÍCULOS",
    margin + logoW,
    headerY + 16,
    {
      width: titleW,
      align: "center",
    },
  );

    const topY = 78;
    const leftW = 260;
    const rightW = contentWidth - leftW - 10;
    const rightX = margin + leftW + 10;

    const infoRows = [
      ["Fecha", this.formatDate(checklist.date)],
      ["Patente", this.text(checklist.patent)],
      ["Kilometraje", this.text(checklist.mileage)],
      ["Tipo de Vehículo", this.text(checklist.vehicleType)],
      ["Modelo Vehículo", this.text(checklist.vehicleModel)],
      [
        "Mantención al día",
        this.formatMaintenance((checklist as any).maintenanceUpToDate),
      ],
    ];

    let y = topY;

    infoRows.forEach(([label, value]) => {
      drawCell(margin, y, 100, 16, label, { fill: gray, bold: true });
      drawCell(margin + 100, y, leftW - 100, 16, value, {
        fontSize: 8,
        bold: true,
        align: "center",
      });
      y += 16;
    });

    const docHeaderH = 16;

    drawCell(rightX, topY, 145, docHeaderH, "Marque con una X", {
      bold: true,
      align: "center",
      fill: gray,
    });
    drawCell(rightX + 145, topY, 48, docHeaderH, "Fecha", {
      bold: true,
      align: "center",
      fill: gray,
    });
    drawCell(rightX + 193, topY, 38, docHeaderH, "Vigente", {
      bold: true,
      align: "center",
      fill: gray,
    });
    drawCell(rightX + 231, topY, 38, docHeaderH, "Vencida", {
      bold: true,
      align: "center",
      fill: gray,
    });

    const docs = [
      ["Revisión Técnica", checklist.technicalReview],
      ["Emisión Gases Contaminantes", checklist.gasEmissionReview],
      ["Permiso Circulación", checklist.circulationPermitExpiration],
      ["Seguro Obligatorio", checklist.mandatoryInsuranceExpiration],
      ["Vigencia Licencia de Conducir", checklist.driverLicenseExpiration],
    ];

    y = topY + docHeaderH;

    docs.forEach(([label, value]: any[]) => {
      drawCell(rightX, y, 145, 16, label, {
        bold: true,
        align: "center",
      });
      drawCell(rightX + 145, y, 48, 16, this.formatDate(value), {
        align: "center",
      });
      drawCell(rightX + 193, y, 38, 16, "");
      drawCell(rightX + 231, y, 38, 16, "");

      if (value) {
        drawX(rightX + 193, y, 38, 16);
      } else {
        drawX(rightX + 231, y, 38, 16);
      }

      y += 16;
    });

    const tableY = 188;
    const tableGap = 10;
    const tableW = (contentWidth - tableGap) / 2;
    const rowH = 16;
    const titleH = 16;

    const items = checklist.items || [];
    const half = Math.ceil(items.length / 2);
    const leftItems = items.slice(0, half);
    const rightItems = items.slice(half);

    const drawChecklistTable = (x: number, yStart: number, list: any[]) => {
      drawCell(x, yStart, tableW, titleH, "CHEQUEO GENERAL", {
        bold: true,
        align: "center",
        fill: gray,
      });

      let yy = yStart + titleH;

      const colElemento = tableW * 0.42;
      const colSmall = tableW * 0.12;
      const colObs = tableW - colElemento - colSmall * 3;

      drawCell(x, yy, colElemento, rowH, "Elemento a revisar", {
        bold: true,
        align: "center",
        fill: gray,
      });
      drawCell(x + colElemento, yy, colSmall, rowH, "Bueno", {
        bold: true,
        align: "center",
        fill: gray,
      });
      drawCell(x + colElemento + colSmall, yy, colSmall, rowH, "Malo", {
        bold: true,
        align: "center",
        fill: gray,
      });
      drawCell(
        x + colElemento + colSmall * 2,
        yy,
        colSmall,
        rowH,
        "No aplica",
        {
          bold: true,
          align: "center",
          fill: gray,
          fontSize: 4.6,
        },
      );
      drawCell(x + colElemento + colSmall * 3, yy, colObs, rowH, "Observación", {
        bold: true,
        align: "center",
        fill: gray,
      });

      yy += rowH;

      const rowsToDraw = Math.max(8, list.length);

      for (let i = 0; i < rowsToDraw; i++) {
        const item = list[i];
        const status = normalizeStatus(item?.status);

        drawCell(x, yy, colElemento, rowH, this.text(item?.itemName || ""), {
          fontSize: 6,
          bold: !!item,
        });
        drawCell(x + colElemento, yy, colSmall, rowH, "");
        drawCell(x + colElemento + colSmall, yy, colSmall, rowH, "");
        drawCell(x + colElemento + colSmall * 2, yy, colSmall, rowH, "");
        drawCell(
          x + colElemento + colSmall * 3,
          yy,
          colObs,
          rowH,
          this.text(item?.observation || ""),
          { fontSize: 5.4 },
        );

        if (status === "BUENO") {
          drawX(x + colElemento, yy, colSmall, rowH);
        } else if (status === "MALO") {
          drawX(x + colElemento + colSmall, yy, colSmall, rowH);
        } else if (
          status === "NO" ||
          status === "NO APLICA" ||
          status === "NO_APLICA"
        ) {
          drawX(x + colElemento + colSmall * 2, yy, colSmall, rowH);
        }

        yy += rowH;
      }
    };

    drawChecklistTable(margin, tableY, leftItems);
    drawChecklistTable(margin + tableW + tableGap, tableY, rightItems);

    const photos = checklist.photos || [];
    let currentY = 372;

    if (photos.length > 0) {
      drawCell(
        margin,
        currentY,
        contentWidth,
        18,
        "Evidencia fotografica de desperfecto",
        { bold: true, align: "center", fontSize: 7 },
      );

      currentY += 18;

      const photosPerRow = photos.length <= 2 ? 2 : 3;
      const photoGap = 8;
      const photoW =
        (contentWidth - photoGap * (photosPerRow - 1)) / photosPerRow;
      const photoH = photos.length <= 2 ? 150 : 96;

      photos.forEach((photo: any, index: number) => {
        const col = index % photosPerRow;

        if (col === 0 && index > 0) {
          currentY += photoH + photoGap;
        }

        if (currentY + photoH > bottomLimit - 120) {
          doc.addPage();
          currentY = 28;

          drawCell(
            margin,
            currentY,
            contentWidth,
            18,
            "Continuación registro fotográfico",
            { bold: true, align: "center", fontSize: 8, fill: gray },
          );

          currentY += 22;
        }

        const x = margin + col * (photoW + photoGap);

        doc.rect(x, currentY, photoW, photoH).stroke(black);
        drawPhotoClean(x, currentY, photoW, photoH, photo);
      });

      currentY += photoH + 18;
    } else {
      drawCell(
        margin,
        currentY,
        contentWidth,
        18,
        "Evidencia fotografica de desperfecto",
        { bold: true, align: "center", fontSize: 7 },
      );

      currentY += 18;

      doc.rect(margin, currentY, contentWidth, 80).stroke(black);

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#6b7280")
        .text("Sin fotos adjuntas", margin, currentY + 35, {
          width: contentWidth,
          align: "center",
        });

      currentY += 98;
    }

    const neededForBottom = 16 + 76 + 18 + 16 + 72 + 20;

    if (currentY + neededForBottom > bottomLimit) {
      doc.addPage();
      currentY = 28;
    }

    drawCell(margin, currentY, contentWidth, 16, "COMENTARIOS Y OBSERVACIONES", {
      bold: true,
      align: "center",
      fill: gray,
    });

    currentY += 16;

    const obsH = 76;

    doc.rect(margin, currentY, contentWidth, obsH).stroke(black);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(black)
      .text(
        this.text(checklist.generalObservation || ""),
        margin + 14,
        currentY + 14,
        {
          width: contentWidth - 28,
          height: obsH - 18,
          align: "left",
        },
      );

    currentY += obsH + 18;

    const signH = 72;
    const signW = (contentWidth - 10) / 2;

    drawCell(margin, currentY, signW, 16, "Nombre y firma del trabajador:", {
      bold: true,
      align: "center",
      fill: gray,
    });

    doc.rect(margin, currentY + 16, signW, signH).stroke(black);

    drawSignatureImage(
      margin,
      currentY + 18,
      signW,
      38,
      checklist.driverSignatureUrl,
    );

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(black)
      .text(this.text(checklist.driverName || ""), margin, currentY + 58, {
        width: signW,
        align: "center",
      });

    drawCell(margin + signW + 10, currentY, signW, 16, "Supervisor", {
      bold: true,
      align: "center",
      fill: gray,
    });

    doc.rect(margin + signW + 10, currentY + 16, signW, signH).stroke(black);

    doc
      .font("Helvetica")
      .fontSize(13)
      .fillColor(black)
      .text(
        this.text(checklist.supervisorName || ""),
        margin + signW + 10,
        currentY + 48,
        {
          width: signW,
          align: "center",
        },
      );

    doc.end();
  }

  async remove(id: number) {
    const checklist = await this.prisma.vehicleCheckList.findUnique({
      where: {
        id,
      },
    });

    if (!checklist) {
      throw new NotFoundException("Check list no encontrado");
    }

    return this.prisma.vehicleCheckList.delete({
      where: {
        id,
      },
    });
  }
}