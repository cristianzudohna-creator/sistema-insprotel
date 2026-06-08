import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";

import { HarnessCheckController } from "./harness-check.controller";
import { HarnessCheckService } from "./harness-check.service";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secret",
    }),
  ],
  controllers: [HarnessCheckController],
  providers: [HarnessCheckService],
})
export class HarnessCheckModule {}