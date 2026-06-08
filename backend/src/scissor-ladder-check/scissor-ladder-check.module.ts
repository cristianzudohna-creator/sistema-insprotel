import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { ScissorLadderCheckController } from "./scissor-ladder-check.controller";
import { ScissorLadderCheckService } from "./scissor-ladder-check.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [ScissorLadderCheckController],
  providers: [ScissorLadderCheckService],
})
export class ScissorLadderCheckModule {}