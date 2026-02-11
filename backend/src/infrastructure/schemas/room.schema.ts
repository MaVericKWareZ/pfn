import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import {
  Player,
  Team,
  GameState,
  GameConfig,
  DEFAULT_GAME_CONFIG,
} from "../../domain/types";
import { SerializableGameEngineState } from "../../domain/game-engine";

/** MongoDB document representing a game room */
@Schema({ collection: "rooms", timestamps: true })
export class RoomDocument {
  @Prop({ type: String, required: true })
  _id!: string; // Room code

  @Prop({ required: true })
  hostId!: string;

  @Prop({ type: [Object], default: [] })
  players!: Array<{ key: string; value: Player }>;

  @Prop({ type: [Object], default: [] })
  teams!: Team[];

  @Prop({ type: String, enum: GameState, default: GameState.LOBBY })
  gameState!: GameState;

  @Prop({ type: Object, default: DEFAULT_GAME_CONFIG })
  config!: GameConfig;

  @Prop({ type: Object, default: null })
  gameEngineState!: SerializableGameEngineState | null;
}

export type RoomDoc = RoomDocument & Document;
export const RoomSchema = SchemaFactory.createForClass(RoomDocument);

/** MongoDB document mapping player IDs to room codes */
@Schema({ collection: "player_room_map" })
export class PlayerRoomMapDocument {
  @Prop({ type: String, required: true })
  _id!: string; // Player ID

  @Prop({ required: true })
  roomCode!: string;
}

export type PlayerRoomMapDoc = PlayerRoomMapDocument & Document;
export const PlayerRoomMapSchema =
  SchemaFactory.createForClass(PlayerRoomMapDocument);
