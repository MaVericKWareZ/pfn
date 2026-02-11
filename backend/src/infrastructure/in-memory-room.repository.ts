import { Injectable } from "@nestjs/common";
import { PlayerId, RoomCode } from "../domain/types";
import { Room } from "../application/room.service";
import { IRoomRepository } from "../application/room.repository";

@Injectable()
export class InMemoryRoomRepository implements IRoomRepository {
  private rooms: Map<RoomCode, Room> = new Map();
  private playerToRoom: Map<PlayerId, RoomCode> = new Map();

  save(room: Room): void {
    this.rooms.set(room.code, room);
  }

  findByCode(code: RoomCode): Room | null {
    return this.rooms.get(code) ?? null;
  }

  delete(code: RoomCode): void {
    this.rooms.delete(code);
  }

  has(code: RoomCode): boolean {
    return this.rooms.has(code);
  }

  setPlayerToRoom(playerId: PlayerId, roomCode: RoomCode): void {
    this.playerToRoom.set(playerId, roomCode);
  }

  getPlayerRoom(playerId: PlayerId): RoomCode | null {
    return this.playerToRoom.get(playerId) ?? null;
  }

  deletePlayerMapping(playerId: PlayerId): void {
    this.playerToRoom.delete(playerId);
  }
}
