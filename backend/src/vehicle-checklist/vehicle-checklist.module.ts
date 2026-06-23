import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";

import { VehicleChecklistController } from "./vehicle-checklist.controller";
import { VehicleChecklistService } from "./vehicle-checklist.service";

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secret",
    }),
  ],
  controllers: [VehicleChecklistController],
  providers: [VehicleChecklistService],
})
export class VehicleChecklistModule {}
