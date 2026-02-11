import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { RoomService } from "../application/room.service";
import { TimerService } from "../application/timer.service";
import { GameService } from "../application/game.service";
import { GameState, PlayerRole } from "../domain/types";
import {
  ClientEvent,
  ServerEvent,
  RoomCreatePayload,
  RoomJoinPayload,
  TeamAssignPayload,
  TeamShufflePayload,
  GameStartPayload,
  GameEndPayload,
  TurnActionPayload,
  PlayerReconnectPayload,
  RoomStateResponse,
  GameStateResponse,
  PlayerInfo,
  TeamInfo,
  TurnInfo,
} from "./events";

@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private socketToPlayer: Map<string, { roomCode: string; playerId: string }> =
    new Map();

  constructor(
    private readonly roomService: RoomService,
    private readonly timerService: TimerService,
    private readonly gameService: GameService,
  ) {}

  handleConnection(client: Socket): void {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected: ${client.id}`);
    const mapping = this.socketToPlayer.get(client.id);
    if (mapping) {
      this.roomService.markPlayerDisconnected(
        mapping.roomCode,
        mapping.playerId,
      );
      this.server.to(mapping.roomCode).emit(ServerEvent.PLAYER_DISCONNECTED, {
        playerId: mapping.playerId,
      });
      this.socketToPlayer.delete(client.id);
    }
  }

  @SubscribeMessage(ClientEvent.ROOM_CREATE)
  handleRoomCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomCreatePayload,
  ): void {
    console.log(
      `[ROOM_CREATE] Received from client ${client.id}, playerName: ${payload.playerName}`,
    );
    try {
      const { room, playerId } = this.roomService.createRoom(
        payload.playerName,
      );
      console.log(
        `[ROOM_CREATE] Room created: ${room.code}, playerId: ${playerId}`,
      );

      client.join(room.code);
      this.socketToPlayer.set(client.id, { roomCode: room.code, playerId });

      client.emit(ServerEvent.ROOM_CREATED, {
        roomCode: room.code,
        playerId,
      });

      const roomStateResponse: RoomStateResponse = {
        code: room.code,
        hostId: room.hostId,
        players: Array.from(room.players.values()).map((p) =>
          this.toPlayerInfo(p),
        ),
        teams: room.teams.map((t) => this.toTeamInfo(t)),
        gameState: room.gameState,
      };
      client.emit(ServerEvent.ROOM_STATE, roomStateResponse);
    } catch (error) {
      client.emit(ServerEvent.ROOM_ERROR, {
        message:
          error instanceof Error ? error.message : "Failed to create room",
      });
    }
  }

  @SubscribeMessage(ClientEvent.ROOM_JOIN)
  handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomJoinPayload,
  ): void {
    try {
      const { room, playerId } = this.roomService.joinRoom(
        payload.roomCode,
        payload.playerName,
      );

      client.join(room.code);
      this.socketToPlayer.set(client.id, { roomCode: room.code, playerId });

      client.emit(ServerEvent.ROOM_JOINED, {
        roomCode: room.code,
        playerId,
      });

      const player = room.players.get(playerId);
      this.server.to(room.code).emit(ServerEvent.PLAYER_JOINED, {
        player: this.toPlayerInfo(player!),
      });

      this.emitRoomState(room.code);
    } catch (error) {
      client.emit(ServerEvent.ROOM_ERROR, {
        message: error instanceof Error ? error.message : "Failed to join room",
      });
    }
  }

  @SubscribeMessage(ClientEvent.ROOM_LEAVE)
  handleRoomLeave(@ConnectedSocket() client: Socket): void {
    const mapping = this.socketToPlayer.get(client.id);
    if (!mapping) return;

    const room = this.roomService.leaveRoom(mapping.roomCode, mapping.playerId);

    this.server.to(mapping.roomCode).emit(ServerEvent.PLAYER_LEFT, {
      playerId: mapping.playerId,
    });

    client.leave(mapping.roomCode);
    this.socketToPlayer.delete(client.id);

    if (room) {
      this.emitRoomState(mapping.roomCode);
    }
  }

  @SubscribeMessage(ClientEvent.TEAM_ASSIGN)
  handleTeamAssign(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TeamAssignPayload,
  ): void {
    try {
      this.roomService.assignTeam(
        payload.roomCode,
        payload.playerId,
        payload.teamId,
      );
      this.emitRoomState(payload.roomCode);
    } catch (error) {
      client.emit(ServerEvent.ROOM_ERROR, {
        message:
          error instanceof Error ? error.message : "Failed to assign team",
      });
    }
  }

  @SubscribeMessage(ClientEvent.TEAM_SHUFFLE)
  handleTeamShuffle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TeamShufflePayload,
  ): void {
    try {
      this.roomService.shuffleTeams(payload.roomCode);
      this.emitRoomState(payload.roomCode);
    } catch (error) {
      client.emit(ServerEvent.ROOM_ERROR, {
        message:
          error instanceof Error ? error.message : "Failed to shuffle teams",
      });
    }
  }

  @SubscribeMessage(ClientEvent.GAME_START)
  handleGameStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GameStartPayload,
  ): void {
    try {
      const mapping = this.socketToPlayer.get(client.id);
      if (!mapping) {
        throw new Error("Player not in a room");
      }

      this.roomService.startGame(
        payload.roomCode,
        mapping.playerId,
        payload.maxTurns,
      );

      this.server.to(payload.roomCode).emit(ServerEvent.GAME_STARTED, {});
      this.emitRoomState(payload.roomCode);
      this.emitGameState(payload.roomCode);
    } catch (error) {
      client.emit(ServerEvent.ROOM_ERROR, {
        message:
          error instanceof Error ? error.message : "Failed to start game",
      });
    }
  }

  @SubscribeMessage(ClientEvent.GAME_END)
  handleGameEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GameEndPayload,
  ): void {
    try {
      const mapping = this.socketToPlayer.get(client.id);
      if (!mapping) {
        throw new Error("Player not in a room");
      }

      const summary = this.gameService.endGameManually(
        payload.roomCode,
        mapping.playerId,
      );

      this.server.to(payload.roomCode).emit(ServerEvent.GAME_ENDED, summary);
      this.emitGameState(payload.roomCode);
    } catch (error) {
      client.emit(ServerEvent.ROOM_ERROR, {
        message: error instanceof Error ? error.message : "Failed to end game",
      });
    }
  }

  @SubscribeMessage(ClientEvent.TURN_START)
  handleTurnStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TurnActionPayload,
  ): void {
    try {
      const result = this.gameService.startTurn(payload.roomCode);

      this.server.to(payload.roomCode).emit(ServerEvent.TURN_STARTED, {
        turn: this.toTurnInfo(result.turn),
        timerDuration: result.timerDuration,
      });

      this.emitCardToPoet(
        payload.roomCode,
        result.turn.poetId,
        result.turn.currentCard,
      );

      const room = this.roomService.getRoom(payload.roomCode);
      this.timerService.startTimer(
        payload.roomCode,
        result.timerDuration,
        (roomCode, remaining) => {
          this.server.to(roomCode).emit(ServerEvent.TURN_TIMER, { remaining });
        },
        (roomCode) => {
          this.onTimerExpired(roomCode);
        },
        (roomCode, remaining) => {
          this.server
            .to(roomCode)
            .emit(ServerEvent.TURN_TIMER_WARNING, { remaining });
        },
      );

      this.emitGameState(payload.roomCode);
    } catch (error) {
      client.emit(ServerEvent.ROOM_ERROR, {
        message:
          error instanceof Error ? error.message : "Failed to start turn",
      });
    }
  }

  @SubscribeMessage(ClientEvent.TURN_CORRECT_EASY)
  handleTurnCorrectEasy(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TurnActionPayload,
  ): void {
    try {
      const result = this.gameService.handleCorrectEasy(payload.roomCode);

      this.server.to(payload.roomCode).emit(ServerEvent.TURN_SCORE, {
        points: result.points,
        totalScore: result.totalScore,
        type: "easy",
      });

      this.server.to(payload.roomCode).emit(ServerEvent.FEEDBACK, {
        type: "correct",
        message: "Correct! +1 point",
        teamId: result.teamId,
      });

      if (result.previousCard) {
        this.server.to(payload.roomCode).emit(ServerEvent.CARD_REVEALED, {
          card: result.previousCard,
          reason: "easy",
          pointsEarned: 1,
        });
      }

      if (result.poetId && result.newCard) {
        this.emitCardToPoet(payload.roomCode, result.poetId, result.newCard);
      }

      this.emitGameState(payload.roomCode);
    } catch (error) {
      client.emit(ServerEvent.ROOM_ERROR, {
        message:
          error instanceof Error ? error.message : "Failed to mark correct",
      });
    }
  }

  @SubscribeMessage(ClientEvent.TURN_CORRECT_HARD)
  handleTurnCorrectHard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TurnActionPayload,
  ): void {
    try {
      const result = this.gameService.handleCorrectHard(payload.roomCode);

      this.server.to(payload.roomCode).emit(ServerEvent.TURN_SCORE, {
        points: result.points,
        totalScore: result.totalScore,
        type: "hard",
      });

      this.server.to(payload.roomCode).emit(ServerEvent.FEEDBACK, {
        type: "correct",
        message: "Correct! +3 points",
        teamId: result.teamId,
      });

      if (result.previousCard) {
        this.server.to(payload.roomCode).emit(ServerEvent.CARD_REVEALED, {
          card: result.previousCard,
          reason: "hard",
          pointsEarned: 3,
        });
      }

      if (result.poetId && result.newCard) {
        this.emitCardToPoet(payload.roomCode, result.poetId, result.newCard);
      }

      this.emitGameState(payload.roomCode);
    } catch (error) {
      client.emit(ServerEvent.ROOM_ERROR, {
        message:
          error instanceof Error ? error.message : "Failed to mark correct",
      });
    }
  }

  @SubscribeMessage(ClientEvent.TURN_SKIP)
  handleTurnSkip(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TurnActionPayload,
  ): void {
    try {
      const result = this.gameService.handleSkipOrNo(payload.roomCode);

      this.server.to(payload.roomCode).emit(ServerEvent.TURN_SCORE, {
        points: result.points,
        totalScore: result.totalScore,
        type: "skip",
      });

      this.server.to(payload.roomCode).emit(ServerEvent.FEEDBACK, {
        type: "skip",
        message: "Card skipped! -1 point",
        teamId: result.teamId,
      });

      if (result.previousCard) {
        this.server.to(payload.roomCode).emit(ServerEvent.CARD_REVEALED, {
          card: result.previousCard,
          reason: "skip",
          pointsEarned: -1,
        });
      }

      if (result.newCard && result.poetId) {
        this.emitCardToPoet(payload.roomCode, result.poetId, result.newCard);
      }

      this.emitGameState(payload.roomCode);
    } catch (error) {
      client.emit(ServerEvent.ROOM_ERROR, {
        message: error instanceof Error ? error.message : "Failed to skip",
      });
    }
  }

  @SubscribeMessage(ClientEvent.TURN_NO)
  handleTurnNo(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TurnActionPayload,
  ): void {
    try {
      const result = this.gameService.handleSkipOrNo(payload.roomCode);

      this.server.to(payload.roomCode).emit(ServerEvent.TURN_SCORE, {
        points: result.points,
        totalScore: result.totalScore,
        type: "skip",
      });

      this.server.to(payload.roomCode).emit(ServerEvent.FEEDBACK, {
        type: "no",
        message: "NO! -1 point",
        teamId: result.teamId,
      });

      if (result.previousCard) {
        this.server.to(payload.roomCode).emit(ServerEvent.CARD_REVEALED, {
          card: result.previousCard,
          reason: "no",
          pointsEarned: -1,
        });
      }

      if (result.newCard && result.poetId) {
        this.emitCardToPoet(payload.roomCode, result.poetId, result.newCard);
      }

      this.emitGameState(payload.roomCode);
    } catch (error) {
      client.emit(ServerEvent.ROOM_ERROR, {
        message: error instanceof Error ? error.message : "Failed to apply NO",
      });
    }
  }

  @SubscribeMessage(ClientEvent.PLAYER_RECONNECT)
  handlePlayerReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlayerReconnectPayload,
  ): void {
    try {
      const room = this.roomService.reconnectPlayer(
        payload.roomCode,
        payload.playerId,
      );
      if (!room) {
        throw new Error("Room or player not found");
      }

      client.join(payload.roomCode);
      this.socketToPlayer.set(client.id, {
        roomCode: payload.roomCode,
        playerId: payload.playerId,
      });

      this.server.to(payload.roomCode).emit(ServerEvent.PLAYER_RECONNECTED, {
        playerId: payload.playerId,
      });

      this.emitRoomState(payload.roomCode);
      if (room.gameState !== GameState.LOBBY) {
        this.emitGameState(payload.roomCode);
      }
    } catch (error) {
      client.emit(ServerEvent.ROOM_ERROR, {
        message: error instanceof Error ? error.message : "Failed to reconnect",
      });
    }
  }

  private onTimerExpired(roomCode: string): void {
    const result = this.gameService.handleTimerExpired(roomCode);
    if (!result) return;

    this.server.to(roomCode).emit(ServerEvent.FEEDBACK, {
      type: "time_up",
      message: "Time's up!",
      teamId: result.teamId,
    });

    this.server.to(roomCode).emit(ServerEvent.TURN_ENDED, {
      reason: result.turn.endReason,
      pointsEarned: result.turn.pointsEarned,
      teamScore: result.teamScore,
      card: result.turn.currentCard,
    });

    this.emitGameState(roomCode);

    if (this.gameService.isGameOver(roomCode)) {
      const summary = this.gameService.getGameSummary(roomCode);
      this.server.to(roomCode).emit(ServerEvent.GAME_ENDED, summary);
      this.timerService.cleanup(roomCode);
    }
  }

  private emitRoomState(roomCode: string): void {
    const room = this.roomService.getRoom(roomCode);
    if (!room) return;

    const response: RoomStateResponse = {
      code: room.code,
      hostId: room.hostId,
      players: Array.from(room.players.values()).map((p) =>
        this.toPlayerInfo(p),
      ),
      teams: room.teams.map((t) => this.toTeamInfo(t)),
      gameState: room.gameState,
    };

    this.server.to(roomCode).emit(ServerEvent.ROOM_STATE, response);
  }

  private emitGameState(roomCode: string): void {
    const room = this.roomService.getRoom(roomCode);
    if (!room || !room.gameEngine) return;

    const state = room.gameEngine.getState();
    const timerState = this.timerService.getTimerState(roomCode);

    const response: GameStateResponse = {
      state: state.state,
      teams: state.teams.map((t) => this.toTeamInfo(t)),
      players: Array.from(state.players.values()).map((p) =>
        this.toPlayerInfo(p),
      ),
      currentTurn: state.currentTurn
        ? this.toTurnInfo(state.currentTurn)
        : null,
      turnNumber: state.turnNumber,
      timerRemaining: timerState?.remainingSeconds ?? null,
    };

    this.server.to(roomCode).emit(ServerEvent.GAME_STATE, response);
  }

  private emitCardToPoet(
    roomCode: string,
    poetId: string,
    card: { id: string; easyWord: string; hardPhrase: string },
  ): void {
    for (const [socketId, mapping] of this.socketToPlayer.entries()) {
      if (mapping.roomCode === roomCode && mapping.playerId === poetId) {
        this.server.to(socketId).emit(ServerEvent.TURN_CARD, { card });
        break;
      }
    }
  }

  private toPlayerInfo(player: {
    id: string;
    name: string;
    teamId: string | null;
    role: PlayerRole;
    isConnected: boolean;
    isHost: boolean;
  }): PlayerInfo {
    return {
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      role: player.role,
      isConnected: player.isConnected,
      isHost: player.isHost,
    };
  }

  private toTeamInfo(team: {
    id: string;
    name: string;
    playerIds: string[];
    score: number;
  }): TeamInfo {
    return {
      id: team.id,
      name: team.name,
      playerIds: team.playerIds,
      score: team.score,
    };
  }

  private toTurnInfo(turn: {
    teamId: string;
    poetId: string;
    judgeId: string;
    currentCardEasyGuessed: boolean;
    currentCardHardGuessed: boolean;
    pointsEarned: number;
  }): TurnInfo {
    return {
      teamId: turn.teamId,
      poetId: turn.poetId,
      judgeId: turn.judgeId,
      easyWordGuessed: turn.currentCardEasyGuessed,
      hardPhraseGuessed: turn.currentCardHardGuessed,
      pointsEarned: turn.pointsEarned,
    };
  }
}
