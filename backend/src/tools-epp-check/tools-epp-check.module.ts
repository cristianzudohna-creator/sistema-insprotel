import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { ToolsEppCheckController } from "./tools-epp-check.controller";
import { ToolsEppCheckService } from "./tools-epp-check.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [ToolsEppCheckController],
  providers: [ToolsEppCheckService],
})
export class ToolsEppCheckModule {}