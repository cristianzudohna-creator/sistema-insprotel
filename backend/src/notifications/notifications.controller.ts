import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async myNotifications(@Req() req: any) {
    return this.notificationsService.getMyNotifications(req.user.id);
  }

  @Get("unread-count")
  async unreadCount(@Req() req: any) {
    const count = await this.notificationsService.unreadCount(req.user.id);

    return { count };
  }

  @Patch(":id/read")
  async markAsRead(@Param("id", ParseIntPipe) id: number, @Req() req: any) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch("read-all")
  async markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }
}