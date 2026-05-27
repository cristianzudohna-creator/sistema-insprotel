import { Module } from '@nestjs/common';
import { VehicleChecklistService } from './vehicle-checklist.service';
import { VehicleChecklistController } from './vehicle-checklist.controller';

@Module({
  providers: [VehicleChecklistService],
  controllers: [VehicleChecklistController]
})
export class VehicleChecklistModule {}
