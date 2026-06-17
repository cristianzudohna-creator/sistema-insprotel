import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private onlySuperadmin(req: any) {
    if (req.user?.role !== "SUPERADMIN") {
      throw new ForbiddenException("Solo SUPERADMIN puede realizar esta acción");
    }
  }

  @Post("fcm-token")
  async saveFcmToken(@Req() req: any, @Body() body: any) {
    return this.usersService.saveFcmToken(req.user.id, body.token);
  }

  @Get("workers")
  async findWorkers() {
    return this.usersService.findWorkers();
  }

  @Get()
  async findAll(@Req() req: any) {
    this.onlySuperadmin(req);
    return this.usersService.findAll();
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    this.onlySuperadmin(req);
    return this.usersService.create(body);
  }

  @Patch(":id")
  async update(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    this.onlySuperadmin(req);
    return this.usersService.update(Number(id), body);
  }

  @Delete(":id")
  async remove(@Req() req: any, @Param("id") id: string) {
    this.onlySuperadmin(req);
    return this.usersService.remove(Number(id), req.user.id);
  }
}