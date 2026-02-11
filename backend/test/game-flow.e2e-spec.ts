import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { io, Socket } from "socket.io-client";
import { AppModule } from "../src/app.module";

describe("Game Flow E2E", () => {
  let app: INestApplication;
  let hostSocket: Socket;
  let player2Socket: Socket;
  let player3Socket: Socket;
  let player4Socket: Socket;
  let roomCode: string;
  let hostId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3002);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach((done) => {
    hostSocket = io("http://localhost:3002", {
      transports: ["websocket"],
      autoConnect: true,
    });

    hostSocket.on("connect", () => {
      done();
    });
  });

  afterEach(() => {
    if (hostSocket?.connected) hostSocket.disconnect();
    if (player2Socket?.connected) player2Socket.disconnect();
    if (player3Socket?.connected) player3Socket.disconnect();
    if (player4Socket?.connected) player4Socket.disconnect();
  });

  describe("Room Creation and Joining", () => {
    it("should create a room and return room code", (done) => {
      hostSocket.emit("room:create", { playerName: "Alice" });

      hostSocket.on("room:created", (data) => {
        expect(data.roomCode).toBeDefined();
        expect(data.roomCode).toHaveLength(6);
        expect(data.playerId).toBeDefined();
        expect(data.room.players).toHaveLength(1);
        expect(data.room.teams).toHaveLength(2);
        roomCode = data.roomCode;
        hostId = data.playerId;
        done();
      });
    });

    it("should allow players to join existing room", (done) => {
      hostSocket.emit("room:create", { playerName: "Alice" });

      hostSocket.on("room:created", (data) => {
        roomCode = data.roomCode;

        player2Socket = io("http://localhost:3002", {
          transports: ["websocket"],
        });

        player2Socket.on("connect", () => {
          player2Socket.emit("room:join", {
            roomCode,
            playerName: "Bob",
          });
        });

        player2Socket.on("room:joined", (joinData) => {
          expect(joinData.playerId).toBeDefined();
          expect(joinData.room.players).toHaveLength(2);
          done();
        });
      });
    });

    it("should broadcast room state to all players when someone joins", (done) => {
      hostSocket.emit("room:create", { playerName: "Alice" });

      hostSocket.on("room:created", (data) => {
        roomCode = data.roomCode;

        hostSocket.on("room:state", (stateData) => {
          expect(stateData.players).toHaveLength(2);
          done();
        });

        player2Socket = io("http://localhost:3002", {
          transports: ["websocket"],
        });

        player2Socket.on("connect", () => {
          player2Socket.emit("room:join", {
            roomCode,
            playerName: "Bob",
          });
        });
      });
    });
  });

  describe("Team Assignment", () => {
    beforeEach((done) => {
      hostSocket.emit("room:create", { playerName: "Alice" });

      hostSocket.on("room:created", (data) => {
        roomCode = data.roomCode;
        hostId = data.playerId;
        done();
      });
    });

    it("should assign player to team", (done) => {
      hostSocket.on("room:state", (data) => {
        const host = data.players.find((p: any) => p.id === hostId);
        if (host?.teamId) {
          expect(
            data.teams.some((t: any) => t.playerIds.includes(hostId)),
          ).toBe(true);
          done();
        }
      });

      hostSocket.emit("team:assign", {
        roomCode,
        playerId: hostId,
        teamId: null,
      });

      hostSocket.on("room:created", (data) => {
        hostSocket.emit("team:assign", {
          roomCode,
          playerId: hostId,
          teamId: data.room.teams[0].id,
        });
      });
    });

    it("should shuffle teams randomly", (done) => {
      player2Socket = io("http://localhost:3002", {
        transports: ["websocket"],
      });

      player2Socket.on("connect", () => {
        player2Socket.emit("room:join", { roomCode, playerName: "Bob" });
      });

      player2Socket.on("room:joined", () => {
        hostSocket.emit("team:shuffle", { roomCode });
      });

      hostSocket.on("room:state", (data) => {
        const totalAssigned = data.teams.reduce(
          (sum: number, team: any) => sum + team.playerIds.length,
          0,
        );
        if (totalAssigned === 2) {
          expect(totalAssigned).toBe(2);
          done();
        }
      });
    });
  });

  describe("Full Game Flow", () => {
    beforeEach((done) => {
      let joinedCount = 0;

      hostSocket.emit("room:create", { playerName: "Alice" });

      hostSocket.on("room:created", (data) => {
        roomCode = data.roomCode;
        hostId = data.playerId;

        player2Socket = io("http://localhost:3002", {
          transports: ["websocket"],
        });
        player3Socket = io("http://localhost:3002", {
          transports: ["websocket"],
        });
        player4Socket = io("http://localhost:3002", {
          transports: ["websocket"],
        });

        const checkAllJoined = () => {
          joinedCount++;
          if (joinedCount === 3) {
            setTimeout(done, 100);
          }
        };

        player2Socket.on("connect", () => {
          player2Socket.emit("room:join", { roomCode, playerName: "Bob" });
        });

        player2Socket.on("room:joined", checkAllJoined);

        player3Socket.on("connect", () => {
          player3Socket.emit("room:join", { roomCode, playerName: "Charlie" });
        });

        player3Socket.on("room:joined", checkAllJoined);

        player4Socket.on("connect", () => {
          player4Socket.emit("room:join", { roomCode, playerName: "Diana" });
        });

        player4Socket.on("room:joined", checkAllJoined);
      });
    });

    it("should complete a full game from start to finish", (done) => {
      let gameStarted = false;
      let turnStarted = false;
      let turnEnded = false;

      hostSocket.on("room:state", (data) => {
        if (!gameStarted && data.players.length === 4) {
          hostSocket.emit("team:shuffle", { roomCode });

          setTimeout(() => {
            hostSocket.emit("game:start", { roomCode });
            gameStarted = true;
          }, 100);
        }
      });

      hostSocket.on("game:started", (data) => {
        expect(data.gameState).toBe("PLAYING");
        expect(data.gameEngine).toBeDefined();
      });

      hostSocket.on("turn:start", (data) => {
        expect(data.turn).toBeDefined();
        expect(data.turn.poetId).toBeDefined();
        expect(data.turn.judgeId).toBeDefined();
        turnStarted = true;

        setTimeout(() => {
          hostSocket.emit("turn:correct", {
            roomCode,
            type: "easy",
          });
        }, 100);
      });

      hostSocket.on("turn:score", (data) => {
        expect(data.points).toBeDefined();

        if (turnStarted && !turnEnded) {
          done();
        }
      });
    }, 10000);

    it("should handle NO! penalty correctly", (done) => {
      let gameStarted = false;

      hostSocket.on("room:state", (data) => {
        if (!gameStarted && data.players.length === 4) {
          hostSocket.emit("team:shuffle", { roomCode });

          setTimeout(() => {
            hostSocket.emit("game:start", { roomCode });
            gameStarted = true;
          }, 100);
        }
      });

      hostSocket.on("turn:start", () => {
        setTimeout(() => {
          hostSocket.emit("turn:no", { roomCode });
        }, 100);
      });

      hostSocket.on("turn:score", (data) => {
        expect(data.points).toBe(-1);
        expect(data.type).toBe("skip");
        done();
      });
    }, 10000);

    it("should handle skip mechanic", (done) => {
      let gameStarted = false;
      let originalCard: any;

      hostSocket.on("room:state", (data) => {
        if (!gameStarted && data.players.length === 4) {
          hostSocket.emit("team:shuffle", { roomCode });

          setTimeout(() => {
            hostSocket.emit("game:start", { roomCode });
            gameStarted = true;
          }, 100);
        }
      });

      hostSocket.on("turn:start", (data) => {
        originalCard = data.turn.card;

        setTimeout(() => {
          hostSocket.emit("turn:skip", { roomCode });
        }, 100);
      });

      hostSocket.on("turn:skipped", (data) => {
        expect(data.points).toBe(-1);
        expect(data.newCard).toBeDefined();
        expect(data.newCard.id).not.toBe(originalCard.id);
        done();
      });
    }, 10000);

    it("should rotate turns between teams", (done) => {
      let gameStarted = false;
      let firstTeamId: string;
      let turnCount = 0;

      hostSocket.on("room:state", (data) => {
        if (!gameStarted && data.players.length === 4) {
          hostSocket.emit("team:shuffle", { roomCode });

          setTimeout(() => {
            hostSocket.emit("game:start", { roomCode });
            gameStarted = true;
          }, 100);
        }
      });

      hostSocket.on("turn:start", (data) => {
        turnCount++;

        if (turnCount === 1) {
          firstTeamId = data.turn.teamId;
        } else if (turnCount === 2) {
          expect(data.turn.teamId).not.toBe(firstTeamId);
          done();
        }
      });

      hostSocket.on("turn:ended", () => {
        if (turnCount === 1) {
          setTimeout(() => {
            hostSocket.emit("turn:start", { roomCode });
          }, 100);
        }
      });
    }, 15000);
  });

  describe("Reconnection", () => {
    it("should allow player to reconnect", (done) => {
      hostSocket.emit("room:create", { playerName: "Alice" });

      hostSocket.on("room:created", (data) => {
        roomCode = data.roomCode;
        const playerId = data.playerId;

        hostSocket.disconnect();

        setTimeout(() => {
          const reconnectSocket = io("http://localhost:3002", {
            transports: ["websocket"],
          });

          reconnectSocket.on("connect", () => {
            reconnectSocket.emit("player:reconnect", {
              roomCode,
              playerId,
            });
          });

          reconnectSocket.on("player:reconnected", (reconnectData) => {
            expect(reconnectData.room).toBeDefined();
            expect(reconnectData.room.code).toBe(roomCode);
            reconnectSocket.disconnect();
            done();
          });
        }, 500);
      });
    }, 10000);
  });

  describe("Error Handling", () => {
    it("should handle joining non-existent room", (done) => {
      hostSocket.emit("room:join", {
        roomCode: "INVALID",
        playerName: "Bob",
      });

      hostSocket.on("error", (error) => {
        expect(error.message).toContain("Room not found");
        done();
      });
    });

    it("should prevent non-host from starting game", (done) => {
      hostSocket.emit("room:create", { playerName: "Alice" });

      hostSocket.on("room:created", (data) => {
        roomCode = data.roomCode;

        player2Socket = io("http://localhost:3002", {
          transports: ["websocket"],
        });

        player2Socket.on("connect", () => {
          player2Socket.emit("room:join", { roomCode, playerName: "Bob" });
        });

        player2Socket.on("room:joined", (joinData) => {
          player2Socket.emit("game:start", { roomCode });
        });

        player2Socket.on("error", (error) => {
          expect(error.message).toContain("Only host can start");
          done();
        });
      });
    });

    it("should prevent starting game with insufficient teams", (done) => {
      hostSocket.emit("room:create", { playerName: "Alice" });

      hostSocket.on("room:created", (data) => {
        roomCode = data.roomCode;

        hostSocket.emit("game:start", { roomCode });
      });

      hostSocket.on("error", (error) => {
        expect(error.message).toContain("At least 2 teams");
        done();
      });
    });
  });

  describe("Timer Integration", () => {
    it("should broadcast timer ticks during turn", (done) => {
      let gameStarted = false;
      let tickCount = 0;

      hostSocket.on("room:state", (data) => {
        if (!gameStarted && data.players.length === 4) {
          player2Socket = io("http://localhost:3002", {
            transports: ["websocket"],
          });
          player3Socket = io("http://localhost:3002", {
            transports: ["websocket"],
          });
          player4Socket = io("http://localhost:3002", {
            transports: ["websocket"],
          });

          player2Socket.on("connect", () => {
            player2Socket.emit("room:join", {
              roomCode: data.code,
              playerName: "Bob",
            });
          });

          player3Socket.on("connect", () => {
            player3Socket.emit("room:join", {
              roomCode: data.code,
              playerName: "Charlie",
            });
          });

          player4Socket.on("connect", () => {
            player4Socket.emit("room:join", {
              roomCode: data.code,
              playerName: "Diana",
            });
          });

          setTimeout(() => {
            hostSocket.emit("team:shuffle", { roomCode: data.code });
            setTimeout(() => {
              hostSocket.emit("game:start", { roomCode: data.code });
              gameStarted = true;
            }, 100);
          }, 500);
        }
      });

      hostSocket.on("turn:timer", (data) => {
        tickCount++;
        expect(data.remainingSeconds).toBeDefined();
        expect(data.remainingSeconds).toBeGreaterThanOrEqual(0);

        if (tickCount >= 2) {
          done();
        }
      });

      hostSocket.emit("room:create", { playerName: "Alice" });
    }, 15000);
  });
});
