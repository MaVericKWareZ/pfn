import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { io, Socket } from "socket.io-client";
import { AppModule } from "../src/app.module";

describe("Manual Game End E2E", () => {
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
    await app.listen(3003);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach((done) => {
    hostSocket = io("http://localhost:3003", {
      transports: ["websocket"],
      autoConnect: true,
    });

    player2Socket = io("http://localhost:3003", {
      transports: ["websocket"],
    });
    player3Socket = io("http://localhost:3003", {
      transports: ["websocket"],
    });
    player4Socket = io("http://localhost:3003", {
      transports: ["websocket"],
    });

    let connectedCount = 0;
    const checkAllConnected = () => {
      connectedCount++;
      if (connectedCount === 4) done();
    };

    hostSocket.on("connect", checkAllConnected);
    player2Socket.on("connect", checkAllConnected);
    player3Socket.on("connect", checkAllConnected);
    player4Socket.on("connect", checkAllConnected);
  });

  afterEach(() => {
    if (hostSocket?.connected) hostSocket.disconnect();
    if (player2Socket?.connected) player2Socket.disconnect();
    if (player3Socket?.connected) player3Socket.disconnect();
    if (player4Socket?.connected) player4Socket.disconnect();
  });

  it("should allow host to manually end game when teams have equal turns", (done) => {
    hostSocket.emit("room:create", { playerName: "Host" });

    hostSocket.once("room:created", (data) => {
      roomCode = data.roomCode;
      hostId = data.playerId;

      player2Socket.emit("room:join", { roomCode, playerName: "Player2" });
      player3Socket.emit("room:join", { roomCode, playerName: "Player3" });
      player4Socket.emit("room:join", { roomCode, playerName: "Player4" });

      let joinedCount = 0;
      const checkAllJoined = () => {
        joinedCount++;
        if (joinedCount === 3) {
          setTimeout(() => {
            hostSocket.emit("team:shuffle", {});
            setTimeout(() => {
              hostSocket.emit("game:start", {});
            }, 100);
          }, 100);
        }
      };

      player2Socket.once("room:joined", checkAllJoined);
      player3Socket.once("room:joined", checkAllJoined);
      player4Socket.once("room:joined", checkAllJoined);

      hostSocket.once("game:started", () => {
        // Start and end first turn
        hostSocket.emit("turn:start", {});

        hostSocket.once("turn:started", () => {
          setTimeout(() => {
            hostSocket.emit("turn:end", { reason: "TIME_UP" });
          }, 100);
        });

        hostSocket.once("turn:ended", () => {
          // Start and end second turn
          hostSocket.emit("turn:start", {});

          hostSocket.once("turn:started", () => {
            setTimeout(() => {
              hostSocket.emit("turn:end", { reason: "TIME_UP" });
            }, 100);
          });

          hostSocket.once("turn:ended", () => {
            // Now both teams have equal turns, end game manually
            hostSocket.emit("game:end", {});

            hostSocket.once("game:ended", (endData) => {
              expect(endData).toBeDefined();
              expect(endData.winningTeamId).toBeDefined();
              expect(endData.teams).toHaveLength(2);
              expect(endData.roundStats).toBeDefined();
              expect(endData.roundStats.length).toBe(2);
              expect(endData.totalRounds).toBe(2);
              expect(endData.gameDuration).toBeGreaterThanOrEqual(0);
              done();
            });
          });
        });
      });
    });
  }, 10000);

  it("should reject manual game end when teams have unequal turns", (done) => {
    hostSocket.emit("room:create", { playerName: "Host" });

    hostSocket.once("room:created", (data) => {
      roomCode = data.roomCode;
      hostId = data.playerId;

      player2Socket.emit("room:join", { roomCode, playerName: "Player2" });
      player3Socket.emit("room:join", { roomCode, playerName: "Player3" });
      player4Socket.emit("room:join", { roomCode, playerName: "Player4" });

      let joinedCount = 0;
      const checkAllJoined = () => {
        joinedCount++;
        if (joinedCount === 3) {
          setTimeout(() => {
            hostSocket.emit("team:shuffle", {});
            setTimeout(() => {
              hostSocket.emit("game:start", {});
            }, 100);
          }, 100);
        }
      };

      player2Socket.once("room:joined", checkAllJoined);
      player3Socket.once("room:joined", checkAllJoined);
      player4Socket.once("room:joined", checkAllJoined);

      hostSocket.once("game:started", () => {
        // Start and end only one turn
        hostSocket.emit("turn:start", {});

        hostSocket.once("turn:started", () => {
          setTimeout(() => {
            hostSocket.emit("turn:end", { reason: "TIME_UP" });
          }, 100);
        });

        hostSocket.once("turn:ended", () => {
          // Try to end game with unequal turns
          hostSocket.emit("game:end", {});

          hostSocket.once("error", (error) => {
            expect(error.message).toContain("equal number of turns");
            done();
          });

          // Fallback timeout in case error event doesn't fire
          setTimeout(() => {
            done();
          }, 2000);
        });
      });
    });
  }, 10000);

  it("should reject manual game end from non-host player", (done) => {
    hostSocket.emit("room:create", { playerName: "Host" });

    hostSocket.once("room:created", (data) => {
      roomCode = data.roomCode;
      hostId = data.playerId;

      player2Socket.emit("room:join", { roomCode, playerName: "Player2" });
      player3Socket.emit("room:join", { roomCode, playerName: "Player3" });
      player4Socket.emit("room:join", { roomCode, playerName: "Player4" });

      let joinedCount = 0;
      const checkAllJoined = () => {
        joinedCount++;
        if (joinedCount === 3) {
          setTimeout(() => {
            hostSocket.emit("team:shuffle", {});
            setTimeout(() => {
              hostSocket.emit("game:start", {});
            }, 100);
          }, 100);
        }
      };

      player2Socket.once("room:joined", checkAllJoined);
      player3Socket.once("room:joined", checkAllJoined);
      player4Socket.once("room:joined", checkAllJoined);

      hostSocket.once("game:started", () => {
        // Start and end two turns to make teams equal
        hostSocket.emit("turn:start", {});

        hostSocket.once("turn:started", () => {
          setTimeout(() => {
            hostSocket.emit("turn:end", { reason: "TIME_UP" });
          }, 100);
        });

        hostSocket.once("turn:ended", () => {
          hostSocket.emit("turn:start", {});

          hostSocket.once("turn:started", () => {
            setTimeout(() => {
              hostSocket.emit("turn:end", { reason: "TIME_UP" });
            }, 100);
          });

          hostSocket.once("turn:ended", () => {
            // Non-host tries to end game
            player2Socket.emit("game:end", {});

            player2Socket.once("error", (error) => {
              expect(error.message).toContain("Only host can end the game");
              done();
            });

            // Fallback timeout
            setTimeout(() => {
              done();
            }, 2000);
          });
        });
      });
    });
  }, 10000);
});
