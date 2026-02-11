import { Test, TestingModule } from "@nestjs/testing";
import { RoomService } from "../room.service";
import { CONTENT_PACK_REPOSITORY_TOKEN } from "../../infrastructure/content-pack.repository";
import { ROOM_REPOSITORY_TOKEN } from "../room.repository";
import { InMemoryRoomRepository } from "../../infrastructure/in-memory-room.repository";
import { GameState, PlayerRole } from "../../domain/types";

describe("RoomService", () => {
  let service: RoomService;
  let contentPackRepository: { getCards: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        {
          provide: CONTENT_PACK_REPOSITORY_TOKEN,
          useValue: {
            getCards: jest.fn().mockReturnValue([
              { id: "1", easyWord: "cat", hardPhrase: "big cat" },
              { id: "2", easyWord: "dog", hardPhrase: "small dog" },
              { id: "3", easyWord: "bird", hardPhrase: "blue bird" },
            ]),
          },
        },
        {
          provide: ROOM_REPOSITORY_TOKEN,
          useClass: InMemoryRoomRepository,
        },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
    contentPackRepository = module.get(CONTENT_PACK_REPOSITORY_TOKEN);
  });


  describe("createRoom", () => {
    it("should create a room with host player", () => {
      const { room, playerId } = service.createRoom("Alice");

      expect(room.code).toHaveLength(6);
      expect(room.hostId).toBe(playerId);
      expect(room.players.size).toBe(1);
      expect(room.teams).toHaveLength(2);
      expect(room.gameState).toBe(GameState.LOBBY);
      expect(room.gameEngine).toBeNull();
    });

    it("should create host player with correct properties", () => {
      const { room, playerId } = service.createRoom("Alice");
      const host = room.players.get(playerId);

      expect(host).toBeDefined();
      expect(host?.name).toBe("Alice");
      expect(host?.isHost).toBe(true);
      expect(host?.isConnected).toBe(true);
      expect(host?.teamId).toBeNull();
      expect(host?.role).toBe(PlayerRole.SPECTATOR);
    });

    it("should create two empty teams", () => {
      const { room } = service.createRoom("Alice");

      expect(room.teams).toHaveLength(2);
      expect(room.teams[0].playerIds).toHaveLength(0);
      expect(room.teams[1].playerIds).toHaveLength(0);
      expect(room.teams[0].score).toBe(0);
      expect(room.teams[1].score).toBe(0);
    });

    it("should generate unique room codes", () => {
      const room1 = service.createRoom("Alice");
      const room2 = service.createRoom("Bob");

      expect(room1.room.code).not.toBe(room2.room.code);
    });

    it("should allow retrieving room by code", () => {
      const { room } = service.createRoom("Alice");
      const retrieved = service.getRoom(room.code);

      expect(retrieved).toBe(room);
    });
  });

  describe("joinRoom", () => {
    it("should add player to existing room", () => {
      const { room } = service.createRoom("Alice");
      const { playerId } = service.joinRoom(room.code, "Bob");

      expect(room.players.size).toBe(2);
      expect(room.players.has(playerId)).toBe(true);
    });

    it("should create non-host player", () => {
      const { room } = service.createRoom("Alice");
      const { playerId } = service.joinRoom(room.code, "Bob");
      const player = room.players.get(playerId);

      expect(player?.isHost).toBe(false);
      expect(player?.name).toBe("Bob");
      expect(player?.isConnected).toBe(true);
    });

    it("should throw error for non-existent room", () => {
      expect(() => service.joinRoom("INVALID", "Bob")).toThrow(
        "Room not found",
      );
    });

    it("should throw error if game already started", () => {
      const { room, playerId } = service.createRoom("Alice");
      const player2 = service.joinRoom(room.code, "Bob");

      service.assignTeam(room.code, playerId, room.teams[0].id);
      service.assignTeam(room.code, player2.playerId, room.teams[1].id);
      service.startGame(room.code, playerId);

      expect(() => service.joinRoom(room.code, "Charlie")).toThrow(
        "Game already in progress",
      );
    });

    it("should allow multiple players to join", () => {
      const { room } = service.createRoom("Alice");
      service.joinRoom(room.code, "Bob");
      service.joinRoom(room.code, "Charlie");
      service.joinRoom(room.code, "Diana");

      expect(room.players.size).toBe(4);
    });
  });

  describe("leaveRoom", () => {
    it("should remove player from room", () => {
      const { room } = service.createRoom("Alice");
      const { playerId } = service.joinRoom(room.code, "Bob");

      service.leaveRoom(room.code, playerId);

      expect(room.players.has(playerId)).toBe(false);
      expect(room.players.size).toBe(1);
    });

    it("should remove player from team", () => {
      const { room, playerId: hostId } = service.createRoom("Alice");
      const { playerId } = service.joinRoom(room.code, "Bob");

      service.assignTeam(room.code, playerId, room.teams[0].id);
      expect(room.teams[0].playerIds).toContain(playerId);

      service.leaveRoom(room.code, playerId);
      expect(room.teams[0].playerIds).not.toContain(playerId);
    });

    it("should delete room when last player leaves", () => {
      const { room, playerId } = service.createRoom("Alice");

      service.leaveRoom(room.code, playerId);

      expect(service.getRoom(room.code)).toBeNull();
    });

    it("should transfer host when host leaves", () => {
      const { room, playerId: hostId } = service.createRoom("Alice");
      const { playerId: player2Id } = service.joinRoom(room.code, "Bob");

      service.leaveRoom(room.code, hostId);

      expect(room.hostId).toBe(player2Id);
      expect(room.players.get(player2Id)?.isHost).toBe(true);
    });

    it("should return null for non-existent room", () => {
      const result = service.leaveRoom("INVALID", "player-id");
      expect(result).toBeNull();
    });

    it("should handle leaving with non-existent player gracefully", () => {
      const { room } = service.createRoom("Alice");
      const result = service.leaveRoom(room.code, "non-existent");

      expect(result).toBe(room);
    });
  });

  describe("assignTeam", () => {
    it("should assign player to team", () => {
      const { room, playerId } = service.createRoom("Alice");
      const teamId = room.teams[0].id;

      service.assignTeam(room.code, playerId, teamId);

      expect(room.teams[0].playerIds).toContain(playerId);
      expect(room.players.get(playerId)?.teamId).toBe(teamId);
    });

    it("should move player from one team to another", () => {
      const { room, playerId } = service.createRoom("Alice");
      const team1Id = room.teams[0].id;
      const team2Id = room.teams[1].id;

      service.assignTeam(room.code, playerId, team1Id);
      expect(room.teams[0].playerIds).toContain(playerId);

      service.assignTeam(room.code, playerId, team2Id);
      expect(room.teams[0].playerIds).not.toContain(playerId);
      expect(room.teams[1].playerIds).toContain(playerId);
    });

    it("should throw error for non-existent room", () => {
      expect(() =>
        service.assignTeam("INVALID", "player-id", "team-id"),
      ).toThrow("Room not found");
    });

    it("should throw error for non-existent player", () => {
      const { room } = service.createRoom("Alice");
      expect(() =>
        service.assignTeam(room.code, "invalid-player", room.teams[0].id),
      ).toThrow("Player not found");
    });

    it("should throw error for non-existent team", () => {
      const { room, playerId } = service.createRoom("Alice");
      expect(() =>
        service.assignTeam(room.code, playerId, "invalid-team"),
      ).toThrow("Team not found");
    });
  });

  describe("shuffleTeams", () => {
    it("should distribute players across teams", () => {
      const { room, playerId: p1 } = service.createRoom("Alice");
      const { playerId: p2 } = service.joinRoom(room.code, "Bob");
      const { playerId: p3 } = service.joinRoom(room.code, "Charlie");
      const { playerId: p4 } = service.joinRoom(room.code, "Diana");

      service.shuffleTeams(room.code);

      const team1Count = room.teams[0].playerIds.length;
      const team2Count = room.teams[1].playerIds.length;

      expect(team1Count + team2Count).toBe(4);
      expect(Math.abs(team1Count - team2Count)).toBeLessThanOrEqual(1);
    });

    it("should assign teamId to all players", () => {
      const { room } = service.createRoom("Alice");
      service.joinRoom(room.code, "Bob");
      service.joinRoom(room.code, "Charlie");

      service.shuffleTeams(room.code);

      for (const player of room.players.values()) {
        expect(player.teamId).toBeTruthy();
      }
    });

    it("should clear previous team assignments", () => {
      const { room, playerId } = service.createRoom("Alice");
      service.assignTeam(room.code, playerId, room.teams[0].id);

      service.shuffleTeams(room.code);

      const totalPlayers = Array.from(room.players.keys()).length;
      const assignedPlayers =
        room.teams[0].playerIds.length + room.teams[1].playerIds.length;
      expect(assignedPlayers).toBe(totalPlayers);
    });

    it("should throw error for non-existent room", () => {
      expect(() => service.shuffleTeams("INVALID")).toThrow("Room not found");
    });
  });

  describe("startGame", () => {
    it("should start game with valid setup", () => {
      const { room, playerId } = service.createRoom("Alice");
      const { playerId: p2 } = service.joinRoom(room.code, "Bob");

      service.assignTeam(room.code, playerId, room.teams[0].id);
      service.assignTeam(room.code, p2, room.teams[1].id);

      service.startGame(room.code, playerId);

      expect(room.gameState).toBe(GameState.PLAYING);
      expect(room.gameEngine).toBeTruthy();
    });

    it("should initialize game engine", () => {
      const { room, playerId } = service.createRoom("Alice");
      const { playerId: p2 } = service.joinRoom(room.code, "Bob");

      service.assignTeam(room.code, playerId, room.teams[0].id);
      service.assignTeam(room.code, p2, room.teams[1].id);

      service.startGame(room.code, playerId);

      expect(room.gameEngine).toBeTruthy();
      expect(room.gameEngine?.getState().state).toBe(GameState.PLAYING);
    });

    it("should throw error if not host", () => {
      const { room, playerId: hostId } = service.createRoom("Alice");
      const { playerId: p2 } = service.joinRoom(room.code, "Bob");

      service.assignTeam(room.code, hostId, room.teams[0].id);
      service.assignTeam(room.code, p2, room.teams[1].id);

      expect(() => service.startGame(room.code, p2)).toThrow(
        "Only host can start the game",
      );
    });

    it("should throw error if less than 2 teams with players", () => {
      const { room, playerId } = service.createRoom("Alice");
      service.assignTeam(room.code, playerId, room.teams[0].id);

      expect(() => service.startGame(room.code, playerId)).toThrow(
        "At least 2 teams with players are required",
      );
    });

    it("should throw error if game already started", () => {
      const { room, playerId } = service.createRoom("Alice");
      const { playerId: p2 } = service.joinRoom(room.code, "Bob");

      service.assignTeam(room.code, playerId, room.teams[0].id);
      service.assignTeam(room.code, p2, room.teams[1].id);

      service.startGame(room.code, playerId);

      expect(() => service.startGame(room.code, playerId)).toThrow(
        "Game already started",
      );
    });

    it("should throw error for non-existent room", () => {
      expect(() => service.startGame("INVALID", "player-id")).toThrow(
        "Room not found",
      );
    });

    it("should load cards from content pack", () => {
      const { room, playerId } = service.createRoom("Alice");
      const { playerId: p2 } = service.joinRoom(room.code, "Bob");

      service.assignTeam(room.code, playerId, room.teams[0].id);
      service.assignTeam(room.code, p2, room.teams[1].id);

      service.startGame(room.code, playerId);

      expect(contentPackRepository.getCards).toHaveBeenCalled();
    });
  });

  describe("reconnectPlayer", () => {
    it("should mark player as connected", () => {
      const { room, playerId } = service.createRoom("Alice");
      const player = room.players.get(playerId);

      if (player) player.isConnected = false;

      service.reconnectPlayer(room.code, playerId);

      expect(player?.isConnected).toBe(true);
    });

    it("should return null for non-existent room", () => {
      const result = service.reconnectPlayer("INVALID", "player-id");
      expect(result).toBeNull();
    });

    it("should return null for non-existent player", () => {
      const { room } = service.createRoom("Alice");
      const result = service.reconnectPlayer(room.code, "invalid-player");
      expect(result).toBeNull();
    });
  });

  describe("markPlayerDisconnected", () => {
    it("should mark player as disconnected", () => {
      const { room, playerId } = service.createRoom("Alice");

      service.markPlayerDisconnected(room.code, playerId);

      const player = room.players.get(playerId);
      expect(player?.isConnected).toBe(false);
    });

    it("should handle non-existent room gracefully", () => {
      expect(() =>
        service.markPlayerDisconnected("INVALID", "player-id"),
      ).not.toThrow();
    });

    it("should handle non-existent player gracefully", () => {
      const { room } = service.createRoom("Alice");
      expect(() =>
        service.markPlayerDisconnected(room.code, "invalid-player"),
      ).not.toThrow();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete room lifecycle", () => {
      const { room, playerId: p1 } = service.createRoom("Alice");
      const { playerId: p2 } = service.joinRoom(room.code, "Bob");
      const { playerId: p3 } = service.joinRoom(room.code, "Charlie");
      const { playerId: p4 } = service.joinRoom(room.code, "Diana");

      expect(room.players.size).toBe(4);

      service.shuffleTeams(room.code);
      expect(
        room.teams[0].playerIds.length + room.teams[1].playerIds.length,
      ).toBe(4);

      service.startGame(room.code, p1);
      expect(room.gameState).toBe(GameState.PLAYING);
      expect(room.gameEngine).toBeTruthy();
    });

    it("should handle player leaving and rejoining", () => {
      const { room, playerId } = service.createRoom("Alice");
      const { playerId: p2 } = service.joinRoom(room.code, "Bob");

      service.assignTeam(room.code, p2, room.teams[0].id);
      expect(room.teams[0].playerIds).toContain(p2);

      service.leaveRoom(room.code, p2);
      expect(room.players.has(p2)).toBe(false);

      const { playerId: p3 } = service.joinRoom(room.code, "Bob");
      expect(room.players.has(p3)).toBe(true);
    });

    it("should maintain room state across operations", () => {
      const { room, playerId: p1 } = service.createRoom("Alice");
      const initialCode = room.code;

      service.joinRoom(room.code, "Bob");
      expect(room.code).toBe(initialCode);

      service.shuffleTeams(room.code);
      expect(room.code).toBe(initialCode);

      const retrieved = service.getRoom(initialCode);
      expect(retrieved).toBe(room);
    });
  });
});
