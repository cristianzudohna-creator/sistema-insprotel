import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { diskStorage } from "multer";
import * as fs from "fs";
import * as path from "path";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { IncidentsService } from "./incidents.service";

const uploadDir = path.join(process.cwd(), "uploads", "incidents");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller("incidents")
@UseGuards(JwtAuthGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor("photos", 5, {
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
        files: 5,
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async create(
    @Req() req: any,
    @Body() body: any,
    @UploadedFiles() photos: Express.Multer.File[],
  ) {
    return this.incidentsService.create(req.user, body, photos || []);
  }

  @Get("mine")
  async findMine(@Req() req: any) {
    return this.incidentsService.findMine(req.user);
  }

  @Get("all")
  async findAll(@Req() req: any) {
    return this.incidentsService.findAll(req.user);
  }

  @Get("vehicles")
  async findVehicles() {
    return this.incidentsService.findVehicles();
  }

  @Get("supervisors")
async findSupervisors() {
  return this.incidentsService.findSupervisors();
}

  @Get(":id")
  async findOne(@Req() req: any, @Param("id") id: string) {
    return this.incidentsService.findOne(req.user, Number(id));
  }

  @Get(":id/pdf")
  async previewPdf(
    @Req() req: any,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    return this.incidentsService.generatePdf(req.user, Number(id), res);
  }

  @Patch(":id/review")
  async markAsReviewed(@Req() req: any, @Param("id") id: string) {
    return this.incidentsService.markAsReviewed(req.user, Number(id));
  }

    @Patch(":id/solve")
  async markAsSolved(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.incidentsService.markAsSolved(
      req.user,
      Number(id),
      body?.solutionDescription || "",
    );
  }

  @Delete(":id")
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.incidentsService.remove(req.user, Number(id));
  }
}