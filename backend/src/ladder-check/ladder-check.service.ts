import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Response } from "express";
import PDFDocument = require("pdfkit");
import * as fs from "fs";
import * as path from "path";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LadderCheckService {
  constructor(private readonly prisma: PrismaService) {}

  private text(value: any) {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
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

  private isSuperadmin(user: any) {
    return String(user?.role || "").toUpperCase() === "SUPERADMIN";
  }

  private async getLoggedUser(user: any) {
    const userId = Number(user?.id || user?.sub || 0);
    const email = user?.email || "";

    if (userId) {
      const found = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (found) return found;
    }

    if (email) {
      const found = await this.prisma.user.findUnique({
        where: { email },
      });

      if (found) return found;
    }

    throw new ForbiddenException("Usuario no válido");
  }

  private async canAccess(currentUser: any, id: number) {
    const user = await this.getLoggedUser(currentUser);

    const check = await this.prisma.ladderCheck.findUnique({
      where: { id },
      include: {
        items: true,
        photos: true,
        user: true,
      },
    });

    if (!check) {
      throw new NotFoundException("Check list de escala no encontrado");
    }

    if (!this.isSuperadmin(user) && check.userId !== user.id) {
      throw new ForbiddenException(
        "No tienes permiso para ver este check list",
      );
    }

    return check;
  }

  async create(
    currentUser: any,
    data: any,
    photos: Express.Multer.File[] = [],
    technicianSignature?: Express.Multer.File | null,
    inspectorSignature?: Express.Multer.File | null,
  ) {
    const user = await this.getLoggedUser(currentUser);
    const items = this.parseItems(data.items);

    const lastCheck = await this.prisma.ladderCheck.findFirst({
      orderBy: {
        id: "desc",
      },
    });

    const nextNumber = (lastCheck?.id || 0) + 1;

    const generatedFolio = `ESC-${new Date().getFullYear()}-${String(
      nextNumber,
    ).padStart(4, "0")}`;

    return this.prisma.ladderCheck.create({
      data: {
        folio: generatedFolio,
        date: new Date(),
        contract: data.contract || null,
        technicianName: data.technicianName || user.name || null,
        mobile: data.mobile || null,
        inspectorName: data.inspectorName || null,
        zone: data.zone || null,
        technicianSignatureUrl: technicianSignature
          ? `/uploads/ladder-check/${technicianSignature.filename}`
          : null,
        inspectorSignatureUrl: inspectorSignature
          ? `/uploads/ladder-check/${inspectorSignature.filename}`
          : null,
        status: data.status || "PENDIENTE",
        generalObservation: data.generalObservation || null,
        userId: user.id,

        items: {
          create: items.map((item: any) => ({
            section: item.section || "GENERAL",
            description: item.description,
            status: item.status || null,
            observation: item.observation || null,
          })),
        },

        photos: {
          create: photos.map((file) => ({
            imageUrl: `/uploads/ladder-check/${file.filename}`,
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

  async findAll(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    return this.prisma.ladderCheck.findMany({
      where: {
        userId: user.id,
      },
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

  async findAllAdmin(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    if (!this.isSuperadmin(user)) {
      throw new ForbiddenException(
        "Solo SUPERADMIN puede ver todos los check list de escalas",
      );
    }

    return this.prisma.ladderCheck.findMany({
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

  async findOne(currentUser: any, id: number) {
    return this.canAccess(currentUser, id);
  }

  async remove(currentUser: any, id: number) {
    const user = await this.getLoggedUser(currentUser);

    const check = await this.prisma.ladderCheck.findUnique({
      where: { id },
    });

    if (!check) {
      throw new NotFoundException("Check list de escala no encontrado");
    }

    if (!this.isSuperadmin(user) && check.userId !== user.id) {
      throw new ForbiddenException(
        "No tienes permiso para eliminar este check list",
      );
    }

    return this.prisma.ladderCheck.delete({
      where: { id },
    });
  }

  async generatePdf(currentUser: any, id: number, res: Response) {
    const check = await this.findOne(currentUser, id);

    const safeTechnician = String(check.technicianName || "tecnico").replace(
      /[^a-zA-Z0-9-_]/g,
      "_",
    );

    const today = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="CHECKLIST_ESCALA_${safeTechnician}_${today}.pdf"`,
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 18,
      bufferPages: true,
    });

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const black = "#111827";
    const gray = "#f3f4f6";
    const bottomLimit = pageHeight - 26;

    const logoCandidates = [
      path.join(process.cwd(), "uploads", "branding", "logo-insprotel.png"),
      path.join(process.cwd(), "uploads", "logo-insprotel.png"),
    ];

    const logoPath = logoCandidates.find((item) => fs.existsSync(item));

    const getPathFromUrl = (url: any) => {
      const relativePath = String(url || "").replace(/^\/+/, "");
      return path.join(process.cwd(), relativePath);
    };

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
        .fontSize(options.fontSize || 7)
        .text(text, x + 4, y + 5, {
          width: w - 8,
          height: h - 6,
          align: options.align || "left",
        });
    };

    const drawSignature = (
      x: number,
      y: number,
      w: number,
      h: number,
      signatureUrl: any,
    ) => {
      if (!signatureUrl) return;

      const signaturePath = getPathFromUrl(signatureUrl);

      if (!fs.existsSync(signaturePath)) return;

      try {
        doc.image(signaturePath, x + 8, y + 3, {
          fit: [w - 16, h - 6],
          align: "center",
          valign: "center",
        });
      } catch {
        // Evitar romper PDF
      }
    };

    const drawImageBox = (
      x: number,
      y: number,
      w: number,
      h: number,
      imageUrl: any,
    ) => {
      doc.rect(x, y, w, h).stroke(black);

      const imagePath = getPathFromUrl(imageUrl);

      if (!imageUrl || !fs.existsSync(imagePath)) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#6b7280")
          .text("Sin foto", x, y + h / 2 - 4, {
            width: w,
            align: "center",
          });

        return;
      }

      try {
        doc.image(imagePath, x + 6, y + 6, {
          fit: [w - 12, h - 12],
          align: "center",
          valign: "center",
        });
      } catch {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#6b7280")
          .text("No se pudo cargar imagen", x, y + h / 2 - 4, {
            width: w,
            align: "center",
          });
      }
    };

    const drawStatus = (value: any, target: string) => {
      const normalized = String(value || "").toUpperCase();
      if (normalized !== target) return " ";
      return "X";
    };

    const headerY = 18;
    const headerH = 52;
    const logoW = 165;
    const titleW = contentWidth - logoW;

    drawCell(margin, headerY, logoW, headerH, "");

    if (logoPath) {
      try {
        doc.image(logoPath, margin + 12, headerY + 8, {
          width: 140,
          height: 36,
        });
      } catch {
        doc
          .font("Helvetica-Bold")
          .fontSize(14)
          .fillColor(black)
          .text("INSPROTEL", margin + 18, headerY + 20);
      }
    }

    drawCell(margin + logoW, headerY, titleW, headerH, "");

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(black)
      .text("CHECK LIST ESCALAS TELESCÓPICAS", margin + logoW, headerY + 17, {
        width: titleW,
        align: "center",
      });

    let y = headerY + headerH + 10;

    drawCell(margin, y, contentWidth, 18, "DATOS GENERALES", {
      bold: true,
      fill: gray,
      align: "center",
      fontSize: 8,
    });

    y += 18;

    const leftW = contentWidth / 2;

    drawCell(margin, y, 95, 18, "Contrato", {
      fill: gray,
      bold: true,
    });
    drawCell(margin + 95, y, leftW - 95, 18, this.text(check.contract));

    drawCell(margin + leftW, y, 95, 18, "Fecha", {
      fill: gray,
      bold: true,
    });
    drawCell(
      margin + leftW + 95,
      y,
      leftW - 95,
      18,
      this.formatDate(check.date),
    );

    y += 18;

    drawCell(margin, y, 95, 18, "Técnico", {
      fill: gray,
      bold: true,
    });
    drawCell(
      margin + 95,
      y,
      leftW - 95,
      18,
      this.text(check.technicianName),
    );

    drawCell(margin + leftW, y, 95, 18, "Móvil", {
      fill: gray,
      bold: true,
    });
    drawCell(margin + leftW + 95, y, leftW - 95, 18, this.text(check.mobile));

    y += 18;

    drawCell(margin, y, 95, 18, "Inspector", {
      fill: gray,
      bold: true,
    });
    drawCell(margin + 95, y, leftW - 95, 18, this.text(check.inspectorName));

    drawCell(margin + leftW, y, 95, 18, "Zona", {
      fill: gray,
      bold: true,
    });
    drawCell(margin + leftW + 95, y, leftW - 95, 18, this.text(check.zone));

    y += 28;

    drawCell(margin, y, contentWidth, 18, "INSPECCIÓN DE ESCALA", {
      bold: true,
      fill: gray,
      align: "center",
      fontSize: 8,
    });

    y += 24;

    const items = check.items || [];

    const generalItems = items.filter(
      (item: any) => item.section === "CHEQUEO GENERAL",
    );

    const telescopicItems = items.filter(
      (item: any) => item.section === "CHEQUEO ESCALERA TELESCÓPICA",
    );

    const tableGap = 12;
    const tableWidth = (contentWidth - tableGap) / 2;
    const leftX = margin;
    const rightX = margin + tableWidth + tableGap;
    const tableHeaderH = 18;
    const tableColHeaderH = 18;
    const tableRowH = 24;

    const drawInspectionTable = (
      startX: number,
      startY: number,
      title: string,
      rows: any[],
    ) => {
      drawCell(startX, startY, tableWidth, tableHeaderH, title, {
        bold: true,
        fill: gray,
        align: "center",
        fontSize: 7,
      });

      let currentY = startY + tableHeaderH;

      const colN = 24;
      const colSmall = 31;
      const colObs = 70;
      const colItem = tableWidth - colN - colSmall * 3 - colObs;

      drawCell(startX, currentY, colN, tableColHeaderH, "N°", {
        bold: true,
        fill: gray,
        align: "center",
        fontSize: 6,
      });

      drawCell(startX + colN, currentY, colItem, tableColHeaderH, "Elemento a revisar", {
        bold: true,
        fill: gray,
        align: "center",
        fontSize: 5.8,
      });

      drawCell(startX + colN + colItem, currentY, colSmall, tableColHeaderH, "Bueno", {
        bold: true,
        fill: gray,
        align: "center",
        fontSize: 5,
      });

      drawCell(startX + colN + colItem + colSmall, currentY, colSmall, tableColHeaderH, "Malo", {
        bold: true,
        fill: gray,
        align: "center",
        fontSize: 5,
      });

      drawCell(startX + colN + colItem + colSmall * 2, currentY, colSmall, tableColHeaderH, "N/A", {
        bold: true,
        fill: gray,
        align: "center",
        fontSize: 5,
      });

      drawCell(startX + colN + colItem + colSmall * 3, currentY, colObs, tableColHeaderH, "Obs.", {
        bold: true,
        fill: gray,
        align: "center",
        fontSize: 5,
      });

      currentY += tableColHeaderH;

      rows.forEach((item: any, index: number) => {
        drawCell(startX, currentY, colN, tableRowH, String(index + 1), {
          align: "center",
          fontSize: 6,
        });

        drawCell(startX + colN, currentY, colItem, tableRowH, this.text(item.description), {
          fontSize: 5.2,
        });

        drawCell(
          startX + colN + colItem,
          currentY,
          colSmall,
          tableRowH,
          drawStatus(item.status, "BUENO"),
          {
            align: "center",
            bold: true,
            fontSize: 10,
          },
        );

        drawCell(
          startX + colN + colItem + colSmall,
          currentY,
          colSmall,
          tableRowH,
          drawStatus(item.status, "MALO"),
          {
            align: "center",
            bold: true,
            fontSize: 10,
          },
        );

        drawCell(
          startX + colN + colItem + colSmall * 2,
          currentY,
          colSmall,
          tableRowH,
          drawStatus(item.status, "NO_APLICA"),
          {
            align: "center",
            bold: true,
            fontSize: 10,
          },
        );

        drawCell(
          startX + colN + colItem + colSmall * 3,
          currentY,
          colObs,
          tableRowH,
          this.text(item.observation || ""),
          {
            fontSize: 5.2,
          },
        );

        currentY += tableRowH;
      });

      return currentY;
    };

    const leftBottom = drawInspectionTable(
      leftX,
      y,
      "CHEQUEO GENERAL",
      generalItems,
    );

    const rightBottom = drawInspectionTable(
      rightX,
      y,
      "CHEQUEO ESCALERA TELESCÓPICA",
      telescopicItems,
    );

    y = Math.max(leftBottom, rightBottom) + 18;

    if (y + 115 > bottomLimit) {
      doc.addPage();
      y = 28;
    }

    drawCell(margin, y, contentWidth, 18, "FOTOS DE LA ESCALA", {
      bold: true,
      fill: gray,
      align: "center",
      fontSize: 8,
    });

    y += 18;

    const photoGap = 10;
    const photoW = (contentWidth - photoGap) / 2;
    const photoH = 90;
    const photos = check.photos || [];

    drawImageBox(margin, y, photoW, photoH, photos[0]?.imageUrl);
    drawImageBox(
      margin + photoW + photoGap,
      y,
      photoW,
      photoH,
      photos[1]?.imageUrl,
    );

    y += photoH + 14;

    if (y + 170 > bottomLimit) {
      doc.addPage();
      y = 28;
    }

    drawCell(margin, y, contentWidth, 18, "OBSERVACIONES GENERALES", {
      bold: true,
      fill: gray,
      align: "center",
      fontSize: 8,
    });

    y += 18;

    drawCell(margin, y, contentWidth, 60, this.text(check.generalObservation), {
      fontSize: 8,
    });

    y += 74;

    const signGap = 12;
    const signW = (contentWidth - signGap) / 2;
    const signH = 72;

    drawCell(margin, y, signW, 18, "Firma Técnico", {
      bold: true,
      fill: gray,
      align: "center",
    });

    doc.rect(margin, y + 18, signW, signH).stroke(black);

    drawSignature(
      margin,
      y + 22,
      signW,
      36,
      check.technicianSignatureUrl,
    );

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(black)
      .text(this.text(check.technicianName), margin, y + 62, {
        width: signW,
        align: "center",
      });

    drawCell(margin + signW + signGap, y, signW, 18, "Firma Inspector", {
      bold: true,
      fill: gray,
      align: "center",
    });

    doc.rect(margin + signW + signGap, y + 18, signW, signH).stroke(black);

    drawSignature(
      margin + signW + signGap,
      y + 22,
      signW,
      36,
      check.inspectorSignatureUrl,
    );

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(black)
      .text(this.text(check.inspectorName), margin + signW + signGap, y + 62, {
        width: signW,
        align: "center",
      });

    doc.end();
  }
}