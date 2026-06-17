import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

import { PrismaModule } from "./prisma/prisma.module";
import { VehicleChecklistModule } from "./vehicle-checklist/vehicle-checklist.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { SafetyTalksModule } from "./safety-talks/safety-talks.module";
import { HarnessCheckModule } from "./harness-check/harness-check.module";
import { LadderCheckModule } from "./ladder-check/ladder-check.module";
import { ScissorLadderCheckModule } from "./scissor-ladder-check/scissor-ladder-check.module";
import { ToolsEppCheckModule } from "./tools-epp-check/tools-epp-check.module";
import { ToolsDriverCheckModule } from "./tools-driver-check/tools-driver-check.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    VehicleChecklistModule,
    SafetyTalksModule,
    HarnessCheckModule,
    LadderCheckModule,
    ScissorLadderCheckModule,
    ToolsEppCheckModule,
    ToolsDriverCheckModule,
    NotificationsModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
