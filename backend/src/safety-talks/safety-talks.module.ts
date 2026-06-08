import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";

import { SafetyTalksService } from "./safety-talks.service";
import { SafetyTalksController } from "./safety-talks.controller";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secret",
    }),
  ],
  providers: [SafetyTalksService],
  controllers: [SafetyTalksController],
})
export class SafetyTalksModule {}