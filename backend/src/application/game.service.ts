import { Injectable } from "@nestjs/common";
import { RoomService, Room } from "./room.service";
import { TimerService } from "./timer.service";
import {
  TurnEndReason,
  GameState,
  Turn,
  Card,
  GameSummary,
} from "../domain/types";

export interface TurnScoreResult {
  points: number;
  totalScore: number;
  teamId: string;
  previousCard: Card | null;
  newCard: Card | null;
  poetId: string | null;
}

export interface TurnStartResult {
  turn: Turn;
  timerDuration: number;
}

export interface TurnEndResult {
  turn: Turn;
  teamId: string;
  teamScore: number;
}

export interface IGameService {
  startTurn(roomCode: string): TurnStartResult;
  handleCorrectEasy(roomCode: string): TurnScoreResult;
  handleCorrectHard(roomCode: string): TurnScoreResult;
  handleSkipOrNo(roomCode: string): TurnScoreResult;
  handleTimerExpired(roomCode: string): TurnEndResult | null;
  endGameManually(roomCode: string, playerId: string): GameSummary;
  isGameOver(roomCode: string): boolean;
  getGameSummary(roomCode: string): GameSummary;
}

@Injectable()
export class GameService implements IGameService {
  constructor(
    private readonly roomService: RoomService,
    private readonly timerService: TimerService,
  ) {}

  startTurn(roomCode: string): TurnStartResult {
    const room = this.getValidGameRoom(roomCode);
    const turn = room.gameEngine!.startTurn();

    return {
      turn,
      timerDuration: room.config.turnDurationSeconds,
    };
  }

  handleCorrectEasy(roomCode: string): TurnScoreResult {
    const room = this.getValidGameRoom(roomCode);
    const previousCard = room.gameEngine!.getState().currentTurn?.currentCard ?? null;
    const points = room.gameEngine!.markEasyWordGuessed();
    return this.buildScoreResult(room, points, previousCard);
  }

  handleCorrectHard(roomCode: string): TurnScoreResult {
    const room = this.getValidGameRoom(roomCode);
    const previousCard = room.gameEngine!.getState().currentTurn?.currentCard ?? null;
    const points = room.gameEngine!.markHardPhraseGuessed();
    return this.buildScoreResult(room, points, previousCard);
  }

  handleSkipOrNo(roomCode: string): TurnScoreResult {
    const room = this.getValidGameRoom(roomCode);
    const previousCard = room.gameEngine!.getState().currentTurn?.currentCard ?? null;
    const { points, newCard } = room.gameEngine!.skipCard();
    const state = room.gameEngine!.getState();
    const team = state.teams.find((t) => t.id === state.currentTurn?.teamId);

    return {
      points,
      totalScore: team?.score ?? 0,
      teamId: state.currentTurn?.teamId ?? "",
      previousCard,
      newCard,
      poetId: state.currentTurn?.poetId ?? null,
    };
  }

  handleTimerExpired(roomCode: string): TurnEndResult | null {
    const room = this.roomService.getRoom(roomCode);
    if (!room || !room.gameEngine) return null;

    const state = room.gameEngine.getState();
    if (state.state !== GameState.TURN_ACTIVE) return null;

    const turn = room.gameEngine.endTurn(TurnEndReason.TIME_UP);
    const team = room.teams.find((t) => t.id === turn.teamId);

    return {
      turn,
      teamId: turn.teamId,
      teamScore: team?.score ?? 0,
    };
  }

  endGameManually(roomCode: string, playerId: string): GameSummary {
    const room = this.getValidGameRoom(roomCode);

    if (room.hostId !== playerId) {
      throw new Error("Only host can end the game");
    }

    if (!room.gameEngine!.canEndGameManually()) {
      throw new Error(
        "Cannot end game yet. All teams must complete equal number of turns.",
      );
    }

    room.gameEngine!.endGameManually();
    this.timerService.cleanup(roomCode);

    return room.gameEngine!.getGameSummary();
  }

  isGameOver(roomCode: string): boolean {
    const room = this.roomService.getRoom(roomCode);
    if (!room || !room.gameEngine) return false;
    return room.gameEngine.getState().state === GameState.GAME_OVER;
  }

  getGameSummary(roomCode: string): GameSummary {
    const room = this.getValidGameRoom(roomCode);
    return room.gameEngine!.getGameSummary();
  }

  private getValidGameRoom(roomCode: string): Room {
    const room = this.roomService.getRoom(roomCode);
    if (!room || !room.gameEngine) {
      throw new Error("Game not found");
    }
    return room;
  }

  private buildScoreResult(
    room: Room,
    points: number,
    previousCard: Card | null,
  ): TurnScoreResult {
    const state = room.gameEngine!.getState();
    const team = state.teams.find((t) => t.id === state.currentTurn?.teamId);

    return {
      points,
      totalScore: team?.score ?? 0,
      teamId: state.currentTurn?.teamId ?? "",
      previousCard,
      newCard: state.currentTurn?.currentCard ?? null,
      poetId: state.currentTurn?.poetId ?? null,
    };
  }
}
