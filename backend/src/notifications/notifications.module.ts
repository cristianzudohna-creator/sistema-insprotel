import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";

import { PrismaModule } from "../prisma/prisma.module";
import { FirebaseModule } from "../firebase/firebase.module";

@Module({
  imports: [
    PrismaModule,
    FirebaseModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET || "insprotel_secret_dev",
    }),
  ],

  controllers: [NotificationsController],

  providers: [NotificationsService],

  exports: [NotificationsService],
})
export class NotificationsModule {}