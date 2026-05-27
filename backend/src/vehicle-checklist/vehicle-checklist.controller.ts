import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { diskStorage } from "multer";
import * as fs from "fs";
import * as path from "path";

import { VehicleChecklistService } from "./vehicle-checklist.service";

const uploadDir = path.join(process.cwd(), "uploads", "vehicle-checklist");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller("vehicle-checklist")
export class VehicleChecklistController {
  constructor(
    private readonly vehicleChecklistService: VehicleChecklistService,
  ) {}

  @Get("vehicles/search")
  async searchVehicles(@Query("q") q: string) {
    return this.vehicleChecklistService.searchVehicles(q || "");
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "photos", maxCount: 10 },
        { name: "driverSignature", maxCount: 1 },
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
          files: 11,
          fileSize: 10 * 1024 * 1024,
        },
      },
    ),
  )
  async create(
    @Body() body: any,
    @UploadedFiles()
    files: {
      photos?: Express.Multer.File[];
      driverSignature?: Express.Multer.File[];
    },
  ) {
    return this.vehicleChecklistService.create(
      body,
      files?.photos || [],
      files?.driverSignature?.[0] || null,
    );
  }

  @Get()
  async findAll() {
    return this.vehicleChecklistService.findAll();
  }

  @Get(":id/pdf")
  async previewPdf(@Param("id") id: string, @Res() res: Response) {
    return this.vehicleChecklistService.generatePdf(Number(id), res);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.vehicleChecklistService.remove(Number(id));
  }
}