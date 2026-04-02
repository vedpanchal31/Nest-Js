import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';

describe('HealthController - Comprehensive', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check - Health Check Endpoint', () => {
    it('should return status ok', () => {
      const result = controller.check();

      expect(result.status).toBe('ok');
    });

    it('should return ISO timestamp', () => {
      const result = controller.check();

      expect(result.timestamp).toBeDefined();
      // Verify it's a valid ISO string
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should return current timestamp', () => {
      const before = Date.now();
      const result = controller.check();
      const after = Date.now();

      const resultTimestamp = new Date(result.timestamp).getTime();
      expect(resultTimestamp).toBeGreaterThanOrEqual(before);
      expect(resultTimestamp).toBeLessThanOrEqual(after);
    });

    it('should return object with status and timestamp', () => {
      const result = controller.check();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(Object.keys(result)).toHaveLength(2);
    });
  });
});
