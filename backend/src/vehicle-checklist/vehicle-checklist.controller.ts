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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from "@nestjs/platform-express";
import type { Request, Response } from "express";
import { diskStorage } from "multer";
import * as fs from "fs";
import * as path from "path";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { VehicleChecklistService } from "./vehicle-checklist.service";

const uploadDir = path.join(process.cwd(), "uploads", "vehicle-checklist");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const imageStorage = diskStorage({
  destination: uploadDir,
  filename: (_req, file, callback) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${path.extname(file.originalname)}`;

    callback(null, uniqueName);
  },
});

const imageFileFilter = (_req: any, file: Express.Multer.File, callback: any) => {
  if (!file.mimetype.startsWith("image/")) {
    return callback(new Error("Solo se permiten imágenes"), false);
  }

  callback(null, true);
};

@Controller("vehicle-checklist")
@UseGuards(JwtAuthGuard)
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
        { name: "inspectorSignature", maxCount: 1 },
      ],
      {
        storage: imageStorage,
        fileFilter: imageFileFilter,
        limits: {
          files: 12,
          fileSize: 10 * 1024 * 1024,
        },
      },
    ),
  )
  async create(
    @Req() req: Request,
    @Body() body: any,
    @UploadedFiles()
    files: {
      photos?: Express.Multer.File[];
      driverSignature?: Express.Multer.File[];
      inspectorSignature?: Express.Multer.File[];
    },
  ) {
    return this.vehicleChecklistService.create(
      body,
      files?.photos || [],
      files?.driverSignature?.[0] || null,
      files?.inspectorSignature?.[0] || null,
      req.user,
    );
  }

  @Get()
  async findMine(@Req() req: Request) {
    return this.vehicleChecklistService.findMine(req.user);
  }

  @Get("all")
  async findAllForSuperadmin(@Req() req: Request) {
    return this.vehicleChecklistService.findAllForSuperadmin(req.user);
  }

  @Get("finished")
  async finished(@Req() req: Request) {
    return this.vehicleChecklistService.finished(req.user);
  }

  @Get("pending-signatures")
  async pendingSignatures(@Req() req: Request) {
    return this.vehicleChecklistService.pendingSignatures(req.user);
  }

  @Post(":id/sign")
  @UseInterceptors(
    FileInterceptor("signature", {
      storage: imageStorage,
      fileFilter: imageFileFilter,
      limits: {
        files: 1,
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async sign(
    @Req() req: Request,
    @Param("id") id: string,
    @UploadedFile() signature?: Express.Multer.File,
  ) {
    return this.vehicleChecklistService.signChecklist(
      req.user,
      Number(id),
      signature || null,
    );
  }

  @Get(":id/pdf")
  async previewPdf(
    @Req() req: Request,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    return this.vehicleChecklistService.generatePdf(Number(id), res, req.user);
  }

  @Delete(":id")
  async remove(@Req() req: Request, @Param("id") id: string) {
    return this.vehicleChecklistService.remove(Number(id), req.user);
  }
}