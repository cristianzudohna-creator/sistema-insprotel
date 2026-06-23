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
export class VehicleChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private toDate(value: any) {
    if (!value) return null;

    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date;
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

  private role(user: any) {
    return String(user?.role || "").toUpperCase();
  }

  private isSuperadmin(user: any) {
    return this.role(user) === "SUPERADMIN";
  }

  private isDriver(user: any) {
    return this.role(user) === "CONDUCTOR";
  }

  private isReviewer(user: any) {
    const role = this.role(user);
    return role === "SUPERADMIN" || role === "SUPERVISOR" || role === "PREVENCION";
  }

  private canCreate(user: any) {
    return this.isDriver(user) || this.isReviewer(user);
  }

  private ensureTecnicoOut(user: any) {
    if (this.role(user) === "TECNICO") {
      throw new ForbiddenException("TÉCNICO no participa en Check List Vehículos");
    }
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

  private normalizeDocumentStatus(value: any) {
    const normalized = String(value || "").trim().toUpperCase();

    if (normalized === "VIGENTE") return "VIGENTE";
    if (normalized === "VENCIDA" || normalized === "VENCIDO") return "VENCIDA";

    if (
      normalized === "NO_APLICA" ||
      normalized === "NO APLICA" ||
      normalized === "N/A"
    ) {
      return "NO_APLICA";
    }

    return null;
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

  private async findDriverByData(data: any, fallbackUser: any) {
    const driverUserId = Number(data.driverUserId || data.conductorId || 0);

    if (driverUserId) {
      const found = await this.prisma.user.findUnique({
        where: { id: driverUserId },
      });

      if (found && found.role === "CONDUCTOR" && found.isActive) {
        return found;
      }
    }

    const driverName = String(data.driverName || "").trim();

    if (driverName) {
      const found = await this.prisma.user.findFirst({
        where: {
          role: "CONDUCTOR",
          isActive: true,
          name: {
            equals: driverName,
            mode: "insensitive",
          },
        },
      });

      if (found) return found;
    }

    if (this.isDriver(fallbackUser)) return fallbackUser;

    return null;
  }

  private checklistInclude() {
    return {
      items: true,
      photos: true,
      user: true,
    };
  }

  private async canAccessChecklist(id: number, currentUser: any) {
    const user = await this.getLoggedUser(currentUser);
    this.ensureTecnicoOut(user);

    const checklist = await this.prisma.vehicleCheckList.findUnique({
      where: { id },
      include: this.checklistInclude(),
    });

    if (!checklist) {
      throw new NotFoundException("Check list no encontrado");
    }

    const isOwner = checklist.userId === user.id;
    const isAssignedDriver = checklist.driverUserId === user.id;

    if (!this.isReviewer(user) && !isOwner && !isAssignedDriver) {
      throw new ForbiddenException("No tienes permiso para ver este check list");
    }

    return checklist;
  }

  private isCompleted(check: any) {
  const hasDriverSignature = !!check.driverSignatureUrl;

  const hasInspectorSignature =
    !!check.inspectorSignatureUrl ||
    !!check.supervisorSignatureUrl ||
    !!check.preventionSignatureUrl ||
    !!check.superadminSignatureUrl;

  return hasDriverSignature && hasInspectorSignature;
}

  private async updateStatusIfCompleted(id: number) {
    const check = await this.prisma.vehicleCheckList.findUnique({
      where: { id },
    });

    if (!check) return null;

    if (!this.isCompleted(check)) {
      return this.prisma.vehicleCheckList.update({
        where: { id },
        data: {
          status: "PENDIENTE_FIRMAS",
          completedAt: null,
        },
        include: this.checklistInclude(),
      });
    }

    return this.prisma.vehicleCheckList.update({
      where: { id },
      data: {
        status: "COMPLETADO",
        completedAt: check.completedAt || new Date(),
      },
      include: this.checklistInclude(),
    });
  }

  private async notifySelectedReviewer(check: any) {
    const selectedReviewerId = Number(check?.supervisorUserId || 0);

    if (!selectedReviewerId) return;

    const reviewer = await this.prisma.user.findFirst({
      where: {
        id: selectedReviewerId,
        isActive: true,
        role: {
          in: ["SUPERVISOR", "PREVENCION"],
        },
      },
    });

    if (!reviewer) return;

    await this.notificationsService.create(
      reviewer.id,
      "Check list vehículo pendiente de firma",
      `Tienes un check list de vehículo pendiente de firma${
        check?.folio ? ` (${check.folio})` : ""
      }.`,
      "/vehicle-checklist/pending-signatures",
    );
  }

  private async notifyDriver(check: any) {
    if (!check.driverUserId) return;

    await this.notificationsService.create(
      check.driverUserId,
      "Check list vehículo pendiente de firma",
      `Tienes un check list de vehículo pendiente de firma${
        check?.folio ? ` (${check.folio})` : ""
      }.`,
      "/vehicle-checklist/pending-signatures",
    );
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
    inspectorSignature?: Express.Multer.File | null,
    currentUser?: any,
  ) {
    const user = await this.getLoggedUser(currentUser);
    this.ensureTecnicoOut(user);

    if (!this.canCreate(user)) {
      throw new ForbiddenException("No tienes permiso para crear check list vehículos");
    }

    const items = this.parseItems(data.items);
    const driver = await this.findDriverByData(data, user);

    if (!driver) {
      throw new ForbiddenException("Debes seleccionar un conductor válido");
    }

    const lastChecklist = await this.prisma.vehicleCheckList.findFirst({
      orderBy: {
        id: "desc",
      },
    });

    const nextNumber = (lastChecklist?.id || 0) + 1;

    const generatedFolio = `CL-${new Date().getFullYear()}-${String(
      nextNumber,
    ).padStart(4, "0")}`;

    const creatorRole = this.role(user) as any;
    const now = new Date();

    const isCreatedByDriver = this.isDriver(user);
    const selectedReviewerId = Number(data.supervisorUserId || 0);

    let selectedReviewer: any = null;

    if (selectedReviewerId) {
      selectedReviewer = await this.prisma.user.findFirst({
        where: {
          id: selectedReviewerId,
          isActive: true,
          role: {
            in: ["SUPERVISOR", "PREVENCION"],
          },
        },
      });

      if (!selectedReviewer) {
        throw new ForbiddenException(
          "Debes seleccionar un supervisor o prevención válido",
        );
      }
    }

    if (isCreatedByDriver && !selectedReviewerId) {
      throw new ForbiddenException(
        "Debes seleccionar un supervisor o prevención para la firma",
      );
    }

    const created = await this.prisma.vehicleCheckList.create({
      data: {
        folio: generatedFolio,
        date: this.toDate(data.date) || new Date(),
        patent: data.patent || "SIN_PATENTE",
        mileage: Number(data.mileage || 0),
        maintenanceUpToDate: data.maintenanceUpToDate || null,
        padron: data.padron || null,

        vehicleType: data.vehicleType || null,
        vehicleModel: data.vehicleModel || null,

        driverName: data.driverName || driver.name || "Sin conductor",
        driverUserId: driver.id,

        supervisorName:
          data.supervisorName || selectedReviewer?.name || null,
        supervisorUserId: selectedReviewerId || null,
        inspectorName: isCreatedByDriver
          ? data.inspectorName || null
          : data.inspectorName || user.name,

        driverSignatureUrl: driverSignature
          ? `/uploads/vehicle-checklist/${driverSignature.filename}`
          : null,

        inspectorSignatureUrl: inspectorSignature
          ? `/uploads/vehicle-checklist/${inspectorSignature.filename}`
          : null,

        driverSignedAt: driverSignature ? now : null,
        inspectorSignedAt: inspectorSignature ? now : null,

        supervisorSignatureUrl: null,
        preventionSignatureUrl: null,
        superadminSignatureUrl: null,

        supervisorSignedAt: null,
        preventionSignedAt: null,
        superadminSignedAt: null,

        preventionName: null,
        superadminName: null,

        createdByRole: creatorRole,
        completedAt: null,

        technicalReview: this.toDate(data.technicalReview),
        technicalReviewStatus: this.normalizeDocumentStatus(
          data.technicalReviewStatus,
        ) as any,

        gasEmissionReview: this.toDate(data.gasReview),
        gasEmissionReviewStatus: this.normalizeDocumentStatus(
          data.gasEmissionReviewStatus,
        ) as any,

        driverLicenseExpiration: this.toDate(data.driverLicense),
        driverLicenseStatus: this.normalizeDocumentStatus(
          data.driverLicenseStatus,
        ) as any,

        circulationPermitExpiration: this.toDate(data.circulationPermit),
        circulationPermitStatus: this.normalizeDocumentStatus(
          data.circulationPermitStatus,
        ) as any,

        mandatoryInsuranceExpiration: this.toDate(data.insurance),
        mandatoryInsuranceStatus: this.normalizeDocumentStatus(
          data.mandatoryInsuranceStatus,
        ) as any,

        generalObservation: data.observations || data.generalObservation || null,
        status: "PENDIENTE_FIRMAS",
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
      include: this.checklistInclude(),
    });

    if (isCreatedByDriver) {
      await this.notifySelectedReviewer(created);
    } else {
      await this.notifyDriver(created);
    }

    return this.updateStatusIfCompleted(created.id);
  }

  async findMine(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);
    this.ensureTecnicoOut(user);

    if (this.isReviewer(user)) {
      return this.finished(currentUser);
    }

    return this.prisma.vehicleCheckList.findMany({
      where: {
        OR: [{ userId: user.id }, { driverUserId: user.id }],
      },
      include: this.checklistInclude(),
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findAllForSuperadmin(currentUser: any) {
  const user = await this.getLoggedUser(currentUser);
  this.ensureTecnicoOut(user);

  if (!this.isReviewer(user)) {
    throw new ForbiddenException(
      "No tienes permiso para ver todos los check list",
    );
  }

  return this.prisma.vehicleCheckList.findMany({
    include: this.checklistInclude(),
    orderBy: {
      createdAt: "desc",
    },
  });
}

  async finished(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);
    this.ensureTecnicoOut(user);

    if (this.isDriver(user)) {
      return this.prisma.vehicleCheckList.findMany({
        where: {
          OR: [{ userId: user.id }, { driverUserId: user.id }],
          status: "COMPLETADO",
        },
        include: this.checklistInclude(),
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    if (!this.isReviewer(user)) {
      throw new ForbiddenException("No tienes permiso para ver check list terminados");
    }

    return this.prisma.vehicleCheckList.findMany({
      where: {
        status: "COMPLETADO",
      },
      include: this.checklistInclude(),
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async pendingSignatures(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);
    this.ensureTecnicoOut(user);

    if (this.isDriver(user)) {
      return this.prisma.vehicleCheckList.findMany({
        where: {
          driverUserId: user.id,
          driverSignatureUrl: null,
          status: "PENDIENTE_FIRMAS",
        },
        include: this.checklistInclude(),
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    if (!this.isReviewer(user)) {
      throw new ForbiddenException("No tienes permiso para ver firmas pendientes");
    }

    const role = this.role(user);

    const where: any = {
  status: "PENDIENTE_FIRMAS",
};

    if (role === "SUPERVISOR") {
  where.supervisorUserId = user.id;
  where.supervisorSignatureUrl = null;
}

if (role === "PREVENCION") {
  where.supervisorUserId = user.id;
  where.preventionSignatureUrl = null;
}

if (role === "SUPERADMIN") {
  where.superadminSignatureUrl = null;
}

    return this.prisma.vehicleCheckList.findMany({
      where,
      include: this.checklistInclude(),
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async signChecklist(
    currentUser: any,
    id: number,
    signature?: Express.Multer.File | null,
  ) {
    const user = await this.getLoggedUser(currentUser);
    this.ensureTecnicoOut(user);

    if (!signature) {
      throw new ForbiddenException("Debes adjuntar una firma");
    }

    const check = await this.prisma.vehicleCheckList.findUnique({
      where: { id },
      include: this.checklistInclude(),
    });

    if (!check) {
      throw new NotFoundException("Check list no encontrado");
    }

    const signatureUrl = `/uploads/vehicle-checklist/${signature.filename}`;
    const now = new Date();

    if (this.isDriver(user)) {
      if (check.driverUserId !== user.id) {
        throw new ForbiddenException("Este check list no está asignado a este conductor");
      }

      if (check.driverSignatureUrl) {
        throw new ForbiddenException("Este check list ya fue firmado por el conductor");
      }

      await this.prisma.vehicleCheckList.update({
        where: { id },
        data: {
          driverSignatureUrl: signatureUrl,
          driverSignedAt: now,
          driverName: check.driverName || user.name,
        },
      });

      return this.updateStatusIfCompleted(id);
    }

    if (!this.isReviewer(user)) {
      throw new ForbiddenException("No tienes permiso para firmar este check list");
    }

    const role = this.role(user);

    if (check.createdByRole !== "CONDUCTOR") {
      throw new ForbiddenException(
        "Este check list ya fue creado por inspector. Solo falta firma del conductor.",
      );
    }

    if (check.supervisorUserId && check.supervisorUserId !== user.id) {
      throw new ForbiddenException(
        "Este check list fue asignado a otro supervisor o prevención",
      );
    }

    if (role === "SUPERVISOR") {
      if (check.supervisorSignatureUrl) {
        throw new ForbiddenException("Este check list ya fue firmado por supervisor");
      }

      await this.prisma.vehicleCheckList.update({
        where: { id },
        data: {
          supervisorSignatureUrl: signatureUrl,
          supervisorSignedAt: now,
          supervisorName: check.supervisorName || user.name,
          inspectorName: check.inspectorName || user.name,
          inspectorSignatureUrl: check.inspectorSignatureUrl || signatureUrl,
          inspectorSignedAt: check.inspectorSignedAt || now,
        },
      });

      return this.updateStatusIfCompleted(id);
    }

    if (role === "PREVENCION") {
      if (check.preventionSignatureUrl) {
        throw new ForbiddenException("Este check list ya fue firmado por prevención");
      }

      await this.prisma.vehicleCheckList.update({
        where: { id },
        data: {
          preventionSignatureUrl: signatureUrl,
          preventionSignedAt: now,
          preventionName: user.name,
        },
      });

      return this.updateStatusIfCompleted(id);
    }

    if (role === "SUPERADMIN") {
      if (check.superadminSignatureUrl) {
        throw new ForbiddenException("Este check list ya fue firmado por superadmin");
      }

      await this.prisma.vehicleCheckList.update({
        where: { id },
        data: {
          superadminSignatureUrl: signatureUrl,
          superadminSignedAt: now,
          superadminName: user.name,
        },
      });

      return this.updateStatusIfCompleted(id);
    }

    throw new ForbiddenException("No tienes permiso para firmar este check list");
  }

  async findAll() {
    return this.prisma.vehicleCheckList.findMany({
      include: this.checklistInclude(),
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findOne(id: number, currentUser?: any) {
    if (currentUser) {
      return this.canAccessChecklist(id, currentUser);
    }

    const checklist = await this.prisma.vehicleCheckList.findUnique({
      where: { id },
      include: this.checklistInclude(),
    });

    if (!checklist) {
      throw new NotFoundException("Check list no encontrado");
    }

    return checklist;
  }

  async generatePdf(id: number, res: Response, currentUser?: any) {
    const checklist = await this.findOne(id, currentUser);

    const doc = new PDFDocument({
      size: "A4",
      margin: 18,
      bufferPages: true,
    });

    const safePatent = String(checklist.patent || "sin-patente").replace(
      /[^a-zA-Z0-9-_]/g,
      "_",
    );

    const safeDriver = String(checklist.driverName || "usuario").replace(
      /[^a-zA-Z0-9-_]/g,
      "_",
    );

    const today = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");

    res.setHeader("Content-Type", "application/pdf");

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
    .save()
    .lineWidth(1.6)
    .strokeColor("#000000")
    .moveTo(x + 4, y + 4)
    .lineTo(x + w - 4, y + h - 4)
    .moveTo(x + w - 4, y + 4)
    .lineTo(x + 4, y + h - 4)
    .stroke()
    .restore();
};

    const normalizeStatus = (value: any) =>
      String(value || "").trim().toUpperCase();

    const getPhotoPath = (photo: any) => {
      const relativePath = String(photo?.imageUrl || "").replace(/^\/+/, "");
      return path.join(process.cwd(), relativePath);
    };

    const getPathFromUrl = (url: any) => {
  const relativePath = String(url || "").replace(/^\/+/, "");

  const candidates = [
    path.join(process.cwd(), relativePath),
    path.join(process.cwd(), "..", relativePath),
    path.join("/app", relativePath),
  ];

  return candidates.find((item) => fs.existsSync(item)) || candidates[0];
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

  if (!fs.existsSync(signaturePath)) {
    doc
      .font("Helvetica")
      .fontSize(6)
      .fillColor("#dc2626")
      .text("Firma no encontrada", x, yStart + 10, {
        width: w,
        align: "center",
      });
    return;
  }

  try {
    doc.image(signaturePath, x + 18, yStart + 2, {
      fit: [w - 36, h - 4],
      align: "center",
      valign: "center",
    });
  } catch {
    doc
      .font("Helvetica")
      .fontSize(6)
      .fillColor("#dc2626")
      .text("No se pudo cargar firma", x, yStart + 10, {
        width: w,
        align: "center",
      });
  }
};

    const isoLogoCandidates = [
      path.join(process.cwd(), "uploads", "branding", "sgs.png"),
      path.join(process.cwd(), "uploads", "branding", "iso.png"),
      path.join(process.cwd(), "uploads", "sgs.png"),
    ];

    const isoLogoPath = isoLogoCandidates.find((item) => fs.existsSync(item));

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
      .fontSize(18)
      .fillColor(black)
      .text("CHECK LIST VEHÍCULOS", margin + logoW, headerY + 15, {
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

    const topY = 78;
    const leftW = 260;
    const rightW = contentWidth - leftW - 10;
    const rightX = margin + leftW + 10;

    const infoRows = [
      ["Check List N°", this.text(checklist.folio)],
      ["Fecha", this.formatDate(checklist.date)],
      ["Patente", this.text(checklist.patent)],
      ["Kilometraje", this.text(checklist.mileage)],
      ["Tipo de Vehículo", this.text(checklist.vehicleType)],
      ["Modelo Vehículo", this.text(checklist.vehicleModel)],
      [
        "Mantención al día",
        this.formatMaintenance((checklist as any).maintenanceUpToDate),
      ],
      ["Padrón", this.text((checklist as any).padron)],
    ];

    let y = topY;

    infoRows.forEach(([label, value]) => {
      drawCell(margin, y, 100, 15, label, { fill: gray, bold: true });
      drawCell(margin + 100, y, leftW - 100, 15, value, {
        fontSize: 7.5,
        bold: true,
        align: "center",
      });
      y += 15;
    });

    const docHeaderH = 16;

    drawCell(rightX, topY, 122, docHeaderH, "Marque con una X", {
      bold: true,
      align: "center",
      fill: gray,
    });
    drawCell(rightX + 122, topY, 48, docHeaderH, "Fecha", {
      bold: true,
      align: "center",
      fill: gray,
    });
    drawCell(rightX + 170, topY, 33, docHeaderH, "Vigente", {
      bold: true,
      align: "center",
      fill: gray,
      fontSize: 5.5,
    });
    drawCell(rightX + 203, topY, 33, docHeaderH, "Vencida", {
      bold: true,
      align: "center",
      fill: gray,
      fontSize: 5.5,
    });
    drawCell(rightX + 236, topY, 33, docHeaderH, "N/A", {
      bold: true,
      align: "center",
      fill: gray,
      fontSize: 5.5,
    });

    const docs = [
      ["Revisión Técnica", checklist.technicalReview, (checklist as any).technicalReviewStatus],
      ["Emisión Gases Contaminantes", checklist.gasEmissionReview, (checklist as any).gasEmissionReviewStatus],
      ["Permiso Circulación", checklist.circulationPermitExpiration, (checklist as any).circulationPermitStatus],
      ["Seguro Obligatorio", checklist.mandatoryInsuranceExpiration, (checklist as any).mandatoryInsuranceStatus],
      ["Vigencia Licencia de Conducir", checklist.driverLicenseExpiration, (checklist as any).driverLicenseStatus],
    ];

    y = topY + docHeaderH;

    docs.forEach(([label, value, documentStatus]: any[]) => {
      const status = this.normalizeDocumentStatus(documentStatus);

      drawCell(rightX, y, 122, 16, label, {
        bold: true,
        align: "center",
        fontSize: 5.8,
      });
      drawCell(rightX + 122, y, 48, 16, this.formatDate(value), {
        align: "center",
      });
      drawCell(rightX + 170, y, 33, 16, "");
      drawCell(rightX + 203, y, 33, 16, "");
      drawCell(rightX + 236, y, 33, 16, "");

      if (status === "VIGENTE") drawX(rightX + 170, y, 33, 16);
      if (status === "VENCIDA") drawX(rightX + 203, y, 33, 16);
      if (status === "NO_APLICA") drawX(rightX + 236, y, 33, 16);

      y += 16;
    });

    const tableY = 208;
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
      drawCell(x + colElemento + colSmall * 2, yy, colSmall, rowH, "No aplica", {
        bold: true,
        align: "center",
        fill: gray,
        fontSize: 4.6,
      });
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

        if (status === "BUENO") drawX(x + colElemento, yy, colSmall, rowH);
        else if (status === "MALO") drawX(x + colElemento + colSmall, yy, colSmall, rowH);
        else if (status === "NO" || status === "NO APLICA" || status === "NO_APLICA") {
          drawX(x + colElemento + colSmall * 2, yy, colSmall, rowH);
        }

        yy += rowH;
      }
    };

    drawChecklistTable(margin, tableY, leftItems);
    drawChecklistTable(margin + tableW + tableGap, tableY, rightItems);

    const photos = checklist.photos || [];
    let currentY = 392;

    if (photos.length > 0) {
      drawCell(margin, currentY, contentWidth, 18, "Evidencia fotográfica de desperfecto", {
        bold: true,
        align: "center",
        fontSize: 7,
      });

      currentY += 18;

      const photosPerRow = photos.length <= 2 ? 2 : 3;
      const photoGap = 8;
      const photoW = (contentWidth - photoGap * (photosPerRow - 1)) / photosPerRow;
      const photoH = photos.length <= 2 ? 150 : 96;

      photos.forEach((photo: any, index: number) => {
        const col = index % photosPerRow;

        if (col === 0 && index > 0) {
          currentY += photoH + photoGap;
        }

        if (currentY + photoH > bottomLimit - 120) {
          doc.addPage();
          currentY = 28;

          drawCell(margin, currentY, contentWidth, 18, "Continuación registro fotográfico", {
            bold: true,
            align: "center",
            fontSize: 8,
            fill: gray,
          });

          currentY += 22;
        }

        const x = margin + col * (photoW + photoGap);

        doc.rect(x, currentY, photoW, photoH).stroke(black);
        drawPhotoClean(x, currentY, photoW, photoH, photo);
      });

      currentY += photoH + 18;
    } else {
      drawCell(margin, currentY, contentWidth, 18, "Evidencia fotográfica de desperfecto", {
        bold: true,
        align: "center",
        fontSize: 7,
      });

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
      .text(this.text(checklist.generalObservation || ""), margin + 14, currentY + 14, {
        width: contentWidth - 28,
        height: obsH - 18,
        align: "left",
      });

    currentY += obsH + 18;

    const signH = 72;
    const signW = (contentWidth - 10) / 2;

    drawCell(margin, currentY, signW, 16, "Nombre y firma Conductor:", {
      bold: true,
      align: "center",
      fill: gray,
    });

    doc.rect(margin, currentY + 16, signW, signH).stroke(black);

    drawSignatureImage(margin, currentY + 18, signW, 38, checklist.driverSignatureUrl);

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(black)
      .text(this.text(checklist.driverName || ""), margin, currentY + 58, {
        width: signW,
        align: "center",
      });

    drawCell(margin + signW + 10, currentY, signW, 16, "Nombre y firma Inspector:", {
      bold: true,
      align: "center",
      fill: gray,
    });

    doc.rect(margin + signW + 10, currentY + 16, signW, signH).stroke(black);

    drawSignatureImage(
      margin + signW + 10,
      currentY + 18,
      signW,
      38,
      (checklist as any).inspectorSignatureUrl ||
        (checklist as any).supervisorSignatureUrl ||
        (checklist as any).preventionSignatureUrl ||
        (checklist as any).superadminSignatureUrl,
    );

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(black)
      .text(
        this.text(
          (checklist as any).inspectorName ||
            checklist.supervisorName ||
            (checklist as any).preventionName ||
            (checklist as any).superadminName ||
            "",
        ),
        margin + signW + 10,
        currentY + 58,
        {
          width: signW,
          align: "center",
        },
      );

    doc.end();
  }

  async remove(id: number, currentUser?: any) {
    const user = await this.getLoggedUser(currentUser);
    this.ensureTecnicoOut(user);

    const checklist = await this.prisma.vehicleCheckList.findUnique({
      where: {
        id,
      },
    });

    if (!checklist) {
      throw new NotFoundException("Check list no encontrado");
    }

    if (!this.isSuperadmin(user)) {
      throw new ForbiddenException("Solo SUPERADMIN puede eliminar check list vehículos");
    }

    return this.prisma.vehicleCheckList.delete({
      where: {
        id,
      },
    });
  }
}