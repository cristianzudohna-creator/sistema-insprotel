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
export class HarnessCheckService {
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

  private parseDate(value: any) {
    if (!value) return null;

    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date;
  }

  private formatDate(value: any) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleDateString("es-CL");
    } catch {
      return "—";
    }
  }

  private normalizeStatus(value: any) {
    const status = String(value || "").toUpperCase();

    if (status === "APROBADO") return "APROBADO";
    if (status === "RECHAZADO") return "RECHAZADO";

    return "PENDIENTE";
  }

  private isSuperadmin(user: any) {
    return String(user?.role || "").toUpperCase() === "SUPERADMIN";
  }

  private isReviewer(user: any) {
  const role = String(user?.role || "").toUpperCase();

  return (
    role === "SUPERADMIN" ||
    role === "SUPERVISOR" ||
    role === "PREVENCION"
  );
}

private isTechnician(user: any) {
  return String(user?.role || "").toUpperCase() === "TECNICO";
}

private async notifyPendingHarnessSignature(check: any) {
  const technicianName = String(check?.technicianName || "").trim();

  if (!technicianName) return;

  const technician = await this.prisma.user.findFirst({
    where: {
      isActive: true,
      role: "TECNICO",
      name: {
        equals: technicianName,
        mode: "insensitive",
      },
    },
  });

  if (!technician) return;

  await this.notificationsService.create(
    technician.id,
    "Check list de arnés pendiente de firma",
    `Tienes un check list de arnés pendiente de firma${
      check?.folio ? ` (${check.folio})` : ""
    }.`,
    "/arnes/pendientes-firma",
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

    const isOwner = check.userId === user.id;
const isAssignedTechnician =
  this.isTechnician(user) &&
  String(check.technicianName || "") === String(user.name || "");
const isReviewerUser = this.isReviewer(user);

if (!this.isSuperadmin(user) && !isOwner && !isAssignedTechnician && !isReviewerUser) {
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

  const created = await this.prisma.harnessCheck.create({
    data: {
      folio: generatedFolio,
      date: data.date ? this.parseDate(data.date) || new Date() : new Date(),
      expirationDate: this.parseDate(data.expirationDate),
      contract: data.contract || null,
      technicianName: data.technicianName || user.name || null,
      mobile: data.mobile || null,
      supervisorInspectorName: user.name,
      zone: data.zone || null,

      technicianSignatureUrl: technicianSignature
        ? `/uploads/harness-check/${technicianSignature.filename}`
        : null,

      supervisorSignatureUrl: supervisorSignature
        ? `/uploads/harness-check/${supervisorSignature.filename}`
        : null,

      status: this.normalizeStatus(data.status),
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

  if (!created.supervisorSignatureUrl) {
    await this.notifyPendingHarnessSignature(created);
  }

  return created;
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

  async finished(currentUser: any) {
  const user = await this.getLoggedUser(currentUser);

  if (this.isTechnician(user)) {
    return this.prisma.harnessCheck.findMany({
      where: {
        technicianName: user.name,
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

  if (!this.isReviewer(user)) {
    throw new ForbiddenException(
      "No tienes permiso para ver check list de arnés terminados",
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

  async pendingSignatures(currentUser: any) {
  const user = await this.getLoggedUser(currentUser);

  if (this.isTechnician(user)) {
    return this.prisma.harnessCheck.findMany({
      where: {
        technicianSignatureUrl: null,
        technicianName: user.name,
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

  if (!this.isReviewer(user)) {
    throw new ForbiddenException(
      "No tienes permiso para ver firmas pendientes",
    );
  }

  return this.prisma.harnessCheck.findMany({
    where: {
      supervisorSignatureUrl: null,
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

async signSupervisor(
  currentUser: any,
  id: number,
  signature?: Express.Multer.File | null,
) {
  const user = await this.getLoggedUser(currentUser);

  if (!signature) {
    throw new ForbiddenException("Debes adjuntar una firma");
  }

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

  if (this.isTechnician(user)) {
    if (String(check.technicianName || "") !== String(user.name || "")) {
      throw new ForbiddenException(
        "Este check list no está asignado a este técnico",
      );
    }

    if (check.technicianSignatureUrl) {
      throw new ForbiddenException(
        "Este check list ya fue firmado por el técnico",
      );
    }

    return this.prisma.harnessCheck.update({
      where: { id },
      data: {
        technicianSignatureUrl: `/uploads/harness-check/${signature.filename}`,
      },
      include: {
        items: true,
        user: true,
      },
    });
  }

  if (!this.isReviewer(user)) {
    throw new ForbiddenException(
      "No tienes permiso para firmar este check list",
    );
  }

  if (check.supervisorSignatureUrl) {
    throw new ForbiddenException(
      "Este check list ya fue firmado por supervisor",
    );
  }

  return this.prisma.harnessCheck.update({
    where: { id },
    data: {
      supervisorSignatureUrl: `/uploads/harness-check/${signature.filename}`,
      supervisorInspectorName: check.supervisorInspectorName || user.name,
    },
    include: {
      items: true,
      user: true,
    },
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
      path.join(process.cwd(), "uploads", "branding", "insprotel.png"),
    ];

    const logoPath = logoCandidates.find((item) => fs.existsSync(item));

    const isoLogoCandidates = [
      path.join(process.cwd(), "uploads", "branding", "sgs.png"),
      path.join(process.cwd(), "uploads", "branding", "iso.png"),
      path.join(process.cwd(), "uploads", "sgs.png"),
    ];

    const isoLogoPath = isoLogoCandidates.find((item) =>
      fs.existsSync(item),
    );

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
        .fontSize(options.fontSize || 6.5)
        .text(text, x + 3, y + 4, {
          width: w - 6,
          height: h - 4,
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
    const headerH = 48;

    const logoW = 170;
    const isoW = 130;
    const titleW = contentWidth - logoW - isoW;

    drawCell(margin, headerY, logoW, headerH, "");

    if (logoPath) {
      try {
        doc.image(logoPath, margin + 12, headerY + 7, {
          width: 145,
          height: 34,
          fit: [145, 34],
          align: "center",
          valign: "center",
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

    drawCell(margin + logoW, headerY, titleW, headerH, "");

    doc
      .font("Helvetica-Bold")
      .fontSize(15)
      .fillColor(black)
      .text("CHECK LIST ARNÉS DE SEGURIDAD", margin + logoW, headerY + 16, {
        width: titleW,
        align: "center",
      });

    drawCell(margin + logoW + titleW, headerY, isoW, headerH, "");

    if (isoLogoPath) {
      try {
        doc.image(isoLogoPath, margin + logoW + titleW + 8, headerY + 5, {
          width: isoW - 16,
          height: headerH - 10,
          fit: [isoW - 16, headerH - 10],
          align: "center",
          valign: "center",
        });
      } catch {
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor(black)
          .text("ISO", margin + logoW + titleW, headerY + 18, {
            width: isoW,
            align: "center",
          });
      }
    }

    let y = headerY + headerH + 10;

    drawCell(margin, y, contentWidth, 16, "DATOS GENERALES", {
      bold: true,
      fill: gray,
      align: "center",
      fontSize: 8,
    });

    y += 16;

    const leftW = contentWidth / 2;

    drawCell(margin, y, 95, 16, "Contrato", {
      fill: gray,
      bold: true,
    });
    drawCell(margin + 95, y, leftW - 95, 16, this.text(check.contract));

    drawCell(margin + leftW, y, 95, 16, "Fecha", {
      fill: gray,
      bold: true,
    });
    drawCell(
      margin + leftW + 95,
      y,
      leftW - 95,
      16,
      this.formatDate(check.date),
    );

    y += 16;

    drawCell(margin, y, 95, 16, "Vencimiento", {
      fill: gray,
      bold: true,
    });
    drawCell(
      margin + 95,
      y,
      leftW - 95,
      16,
      this.formatDate((check as any).expirationDate),
    );

    drawCell(margin + leftW, y, 95, 16, "Estado", {
      fill: gray,
      bold: true,
    });
    drawCell(
      margin + leftW + 95,
      y,
      leftW - 95,
      16,
      this.text(check.status),
    );

    y += 16;

    drawCell(margin, y, 95, 16, "Técnico", {
      fill: gray,
      bold: true,
    });
    drawCell(
      margin + 95,
      y,
      leftW - 95,
      16,
      this.text(check.technicianName),
    );

    drawCell(margin + leftW, y, 95, 16, "Móvil", {
      fill: gray,
      bold: true,
    });
    drawCell(margin + leftW + 95, y, leftW - 95, 16, this.text(check.mobile));

    y += 16;

    drawCell(margin, y, 95, 16, "Supervisor", {
      fill: gray,
      bold: true,
    });
    drawCell(
      margin + 95,
      y,
      leftW - 95,
      16,
      this.text(check.supervisorInspectorName),
    );

    drawCell(margin + leftW, y, 95, 16, "Zona", {
      fill: gray,
      bold: true,
    });
    drawCell(margin + leftW + 95, y, leftW - 95, 16, this.text(check.zone));

    y += 24;

    drawCell(margin, y, contentWidth, 16, "RESULTADO DE INSPECCIÓN", {
      bold: true,
      fill: gray,
      align: "center",
      fontSize: 8,
    });

    y += 16;

    const resultColW = contentWidth / 3;

    drawCell(margin, y, resultColW, 16, "VENCIMIENTO", {
      bold: true,
      fill: gray,
      align: "center",
    });

    drawCell(margin + resultColW, y, resultColW, 16, "APROBADO", {
      bold: true,
      fill: gray,
      align: "center",
    });

    drawCell(margin + resultColW * 2, y, resultColW, 16, "RECHAZADO", {
      bold: true,
      fill: gray,
      align: "center",
    });

    y += 16;

    drawCell(
      margin,
      y,
      resultColW,
      16,
      this.formatDate((check as any).expirationDate),
      {
        align: "center",
      },
    );

    drawCell(
      margin + resultColW,
      y,
      resultColW,
      16,
      check.status === "APROBADO" ? "X" : "",
      {
        align: "center",
        bold: true,
        fontSize: 10,
      },
    );

    drawCell(
      margin + resultColW * 2,
      y,
      resultColW,
      16,
      check.status === "RECHAZADO" ? "X" : "",
      {
        align: "center",
        bold: true,
        fontSize: 10,
      },
    );

    y += 22;

    drawCell(margin, y, contentWidth, 16, "INSPECCIÓN DEL ARNÉS", {
      bold: true,
      fill: gray,
      align: "center",
      fontSize: 8,
    });

    y += 16;

    const colN = 28;
    const colDescription = contentWidth - colN - 36 * 3 - 145;
    const colSmall = 36;
    const colObs = 145;
    const rowH = 17;

    drawCell(margin, y, colN, 16, "N°", {
      bold: true,
      fill: gray,
      align: "center",
    });

    drawCell(margin + colN, y, colDescription, 16, "DESCRIPCIÓN", {
      bold: true,
      fill: gray,
      align: "center",
    });

    drawCell(margin + colN + colDescription, y, colSmall, 16, "SI", {
      bold: true,
      fill: gray,
      align: "center",
    });

    drawCell(margin + colN + colDescription + colSmall, y, colSmall, 16, "NO", {
      bold: true,
      fill: gray,
      align: "center",
    });

    drawCell(
      margin + colN + colDescription + colSmall * 2,
      y,
      colSmall,
      16,
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
      16,
      "Observación",
      {
        bold: true,
        fill: gray,
        align: "center",
      },
    );

    y += 16;

    const items = check.items || [];

    items.forEach((item: any, index: number) => {
      if (y + rowH > bottomLimit - 105) {
        doc.addPage();
        y = 28;
      }

      drawCell(margin, y, colN, rowH, String(index + 1), {
        align: "center",
      });

      drawCell(
        margin + colN,
        y,
        colDescription,
        rowH,
        this.text(item.description),
        {
          fontSize: 5.8,
        },
      );

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
          fontSize: 5.5,
        },
      );

      y += rowH;
    });

    y += 14;

    if (y + 150 > bottomLimit) {
      doc.addPage();
      y = 28;
    }

    drawCell(margin, y, contentWidth, 16, "OBSERVACIONES GENERALES", {
      bold: true,
      fill: gray,
      align: "center",
      fontSize: 8,
    });

    y += 16;

    drawCell(margin, y, contentWidth, 42, this.text(check.generalObservation), {
      fontSize: 7,
    });

    y += 75;

    const signGap = 12;
    const signW = (contentWidth - signGap) / 2;
    const signH = 58;

    drawCell(margin, y, signW, 16, "Firma Técnico", {
      bold: true,
      fill: gray,
      align: "center",
    });

    doc.rect(margin, y + 16, signW, signH).stroke(black);

    drawSignature(margin, y + 20, signW, 30, check.technicianSignatureUrl);

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(black)
      .text(this.text(check.technicianName), margin, y + 50, {
        width: signW,
        align: "center",
      });

    drawCell(margin + signW + signGap, y, signW, 16, "Firma Supervisor", {
      bold: true,
      fill: gray,
      align: "center",
    });

    doc.rect(margin + signW + signGap, y + 16, signW, signH).stroke(black);

    drawSignature(
      margin + signW + signGap,
      y + 20,
      signW,
      30,
      check.supervisorSignatureUrl,
    );

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(black)
      .text(
        this.text(check.supervisorInspectorName),
        margin + signW + signGap,
        y + 50,
        {
          width: signW,
          align: "center",
        },
      );

    doc.end();
  }
}