import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Response } from "express";
import PDFDocument = require("pdfkit");
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class SafetyTalksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private text(value: any) {
  if (value === null || value === undefined || value === "") return "—";

  return String(value)
    .replace(/\r/g, "")
    .replace(/\u000d/g, "")
    .replace(/\u2028/g, "\n")
    .replace(/\u2029/g, "\n")
    .replace(/[^\S\n]+$/gm, "")
    .trim();
}

  private toDate(value: any) {
  if (!value) return new Date();

  if (typeof value === "string" && value.includes("-")) {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

  private formatDate(value: any) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleDateString("es-CL");
    } catch {
      return "—";
    }
  }

  private formatDateTime(value: any) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
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

  private isSuperadmin(user: any) {
    return String(user?.role || "").toUpperCase() === "SUPERADMIN";
  }

  private isAdminReviewer(user: any) {
    const role = String(user?.role || "").toUpperCase();
    return role === "SUPERADMIN" || role === "SUPERVISOR" || role === "PREVENCION";
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

  private async notifyTalkParticipants(talk: any) {
    const participantsToNotify = (talk.participants || []).filter(
      (participant: any) => participant.userId && !participant.signatureUrl,
    );

    await Promise.all(
      participantsToNotify.map((participant: any) =>
        this.notificationsService.create(
          Number(participant.userId),
          "Charla pendiente de firma",
          `Tienes una charla pendiente de firma${talk.folio ? ` (${talk.folio})` : ""}.`,
          `/charlas/pendientes-firma`,
        ),
      ),
    );
  }

  private async notifyReviewersTalkCompleted(talk: any) {
    const reviewers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: ["SUPERVISOR", "PREVENCION"],
        },
      },
    });

    await Promise.all(
      reviewers.map((reviewer) =>
        this.notificationsService.create(
          reviewer.id,
          "Charla terminada",
          `Charla terminada disponible para revisión${talk?.folio ? ` (${talk.folio})` : ""}.`,
          `/charlas/admin`,
        ),
      ),
    );
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

    const isOwner = talk.userId === user.id;
    const isParticipant = talk.participants.some(
      (participant) => participant.userId === user.id,
    );

    if (!this.isAdminReviewer(user) && !isOwner && !isParticipant) {
      throw new ForbiddenException("No tienes permiso para ver esta charla");
    }

    return talk;
  }

  private generateFolio(id: number) {
    return `RPS-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`;
  }

  async create(
    currentUser: any,
    data: any,
    photos: Express.Multer.File[] = [],
    creatorSignature?: Express.Multer.File | null,
    participantSignatures: Express.Multer.File[] = [],
  ) {
    const user = await this.getLoggedUser(currentUser);
    const participants = this.parseJson(data.participants);

    const created = await this.prisma.safetyTalk.create({
      data: {
        date: this.toDate(data.date),
        areaLocationInstallation: data.areaLocationInstallation || null,
        meetingTime: data.meetingTime || null,
        workOrderProject: data.workOrderProject || null,
        workPermitActivity: data.workPermitActivity || null,
        worksToDo: data.worksToDo || null,
        foremanOrBrigadeName: data.foremanOrBrigadeName || null,
        foremanCompany: data.foremanCompany || null,
        peopleCount: Number.isFinite(Number(data.peopleCount))
          ? Number(data.peopleCount)
          : participants.length || 0,
        workTypes: data.workTypes || null,
        significantRisks: data.significantRisks || null,
        analyzedAccident: data.analyzedAccident || null,
        controlMeasure1: data.controlMeasure1 || null,
        controlMeasure2: data.controlMeasure2 || null,
        controlMeasure3: data.controlMeasure3 || null,
        controlMeasure4: data.controlMeasure4 || null,
        controlMeasure5: data.controlMeasure5 || null,
        controlMeasure6: data.controlMeasure6 || null,
        controlMeasure7: data.controlMeasure7 || null,
        controlMeasure8: data.controlMeasure8 || null,
        controlMeasure9: data.controlMeasure9 || null,
        controlMeasure10: data.controlMeasure10 || null,
        controlMeasure11: data.controlMeasure11 || null,
        controlMeasure12: data.controlMeasure12 || null,
        creatorRole: data.creatorRole || "TECNICO",
        status: "PENDIENTE_FIRMAS",
        createdByName: data.createdByName || user.name || "Sin nombre",
        createdByRut: data.createdByRut || user.rut || null,
        createdBySignatureUrl: creatorSignature
          ? `/uploads/safety-talks/${creatorSignature.filename}`
          : null,
        userId: user.id,
        participants: {
          create: participants.map((item: any, index: number) => {
            const participantSignature = participantSignatures[index];

            return {
              userId: item.userId ? Number(item.userId) : null,
              name: item.name || "Sin nombre",
              rut: item.rut || null,
              compliesRest:
                item.compliesRest === true ||
                item.compliesRest === "true" ||
                item.compliesRest === "SI",
              signatureUrl: participantSignature
                ? `/uploads/safety-talks/${participantSignature.filename}`
                : null,
              signedAt: participantSignature ? new Date() : null,
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

    const updated = await this.prisma.safetyTalk.update({
      where: { id: created.id },
      data: {
        folio: this.generateFolio(created.id),
      },
      include: {
        participants: true,
        photos: true,
        user: true,
      },
    });

    await this.notifyTalkParticipants(updated);

    const allSigned =
      updated.participants.length > 0 &&
      updated.participants.every((item) => Boolean(item.signatureUrl));

    if (allSigned) {
      const completedTalk = await this.prisma.safetyTalk.update({
        where: { id: updated.id },
        data: {
          status: "COMPLETADA",
          completedAt: new Date(),
        },
        include: {
          participants: true,
          photos: true,
          user: true,
        },
      });

      await this.notifyReviewersTalkCompleted(completedTalk);

      return completedTalk;
    }

    return updated;
  }

  async findAll(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    return this.prisma.safetyTalk.findMany({
      where: {
        OR: [
          { userId: user.id },
          {
            participants: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
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

    if (!this.isAdminReviewer(user)) {
      throw new ForbiddenException(
        "Solo supervisores, prevención o SUPERADMIN pueden ver todas las charlas",
      );
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

  async pendingSignatures(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    return this.prisma.safetyTalk.findMany({
      where: {
        status: "PENDIENTE_FIRMAS",
        participants: {
          some: {
            userId: user.id,
            signatureUrl: null,
          },
        },
      },
      include: {
        participants: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findOne(currentUser: any, id: number) {
    return this.canAccessTalk(currentUser, id);
  }

  async findPendingSignatures(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    return this.prisma.safetyTalk.findMany({
      where: {
        participants: {
          some: {
            userId: user.id,
            signatureUrl: null,
          },
        },
      },
      include: {
        participants: true,
        photos: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async exportExcel(
  currentUser: any,
  res: Response,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
  },
) {

    const where: any = {
  status: "COMPLETADA",
};

if (filters?.dateFrom || filters?.dateTo) {
  where.completedAt = {};

  if (filters.dateFrom) {
    where.completedAt.gte = new Date(
      `${filters.dateFrom}T00:00:00`,
    );
  }

  if (filters.dateTo) {
    where.completedAt.lte = new Date(
      `${filters.dateTo}T23:59:59`,
    );
  }
}

const talks = await this.prisma.safetyTalk.findMany({
  where,
  include: {
    participants: true,
    user: true,
  },
  orderBy: {
    completedAt: "desc",
  },
});

    const rows: any[] = [];

    for (const talk of talks) {
      const participants = talk.participants || [];

      if (!participants.length) {
        rows.push({
          Folio: this.text(talk.folio),
          Estado: this.text(talk.status),
          "Fecha creación": this.formatDateTime(talk.createdAt),
          "Fecha completada": this.formatDateTime(talk.completedAt),
          "Hora reunión": this.text(talk.meetingTime),
          "Área / Lugar": this.text(talk.areaLocationInstallation),
          Proyecto: this.text(talk.workOrderProject),
          "Permiso de faena": this.text(talk.workPermitActivity),
          "Trabajos a realizar": this.text(talk.worksToDo),
          "Responsable charla": this.text(talk.foremanOrBrigadeName),
          Empresa: this.text(talk.foremanCompany),
          "Número personas": this.text(talk.peopleCount),
          "Tipo trabajos": this.text(talk.workTypes),
          Riesgos: this.text(talk.significantRisks),
          "Accidente analizado": this.text(talk.analyzedAccident),
          "Medida de control 1": this.text(talk.controlMeasure1),
          "Medida de control 2": this.text(talk.controlMeasure2),
          "Medida de control 3": this.text(talk.controlMeasure3),
          "Medida de control 4": this.text(talk.controlMeasure4),
          "Medida de control 5": this.text(talk.controlMeasure5),
          "Medida de control 6": this.text(talk.controlMeasure6),
          "Medida de control 7": this.text(talk.controlMeasure7),
          "Medida de control 8": this.text(talk.controlMeasure8),
          "Medida de control 9": this.text(talk.controlMeasure9),
          "Medida de control 10": this.text(talk.controlMeasure10),
          "Medida de control 11": this.text(talk.controlMeasure11),
          "Medida de control 12": this.text(talk.controlMeasure12),
          "Creado por": this.text(talk.createdByName),
          "Rut creador": this.text(talk.createdByRut),
          "Firmas participantes": "0",
          "Nombre participante": "—",
          "Rut participante": "—",
          Descanso: "—",
          Firmó: "—",
          "Fecha firma": "—",
        });
      }

      for (const participant of participants) {
        rows.push({
          Folio: this.text(talk.folio),
          Estado: this.text(talk.status),
          "Fecha creación": this.formatDateTime(talk.createdAt),
          "Fecha completada": this.formatDateTime(talk.completedAt),
          "Hora reunión": this.text(talk.meetingTime),
          "Área / Lugar": this.text(talk.areaLocationInstallation),
          Proyecto: this.text(talk.workOrderProject),
          "Permiso de faena": this.text(talk.workPermitActivity),
          "Trabajos a realizar": this.text(talk.worksToDo),
          "Responsable charla": this.text(talk.foremanOrBrigadeName),
          Empresa: this.text(talk.foremanCompany),
          "Número personas": this.text(talk.peopleCount),
          "Tipo trabajos": this.text(talk.workTypes),
          Riesgos: this.text(talk.significantRisks),
          "Accidente analizado": this.text(talk.analyzedAccident),
          "Medida de control 1": this.text(talk.controlMeasure1),
          "Medida de control 2": this.text(talk.controlMeasure2),
          "Medida de control 3": this.text(talk.controlMeasure3),
          "Medida de control 4": this.text(talk.controlMeasure4),
          "Medida de control 5": this.text(talk.controlMeasure5),
          "Medida de control 6": this.text(talk.controlMeasure6),
          "Medida de control 7": this.text(talk.controlMeasure7),
          "Medida de control 8": this.text(talk.controlMeasure8),
          "Medida de control 9": this.text(talk.controlMeasure9),
          "Medida de control 10": this.text(talk.controlMeasure10),
          "Medida de control 11": this.text(talk.controlMeasure11),
          "Medida de control 12": this.text(talk.controlMeasure12),
          "Creado por": this.text(talk.createdByName),
          "Rut creador": this.text(talk.createdByRut),
          "Firmas participantes": `${participants.filter((item) => item.signatureUrl).length}/${participants.length}`,
          "Nombre participante": this.text(participant.name),
          "Rut participante": this.text(participant.rut),
          Descanso: participant.compliesRest ? "Sí" : "No",
          Firmó: participant.signatureUrl ? "Sí" : "No",
          "Fecha firma": this.formatDateTime(participant.signedAt),
        });
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 16 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 26 },
      { wch: 26 },
      { wch: 24 },
      { wch: 40 },
      { wch: 26 },
      { wch: 20 },
      { wch: 16 },
      { wch: 35 },
      { wch: 35 },
      { wch: 35 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 24 },
      { wch: 16 },
      { wch: 20 },
      { wch: 26 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Charlas completadas");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const today = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="charlas_completadas_${today}.xlsx"`,
    );

    return res.send(buffer);
  }

  async generatePdf(currentUser: any, id: number, res: Response) {
    const talk = await this.findOne(currentUser, id);

    const safeName = String(talk.createdByName || "charla").replace(
      /[^a-zA-Z0-9-_]/g,
      "_",
    );

    const today = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="REUNION_SEGURIDAD_${safeName}_${today}.pdf"`,
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 18,
      bufferPages: true,
    });

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const black = "#111827";
    const gray = "#e5e7eb";

    const getPathFromUrl = (url: any) => {
      const relativePath = String(url || "").replace(/^\/+/, "");
      return path.join(process.cwd(), relativePath);
    };

    const isoCandidates = [
      path.join(process.cwd(), "uploads", "branding", "iso.png"),
      path.join(process.cwd(), "uploads", "iso.png"),
    ];

    const logoCandidates = [
      path.join(process.cwd(), "uploads", "branding", "logo-insprotel.png"),
      path.join(process.cwd(), "uploads", "logo-insprotel.png"),
    ];

    const isoPath = isoCandidates.find((item) => fs.existsSync(item));
    const logoPath = logoCandidates.find((item) => fs.existsSync(item));

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
          height: h - 5,
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
        doc.image(signaturePath, x + 3, y + 2, {
          fit: [w - 6, h - 4],
          align: "center",
          valign: "center",
        });
      } catch {
        // no romper PDF
      }
    };

    let y = 18;

    drawCell(margin, y, contentWidth, 42, "", {});
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(black)
      .text("Reunión Previa de Seguridad en el Trabajo", margin, y + 6, {
        width: contentWidth,
        align: "center",
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .text(
        "Confeccionada en terreno el día de la ejecución del trabajo",
        margin,
        y + 21,
        {
          width: contentWidth,
          align: "center",
        },
      );

    if (logoPath) {
      try {
        doc.image(logoPath, margin + 12, y + 7, {
          fit: [120, 26],
        });
      } catch {
        // ignorar
      }
    }

    if (isoPath) {
      try {
        doc.image(isoPath, pageWidth - margin - 120, y + 3, {
          fit: [190, 38],
        });
      } catch {
        // ignorar
      }
    }

    y += 42;

    drawCell(margin, y, 120, 16, "Área, lugar, instalación:", {
      bold: true,
      fill: gray,
    });
    drawCell(
      margin + 120,
      y,
      contentWidth - 230,
      16,
      this.text(talk.areaLocationInstallation),
    );
    drawCell(margin + contentWidth - 110, y, 55, 16, "Fecha:", {
      bold: true,
      fill: gray,
    });

    const finalDate = talk.completedAt || talk.date;
    const pdfDateText = talk.completedAt
  ? new Date(talk.completedAt).toLocaleString("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
  : `${new Date(talk.date).toLocaleDateString("es-CL")} ${this.text(
      talk.meetingTime,
    )}`;

    drawCell(
  margin + contentWidth - 55,
  y,
  55,
  16,
  pdfDateText,
  {
    align: "center",
    fontSize: 5.5,
  },
);

    y += 16;

    drawCell(margin, y, 140, 16, "Orden de trabajo/Proyecto:", {
      bold: true,
      fill: gray,
    });
    drawCell(margin + 140, y, 220, 16, this.text(talk.workOrderProject));
    drawCell(margin + 360, y, 130, 16, "N° Permiso de Faena/Actividad:", {
      bold: true,
      fill: gray,
      fontSize: 5.7,
    });
    drawCell(
      margin + 490,
      y,
      contentWidth - 490,
      16,
      this.text(talk.workPermitActivity),
    );

    y += 16;

    drawCell(margin, y, contentWidth, 16, "SE REALIZARAN TRABAJOS DE:", {
      bold: true,
      fill: gray,
    });

    y += 16;
    drawCell(margin, y, contentWidth, 42, this.text(talk.worksToDo), {
      fontSize: 8,
    });

    y += 42;

    drawCell(margin, y, 160, 16, "Jefe de Faena o Brigada", {
      bold: true,
      fill: gray,
    });
    drawCell(margin + 160, y, 210, 16, this.text(talk.foremanOrBrigadeName));
    drawCell(margin + 370, y, 110, 16, "N° de personas:", {
      bold: true,
      fill: gray,
    });

    const totalPeople =
      Number(talk.peopleCount) || 1 + (talk.participants?.length || 0);

    drawCell(margin + 480, y, contentWidth - 480, 16, String(totalPeople), {
      align: "center",
    });

    y += 16;

    drawCell(margin, y, contentWidth, 16, "TIPO DE TRABAJOS", {
      bold: true,
      align: "center",
      fill: gray,
    });

    y += 16;
    drawCell(margin, y, contentWidth, 76, this.text(talk.workTypes), {
      fontSize: 8,
    });

    y += 76;

    drawCell(margin, y, contentWidth, 16, "RIESGOS PREVISTOS MAS SIGNIFICATIVOS", {
      bold: true,
      align: "center",
      fill: gray,
    });

    y += 16;
    drawCell(margin, y, contentWidth, 78, this.text(talk.significantRisks), {
      fontSize: 8,
    });

    y += 78;

    drawCell(margin, y, contentWidth, 16, "ACCIDENTE E INCIDENTE ANALIZADO", {
      bold: true,
      align: "center",
      fill: gray,
    });

    y += 16;
    drawCell(margin, y, contentWidth, 58, this.text(talk.analyzedAccident), {
      fontSize: 8,
    });

    y += 58;

    drawCell(margin, y, contentWidth, 16, "MEDIDAS DE CONTROL", {
      bold: true,
      align: "center",
      fill: gray,
    });

    y += 16;

    const measureW = contentWidth / 2;
    const measureH = 14;
    const measures = [
      talk.controlMeasure1,
      talk.controlMeasure2,
      talk.controlMeasure3,
      talk.controlMeasure4,
      talk.controlMeasure5,
      talk.controlMeasure6,
      talk.controlMeasure7,
      talk.controlMeasure8,
      talk.controlMeasure9,
      talk.controlMeasure10,
      talk.controlMeasure11,
      talk.controlMeasure12,
    ];

    for (let i = 0; i < 6; i++) {
      drawCell(margin, y, 24, measureH, `${i + 1}.-`, { align: "center" });
      drawCell(margin + 24, y, measureW - 24, measureH, this.text(measures[i]));

      drawCell(margin + measureW, y, 24, measureH, `${i + 7}.-`, {
        align: "center",
      });
      drawCell(
        margin + measureW + 24,
        y,
        measureW - 24,
        measureH,
        this.text(measures[i + 6]),
      );

      y += measureH;
    }

    drawCell(margin, y, contentWidth, 16, "LISTADO E INFORMACIÓN TRABAJADORES", {
      bold: true,
      align: "center",
      fill: gray,
    });

    y += 16;

    const rowH = 24;
    const colN = 26;
    const colName = 210;
    const colRut = 95;
    const colRest = 70;
    const colSign = contentWidth - colN - colName - colRut - colRest;

    drawCell(margin, y, colN, 16, "N°", {
      bold: true,
      fill: gray,
      align: "center",
      fontSize: 6,
    });

    drawCell(margin + colN, y, colName, 16, "Nombre", {
      bold: true,
      fill: gray,
      fontSize: 6,
    });

    drawCell(margin + colN + colName, y, colRut, 16, "Rut", {
      bold: true,
      fill: gray,
      fontSize: 6,
    });

    drawCell(margin + colN + colName + colRut, y, colRest, 16, "Descanso", {
      bold: true,
      fill: gray,
      align: "center",
      fontSize: 6,
    });

    drawCell(
      margin + colN + colName + colRut + colRest,
      y,
      colSign,
      16,
      "Firma",
      {
        bold: true,
        fill: gray,
        align: "center",
        fontSize: 6,
      },
    );

    y += 16;

    const participants = [
      {
        name: talk.createdByName,
        rut: talk.createdByRut,
        compliesRest: true,
        signatureUrl: talk.createdBySignatureUrl,
      },
      ...(talk.participants || []),
    ];

    const rowsToDraw = Math.max(participants.length, 1);

    for (let i = 0; i < rowsToDraw; i++) {
      const item = participants[i];

      drawCell(margin, y, colN, rowH, `${i + 1}.-`, {
        align: "center",
        fontSize: 6,
      });

      drawCell(margin + colN, y, colName, rowH, this.text(item?.name || ""), {
        fontSize: 6,
      });

      drawCell(
        margin + colN + colName,
        y,
        colRut,
        rowH,
        this.text(item?.rut || ""),
        {
          fontSize: 6,
        },
      );

      drawCell(
        margin + colN + colName + colRut,
        y,
        colRest,
        rowH,
        item ? (item.compliesRest ? "Sí" : "No") : "",
        {
          align: "center",
          fontSize: 6,
        },
      );

      drawCell(
        margin + colN + colName + colRut + colRest,
        y,
        colSign,
        rowH,
        "",
      );

      if (item?.signatureUrl) {
        drawSignature(
          margin + colN + colName + colRut + colRest,
          y,
          colSign,
          rowH,
          item.signatureUrl,
        );
      }

      y += rowH;
    }

    y += 8;

    const commitmentH = 62;

    doc.rect(margin, y, contentWidth, commitmentH).stroke(black);

    doc
      .font("Helvetica-Bold")
      .fontSize(6.7)
      .fillColor(black)
      .text(
        "Los trabajadores que suscriben, se comprometen a cumplir todas las instrucciones recibidas para evitar accidentes en el trabajo y al mismo tiempo dar cuenta inmediata a sus superiores respecto de acciones subestándares cometidas por otros trabajadores o de condiciones subestándares existentes en las instalaciones.",
        margin + 14,
        y + 7,
        {
          width: contentWidth - 28,
          align: "center",
          lineGap: 1,
        },
      );

    doc
      .font("Helvetica")
      .fontSize(6.7)
      .fillColor(black)
      .text(
        "Los trabajadores que suscriben, declaran conocer todos los riesgos inherentes a los trabajos convenidos, adoptando las medidas preventivas, acuerdos y los procedimientos de trabajos.",
        margin + 14,
        y + 31,
        {
          width: contentWidth - 28,
          align: "center",
          lineGap: 1,
        },
      );

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(black)
      .text(
        "Deber de Informar ( Ley 16.744, artículo 21, Decreto 40/69 ).",
        margin + 10,
        y + 49,
        {
          width: contentWidth - 20,
          align: "center",
        },
      );

    doc.end();
  }

  async signTalk(
    currentUser: any,
    id: number,
    signature?: Express.Multer.File | null,
  ) {
    const user = await this.getLoggedUser(currentUser);

    if (!signature) {
      throw new ForbiddenException("Debes adjuntar una firma");
    }

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

    const participant = talk.participants.find(
      (item) => item.userId === user.id,
    );

    if (!participant) {
      throw new ForbiddenException("No eres participante de esta charla");
    }

    if (participant.signatureUrl) {
      throw new ForbiddenException("Ya firmaste esta charla");
    }

    const signatureUrl = `/uploads/safety-talks/${signature.filename}`;

    await this.prisma.safetyTalkParticipant.update({
      where: {
        id: participant.id,
      },
      data: {
        signatureUrl,
        signedAt: new Date(),
      },
    });

    const updatedTalk = await this.prisma.safetyTalk.findUnique({
      where: { id },
      include: {
        participants: true,
        photos: true,
        user: true,
      },
    });

    const allSigned =
      updatedTalk?.participants.length &&
      updatedTalk.participants.every((item) => Boolean(item.signatureUrl));

    if (allSigned && talk.status !== "COMPLETADA") {
      const completedTalk = await this.prisma.safetyTalk.update({
        where: { id },
        data: {
          status: "COMPLETADA",
          completedAt: new Date(),
        },
        include: {
          participants: true,
          photos: true,
          user: true,
        },
      });

      await this.notifyReviewersTalkCompleted(completedTalk);

      return completedTalk;
    }

    return this.prisma.safetyTalk.findUnique({
      where: { id },
      include: {
        participants: true,
        photos: true,
        user: true,
      },
    });
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