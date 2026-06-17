import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { FirebaseService } from "../firebase/firebase.service";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async create(
    userId: number,
    title: string,
    message: string,
    url?: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        url,
      },
    });

    const tokens = await this.prisma.userFcmToken.findMany({
      where: {
        userId,
      },
      select: {
        token: true,
      },
    });

    await this.firebaseService.sendToTokens(
      tokens.map((item) => item.token),
      title,
      message,
      url,
    );

    return notification;
  }

  async getMyNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async markAsRead(id: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        id,
        userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async unreadCount(userId: number) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }
}