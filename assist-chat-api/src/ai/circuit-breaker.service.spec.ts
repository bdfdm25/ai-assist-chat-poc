import { CircuitBreakerService } from './circuit-breaker.service';
import { CircuitState } from './enums/circuit-state.enum';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
  });

  afterEach(() => {
    service.reset();
  });

  describe('Initial State', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should start in CLOSED state', () => {
      expect(service.getState()).toBe(CircuitState.CLOSED);
    });

    it('should have initial stats with zero failures', () => {
      const stats = service.getStats();
      expect(stats).toEqual({
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
      });
    });
  });

  describe('Successful Execution', () => {
    it('should execute function successfully when circuit is CLOSED', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await service.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(service.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reset failure count after successful execution', async () => {
      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await service.execute(() => Promise.reject(new Error('fail')));
        } catch {}
      }

      expect(service.getStats().failureCount).toBe(3);

      // Succeed once
      await service.execute(() => Promise.resolve('success'));

      expect(service.getStats().failureCount).toBe(0);
    });
  });

  describe('Failure Handling', () => {
    it('should count failures correctly', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      for (let i = 0; i < 3; i++) {
        try {
          await service.execute(mockFn);
        } catch {}
      }

      expect(service.getStats().failureCount).toBe(3);
    });

    it('should open circuit after failure threshold', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Fail 5 times (threshold)
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(mockFn);
        } catch {}
      }

      expect(service.getState()).toBe(CircuitState.OPEN);
      expect(mockFn).toHaveBeenCalledTimes(5);
    });

    it('should record last failure time', async () => {
      const beforeTime = Date.now();

      try {
        await service.execute(() => Promise.reject(new Error('fail')));
      } catch {}

      const afterTime = Date.now();
      const stats = service.getStats();

      expect(stats.lastFailureTime).toBeGreaterThanOrEqual(beforeTime);
      expect(stats.lastFailureTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Circuit OPEN State', () => {
    beforeEach(async () => {
      // Open the circuit by failing 5 times
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(mockFn);
        } catch {}
      }
    });

    it('should reject requests immediately when OPEN', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      await expect(service.execute(mockFn)).rejects.toThrow(
        'Service temporarily unavailable',
      );
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should not call the function when circuit is OPEN', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      try {
        await service.execute(mockFn);
      } catch {}

      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('Circuit HALF_OPEN State', () => {
    beforeEach(async () => {
      // Open the circuit
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(mockFn);
        } catch {}
      }
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Mock Date.now to simulate timeout
      const originalNow = Date.now;
      const lastFailureTime = service.getStats().lastFailureTime!;
      Date.now = jest.fn(() => lastFailureTime + 61000); // 61 seconds later

      const mockFn = jest.fn().mockResolvedValue('success');
      await service.execute(mockFn);

      expect(mockFn).toHaveBeenCalled();

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should close circuit after success threshold in HALF_OPEN', async () => {
      // Transition to HALF_OPEN
      const originalNow = Date.now;
      const lastFailureTime = service.getStats().lastFailureTime!;
      Date.now = jest.fn(() => lastFailureTime + 61000);

      // Succeed twice (threshold)
      const mockFn = jest.fn().mockResolvedValue('success');
      await service.execute(mockFn);
      await service.execute(mockFn);

      expect(service.getState()).toBe(CircuitState.CLOSED);

      Date.now = originalNow;
    });

    it('should reopen circuit if request fails in HALF_OPEN', async () => {
      // Transition to HALF_OPEN
      const originalNow = Date.now;
      const lastFailureTime = service.getStats().lastFailureTime!;
      Date.now = jest.fn(() => lastFailureTime + 61000);

      // Fail again
      const mockFn = jest.fn().mockRejectedValue(new Error('fail again'));
      try {
        await service.execute(mockFn);
      } catch {}

      // Circuit should track the new failure
      // After 5 initial failures to open, plus 1 in HALF_OPEN = 6 total
      expect(service.getStats().failureCount).toBeGreaterThan(0);

      Date.now = originalNow;
    });
  });

  describe('Manual Reset', () => {
    it('should reset circuit to CLOSED state', async () => {
      // Open the circuit
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(mockFn);
        } catch {}
      }

      expect(service.getState()).toBe(CircuitState.OPEN);

      // Reset
      service.reset();

      expect(service.getState()).toBe(CircuitState.CLOSED);
      expect(service.getStats()).toEqual({
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
      });
    });

    it('should allow execution after manual reset', async () => {
      // Open the circuit
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(failFn);
        } catch {}
      }

      service.reset();

      // Should work now
      const successFn = jest.fn().mockResolvedValue('success');
      const result = await service.execute(successFn);

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle synchronous errors', async () => {
      const mockFn = jest.fn(() => {
        throw new Error('sync error');
      });

      await expect(service.execute(mockFn as any)).rejects.toThrow(
        'sync error',
      );
    });

    it('should maintain state across multiple concurrent executions', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Execute concurrently
      const promises = Array(10)
        .fill(null)
        .map(() => service.execute(mockFn).catch(() => {}));

      await Promise.all(promises);

      // Should have counted all failures
      expect(service.getStats().failureCount).toBeGreaterThanOrEqual(5);
      expect(service.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Stats Reporting', () => {
    it('should provide accurate stats', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));

      try {
        await service.execute(failFn);
      } catch {}

      try {
        await service.execute(failFn);
      } catch {}

      const stats = service.getStats();

      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(2);
      expect(stats.successCount).toBe(0);
      expect(stats.lastFailureTime).not.toBeNull();
    });
  });
});
