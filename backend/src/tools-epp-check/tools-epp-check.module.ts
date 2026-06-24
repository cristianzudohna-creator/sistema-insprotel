import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { ToolsEppCheckController } from "./tools-epp-check.controller";
import { ToolsEppCheckService } from "./tools-epp-check.service";

import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    JwtModule.register({}),
    PrismaModule,
    NotificationsModule,
  ],
  controllers: [ToolsEppCheckController],
  providers: [ToolsEppCheckService],
})
export class ToolsEppCheckModule {}