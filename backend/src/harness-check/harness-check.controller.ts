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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from "@nestjs/platform-express";
import type { Response } from "express";
import { diskStorage } from "multer";
import * as fs from "fs";
import * as path from "path";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { HarnessCheckService } from "./harness-check.service";

const uploadDir = path.join(process.cwd(), "uploads", "harness-check");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller("harness-check")
@UseGuards(JwtAuthGuard)
export class HarnessCheckController {
  constructor(private readonly harnessCheckService: HarnessCheckService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "technicianSignature", maxCount: 1 },
        { name: "supervisorSignature", maxCount: 1 },
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
      technicianSignature?: Express.Multer.File[];
      supervisorSignature?: Express.Multer.File[];
    },
  ) {
    return this.harnessCheckService.create(
      req.user,
      body,
      files?.technicianSignature?.[0] || null,
      files?.supervisorSignature?.[0] || null,
    );
  }

  @Get()
  async findMine(@Req() req: any) {
    return this.harnessCheckService.findMine(req.user);
  }

  @Get("all")
  async findAllForSuperadmin(@Req() req: any) {
    return this.harnessCheckService.findAllForSuperadmin(req.user);
  }

  @Get("pending-signatures")
async pendingSignatures(@Req() req: any) {
  return this.harnessCheckService.pendingSignatures(req.user);
}

@Post(":id/sign-supervisor")
@UseInterceptors(
  FileInterceptor("signature", {
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
      files: 1,
      fileSize: 10 * 1024 * 1024,
    },
  }),
)
async signSupervisor(
  @Req() req: any,
  @Param("id") id: string,
  @UploadedFile() signature: Express.Multer.File,
) {
  return this.harnessCheckService.signSupervisor(
    req.user,
    Number(id),
    signature,
  );
}

@Get("finished")
async finished(@Req() req: any) {
  return this.harnessCheckService.finished(req.user);
}

  @Get(":id")
  async findOne(@Req() req: any, @Param("id") id: string) {
    return this.harnessCheckService.findOne(req.user, Number(id));
  }

  @Get(":id/pdf")
  async previewPdf(
    @Req() req: any,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    return this.harnessCheckService.generatePdf(req.user, Number(id), res);
  }

  @Delete(":id")
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.harnessCheckService.remove(req.user, Number(id));
  }
}