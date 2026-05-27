import { Test, TestingModule } from '@nestjs/testing';
import { VehicleChecklistController } from './vehicle-checklist.controller';

describe('VehicleChecklistController', () => {
  let controller: VehicleChecklistController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleChecklistController],
    }).compile();

    controller = module.get<VehicleChecklistController>(VehicleChecklistController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
