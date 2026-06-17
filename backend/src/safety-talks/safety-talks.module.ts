import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";

import { SafetyTalksService } from "./safety-talks.service";
import { SafetyTalksController } from "./safety-talks.controller";

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secret",
    }),
  ],
  providers: [SafetyTalksService],
  controllers: [SafetyTalksController],
})
export class SafetyTalksModule {}