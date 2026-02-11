import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { RoomService } from "./application/room.service";
import { TimerService } from "./application/timer.service";
import { GameService } from "./application/game.service";
import {
  ContentPackRepository,
  CONTENT_PACK_REPOSITORY_TOKEN,
} from "./infrastructure/content-pack.repository";
import { PersistingRoomRepository } from "./infrastructure/persisting-room.repository";
import { ROOM_REPOSITORY_TOKEN } from "./application/room.repository";
import {
  RoomDocument,
  RoomSchema,
  PlayerRoomMapDocument,
  PlayerRoomMapSchema,
} from "./infrastructure/schemas/room.schema";
import { GameGateway } from "./infrastructure/game.gateway";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI"),
        autoIndex: false,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        connectionFactory: (connection) => {
          connection.set("debug", false);
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: RoomDocument.name, schema: RoomSchema },
      { name: PlayerRoomMapDocument.name, schema: PlayerRoomMapSchema },
    ]),
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: CONTENT_PACK_REPOSITORY_TOKEN,
      useClass: ContentPackRepository,
    },
    {
      provide: ROOM_REPOSITORY_TOKEN,
      useClass: PersistingRoomRepository,
    },
    RoomService,
    TimerService,
    GameService,
    GameGateway,
  ],
})
export class AppModule {}
