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

import { ScissorLadderCheckService } from "./scissor-ladder-check.service";

const uploadDir = path.join(process.cwd(), "uploads", "scissor-ladder-check");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller("scissor-ladder-check")
@UseGuards(JwtAuthGuard)
export class ScissorLadderCheckController {
  constructor(
    private readonly scissorLadderCheckService: ScissorLadderCheckService,
  ) {}

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
    return this.scissorLadderCheckService.create(
      req.user,
      body,
      files?.photos || [],
      files?.technicianSignature?.[0] || null,
      files?.inspectorSignature?.[0] || null,
    );
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.scissorLadderCheckService.findAll(req.user);
  }

  @Get("all")
  async findAllAdmin(@Req() req: any) {
    return this.scissorLadderCheckService.findAllAdmin(req.user);
  }

  @Get(":id")
  async findOne(@Req() req: any, @Param("id") id: string) {
    return this.scissorLadderCheckService.findOne(req.user, Number(id));
  }

  @Get(":id/pdf")
  async previewPdf(
    @Req() req: any,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    return this.scissorLadderCheckService.generatePdf(
      req.user,
      Number(id),
      res,
    );
  }

  @Delete(":id")
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.scissorLadderCheckService.remove(req.user, Number(id));
  }
}