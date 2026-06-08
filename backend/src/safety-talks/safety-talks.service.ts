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
export class SafetyTalksService {
  constructor(private readonly prisma: PrismaService) {}

  private text(value: any) {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
  }

  private formatDate(value: any) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleDateString("es-CL");
    } catch {
      return "—";
    }
  }

  private parseJson(value: any) {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }

  private formatTalkType(value: any) {
    return String(value || "")
      .split(",")
      .map((item) =>
        item
          .trim()
          .replaceAll("_", " ")
          .toLowerCase()
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
      )
      .filter(Boolean)
      .join(" / ");
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

  private async canAccessTalk(currentUser: any, id: number) {
    const user = await this.getLoggedUser(currentUser);

    const talk = await this.prisma.safetyTalk.findUnique({
      where: { id },
      include: {
        participants: true,
        photos: true,
        user: true,
      },
    });

    if (!talk) {
      throw new NotFoundException("Charla no encontrada");
    }

    if (!this.isSuperadmin(user) && talk.userId !== user.id) {
      throw new ForbiddenException("No tienes permiso para ver esta charla");
    }

    return talk;
  }

  async create(
    currentUser: any,
    data: any,
    photos: Express.Multer.File[] = [],
    reporterSignature?: Express.Multer.File | null,
    participantSignatures: Express.Multer.File[] = [],
  ) {
    const user = await this.getLoggedUser(currentUser);
    const participants = this.parseJson(data.participants);

    return this.prisma.safetyTalk.create({
      data: {
        date: new Date(),
        sectionOrWork: data.sectionOrWork || null,
        reporterName: data.reporterName || "Sin relator",
        reporterRut: null,
        reporterSignatureUrl: reporterSignature
          ? `/uploads/safety-talks/${reporterSignature.filename}`
          : null,
        type: data.type || "CHARLA_5_MINUTOS",
        topicTitle: data.topicTitle || "Sin tema",
        topicDetails: data.topicDetails || null,
        observations: null,
        userId: user.id,

        participants: {
          create: participants.map((item: any, index: number) => {
            const participantSignature = participantSignatures[index];

            return {
              name: item.name || "Sin nombre",
              rut: item.rut || null,
              position: null,
              signatureUrl: participantSignature
                ? `/uploads/safety-talks/${participantSignature.filename}`
                : null,
            };
          }),
        },

        photos: {
          create: photos.map((file) => ({
            imageUrl: `/uploads/safety-talks/${file.filename}`,
          })),
        },
      },
      include: {
        participants: true,
        photos: true,
        user: true,
      },
    });
  }

  async findAll(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    return this.prisma.safetyTalk.findMany({
      where: {
        userId: user.id,
      },
      include: {
        participants: true,
        photos: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAllAdmin(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    if (!this.isSuperadmin(user)) {
      throw new ForbiddenException("Solo SUPERADMIN puede ver todas las charlas");
    }

    return this.prisma.safetyTalk.findMany({
      include: {
        participants: true,
        photos: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(currentUser: any, id: number) {
    return this.canAccessTalk(currentUser, id);
  }

  async generatePdf(currentUser: any, id: number, res: Response) {
    const talk = await this.findOne(currentUser, id);

    const safeReporter = String(talk.reporterName || "relator").replace(
      /[^a-zA-Z0-9-_]/g,
      "_",
    );

    const today = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="CHARLA_${safeReporter}_${today}.pdf"`,
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
    const bottomLimit = pageHeight - 28;

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
        doc.image(signaturePath, x + 6, y + 3, {
          fit: [w - 12, h - 6],
          align: "center",
          valign: "center",
        });
      } catch {
        // evitar romper pdf
      }
    };

    const headerY = 18;
    const headerH = 54;
    const logoW = 180;
    const titleW = contentWidth - logoW;

    drawCell(margin, headerY, logoW, headerH, "");

    if (logoPath) {
      try {
        doc.image(logoPath, margin + 14, headerY + 8, {
          width: 150,
          height: 38,
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
      .fontSize(18)
      .fillColor(black)
      .text("REGISTRO CHARLA DE SEGURIDAD", margin + logoW, headerY + 17, {
        width: titleW,
        align: "center",
      });

    let y = headerY + headerH + 12;

    drawCell(margin, y, contentWidth, 18, "ANTECEDENTES DE LA CHARLA", {
      bold: true,
      align: "center",
      fill: gray,
      fontSize: 8,
    });

    y += 18;

    drawCell(margin, y, 95, 18, "Fecha", {
      fill: gray,
      bold: true,
    });

    drawCell(margin + 95, y, 150, 18, this.formatDate(talk.date), {
      align: "center",
    });

    drawCell(margin + 245, y, 95, 18, "Tipo de charla", {
      fill: gray,
      bold: true,
    });

    drawCell(
      margin + 340,
      y,
      contentWidth - 340,
      18,
      this.formatTalkType(talk.type),
      {
        fontSize: 7,
        align: "center",
      },
    );

    y += 18;

    drawCell(margin, y, 95, 18, "Relator", {
      fill: gray,
      bold: true,
    });

    drawCell(
      margin + 95,
      y,
      contentWidth - 95,
      18,
      this.text(talk.reporterName),
    );

    y += 18;

    drawCell(margin, y, 95, 18, "Sección / Obra", {
      fill: gray,
      bold: true,
    });

    drawCell(
      margin + 95,
      y,
      contentWidth - 95,
      18,
      this.text(talk.sectionOrWork),
    );

    y += 28;

    drawCell(margin, y, contentWidth, 18, "TEMA TRATADO", {
      bold: true,
      align: "center",
      fill: gray,
      fontSize: 8,
    });

    y += 18;

    drawCell(margin, y, 100, 22, "Tema", {
      fill: gray,
      bold: true,
    });

    drawCell(
      margin + 100,
      y,
      contentWidth - 100,
      22,
      this.text(talk.topicTitle),
      {
        bold: true,
        fontSize: 8,
      },
    );

    y += 22;

    const topicDetailsH = 76;

    drawCell(
      margin,
      y,
      contentWidth,
      topicDetailsH,
      this.text(talk.topicDetails),
      {
        fontSize: 8,
      },
    );

    y += topicDetailsH + 12;

    drawCell(margin, y, contentWidth, 18, "PARTICIPANTES", {
      bold: true,
      align: "center",
      fill: gray,
      fontSize: 8,
    });

    y += 18;

    const colN = 28;
    const colName = 235;
    const colRut = 120;
    const colSignature = contentWidth - colN - colName - colRut;
    const rowH = 28;

    drawCell(margin, y, colN, 18, "N°", {
      bold: true,
      fill: gray,
      align: "center",
    });

    drawCell(margin + colN, y, colName, 18, "Nombre", {
      bold: true,
      fill: gray,
      align: "center",
    });

    drawCell(margin + colN + colName, y, colRut, 18, "RUT", {
      bold: true,
      fill: gray,
      align: "center",
    });

    drawCell(margin + colN + colName + colRut, y, colSignature, 18, "Firma", {
      bold: true,
      fill: gray,
      align: "center",
    });

    y += 18;

    const participants = talk.participants || [];
    const rowsToDraw = Math.max(10, participants.length);

    for (let i = 0; i < rowsToDraw; i++) {
      if (y + rowH > bottomLimit) {
        doc.addPage();
        y = 28;
      }

      const item = participants[i];

      drawCell(margin, y, colN, rowH, item ? String(i + 1) : "", {
        align: "center",
      });

      drawCell(
        margin + colN,
        y,
        colName,
        rowH,
        this.text(item?.name || ""),
      );

      drawCell(
        margin + colN + colName,
        y,
        colRut,
        rowH,
        this.text(item?.rut || ""),
      );

      drawCell(margin + colN + colName + colRut, y, colSignature, rowH, "");

      if (item?.signatureUrl) {
        drawSignature(
          margin + colN + colName + colRut,
          y,
          colSignature,
          rowH,
          item.signatureUrl,
        );
      }

      y += rowH;
    }

    y += 20;

    if (y + 90 > bottomLimit) {
      doc.addPage();
      y = 28;
    }

    const signW = 320;
    const signX = (pageWidth - signW) / 2;

    drawCell(signX, y, signW, 18, "Firma Relator", {
      bold: true,
      fill: gray,
      align: "center",
    });

    doc.rect(signX, y + 18, signW, 62).stroke(black);

    drawSignature(signX, y + 22, signW, 36, talk.reporterSignatureUrl);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(black)
      .text(this.text(talk.reporterName), signX, y + 60, {
        width: signW,
        align: "center",
      });

    doc.end();
  }

  async remove(currentUser: any, id: number) {
    const user = await this.getLoggedUser(currentUser);

    const talk = await this.prisma.safetyTalk.findUnique({
      where: { id },
    });

    if (!talk) {
      throw new NotFoundException("Charla no encontrada");
    }

    if (!this.isSuperadmin(user) && talk.userId !== user.id) {
      throw new ForbiddenException("No tienes permiso para eliminar esta charla");
    }

    return this.prisma.safetyTalk.delete({
      where: { id },
    });
  }
}