import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
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

import { ToolsDriverCheckService } from "./tools-driver-check.service";

const uploadDir = path.join(process.cwd(), "uploads", "tools-driver-check");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller("tools-driver-check")
@UseGuards(JwtAuthGuard)
export class ToolsDriverCheckController {
  constructor(
    private readonly toolsDriverCheckService: ToolsDriverCheckService,
  ) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "driverSignature", maxCount: 1 },
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
          files: 2,
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
      driverSignature?: Express.Multer.File[];
      inspectorSignature?: Express.Multer.File[];
    },
  ) {
    return this.toolsDriverCheckService.create(
      req.user,
      body,
      files?.driverSignature?.[0] || null,
      files?.inspectorSignature?.[0] || null,
    );
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.toolsDriverCheckService.findAll(req.user);
  }

  @Get("all")
  async findAllAdmin(@Req() req: any) {
    return this.toolsDriverCheckService.findAllAdmin(req.user);
  }

  @Get(":id")
  async findOne(@Req() req: any, @Param("id") id: string) {
    return this.toolsDriverCheckService.findOne(req.user, Number(id));
  }

  @Get(":id/pdf")
async previewPdf(
  @Req() req: any,
  @Param("id") id: string,
  @Query("download") download: string,
  @Res() res: Response,
) {
  return this.toolsDriverCheckService.generatePdf(
    req.user,
    Number(id),
    res,
    download === "true",
  );
}

  @Delete(":id")
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.toolsDriverCheckService.remove(req.user, Number(id));
  }
}