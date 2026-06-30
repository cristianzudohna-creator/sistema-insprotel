import {
  Controller,
  Get,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { HomeService } from "./home.service";

@Controller("home")
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(
    private readonly homeService: HomeService,
  ) {}

  @Get("summary")
  async getSummary(@Req() req: any) {
    return this.homeService.getSummary(req.user);
  }
}