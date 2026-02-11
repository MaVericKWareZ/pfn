import { PlayerId, RoomCode } from "../domain/types";
import { Room } from "./room.service";

export const ROOM_REPOSITORY_TOKEN = "IRoomRepository";

export interface IRoomRepository {
  save(room: Room): void;
  findByCode(code: RoomCode): Room | null;
  delete(code: RoomCode): void;
  has(code: RoomCode): boolean;
  setPlayerToRoom(playerId: PlayerId, roomCode: RoomCode): void;
  getPlayerRoom(playerId: PlayerId): RoomCode | null;
  deletePlayerMapping(playerId: PlayerId): void;
}
