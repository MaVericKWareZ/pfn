import { Test, TestingModule } from "@nestjs/testing";
import { TimerService } from "../timer.service";

describe("TimerService", () => {
  let service: TimerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimerService],
    }).compile();

    service = module.get<TimerService>(TimerService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe("startTimer", () => {
    it("should initialize timer state", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 90, onTick, onExpired);

      const state = service.getTimerState("ROOM1");
      expect(state).toBeTruthy();
      expect(state?.remainingSeconds).toBe(90);
      expect(state?.isRunning).toBe(true);
      expect(state?.durationSeconds).toBe(90);
    });

    it("should call onTick immediately with initial duration", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 90, onTick, onExpired);

      expect(onTick).toHaveBeenCalledWith("ROOM1", 90);
    });

    it("should call onTick every second", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 5, onTick, onExpired);

      jest.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledWith("ROOM1", 4);

      jest.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledWith("ROOM1", 3);
    });

    it("should call onExpired when timer reaches zero", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 3, onTick, onExpired);

      jest.advanceTimersByTime(3000);

      expect(onExpired).toHaveBeenCalledWith("ROOM1");
      expect(onExpired).toHaveBeenCalledTimes(1);
    });

    it("should set remainingSeconds to 0 when expired", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 2, onTick, onExpired);

      jest.advanceTimersByTime(2000);

      const state = service.getTimerState("ROOM1");
      expect(state?.remainingSeconds).toBe(0);
      expect(state?.isRunning).toBe(false);
    });

    it("should stop previous timer when starting new one for same room", () => {
      const onTick1 = jest.fn();
      const onExpired1 = jest.fn();
      const onTick2 = jest.fn();
      const onExpired2 = jest.fn();

      service.startTimer("ROOM1", 10, onTick1, onExpired1);
      jest.advanceTimersByTime(2000);

      service.startTimer("ROOM1", 5, onTick2, onExpired2);
      jest.advanceTimersByTime(5000);

      expect(onExpired1).not.toHaveBeenCalled();
      expect(onExpired2).toHaveBeenCalled();
    });

    it("should handle multiple rooms independently", () => {
      const onTick1 = jest.fn();
      const onExpired1 = jest.fn();
      const onTick2 = jest.fn();
      const onExpired2 = jest.fn();

      service.startTimer("ROOM1", 3, onTick1, onExpired1);
      service.startTimer("ROOM2", 5, onTick2, onExpired2);

      jest.advanceTimersByTime(3000);

      expect(onExpired1).toHaveBeenCalled();
      expect(onExpired2).not.toHaveBeenCalled();

      jest.advanceTimersByTime(2000);

      expect(onExpired2).toHaveBeenCalled();
    });
  });

  describe("stopTimer", () => {
    it("should stop running timer", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 10, onTick, onExpired);
      jest.advanceTimersByTime(2000);

      service.stopTimer("ROOM1");
      jest.advanceTimersByTime(10000);

      expect(onExpired).not.toHaveBeenCalled();
    });

    it("should mark timer as not running", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 10, onTick, onExpired);
      service.stopTimer("ROOM1");

      const state = service.getTimerState("ROOM1");
      expect(state?.isRunning).toBe(false);
    });

    it("should handle stopping non-existent timer gracefully", () => {
      expect(() => service.stopTimer("NON_EXISTENT")).not.toThrow();
    });

    it("should preserve remaining seconds when stopped", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 10, onTick, onExpired);
      jest.advanceTimersByTime(3000);

      service.stopTimer("ROOM1");

      const state = service.getTimerState("ROOM1");
      expect(state?.remainingSeconds).toBe(7);
    });
  });

  describe("getTimerState", () => {
    it("should return null for non-existent timer", () => {
      const state = service.getTimerState("NON_EXISTENT");
      expect(state).toBeNull();
    });

    it("should return current timer state", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 90, onTick, onExpired);
      jest.advanceTimersByTime(10000);

      const state = service.getTimerState("ROOM1");
      expect(state?.roomCode).toBe("ROOM1");
      expect(state?.remainingSeconds).toBe(80);
      expect(state?.isRunning).toBe(true);
    });

    it("should reflect stopped state", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 10, onTick, onExpired);
      service.stopTimer("ROOM1");

      const state = service.getTimerState("ROOM1");
      expect(state?.isRunning).toBe(false);
    });
  });

  describe("getRemainingSeconds", () => {
    it("should return 0 for non-existent timer", () => {
      const remaining = service.getRemainingSeconds("NON_EXISTENT");
      expect(remaining).toBe(0);
    });

    it("should return remaining seconds for running timer", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 90, onTick, onExpired);
      jest.advanceTimersByTime(15000);

      const remaining = service.getRemainingSeconds("ROOM1");
      expect(remaining).toBeGreaterThanOrEqual(74);
      expect(remaining).toBeLessThanOrEqual(75);
    });

    it("should return 0 for expired timer", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 2, onTick, onExpired);
      jest.advanceTimersByTime(3000);

      const remaining = service.getRemainingSeconds("ROOM1");
      expect(remaining).toBe(0);
    });

    it("should return correct value for stopped timer", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 10, onTick, onExpired);
      jest.advanceTimersByTime(3000);
      service.stopTimer("ROOM1");

      const remaining = service.getRemainingSeconds("ROOM1");
      expect(remaining).toBe(7);
    });
  });

  describe("cleanup", () => {
    it("should stop timer and remove state", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 10, onTick, onExpired);
      service.cleanup("ROOM1");

      expect(service.getTimerState("ROOM1")).toBeNull();
    });

    it("should prevent further callbacks after cleanup", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 5, onTick, onExpired);
      const initialCallCount = onTick.mock.calls.length;

      service.cleanup("ROOM1");
      jest.advanceTimersByTime(10000);

      expect(onTick.mock.calls.length).toBe(initialCallCount);
      expect(onExpired).not.toHaveBeenCalled();
    });

    it("should handle cleanup of non-existent timer gracefully", () => {
      expect(() => service.cleanup("NON_EXISTENT")).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle very short duration (1 second)", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 1, onTick, onExpired);

      jest.advanceTimersByTime(1000);

      expect(onExpired).toHaveBeenCalled();
    });

    it("should handle zero duration", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 0, onTick, onExpired);

      jest.advanceTimersByTime(1000);

      expect(onExpired).toHaveBeenCalled();
    });

    it("should handle rapid start/stop cycles", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      for (let i = 0; i < 5; i++) {
        service.startTimer("ROOM1", 10, onTick, onExpired);
        service.stopTimer("ROOM1");
      }

      expect(() => service.getTimerState("ROOM1")).not.toThrow();
    });

    it("should maintain accuracy over multiple ticks", () => {
      const onTick = jest.fn();
      const onExpired = jest.fn();

      service.startTimer("ROOM1", 10, onTick, onExpired);

      for (let i = 9; i >= 0; i--) {
        jest.advanceTimersByTime(1000);
        if (i > 0) {
          expect(onTick).toHaveBeenCalledWith("ROOM1", i);
        }
      }

      expect(onExpired).toHaveBeenCalledTimes(1);
    });
  });

  describe("concurrent timers", () => {
    it("should handle multiple concurrent timers", () => {
      const callbacks = Array.from({ length: 5 }, () => ({
        onTick: jest.fn(),
        onExpired: jest.fn(),
      }));

      callbacks.forEach((cb, i) => {
        service.startTimer(`ROOM${i}`, 5 + i, cb.onTick, cb.onExpired);
      });

      jest.advanceTimersByTime(10000);

      callbacks.slice(0, 5).forEach((cb) => {
        expect(cb.onExpired).toHaveBeenCalled();
      });
    });

    it("should isolate timer states between rooms", () => {
      const onTick1 = jest.fn();
      const onExpired1 = jest.fn();
      const onTick2 = jest.fn();
      const onExpired2 = jest.fn();

      service.startTimer("ROOM1", 10, onTick1, onExpired1);
      service.startTimer("ROOM2", 20, onTick2, onExpired2);

      jest.advanceTimersByTime(5000);

      const state1 = service.getTimerState("ROOM1");
      const state2 = service.getTimerState("ROOM2");

      expect(state1?.remainingSeconds).toBe(5);
      expect(state2?.remainingSeconds).toBe(15);
    });
  });
});
