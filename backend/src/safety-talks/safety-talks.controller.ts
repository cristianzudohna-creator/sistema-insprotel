import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UploadedFiles,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";

import {
  FileFieldsInterceptor,
  FileInterceptor,
} from "@nestjs/platform-express";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import type { Response } from "express";

import { diskStorage } from "multer";

import * as fs from "fs";
import * as path from "path";

import { SafetyTalksService } from "./safety-talks.service";

const uploadDir = path.join(process.cwd(), "uploads", "safety-talks");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const safetyTalkStorage = diskStorage({
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

@Controller("safety-talks")
@UseGuards(JwtAuthGuard)
export class SafetyTalksController {
  constructor(private readonly safetyTalksService: SafetyTalksService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "photos", maxCount: 10 },
        { name: "reporterSignature", maxCount: 1 },
        { name: "participantSignatures", maxCount: 25 },
      ],
      {
        storage: safetyTalkStorage,
        fileFilter: imageFileFilter,
        limits: {
          files: 36,
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
      reporterSignature?: Express.Multer.File[];
      participantSignatures?: Express.Multer.File[];
    },
  ) {
    return this.safetyTalksService.create(
      req.user,
      body,
      files?.photos || [],
      files?.reporterSignature?.[0] || null,
      files?.participantSignatures || [],
    );
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.safetyTalksService.findAll(req.user);
  }

  @Get("all")
  async findAllAdmin(@Req() req: any) {
    return this.safetyTalksService.findAllAdmin(req.user);
  }

  @Get("pending-signatures")
async pendingSignatures(@Req() req: any) {
  return this.safetyTalksService.pendingSignatures(
    req.user,
  );
}

  @Get("pending-signatures")
  async findPendingSignatures(@Req() req: any) {
    return this.safetyTalksService.findPendingSignatures(req.user);
  }

  @Get(":id")
  async findOne(@Req() req: any, @Param("id") id: string) {
    return this.safetyTalksService.findOne(req.user, Number(id));
  }

  @Get(":id/pdf")
  async previewPdf(
    @Req() req: any,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    return this.safetyTalksService.generatePdf(req.user, Number(id), res);
  }

  @Post(":id/sign")
  @UseInterceptors(
    FileInterceptor("signature", {
      storage: safetyTalkStorage,
      fileFilter: imageFileFilter,
      limits: {
        files: 1,
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async signTalk(
    @Req() req: any,
    @Param("id") id: string,
    @UploadedFile() signature: Express.Multer.File,
  ) {
    return this.safetyTalksService.signTalk(
      req.user,
      Number(id),
      signature,
    );
  }

  @Delete(":id")
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.safetyTalksService.remove(req.user, Number(id));
  }
}