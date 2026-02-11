import { Injectable } from "@nestjs/common";
import { RoomCode } from "../domain/types";

export interface TimerState {
  roomCode: RoomCode;
  remainingSeconds: number;
  isRunning: boolean;
  startedAt: number;
  durationSeconds: number;
}

export type TimerTickCallback = (
  roomCode: RoomCode,
  remainingSeconds: number,
) => void;
export type TimerExpiredCallback = (roomCode: RoomCode) => void;
export type TimerWarningCallback = (
  roomCode: RoomCode,
  remainingSeconds: number,
) => void;

export interface ITimerService {
  startTimer(
    roomCode: RoomCode,
    durationSeconds: number,
    onTick: TimerTickCallback,
    onExpired: TimerExpiredCallback,
    onWarning?: TimerWarningCallback,
  ): void;
  stopTimer(roomCode: RoomCode): void;
  getTimerState(roomCode: RoomCode): TimerState | null;
}

@Injectable()
export class TimerService implements ITimerService {
  private timers: Map<RoomCode, NodeJS.Timeout> = new Map();
  private timerStates: Map<RoomCode, TimerState> = new Map();

  startTimer(
    roomCode: RoomCode,
    durationSeconds: number,
    onTick: TimerTickCallback,
    onExpired: TimerExpiredCallback,
    onWarning?: TimerWarningCallback,
  ): void {
    this.stopTimer(roomCode);

    const state: TimerState = {
      roomCode,
      remainingSeconds: durationSeconds,
      isRunning: true,
      startedAt: Date.now(),
      durationSeconds,
    };

    this.timerStates.set(roomCode, state);
    let warningEmitted = false;

    const interval = setInterval(() => {
      const currentState = this.timerStates.get(roomCode);
      if (!currentState || !currentState.isRunning) {
        clearInterval(interval);
        this.timers.delete(roomCode);
        return;
      }

      currentState.remainingSeconds--;

      if (currentState.remainingSeconds <= 0) {
        currentState.remainingSeconds = 0;
        currentState.isRunning = false;
        clearInterval(interval);
        this.timers.delete(roomCode);
        onExpired(roomCode);
      } else {
        onTick(roomCode, currentState.remainingSeconds);

        if (
          currentState.remainingSeconds === 10 &&
          !warningEmitted &&
          onWarning
        ) {
          warningEmitted = true;
          onWarning(roomCode, currentState.remainingSeconds);
        }
      }
    }, 1000);

    this.timers.set(roomCode, interval);

    onTick(roomCode, durationSeconds);
  }

  stopTimer(roomCode: RoomCode): void {
    const timer = this.timers.get(roomCode);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(roomCode);
    }

    const state = this.timerStates.get(roomCode);
    if (state) {
      state.isRunning = false;
    }
  }

  getTimerState(roomCode: RoomCode): TimerState | null {
    return this.timerStates.get(roomCode) ?? null;
  }

  getRemainingSeconds(roomCode: RoomCode): number {
    const state = this.timerStates.get(roomCode);
    if (!state) return 0;

    if (!state.isRunning) {
      return state.remainingSeconds;
    }

    const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    return Math.max(0, state.durationSeconds - elapsed);
  }

  cleanup(roomCode: RoomCode): void {
    this.stopTimer(roomCode);
    this.timerStates.delete(roomCode);
  }
}
