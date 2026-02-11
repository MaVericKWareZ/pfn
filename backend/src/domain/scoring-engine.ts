export interface ScoreResult {
  points: number;
  description: string;
}

export interface IScoringEngine {
  scoreEasyWord(): ScoreResult;
  scoreHardPhrase(): ScoreResult;
  scorePenalty(): ScoreResult;
  scoreSkip(): ScoreResult;
}

export class ScoringEngine implements IScoringEngine {
  private static readonly EASY_WORD_POINTS = 1;
  private static readonly HARD_PHRASE_POINTS = 3;
  private static readonly PENALTY_POINTS = -1;
  private static readonly SKIP_POINTS = -1;

  scoreEasyWord(): ScoreResult {
    return {
      points: ScoringEngine.EASY_WORD_POINTS,
      description: "Correct 1-point word",
    };
  }

  scoreHardPhrase(): ScoreResult {
    return {
      points: ScoringEngine.HARD_PHRASE_POINTS,
      description: "Correct 3-point phrase",
    };
  }

  scorePenalty(): ScoreResult {
    return {
      points: ScoringEngine.PENALTY_POINTS,
      description: "NO! penalty",
    };
  }

  scoreSkip(): ScoreResult {
    return {
      points: ScoringEngine.SKIP_POINTS,
      description: "Card skipped",
    };
  }
}
