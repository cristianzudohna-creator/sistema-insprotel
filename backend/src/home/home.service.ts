import { ForbiddenException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

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

    if (!user) {
      throw new ForbiddenException("Usuario no válido");
    }

    return user;
  }

  private canSeeAllIncidents(role: string) {
    return role === "SUPERADMIN" || role === "PREVENCION";
  }

  private canSeeAllChecks(role: string) {
    return (
      role === "SUPERADMIN" ||
      role === "PREVENCION" ||
      role === "SUPERVISOR"
    );
  }

  async getSummary(currentUser: any) {
    const user = await this.getLoggedUser(currentUser);
    const role = String(user.role || "").toUpperCase();

    const reportWhere = this.canSeeAllIncidents(role)
      ? {}
      : {
          userId: user.id,
        };

    const checkWhere = this.canSeeAllChecks(role)
      ? {}
      : {
          userId: user.id,
        };

    const [
      incidentsTotal,
      incidentsReported,
      incidentsInReview,
      incidentsSolved,

      safetyTalkPendingSignatures,
      vehicleCheckPendingSignatures,
      harnessPendingSignatures,
      ladderPendingSignatures,

      safetyTalksCompleted,
      vehicleChecksCompleted,
      harnessChecksCompleted,
      ladderChecksCompleted,
      scissorLadderChecksCompleted,
      toolsEppChecksCompleted,
      toolsDriverChecksCompleted,

      latestReports,
      latestNotifications,
    ] = await Promise.all([
      this.prisma.incidentReport.count({
        where: reportWhere,
      }),

      this.prisma.incidentReport.count({
        where: {
          ...reportWhere,
          status: "REPORTADO",
        },
      }),

      this.prisma.incidentReport.count({
        where: {
          ...reportWhere,
          status: "EN_REVISION",
        },
      }),

      this.prisma.incidentReport.count({
        where: {
          ...reportWhere,
          status: "SOLUCIONADO",
        },
      }),

      this.prisma.safetyTalk.count({
        where: {
          status: "PENDIENTE_FIRMAS",
          participants: {
            some: {
              userId: user.id,
              signatureUrl: null,
            },
          },
        },
      }),

      this.prisma.vehicleCheckList.count({
        where: {
          status: "PENDIENTE_FIRMAS",
          OR: [
            { userId: user.id },
            { driverUserId: user.id },
            { supervisorUserId: user.id },
          ],
        },
      }),

      this.prisma.harnessCheck.count({
        where: {
          ...checkWhere,
          status: "PENDIENTE",
        },
      }),

      this.prisma.ladderCheck.count({
        where: {
          ...checkWhere,
          status: "PENDIENTE",
        },
      }),

      this.prisma.safetyTalk.count({
        where: {
          status: "COMPLETADA",
        },
      }),

      this.prisma.vehicleCheckList.count({
        where: {
          ...checkWhere,
          status: "COMPLETADO",
        },
      }),

      this.prisma.harnessCheck.count({
        where: {
          ...checkWhere,
          status: "APROBADO",
        },
      }),

      this.prisma.ladderCheck.count({
        where: {
          ...checkWhere,
          status: "APROBADO",
        },
      }),

      this.prisma.scissorLadderCheck.count({
        where: {
          ...checkWhere,
          status: "APROBADO",
        },
      }),

      this.prisma.toolsEppCheck.count({
        where: {
          ...checkWhere,
          status: "APROBADO",
        },
      }),

      this.prisma.toolsDriverCheck.count({
        where: {
          ...checkWhere,
          status: "APROBADO",
        },
      }),

      this.prisma.incidentReport.findMany({
        where: reportWhere,
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          folio: true,
          eventType: true,
          category: true,
          status: true,
          vehiclePatent: true,
          createdAt: true,
        },
      }),

      this.prisma.notification.findMany({
        where: {
          userId: user.id,
        },
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          message: true,
          url: true,
          createdAt: true,
          isRead: true,
        },
      }),
    ]);

    const pendingSignatures =
      safetyTalkPendingSignatures +
      vehicleCheckPendingSignatures +
      harnessPendingSignatures +
      ladderPendingSignatures;

    const ladderTotalCompleted =
      ladderChecksCompleted + scissorLadderChecksCompleted;

    const autoInspectionsCompleted =
      toolsEppChecksCompleted + toolsDriverChecksCompleted;

    const allChecksCompleted =
      vehicleChecksCompleted +
      harnessChecksCompleted +
      ladderTotalCompleted +
      autoInspectionsCompleted;

    return {
      incidentsTotal,
      incidentsReported,
      incidentsInReview,
      incidentsSolved,

      pendingSignatures,
      safetyTalkPendingSignatures,
      vehicleCheckPendingSignatures,
      harnessPendingSignatures,
      ladderPendingSignatures,

      safetyTalksCompleted,

      vehicleChecks: vehicleChecksCompleted,
      vehicleChecksCompleted,
      harnessChecksCompleted,

      ladderChecksCompleted,
      scissorLadderChecksCompleted,
      ladderTotalCompleted,

      toolsEppChecksCompleted,
      toolsDriverChecksCompleted,
      autoInspectionsCompleted,
      allChecksCompleted,

      latestReports,
      latestNotifications,
    };
  }
}