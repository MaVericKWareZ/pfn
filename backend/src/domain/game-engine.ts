import {
  GameState,
  GameConfig,
  Team,
  Player,
  Turn,
  Card,
  CardAttempt,
  PlayerId,
  TeamId,
  PlayerRole,
  TurnEndReason,
  DEFAULT_GAME_CONFIG,
  RoundStats,
  GameSummary,
} from "./types";
import { ScoringEngine, IScoringEngine } from "./scoring-engine";
import { DeckManager, IDeckManager } from "./deck-manager";

export interface GameEngineState {
  state: GameState;
  teams: Team[];
  players: Map<PlayerId, Player>;
  currentTurn: Turn | null;
  turnNumber: number;
  config: GameConfig;
  currentTeamIndex: number;
  turnsPerTeam: Map<TeamId, number>;
  completedTurns: Turn[];
  gameStartTime: number | null;
}

/** JSON-safe version of GameEngineState for MongoDB persistence */
export interface SerializableGameEngineState {
  state: GameState;
  teams: Team[];
  players: [PlayerId, Player][];
  currentTurn: Turn | null;
  turnNumber: number;
  config: GameConfig;
  currentTeamIndex: number;
  turnsPerTeam: [TeamId, number][];
  poetIndexPerTeam: [TeamId, number][];
  completedTurns: Turn[];
  gameStartTime: number | null;
}

export interface IGameEngine {
  getState(): GameEngineState;
  startGame(): void;
  startTurn(): Turn;
  endTurn(reason: TurnEndReason): Turn;
  markEasyWordGuessed(): number;
  markHardPhraseGuessed(): number;
  skipCard(): { points: number; newCard: Card | null };
  isGameOver(): boolean;
  getWinningTeam(): Team | null;
  endGameManually(): void;
  getGameSummary(): GameSummary;
  canEndGameManually(): boolean;
}

export class GameEngine implements IGameEngine {
  private state: GameState;
  private teams: Team[];
  private players: Map<PlayerId, Player>;
  private currentTurn: Turn | null;
  private turnNumber: number;
  private config: GameConfig;
  private currentTeamIndex: number;
  private turnsPerTeam: Map<TeamId, number>;
  private scoringEngine: IScoringEngine;
  private deckManager: IDeckManager;
  private poetIndexPerTeam: Map<TeamId, number>;
  private completedTurns: Turn[];
  private gameStartTime: number | null;

  constructor(
    teams: Team[],
    players: Map<PlayerId, Player>,
    deckManager: IDeckManager,
    config: GameConfig = DEFAULT_GAME_CONFIG,
    scoringEngine: IScoringEngine = new ScoringEngine(),
  ) {
    this.state = GameState.LOBBY;
    this.teams = teams;
    this.players = players;
    this.currentTurn = null;
    this.turnNumber = 0;
    this.config = config;
    this.currentTeamIndex = 0;
    this.turnsPerTeam = new Map();
    this.scoringEngine = scoringEngine;
    this.deckManager = deckManager;
    this.poetIndexPerTeam = new Map();
    this.completedTurns = [];
    this.gameStartTime = null;

    for (const team of teams) {
      this.turnsPerTeam.set(team.id, 0);
      this.poetIndexPerTeam.set(team.id, 0);
    }
  }

  getState(): GameEngineState {
    return {
      state: this.state,
      teams: this.teams,
      players: this.players,
      currentTurn: this.currentTurn,
      turnNumber: this.turnNumber,
      config: this.config,
      currentTeamIndex: this.currentTeamIndex,
      turnsPerTeam: this.turnsPerTeam,
      completedTurns: this.completedTurns,
      gameStartTime: this.gameStartTime,
    };
  }

  /**
   * Serializes the engine state into a plain JSON-safe object
   * suitable for MongoDB storage (no Maps, no class instances).
   */
  toSerializable(): SerializableGameEngineState {
    return {
      state: this.state,
      teams: this.teams,
      players: Array.from(this.players.entries()),
      currentTurn: this.currentTurn,
      turnNumber: this.turnNumber,
      config: this.config,
      currentTeamIndex: this.currentTeamIndex,
      turnsPerTeam: Array.from(this.turnsPerTeam.entries()),
      poetIndexPerTeam: Array.from(this.poetIndexPerTeam.entries()),
      completedTurns: this.completedTurns,
      gameStartTime: this.gameStartTime,
    };
  }

  /**
   * Reconstructs a GameEngine from serialized state.
   */
  static fromSerializable(
    data: SerializableGameEngineState,
    deckManager: IDeckManager,
    scoringEngine: IScoringEngine = new ScoringEngine(),
  ): GameEngine {
    const players = new Map<PlayerId, Player>(data.players);
    const engine = new GameEngine(
      data.teams,
      players,
      deckManager,
      data.config,
      scoringEngine,
    );

    // Restore internal state
    engine.state = data.state;
    engine.currentTurn = data.currentTurn;
    engine.turnNumber = data.turnNumber;
    engine.currentTeamIndex = data.currentTeamIndex;
    engine.turnsPerTeam = new Map(data.turnsPerTeam);
    engine.poetIndexPerTeam = new Map(data.poetIndexPerTeam);
    engine.completedTurns = data.completedTurns;
    engine.gameStartTime = data.gameStartTime;

    return engine;
  }

  startGame(): void {
    if (this.state !== GameState.LOBBY) {
      throw new Error("Game can only be started from LOBBY state");
    }

    if (this.teams.length < 2) {
      throw new Error("At least 2 teams are required to start");
    }

    for (const team of this.teams) {
      if (team.playerIds.length === 0) {
        throw new Error(`Team ${team.name} has no players`);
      }
    }

    this.deckManager.shuffle();
    this.state = GameState.PLAYING;
    this.turnNumber = 0;
    this.currentTeamIndex = 0;
    this.gameStartTime = Date.now();
  }

  startTurn(): Turn {
    if (
      this.state !== GameState.PLAYING &&
      this.state !== GameState.TURN_ENDED
    ) {
      throw new Error("Cannot start turn in current state");
    }

    const card = this.deckManager.draw();
    if (!card) {
      this.deckManager.reset();
      this.deckManager.shuffle();
      const newCard = this.deckManager.draw();
      if (!newCard) {
        throw new Error("No cards available");
      }
    }

    const currentTeam = this.teams[this.currentTeamIndex];
    const opposingTeam =
      this.teams[(this.currentTeamIndex + 1) % this.teams.length];

    const poetId = this.selectNextPoet(currentTeam);
    const judgeId = this.selectJudge(opposingTeam);

    this.assignRoles(currentTeam.id, poetId, opposingTeam.id, judgeId);

    const drawnCard = card ?? this.deckManager.draw()!;

    this.currentTurn = {
      teamId: currentTeam.id,
      poetId,
      judgeId,
      currentCard: drawnCard,
      cardsAttempted: [],
      currentCardEasyGuessed: false,
      currentCardHardGuessed: false,
      startTime: Date.now(),
      endTime: null,
      endReason: null,
      pointsEarned: 0,
    };

    this.state = GameState.TURN_ACTIVE;
    this.turnNumber++;

    return this.currentTurn;
  }

  endTurn(reason: TurnEndReason): Turn {
    if (this.state !== GameState.TURN_ACTIVE || !this.currentTurn) {
      throw new Error("No active turn to end");
    }

    this.currentTurn.endTime = Date.now();
    this.currentTurn.endReason = reason;

    const currentTeam = this.teams.find(
      (t) => t.id === this.currentTurn!.teamId,
    );
    if (currentTeam) {
      currentTeam.score += this.currentTurn.pointsEarned;
    }

    const teamTurns = this.turnsPerTeam.get(this.currentTurn.teamId) ?? 0;
    this.turnsPerTeam.set(this.currentTurn.teamId, teamTurns + 1);

    this.completedTurns.push({ ...this.currentTurn });

    this.resetRoles();

    this.currentTeamIndex = (this.currentTeamIndex + 1) % this.teams.length;

    if (this.isGameOver()) {
      this.state = GameState.GAME_OVER;
    } else {
      this.state = GameState.TURN_ENDED;
    }

    return this.currentTurn;
  }

  markEasyWordGuessed(): number {
    if (!this.currentTurn || this.state !== GameState.TURN_ACTIVE) {
      throw new Error("No active turn");
    }

    if (this.currentTurn.currentCardEasyGuessed) {
      return 0;
    }

    this.currentTurn.currentCardEasyGuessed = true;
    const result = this.scoringEngine.scoreEasyWord();
    this.currentTurn.pointsEarned += result.points;

    this.saveCurrentCardAndDrawNext();

    return result.points;
  }

  markHardPhraseGuessed(): number {
    if (!this.currentTurn || this.state !== GameState.TURN_ACTIVE) {
      throw new Error("No active turn");
    }

    if (this.currentTurn.currentCardHardGuessed) {
      return 0;
    }

    this.currentTurn.currentCardHardGuessed = true;
    const result = this.scoringEngine.scoreHardPhrase();
    this.currentTurn.pointsEarned += result.points;

    this.saveCurrentCardAndDrawNext();

    return result.points;
  }

  skipCard(): { points: number; newCard: Card | null } {
    if (!this.currentTurn || this.state !== GameState.TURN_ACTIVE) {
      throw new Error("No active turn");
    }

    const result = this.scoringEngine.scoreSkip();
    this.currentTurn.pointsEarned += result.points;

    this.currentTurn.cardsAttempted.push({
      card: this.currentTurn.currentCard,
      easyWordGuessed: this.currentTurn.currentCardEasyGuessed,
      hardPhraseGuessed: this.currentTurn.currentCardHardGuessed,
      pointsEarned: result.points,
      skipped: true,
    });

    let newCard = this.deckManager.draw();
    if (!newCard) {
      this.deckManager.reset();
      this.deckManager.shuffle();
      newCard = this.deckManager.draw();
    }

    if (newCard) {
      this.currentTurn.currentCard = newCard;
      this.currentTurn.currentCardEasyGuessed = false;
      this.currentTurn.currentCardHardGuessed = false;
    }

    return { points: result.points, newCard };
  }

  private saveCurrentCardAndDrawNext(): void {
    if (!this.currentTurn) return;

    this.currentTurn.cardsAttempted.push({
      card: this.currentTurn.currentCard,
      easyWordGuessed: this.currentTurn.currentCardEasyGuessed,
      hardPhraseGuessed: this.currentTurn.currentCardHardGuessed,
      pointsEarned: this.currentTurn.currentCardHardGuessed
        ? 3
        : this.currentTurn.currentCardEasyGuessed
          ? 1
          : 0,
      skipped: false,
    });

    let newCard = this.deckManager.draw();
    if (!newCard) {
      this.deckManager.reset();
      this.deckManager.shuffle();
      newCard = this.deckManager.draw();
    }

    if (newCard) {
      this.currentTurn.currentCard = newCard;
      this.currentTurn.currentCardEasyGuessed = false;
      this.currentTurn.currentCardHardGuessed = false;
    }
  }

  isGameOver(): boolean {
    // Check if maxTurns is set and reached
    if (this.config.maxTurns && this.turnNumber >= this.config.maxTurns) {
      return true;
    }

    const totalTurnsPerTeam = this.config.roundsPerTeam;

    for (const team of this.teams) {
      const turns = this.turnsPerTeam.get(team.id) ?? 0;
      if (turns < totalTurnsPerTeam) {
        return false;
      }
    }

    return true;
  }

  getWinningTeam(): Team | null {
    if (this.state !== GameState.GAME_OVER) {
      return null;
    }

    let maxScore = -Infinity;
    let winningTeam: Team | null = null;

    for (const team of this.teams) {
      if (team.score > maxScore) {
        maxScore = team.score;
        winningTeam = team;
      }
    }

    return winningTeam;
  }

  private selectNextPoet(team: Team): PlayerId {
    const poetIndex = this.poetIndexPerTeam.get(team.id) ?? 0;
    const poetId = team.playerIds[poetIndex % team.playerIds.length];
    this.poetIndexPerTeam.set(team.id, poetIndex + 1);
    return poetId;
  }

  private selectJudge(team: Team): PlayerId {
    return team.playerIds[0];
  }

  private assignRoles(
    activeTeamId: TeamId,
    poetId: PlayerId,
    opposingTeamId: TeamId,
    judgeId: PlayerId,
  ): void {
    for (const [playerId, player] of this.players) {
      if (playerId === poetId) {
        player.role = PlayerRole.POET;
      } else if (playerId === judgeId) {
        player.role = PlayerRole.JUDGE;
      } else if (player.teamId === activeTeamId) {
        player.role = PlayerRole.GUESSER;
      } else {
        player.role = PlayerRole.SPECTATOR;
      }
    }
  }

  private resetRoles(): void {
    for (const player of this.players.values()) {
      player.role = PlayerRole.SPECTATOR;
    }
  }

  canEndGameManually(): boolean {
    const minTurnsPerTeam = Math.min(...Array.from(this.turnsPerTeam.values()));
    return minTurnsPerTeam > 0 && this.areAllTeamsTurnCountsEqual();
  }

  private areAllTeamsTurnCountsEqual(): boolean {
    const turnCounts = Array.from(this.turnsPerTeam.values());
    if (turnCounts.length === 0) return false;
    const firstCount = turnCounts[0];
    return turnCounts.every((count) => count === firstCount);
  }

  endGameManually(): void {
    if (!this.canEndGameManually()) {
      throw new Error(
        "Cannot end game manually: teams must have equal number of turns",
      );
    }

    if (
      this.state !== GameState.PLAYING &&
      this.state !== GameState.TURN_ENDED
    ) {
      throw new Error("Game is not in a state that can be ended");
    }

    this.state = GameState.GAME_OVER;
  }

  getGameSummary(): GameSummary {
    if (this.state !== GameState.GAME_OVER) {
      throw new Error("Game is not over yet");
    }

    const winningTeam = this.getWinningTeam();
    const roundStats: RoundStats[] = [];

    for (const turn of this.completedTurns) {
      const team = this.teams.find((t) => t.id === turn.teamId);
      const poet = this.players.get(turn.poetId);

      const cardsCompleted = turn.cardsAttempted.filter(
        (ca) => !ca.skipped && (ca.easyWordGuessed || ca.hardPhraseGuessed),
      ).length;
      const cardsSkipped = turn.cardsAttempted.filter(
        (ca) => ca.skipped,
      ).length;

      roundStats.push({
        roundNumber:
          roundStats.filter((rs) => rs.teamId === turn.teamId).length + 1,
        teamId: turn.teamId,
        teamName: team?.name ?? "Unknown",
        poetName: poet?.name ?? "Unknown",
        cardsAttempted: turn.cardsAttempted.length,
        cardsCompleted,
        cardsSkipped,
        pointsEarned: turn.pointsEarned,
        duration: turn.endTime ? turn.endTime - turn.startTime : 0,
      });
    }

    const teamSummaries = this.teams.map((team) => {
      const teamTurns = this.completedTurns.filter((t) => t.teamId === team.id);
      const totalCardsAttempted = teamTurns.reduce(
        (sum, t) => sum + t.cardsAttempted.length,
        0,
      );
      const totalCardsCompleted = teamTurns.reduce(
        (sum, t) =>
          sum +
          t.cardsAttempted.filter(
            (ca) => !ca.skipped && (ca.easyWordGuessed || ca.hardPhraseGuessed),
          ).length,
        0,
      );
      const totalCardsSkipped = teamTurns.reduce(
        (sum, t) => sum + t.cardsAttempted.filter((ca) => ca.skipped).length,
        0,
      );

      return {
        id: team.id,
        name: team.name,
        score: team.score,
        totalCardsAttempted,
        totalCardsCompleted,
        totalCardsSkipped,
      };
    });

    const gameDuration = this.gameStartTime
      ? Date.now() - this.gameStartTime
      : 0;

    return {
      winningTeamId: winningTeam?.id ?? null,
      winningTeamName: winningTeam?.name ?? null,
      teams: teamSummaries,
      roundStats,
      totalRounds: this.completedTurns.length,
      gameDuration,
    };
  }
}
