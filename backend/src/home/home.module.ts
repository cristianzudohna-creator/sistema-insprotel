import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { HomeController } from "./home.controller";
import { HomeService } from "./home.service";

import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "insprotel_secret_dev",
    }),
  ],

  controllers: [HomeController],

  providers: [HomeService],
})
export class HomeModule {}