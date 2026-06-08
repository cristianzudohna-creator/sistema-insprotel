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

import { ToolsEppCheckService } from "./tools-epp-check.service";

const uploadDir = path.join(process.cwd(), "uploads", "tools-epp-check");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller("tools-epp-check")
@UseGuards(JwtAuthGuard)
export class ToolsEppCheckController {
  constructor(
    private readonly toolsEppCheckService: ToolsEppCheckService,
  ) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
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
            return callback(new Error("Solo imágenes"), false);
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
      technicianSignature?: Express.Multer.File[];
      inspectorSignature?: Express.Multer.File[];
    },
  ) {
    return this.toolsEppCheckService.create(
      req.user,
      body,
      files?.technicianSignature?.[0] || null,
      files?.inspectorSignature?.[0] || null,
    );
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.toolsEppCheckService.findAll(req.user);
  }

  @Get("all")
  async findAllAdmin(@Req() req: any) {
    return this.toolsEppCheckService.findAllAdmin(req.user);
  }

  @Get(":id")
  async findOne(@Req() req: any, @Param("id") id: string) {
    return this.toolsEppCheckService.findOne(req.user, Number(id));
  }

  @Get(":id/pdf")
  async previewPdf(
    @Req() req: any,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    return this.toolsEppCheckService.generatePdf(
      req.user,
      Number(id),
      res,
    );
  }

  @Delete(":id")
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.toolsEppCheckService.remove(
      req.user,
      Number(id),
    );
  }
}