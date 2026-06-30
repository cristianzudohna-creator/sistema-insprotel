import {
  BadRequestException,
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
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private text(value: any) {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
  }

  private role(user: any) {
    return String(user?.role || "").toUpperCase();
  }

  private isGeneralHistoryAllowed(user: any) {
    const role = this.role(user);
    return role === "SUPERADMIN" || role === "PREVENCION";
  }

  private isAllowedToCreate(user: any) {
    const role = this.role(user);

    return [
      "SUPERADMIN",
      "SUPERVISOR",
      "PREVENCION",
      "TECNICO",
      "CONDUCTOR",
    ].includes(role);
  }

  private normalizeEventType(value: any) {
    const normalized = String(value || "").trim().toUpperCase();

    if (normalized === "HALLAZGO") return "HALLAZGO";
    return "INCIDENTE";
  }

  private normalizeCategory(value: any) {
    const normalized = String(value || "").trim().toUpperCase();

    if (normalized === "INDUSTRIAL") return "INDUSTRIAL";
    return "LABORAL";
  }

  private parseBoolean(value: any) {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;

    const normalized = String(value || "").trim().toUpperCase();

    return normalized === "SI" || normalized === "SÍ" || normalized === "YES";
  }

  private parseDate(value: any) {
    if (!value) return new Date();

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return new Date();
    }

    return date;
  }

  private formatDateTime(value: any) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleString("es-CL");
    } catch {
      return "—";
    }
  }

  private async getLoggedUser(currentUser: any) {
    const userId = Number(currentUser?.id || currentUser?.sub || 0);

    if (!userId) {
      throw new ForbiddenException("Usuario no válido");
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || !user.isActive) {
      throw new ForbiddenException("Usuario no válido o inactivo");
    }

    return user;
  }

  private includeData() {
  return {
    user: {
      select: {
        id: true,
        name: true,
        rut: true,
        role: true,
      },
    },

    reviewedBy: {
      select: {
        id: true,
        name: true,
        role: true,
      },
    },

    solvedBy: {
      select: {
        id: true,
        name: true,
        role: true,
      },
    },

    photos: true,
  };
}

  private async notifyPreventionUsers(report: any, creator: any) {
  const preventionUsers = await this.prisma.user.findMany({
    where: {
      role: "PREVENCION",
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  const eventType =
    report?.eventType === "HALLAZGO" ? "hallazgo" : "incidente";

  const patentText = report?.vehiclePatent
    ? ` Patente: ${report.vehiclePatent}.`
    : "";

  await Promise.all(
    preventionUsers.map((preventionUser) =>
      this.notificationsService.create(
        preventionUser.id,
        "Nuevo Incidente / Hallazgo",
        `${creator.name} registró un nuevo ${eventType}${
          report?.folio ? ` (${report.folio})` : ""
        }.${patentText}`,
        "/incidentes/historial",
      ),
    ),
  );
}

  async create(
    currentUser: any,
    data: any,
    photos: Express.Multer.File[] = [],
  ) {
    const user = await this.getLoggedUser(currentUser);

    if (!this.isAllowedToCreate(user)) {
      throw new ForbiddenException(
        "No tienes permiso para crear incidentes o hallazgos",
      );
    }

    if (photos.length > 5) {
      throw new BadRequestException("Solo puedes subir hasta 5 fotografías");
    }

    const description = String(data.description || "").trim();

    if (!description) {
      throw new BadRequestException("La descripción es obligatoria");
    }

    const lastReport = await this.prisma.incidentReport.findFirst({
      orderBy: {
        id: "desc",
      },
    });

    const nextNumber = (lastReport?.id || 0) + 1;

    const folio = `INC-${new Date().getFullYear()}-${String(
      nextNumber,
    ).padStart(4, "0")}`;

    const created = await this.prisma.incidentReport.create({
      data: {
        folio,

        eventType: this.normalizeEventType(data.eventType || data.suceso),
        category: this.normalizeCategory(data.category || data.tipo),

        address: data.address || data.direccion || null,
        commune: data.commune || data.comuna || null,

        date: this.parseDate(data.date || data.fecha),

        area: data.area || data.zona || null,
        company: "INSPROTEL",

        description,

        cgedNumber: data.cgedNumber || data.numeroCged || null,
        supervisor: data.supervisor || null,
        cgeResponsible:
          data.cgeResponsible || data.responsableCge || null,
        prodityNumber: data.prodityNumber || data.numeroProdity || null,

        hasPhotographs:
          photos.length > 0 ||
          this.parseBoolean(data.hasPhotographs || data.tieneFotografia),

        notifiedSupervisor: this.parseBoolean(
          data.notifiedSupervisor || data.avisoSupervisorCge,
        ),

        reporterName: data.reporterName || data.nombreReporta || user.name,
        brigadeNumber: data.brigadeNumber || data.numeroBrigada || null,
        vehiclePatent: data.vehiclePatent || data.patente || null,

        phone: data.phone || data.telefono || null,
        rut: data.rut || user.rut || null,

        userId: user.id,

        photos: {
          create: photos.map((photo) => ({
            imageUrl: `/uploads/incidents/${photo.filename}`,
          })),
        },
      },
      include: this.includeData(),
    });

    await this.notifyPreventionUsers(created, user);

    return created;
  }

  async findMine(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    return this.prisma.incidentReport.findMany({
      where: {
        userId: user.id,
      },
      include: this.includeData(),
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findAll(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);

    if (!this.isGeneralHistoryAllowed(user)) {
      throw new ForbiddenException(
        "No tienes permiso para ver el historial general",
      );
    }

    return this.prisma.incidentReport.findMany({
      include: this.includeData(),
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findOne(currentUser: any, id: number) {
    const user = await this.getLoggedUser(currentUser);

    const report = await this.prisma.incidentReport.findUnique({
      where: {
        id,
      },
      include: this.includeData(),
    });

    if (!report) {
      throw new NotFoundException("Incidente / Hallazgo no encontrado");
    }

    const isOwner = report.userId === user.id;
    const canSeeAll = this.isGeneralHistoryAllowed(user);

    if (!isOwner && !canSeeAll) {
      throw new ForbiddenException(
        "No tienes permiso para ver este reporte",
      );
    }

    return report;
  }

  async remove(currentUser: any, id: number) {
    const user = await this.getLoggedUser(currentUser);

    const report = await this.prisma.incidentReport.findUnique({
      where: {
        id,
      },
    });

    if (!report) {
      throw new NotFoundException("Incidente / Hallazgo no encontrado");
    }

    const canDelete = this.isGeneralHistoryAllowed(user);

    if (!canDelete) {
      throw new ForbiddenException(
        "No tienes permiso para eliminar este reporte",
      );
    }

    return this.prisma.incidentReport.delete({
      where: {
        id,
      },
    });
  }

  async markAsReviewed(currentUser: any, id: number) {
  const user = await this.getLoggedUser(currentUser);

  if (!this.isGeneralHistoryAllowed(user)) {
    throw new ForbiddenException(
      "No tienes permiso para revisar este reporte",
    );
  }

  const report = await this.prisma.incidentReport.findUnique({
    where: { id },
  });

  if (!report) {
    throw new NotFoundException("Incidente / Hallazgo no encontrado");
  }

  const updated = await this.prisma.incidentReport.update({
    where: { id },
    data: {
      status: "EN_REVISION",
      reviewedAt: new Date(),
      reviewedById: user.id,
    },
    include: this.includeData(),
  });

  if (updated.userId !== user.id) {
    await this.notificationsService.create(
      updated.userId,
      "Reporte en revisión",
      `Tu reporte ${updated.folio || `#${updated.id}`} se encuentra en revisión por Prevención.`,
      "/incidentes/mis-reportes",
    );
  }

  return updated;
}

  async markAsSolved(
  currentUser: any,
  id: number,
  solutionDescription: string,
) {
  const user = await this.getLoggedUser(currentUser);

  if (!this.isGeneralHistoryAllowed(user)) {
    throw new ForbiddenException(
      "No tienes permiso para cerrar este reporte",
    );
  }

  const report = await this.prisma.incidentReport.findUnique({
    where: { id },
  });

  if (!report) {
    throw new NotFoundException("Incidente / Hallazgo no encontrado");
  }

  const updated = await this.prisma.incidentReport.update({
    where: { id },
    data: {
      status: "SOLUCIONADO",
      solvedAt: new Date(),
      solvedById: user.id,
      solutionDescription: String(solutionDescription || "").trim() || null,
    },
    include: this.includeData(),
  });

  if (updated.userId !== user.id) {
    await this.notificationsService.create(
      updated.userId,
      "Reporte solucionado",
      `Tu reporte ${updated.folio || `#${updated.id}`} fue marcado como solucionado.`,
      "/incidentes/mis-reportes",
    );
  }

  return updated;
}

  async generatePdf(currentUser: any, id: number, res: Response) {
    const report = await this.findOne(currentUser, id);

    const safeFolio = String(report.folio || `reporte-${report.id}`).replace(
      /[^a-zA-Z0-9-_]/g,
      "_",
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="INCIDENTE_HALLAZGO_${safeFolio}.pdf"`,
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 30,
    });

    doc.pipe(res);

    const black = "#111827";
    const gray = "#f3f4f6";
    const border = "#d1d5db";
    const blue = "#1e3a8a";

    const logoCandidates = [
      path.join(process.cwd(), "uploads", "branding", "logo-insprotel.png"),
      path.join(process.cwd(), "uploads", "logo-insprotel.png"),
      path.join(process.cwd(), "uploads", "branding", "insprotel.png"),
    ];

    const logoPath = logoCandidates.find((item) => fs.existsSync(item));

    const drawHeader = () => {
      doc.rect(30, 25, 535, 55).stroke(border);

      if (logoPath) {
        try {
          doc.image(logoPath, 42, 35, {
            width: 130,
            height: 35,
            fit: [130, 35],
          });
        } catch {
          doc
            .font("Helvetica-Bold")
            .fontSize(15)
            .fillColor(black)
            .text("INSPROTEL", 45, 45);
        }
      } else {
        doc
          .font("Helvetica-Bold")
          .fontSize(15)
          .fillColor(black)
          .text("INSPROTEL", 45, 45);
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor(black)
        .text("REPORTE DE INCIDENTE / HALLAZGO", 190, 43, {
          width: 350,
          align: "center",
        });
    };

    const drawSectionTitle = (title: string, y: number) => {
      doc.rect(30, y, 535, 20).fillAndStroke(blue, blue);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#ffffff")
        .text(title, 40, y + 6);
    };

    const drawRow = (
      label1: string,
      value1: any,
      label2: string,
      value2: any,
      y: number,
    ) => {
      const labelW = 95;
      const valueW = 172.5;

      doc.rect(30, y, labelW, 22).fillAndStroke(gray, border);
      doc.rect(125, y, valueW, 22).stroke(border);
      doc.rect(297.5, y, labelW, 22).fillAndStroke(gray, border);
      doc.rect(392.5, y, valueW, 22).stroke(border);

      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(black)
        .text(label1, 36, y + 7, { width: labelW - 10 });

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(black)
        .text(this.text(value1), 131, y + 7, { width: valueW - 10 });

      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(black)
        .text(label2, 303.5, y + 7, { width: labelW - 10 });

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(black)
        .text(this.text(value2), 398.5, y + 7, { width: valueW - 10 });
    };

    drawHeader();

    let y = 100;

    drawSectionTitle("DATOS DEL REPORTE", y);
    y += 20;

    drawRow("Folio", report.folio, "Estado", report.status, y);
    y += 22;

    drawRow("Suceso", report.eventType, "Tipo", report.category, y);
    y += 22;

    drawRow("Fecha / Hora", this.formatDateTime(report.date), "Empresa", report.company, y);
    y += 22;

    drawRow("Área / Zona", report.area, "Dirección", report.address, y);
    y += 22;

    drawRow("Comuna", report.commune, "Patente", report.vehiclePatent, y);
    y += 32;

    drawSectionTitle("INFORMACIÓN CGE / SUPERVISIÓN", y);
    y += 20;

    drawRow("N° CGED", report.cgedNumber, "Supervisor", report.supervisor, y);
    y += 22;

    drawRow(
      "Responsable CGE",
      report.cgeResponsible,
      "N° Prodity",
      report.prodityNumber,
      y,
    );
    y += 22;

    drawRow(
      "¿Fotografía?",
      report.hasPhotographs ? "Sí" : "No",
      "Avisó Sup. CGE",
      report.notifiedSupervisor ? "Sí" : "No",
      y,
    );
    y += 32;

    drawSectionTitle("DATOS DE QUIEN REPORTA", y);
    y += 20;

    drawRow("Nombre", report.reporterName, "RUT", report.rut, y);
    y += 22;

    drawRow("Teléfono", report.phone, "N° Brigada", report.brigadeNumber, y);
    y += 32;

    drawSectionTitle("DESCRIPCIÓN", y);
    y += 20;

    doc.rect(30, y, 535, 95).stroke(border);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(black)
      .text(this.text(report.description), 40, y + 10, {
        width: 515,
        height: 75,
        align: "left",
      });

    y += 115;

    if (report.photos?.length) {
      drawSectionTitle("FOTOGRAFÍAS", y);
      y += 28;

      const getPathFromUrl = (url: any) => {
        const relativePath = String(url || "").replace(/^\/+/, "");
        return path.join(process.cwd(), relativePath);
      };

      const photoW = 160;
      const photoH = 120;
      const gap = 18;

      report.photos.slice(0, 5).forEach((photo: any, index: number) => {
        if (y + photoH > 780) {
          doc.addPage();
          y = 40;
        }

        const col = index % 3;
        const x = 30 + col * (photoW + gap);

        if (col === 0 && index > 0) {
          y += photoH + 25;
        }

        const photoPath = getPathFromUrl(photo.imageUrl);

        doc.rect(x, y, photoW, photoH).stroke(border);

        if (fs.existsSync(photoPath)) {
          try {
            doc.image(photoPath, x + 5, y + 5, {
              fit: [photoW - 10, photoH - 10],
              align: "center",
              valign: "center",
            });
          } catch {
            doc
              .font("Helvetica")
              .fontSize(7)
              .fillColor(black)
              .text("No se pudo cargar la imagen", x + 10, y + 50, {
                width: photoW - 20,
                align: "center",
              });
          }
        }
      });
    }

    doc.end();
  }

  async findVehicles() {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        patent: "asc",
      },
      select: {
        id: true,
        patent: true,
        vehicleType: true,
        vehicleModel: true,
        company: true,
      },
    });

    return vehicles;
  }

  async findSupervisors() {
  return this.prisma.user.findMany({
    where: {
      isActive: true,
      role: {
        in: ["SUPERVISOR", "PREVENCION"],
      },
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      rut: true,
      role: true,
    },
  });
}
}