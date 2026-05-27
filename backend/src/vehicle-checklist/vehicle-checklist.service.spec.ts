import { Test, TestingModule } from '@nestjs/testing';
import { VehicleChecklistService } from './vehicle-checklist.service';

describe('VehicleChecklistService', () => {
  let service: VehicleChecklistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VehicleChecklistService],
    }).compile();

    service = module.get<VehicleChecklistService>(VehicleChecklistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
