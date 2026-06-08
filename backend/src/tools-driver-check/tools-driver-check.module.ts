import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { ToolsDriverCheckController } from "./tools-driver-check.controller";
import { ToolsDriverCheckService } from "./tools-driver-check.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [ToolsDriverCheckController],
  providers: [ToolsDriverCheckService],
})
export class ToolsDriverCheckModule {}