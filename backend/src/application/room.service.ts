import { Injectable, Inject } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import {
  Player,
  Team,
  PlayerId,
  TeamId,
  RoomCode,
  GameState,
  PlayerRole,
  GameConfig,
  DEFAULT_GAME_CONFIG,
} from "../domain/types";
import { GameEngine } from "../domain/game-engine";
import { DeckManager } from "../domain/deck-manager";
import {
  IContentPackRepository,
  CONTENT_PACK_REPOSITORY_TOKEN,
} from "../infrastructure/content-pack.repository";
import { IRoomRepository, ROOM_REPOSITORY_TOKEN } from "./room.repository";

export interface Room {
  code: RoomCode;
  hostId: PlayerId;
  players: Map<PlayerId, Player>;
  teams: Team[];
  gameState: GameState;
  gameEngine: GameEngine | null;
  config: GameConfig;
  createdAt: number;
}

export interface IRoomService {
  createRoom(hostName: string): { room: Room; playerId: PlayerId };
  joinRoom(
    code: RoomCode,
    playerName: string,
  ): { room: Room; playerId: PlayerId };
  leaveRoom(code: RoomCode, playerId: PlayerId): Room | null;
  getRoom(code: RoomCode): Room | null;
  assignTeam(code: RoomCode, playerId: PlayerId, teamId: TeamId): Room;
  shuffleTeams(code: RoomCode): Room;
  startGame(code: RoomCode, playerId: PlayerId, maxTurns?: number): Room;
  reconnectPlayer(code: RoomCode, playerId: PlayerId): Room | null;
}

@Injectable()
export class RoomService implements IRoomService {
  constructor(
    @Inject(CONTENT_PACK_REPOSITORY_TOKEN)
    private readonly contentPackRepository: IContentPackRepository,
    @Inject(ROOM_REPOSITORY_TOKEN)
    private readonly roomRepository: IRoomRepository,
  ) {}

  createRoom(hostName: string): { room: Room; playerId: PlayerId } {
    const code = this.generateRoomCode();
    const playerId = uuidv4();

    const host: Player = {
      id: playerId,
      name: hostName,
      teamId: null,
      role: PlayerRole.SPECTATOR,
      isConnected: true,
      isHost: true,
    };

    const teams: Team[] = [
      { id: uuidv4(), name: "Grunters", playerIds: [], score: 0 },
      { id: uuidv4(), name: "Pointers", playerIds: [], score: 0 },
    ];

    const room: Room = {
      code,
      hostId: playerId,
      players: new Map([[playerId, host]]),
      teams,
      gameState: GameState.LOBBY,
      gameEngine: null,
      config: { ...DEFAULT_GAME_CONFIG },
      createdAt: Date.now(),
    };

    this.roomRepository.save(room);
    this.roomRepository.setPlayerToRoom(playerId, code);

    return { room, playerId };
  }

  joinRoom(
    code: RoomCode,
    playerName: string,
  ): { room: Room; playerId: PlayerId } {
    const room = this.roomRepository.findByCode(code);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.gameState !== GameState.LOBBY) {
      throw new Error("Game already in progress");
    }

    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      name: playerName,
      teamId: null,
      role: PlayerRole.SPECTATOR,
      isConnected: true,
      isHost: false,
    };

    room.players.set(playerId, player);
    this.roomRepository.setPlayerToRoom(playerId, code);

    return { room, playerId };
  }

  leaveRoom(code: RoomCode, playerId: PlayerId): Room | null {
    const room = this.roomRepository.findByCode(code);
    if (!room) {
      return null;
    }

    const player = room.players.get(playerId);
    if (!player) {
      return room;
    }

    if (player.teamId) {
      const team = room.teams.find((t) => t.id === player.teamId);
      if (team) {
        team.playerIds = team.playerIds.filter((id) => id !== playerId);
      }
    }

    room.players.delete(playerId);
    this.roomRepository.deletePlayerMapping(playerId);

    if (room.players.size === 0) {
      this.roomRepository.delete(code);
      return null;
    }

    if (player.isHost) {
      const newHost = room.players.values().next().value;
      if (newHost) {
        newHost.isHost = true;
        room.hostId = newHost.id;
      }
    }

    return room;
  }

  getRoom(code: RoomCode): Room | null {
    return this.roomRepository.findByCode(code);
  }

  getRoomByPlayerId(playerId: PlayerId): Room | null {
    const code = this.roomRepository.getPlayerRoom(playerId);
    if (!code) return null;
    return this.roomRepository.findByCode(code);
  }

  assignTeam(code: RoomCode, playerId: PlayerId, teamId: TeamId): Room {
    const room = this.roomRepository.findByCode(code);
    if (!room) {
      throw new Error("Room not found");
    }

    const player = room.players.get(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    if (player.teamId) {
      const oldTeam = room.teams.find((t) => t.id === player.teamId);
      if (oldTeam) {
        oldTeam.playerIds = oldTeam.playerIds.filter((id) => id !== playerId);
      }
    }

    const newTeam = room.teams.find((t) => t.id === teamId);
    if (!newTeam) {
      throw new Error("Team not found");
    }

    newTeam.playerIds.push(playerId);
    player.teamId = teamId;

    return room;
  }

  shuffleTeams(code: RoomCode): Room {
    const room = this.roomRepository.findByCode(code);
    if (!room) {
      throw new Error("Room not found");
    }

    const playerIds = Array.from(room.players.keys());

    for (let i = playerIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
    }

    for (const team of room.teams) {
      team.playerIds = [];
    }

    playerIds.forEach((playerId, index) => {
      const teamIndex = index % room.teams.length;
      const team = room.teams[teamIndex];
      team.playerIds.push(playerId);

      const player = room.players.get(playerId);
      if (player) {
        player.teamId = team.id;
      }
    });

    return room;
  }

  startGame(code: RoomCode, playerId: PlayerId, maxTurns?: number): Room {
    const room = this.roomRepository.findByCode(code);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.hostId !== playerId) {
      throw new Error("Only host can start the game");
    }

    if (room.gameState !== GameState.LOBBY) {
      throw new Error("Game already started");
    }

    const teamsWithPlayers = room.teams.filter((t) => t.playerIds.length > 0);
    if (teamsWithPlayers.length < 2) {
      throw new Error("At least 2 teams with players are required");
    }

    const cards = this.contentPackRepository.getAllCards();
    const deckManager = new DeckManager(cards);

    // Update config with maxTurns if provided
    const gameConfig = { ...room.config };
    if (maxTurns !== undefined && maxTurns > 0) {
      gameConfig.maxTurns = maxTurns;
    }

    room.gameEngine = new GameEngine(
      teamsWithPlayers,
      room.players,
      deckManager,
      gameConfig,
    );

    room.gameEngine.startGame();
    room.gameState = GameState.PLAYING;

    return room;
  }

  reconnectPlayer(code: RoomCode, playerId: PlayerId): Room | null {
    const room = this.roomRepository.findByCode(code);
    if (!room) {
      return null;
    }

    const player = room.players.get(playerId);
    if (!player) {
      return null;
    }

    player.isConnected = true;
    return room;
  }

  markPlayerDisconnected(code: RoomCode, playerId: PlayerId): void {
    const room = this.roomRepository.findByCode(code);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player) {
      player.isConnected = false;
    }
  }

  private generateRoomCode(): RoomCode {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (this.roomRepository.has(code)) {
      return this.generateRoomCode();
    }

    return code;
  }
}
