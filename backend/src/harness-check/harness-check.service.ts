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
export class HarnessCheckService {
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

  private async canAccessHarnessCheck(currentUser: any, id: number) {
    const user = await this.getLoggedUser(currentUser);

    const check = await this.prisma.harnessCheck.findUnique({
      where: { id },
      include: {
        items: true,
        user: true,
      },
    });

    if (!check) {
      throw new NotFoundException("Check list de arnés no encontrado");
    }

    if (!this.isSuperadmin(user) && check.userId !== user.id) {
      throw new ForbiddenException(
        "No tienes permiso para ver este check list de arnés",
      );
    }

    return check;
  }

  async create(
    currentUser: any,
    data: any,
    technicianSignature?: Express.Multer.File | null,
    supervisorSignature?: Express.Multer.File | null,
  ) {
    const user = await this.getLoggedUser(currentUser);
    const items = this.parseItems(data.items);

    const lastCheck = await this.prisma.harnessCheck.findFirst({
      orderBy: {
        id: "desc",
      },
    });

    const nextNumber = (lastCheck?.id || 0) + 1;

    const generatedFolio = `ARN-${new Date().getFullYear()}-${String(
      nextNumber,
    ).padStart(4, "0")}`;

    return this.prisma.harnessCheck.create({
      data: {
        folio: generatedFolio,
        date: data.date ? new Date(data.date) : new Date(),
        contract: data.contract || null,
        technicianName: data.technicianName || user.name || null,
        mobile: data.mobile || null,
        supervisorInspectorName: data.supervisorInspectorName || null,
        zone: data.zone || null,
        technicianSignatureUrl: technicianSignature
          ? `/uploads/harness-check/${technicianSignature.filename}`
          : null,
        supervisorSignatureUrl: supervisorSignature
          ? `/uploads/harness-check/${supervisorSignature.filename}`
          : null,
        status: data.status || "PENDIENTE",
        generalObservation: data.generalObservation || null,
        userId: user.id,

        items: {
          create: items.map((item: any) => ({
            description: item.description,
            status: item.status || null,
            observation: item.observation || null,
          })),
        },
      },
      include: {
        items: true,
        user: true,
      },
    });
  }

  async findMine(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    return this.prisma.harnessCheck.findMany({
      where: {
        userId: user.id,
      },
      include: {
        items: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findAllForSuperadmin(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    if (!this.isSuperadmin(user)) {
      throw new ForbiddenException(
        "Solo SUPERADMIN puede ver todos los check list de arnés",
      );
    }

    return this.prisma.harnessCheck.findMany({
      include: {
        items: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findOne(currentUser: any, id: number) {
    return this.canAccessHarnessCheck(currentUser, id);
  }

  async remove(currentUser: any, id: number) {
    const user = await this.getLoggedUser(currentUser);

    const check = await this.prisma.harnessCheck.findUnique({
      where: { id },
    });

    if (!check) {
      throw new NotFoundException("Check list de arnés no encontrado");
    }

    if (!this.isSuperadmin(user) && check.userId !== user.id) {
      throw new ForbiddenException(
        "No tienes permiso para eliminar este check list de arnés",
      );
    }

    return this.prisma.harnessCheck.delete({
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
      `inline; filename="CHECKLIST_ARNES_${safeTechnician}_${today}.pdf"`,
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
        // Evitar romper PDF si una firma falla
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
      .fontSize(17)
      .fillColor(black)
      .text("CHECK LIST ARNÉS DE SEGURIDAD", margin + logoW, headerY + 17, {
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

    drawCell(margin, y, 95, 18, "Supervisor", {
      fill: gray,
      bold: true,
    });
    drawCell(
      margin + 95,
      y,
      leftW - 95,
      18,
      this.text(check.supervisorInspectorName),
    );

    drawCell(margin + leftW, y, 95, 18, "Zona", {
      fill: gray,
      bold: true,
    });
    drawCell(margin + leftW + 95, y, leftW - 95, 18, this.text(check.zone));

    y += 28;

    drawCell(margin, y, contentWidth, 18, "INSPECCIÓN DEL ARNÉS", {
      bold: true,
      fill: gray,
      align: "center",
      fontSize: 8,
    });

    y += 18;

    const colN = 28;
    const colDescription = contentWidth - colN - 36 * 3 - 145;
    const colSmall = 36;
    const colObs = 145;
    const rowH = 24;

    drawCell(margin, y, colN, 18, "N°", {
      bold: true,
      fill: gray,
      align: "center",
    });
    drawCell(margin + colN, y, colDescription, 18, "Ítem de revisión", {
      bold: true,
      fill: gray,
      align: "center",
    });
    drawCell(margin + colN + colDescription, y, colSmall, 18, "SI", {
      bold: true,
      fill: gray,
      align: "center",
    });
    drawCell(margin + colN + colDescription + colSmall, y, colSmall, 18, "NO", {
      bold: true,
      fill: gray,
      align: "center",
    });
    drawCell(
      margin + colN + colDescription + colSmall * 2,
      y,
      colSmall,
      18,
      "N/A",
      {
        bold: true,
        fill: gray,
        align: "center",
      },
    );
    drawCell(
      margin + colN + colDescription + colSmall * 3,
      y,
      colObs,
      18,
      "Observación",
      {
        bold: true,
        fill: gray,
        align: "center",
      },
    );

    y += 18;

    const items = check.items || [];

    items.forEach((item: any, index: number) => {
      if (y + rowH > bottomLimit - 140) {
        doc.addPage();
        y = 28;
      }

      drawCell(margin, y, colN, rowH, String(index + 1), {
        align: "center",
      });

      drawCell(margin + colN, y, colDescription, rowH, this.text(item.description), {
        fontSize: 6.8,
      });

      drawCell(
        margin + colN + colDescription,
        y,
        colSmall,
        rowH,
        drawStatus(item.status, "SI"),
        {
          align: "center",
          bold: true,
          fontSize: 10,
        },
      );

      drawCell(
        margin + colN + colDescription + colSmall,
        y,
        colSmall,
        rowH,
        drawStatus(item.status, "NO"),
        {
          align: "center",
          bold: true,
          fontSize: 10,
        },
      );

      drawCell(
        margin + colN + colDescription + colSmall * 2,
        y,
        colSmall,
        rowH,
        drawStatus(item.status, "NO_APLICA"),
        {
          align: "center",
          bold: true,
          fontSize: 10,
        },
      );

      drawCell(
        margin + colN + colDescription + colSmall * 3,
        y,
        colObs,
        rowH,
        this.text(item.observation || ""),
        {
          fontSize: 6,
        },
      );

      y += rowH;
    });

    y += 14;

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

    drawCell(margin + signW + signGap, y, signW, 18, "Firma Supervisor", {
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
      check.supervisorSignatureUrl,
    );

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(black)
      .text(
        this.text(check.supervisorInspectorName),
        margin + signW + signGap,
        y + 62,
        {
          width: signW,
          align: "center",
        },
      );

    doc.end();
  }
}