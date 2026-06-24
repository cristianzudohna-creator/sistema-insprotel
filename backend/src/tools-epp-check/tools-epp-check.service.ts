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
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class ToolsEppCheckService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly notificationsService: NotificationsService,
) {}

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
    return new Date(value).toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

  private canViewAll(user: any) {
  const role = String(user?.role || "").toUpperCase();

  return (
    role === "SUPERADMIN" ||
    role === "SUPERVISOR" ||
    role === "PREVENCION"
  );
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

    const check = await this.prisma.toolsEppCheck.findUnique({
      where: { id },
      include: {
        items: true,
        user: true,
      },
    });

    if (!check) {
      throw new NotFoundException(
        "Check list de herramientas y EPP no encontrado",
      );
    }

    if (!this.canViewAll(user) && check.userId !== user.id) {
      throw new ForbiddenException(
        "No tienes permiso para ver este check list",
      );
    }

    return check;
  }

  async create(
  currentUser: any,
  data: any,
  technicianSignature?: Express.Multer.File | null,
){
    const user = await this.getLoggedUser(currentUser);
    const items = this.parseItems(data.items);

    const lastCheck = await this.prisma.toolsEppCheck.findFirst({
      orderBy: {
        id: "desc",
      },
    });

    const nextNumber = (lastCheck?.id || 0) + 1;

    const generatedFolio = `HER-EPP-${new Date().getFullYear()}-${String(
      nextNumber,
    ).padStart(4, "0")}`;

    const created = await this.prisma.toolsEppCheck.create({
      data: {
        folio: generatedFolio,
        date: new Date(),
        contract: data.contract || null,
        technicianName: data.technicianName || user.name || null,
        mobile: data.mobile || null,
        supervisorInspectorName: data.supervisorInspectorName || null,
        zone: data.zone || null,
        technicianSignatureUrl: technicianSignature
          ? `/uploads/tools-epp-check/${technicianSignature.filename}`
          : null,
        status: "APROBADO",
        generalObservation: data.generalObservation || null,
        userId: user.id,

        items: {
          create: items.map((item: any) => ({
            number: Number(item.number || 0),
            name: item.name,
            quantity:
              item.quantity === null || item.quantity === undefined
                ? null
                : String(item.quantity),
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

    const selectedReviewerId = Number(data.supervisorInspectorUserId || 0);

if (selectedReviewerId) {
  await this.notificationsService.create(
    selectedReviewerId,
    "Nueva autoinspección técnica",
    `${created.technicianName || user.name} realizó una autoinspección ${
      created.folio ? `(${created.folio})` : ""
    }.`,
    "/check-herramientas/historial-todos",
  );
}

return created;
  }

  async findAll(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    return this.prisma.toolsEppCheck.findMany({
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

  async findAllAdmin(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    if (!this.canViewAll(user)) {
      throw new ForbiddenException(
        "Sin permisos para ver todos los check list"
      );
    }

    return this.prisma.toolsEppCheck.findMany({
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
    return this.canAccess(currentUser, id);
  }

  async remove(currentUser: any, id: number) {
    const user = await this.getLoggedUser(currentUser);

    const check = await this.prisma.toolsEppCheck.findUnique({
      where: { id },
    });

    if (!check) {
      throw new NotFoundException(
        "Check list de herramientas y EPP no encontrado",
      );
    }

    if (!this.canViewAll(user) && check.userId !== user.id) {
      throw new ForbiddenException(
        "No tienes permiso para eliminar este check list",
      );
    }

    return this.prisma.toolsEppCheck.delete({
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
      `inline; filename="CHECKLIST_HERRAMIENTAS_EPP_${safeTechnician}_${today}.pdf"`,
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
    const blue = "#2448b8";
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
        .fillColor(options.textColor || black)
        .font(options.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(options.fontSize || 7)
        .text(text, x + 4, y + 4, {
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
        doc.image(signaturePath, x + 8, y + 6, {
          fit: [w - 16, h - 28],
          align: "center",
          valign: "center",
        });
      } catch {
        // Evitar romper PDF
      }
    };

    const drawStatus = (value: any, target: string) => {
      const normalized = String(value || "").toUpperCase();
      return normalized === target ? "X" : " ";
    };

    const drawHeader = () => {
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
        .fontSize(14)
        .fillColor(black)
        .text("LISTA DE CHEQUEO HERRAMIENTAS Y EPP", margin + logoW, headerY + 17, {
          width: titleW,
          align: "center",
        });

      return headerY + headerH + 10;
    };

    let y = drawHeader();

    const leftW = contentWidth / 2;
    const rowH = 18;

    drawCell(margin, y, 95, rowH, "Contrato", {
      fill: gray,
      bold: true,
    });
    drawCell(margin + 95, y, leftW - 95, rowH, this.text(check.contract));

    drawCell(margin + leftW, y, 95, rowH, "Fecha", {
      fill: gray,
      bold: true,
    });
    drawCell(
      margin + leftW + 95,
      y,
      leftW - 95,
      rowH,
      this.formatDate(check.date),
    );

    y += rowH;

    drawCell(margin, y, 95, rowH, "Técnico", {
      fill: gray,
      bold: true,
    });
    drawCell(
      margin + 95,
      y,
      leftW - 95,
      rowH,
      this.text(check.technicianName),
    );

    drawCell(margin + leftW, y, 95, rowH, "Móvil", {
      fill: gray,
      bold: true,
    });
    drawCell(margin + leftW + 95, y, leftW - 95, rowH, this.text(check.mobile));

    y += rowH;

    drawCell(margin, y, 95, rowH, "Supervisor / Inspector", {
      fill: gray,
      bold: true,
      fontSize: 6,
    });
    drawCell(
      margin + 95,
      y,
      leftW - 95,
      rowH,
      this.text(check.supervisorInspectorName),
    );

    drawCell(margin + leftW, y, 95, rowH, "Zona", {
      fill: gray,
      bold: true,
    });
    drawCell(margin + leftW + 95, y, leftW - 95, rowH, this.text(check.zone));

    y += rowH + 10;

    drawCell(margin, y, contentWidth, 18, "ESTADO DE EPP Y HERRAMIENTAS", {
      fill: blue,
      bold: true,
      align: "center",
      fontSize: 8,
      textColor: "#ffffff",
    });

    y += 18;

    const colN = 25;
    const colName = 230;
    const colQty = 50;
    const colStatus = 38;
    const colObs =
      contentWidth - colN - colName - colQty - colStatus * 3;

    const drawTableHeader = () => {
      drawCell(margin, y, colN, 18, "N°", {
        fill: blue,
        bold: true,
        align: "center",
        fontSize: 6,
        textColor: "#ffffff",
      });

      drawCell(margin + colN, y, colName, 18, "Nombre de la Herramienta", {
        fill: blue,
        bold: true,
        align: "center",
        fontSize: 6,
        textColor: "#ffffff",
      });

      drawCell(
        margin + colN + colName,
        y,
        colQty,
        18,
        "Cantidad",
        {
          fill: blue,
          bold: true,
          align: "center",
          fontSize: 6,
          textColor: "#ffffff",
        },
      );

      drawCell(
        margin + colN + colName + colQty,
        y,
        colStatus,
        18,
        "Bueno",
        {
          fill: blue,
          bold: true,
          align: "center",
          fontSize: 5,
          textColor: "#ffffff",
        },
      );

      drawCell(
        margin + colN + colName + colQty + colStatus,
        y,
        colStatus,
        18,
        "Malo",
        {
          fill: blue,
          bold: true,
          align: "center",
          fontSize: 5,
          textColor: "#ffffff",
        },
      );

      drawCell(
        margin + colN + colName + colQty + colStatus * 2,
        y,
        colStatus,
        18,
        "N/A",
        {
          fill: blue,
          bold: true,
          align: "center",
          fontSize: 5,
          textColor: "#ffffff",
        },
      );

      drawCell(
        margin + colN + colName + colQty + colStatus * 3,
        y,
        colObs,
        18,
        "Observación",
        {
          fill: blue,
          bold: true,
          align: "center",
          fontSize: 6,
          textColor: "#ffffff",
        },
      );

      y += 18;
    };

    drawTableHeader();

    const items = check.items || [];
    const rowHeight = 17;

    items.forEach((item: any, index: number) => {
      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = drawHeader();

        drawCell(margin, y, contentWidth, 18, "ESTADO DE EPP Y HERRAMIENTAS", {
          fill: blue,
          bold: true,
          align: "center",
          fontSize: 8,
          textColor: "#ffffff",
        });

        y += 18;
        drawTableHeader();
      }

      drawCell(margin, y, colN, rowHeight, String(item.number || index + 1), {
        align: "center",
        fontSize: 6,
      });

      drawCell(margin + colN, y, colName, rowHeight, this.text(item.name), {
        fontSize: 5.8,
      });

      drawCell(
        margin + colN + colName,
        y,
        colQty,
        rowHeight,
        this.text(item.quantity || ""),
        {
          align: "center",
          fontSize: 6,
        },
      );

      drawCell(
        margin + colN + colName + colQty,
        y,
        colStatus,
        rowHeight,
        drawStatus(item.status, "BUENO"),
        {
          align: "center",
          bold: true,
          fontSize: 10,
        },
      );

      drawCell(
        margin + colN + colName + colQty + colStatus,
        y,
        colStatus,
        rowHeight,
        drawStatus(item.status, "MALO"),
        {
          align: "center",
          bold: true,
          fontSize: 10,
        },
      );

      drawCell(
        margin + colN + colName + colQty + colStatus * 2,
        y,
        colStatus,
        rowHeight,
        drawStatus(item.status, "NO_APLICA"),
        {
          align: "center",
          bold: true,
          fontSize: 10,
        },
      );

      drawCell(
        margin + colN + colName + colQty + colStatus * 3,
        y,
        colObs,
        rowHeight,
        this.text(item.observation || ""),
        {
          fontSize: 5.8,
        },
      );

      y += rowHeight;
    });

    if (y + 160 > bottomLimit) {
      doc.addPage();
      y = drawHeader();
    }

    y += 10;

    drawCell(margin, y, contentWidth, 18, "OBSERVACIONES GENERALES", {
      fill: gray,
      bold: true,
      align: "center",
      fontSize: 8,
    });

    y += 18;

    drawCell(margin, y, contentWidth, 55, this.text(check.generalObservation), {
      fontSize: 8,
    });

    y += 70;

    const signW = contentWidth;
    const signH = 76;

    drawCell(margin, y, signW, 18, "Firma y Nombre Técnico", {
      fill: gray,
      bold: true,
      align: "center",
      fontSize: 7,
    });

    doc.rect(margin, y + 18, signW, signH).stroke(black);
    drawSignature(margin, y + 18, signW, signH, check.technicianSignatureUrl);

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(black)
      .text(this.text(check.technicianName), margin, y + signH - 2, {
        width: signW,
        align: "center",
      });

    doc.end();
  }
}