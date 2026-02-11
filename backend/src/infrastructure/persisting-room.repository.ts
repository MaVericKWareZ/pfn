import { Injectable, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { PlayerId, RoomCode } from "../domain/types";
import { Room } from "../application/room.service";
import { IRoomRepository } from "../application/room.repository";
import { InMemoryRoomRepository } from "./in-memory-room.repository";
import {
  RoomDocument,
  RoomDoc,
  PlayerRoomMapDocument,
  PlayerRoomMapDoc,
} from "./schemas/room.schema";

/**
 * Hybrid repository: reads from in-memory store for real-time performance,
 * writes to both in-memory store AND MongoDB for persistence/durability.
 *
 * This pattern is ideal for real-time games where:
 * - Reads must be synchronous and sub-millisecond (WebSocket event handlers)
 * - Writes should be durable (survive server restarts)
 * - MongoDB is the source of truth for recovery, not for hot-path reads
 */
@Injectable()
export class PersistingRoomRepository implements IRoomRepository {
  private inMemory: InMemoryRoomRepository;

  constructor(
    @InjectModel(RoomDocument.name)
    private readonly roomModel: Model<RoomDoc>,
    @InjectModel(PlayerRoomMapDocument.name)
    private readonly playerRoomMapModel: Model<PlayerRoomMapDoc>,
  ) {
    this.inMemory = new InMemoryRoomRepository();
  }

  save(room: Room): void {
    this.inMemory.save(room);
    this.persistRoomAsync(room);
  }

  findByCode(code: RoomCode): Room | null {
    return this.inMemory.findByCode(code);
  }

  delete(code: RoomCode): void {
    this.inMemory.delete(code);
    this.roomModel
      .findByIdAndDelete(code)
      .exec()
      .catch((err) => console.error("[PersistingRepo] delete room failed:", err));
  }

  has(code: RoomCode): boolean {
    return this.inMemory.has(code);
  }

  setPlayerToRoom(playerId: PlayerId, roomCode: RoomCode): void {
    this.inMemory.setPlayerToRoom(playerId, roomCode);
    this.playerRoomMapModel
      .findByIdAndUpdate(
        playerId,
        { _id: playerId, roomCode },
        { upsert: true },
      )
      .exec()
      .catch((err) =>
        console.error("[PersistingRepo] set player mapping failed:", err),
      );
  }

  getPlayerRoom(playerId: PlayerId): RoomCode | null {
    return this.inMemory.getPlayerRoom(playerId);
  }

  deletePlayerMapping(playerId: PlayerId): void {
    this.inMemory.deletePlayerMapping(playerId);
    this.playerRoomMapModel
      .findByIdAndDelete(playerId)
      .exec()
      .catch((err) =>
        console.error("[PersistingRepo] delete player mapping failed:", err),
      );
  }

  // --- Async persistence helpers ---

  private persistRoomAsync(room: Room): void {
    const doc: Record<string, unknown> = {
      _id: room.code,
      hostId: room.hostId,
      players: Array.from(room.players.entries()).map(([key, value]) => ({
        key,
        value,
      })),
      teams: room.teams,
      gameState: room.gameState,
      config: room.config,
      gameEngineState: room.gameEngine
        ? room.gameEngine.toSerializable()
        : null,
    };

    this.roomModel
      .findByIdAndUpdate(room.code, doc, { upsert: true })
      .exec()
      .catch((err) =>
        console.error("[PersistingRepo] persist room failed:", err),
      );
  }
}
