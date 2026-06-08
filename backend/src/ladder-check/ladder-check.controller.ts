import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";

import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import type { Response } from "express";

import { diskStorage } from "multer";

import * as fs from "fs";
import * as path from "path";

import { LadderCheckService } from "./ladder-check.service";

const uploadDir = path.join(process.cwd(), "uploads", "ladder-check");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller("ladder-check")
@UseGuards(JwtAuthGuard)
export class LadderCheckController {
  constructor(private readonly ladderCheckService: LadderCheckService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "photos", maxCount: 2 },
        { name: "technicianSignature", maxCount: 1 },
        { name: "inspectorSignature", maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: uploadDir,

          filename: (_req, file, callback) => {
            const uniqueName = `${Date.now()}-${Math.round(
              Math.random() * 1e9,
            )}${path.extname(file.originalname)}`;

            callback(null, uniqueName);
          },
        }),

        fileFilter: (_req, file, callback) => {
          if (!file.mimetype.startsWith("image/")) {
            return callback(new Error("Solo se permiten imágenes"), false);
          }

          callback(null, true);
        },

        limits: {
          files: 4,
          fileSize: 10 * 1024 * 1024,
        },
      },
    ),
  )
  async create(
    @Req() req: any,
    @Body() body: any,
    @UploadedFiles()
    files: {
      photos?: Express.Multer.File[];
      technicianSignature?: Express.Multer.File[];
      inspectorSignature?: Express.Multer.File[];
    },
  ) {
    return this.ladderCheckService.create(
      req.user,
      body,
      files?.photos || [],
      files?.technicianSignature?.[0] || null,
      files?.inspectorSignature?.[0] || null,
    );
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.ladderCheckService.findAll(req.user);
  }

  @Get("all")
  async findAllAdmin(@Req() req: any) {
    return this.ladderCheckService.findAllAdmin(req.user);
  }

  @Get(":id")
  async findOne(@Req() req: any, @Param("id") id: string) {
    return this.ladderCheckService.findOne(req.user, Number(id));
  }

  @Get(":id/pdf")
  async previewPdf(
    @Req() req: any,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    return this.ladderCheckService.generatePdf(req.user, Number(id), res);
  }

  @Delete(":id")
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.ladderCheckService.remove(req.user, Number(id));
  }
}