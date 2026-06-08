import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { LadderCheckController } from "./ladder-check.controller";
import { LadderCheckService } from "./ladder-check.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [LadderCheckController],
  providers: [LadderCheckService],
})
export class LadderCheckModule {}