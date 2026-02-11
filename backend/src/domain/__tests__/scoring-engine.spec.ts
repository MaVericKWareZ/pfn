import { ScoringEngine } from "../scoring-engine";

describe("ScoringEngine", () => {
  let scoringEngine: ScoringEngine;

  beforeEach(() => {
    scoringEngine = new ScoringEngine();
  });

  describe("scoreEasyWord", () => {
    it("should return +1 point for easy word", () => {
      const result = scoringEngine.scoreEasyWord();

      expect(result.points).toBe(1);
      expect(result.description).toBe("Correct 1-point word");
    });

    it("should return consistent results on multiple calls", () => {
      const result1 = scoringEngine.scoreEasyWord();
      const result2 = scoringEngine.scoreEasyWord();

      expect(result1).toEqual(result2);
    });
  });

  describe("scoreHardPhrase", () => {
    it("should return +3 points for hard phrase", () => {
      const result = scoringEngine.scoreHardPhrase();

      expect(result.points).toBe(3);
      expect(result.description).toBe("Correct 3-point phrase");
    });

    it("should return consistent results on multiple calls", () => {
      const result1 = scoringEngine.scoreHardPhrase();
      const result2 = scoringEngine.scoreHardPhrase();

      expect(result1).toEqual(result2);
    });
  });

  describe("scorePenalty", () => {
    it("should return -1 point for penalty", () => {
      const result = scoringEngine.scorePenalty();

      expect(result.points).toBe(-1);
      expect(result.description).toBe("NO! penalty");
    });

    it("should apply negative points correctly", () => {
      const result = scoringEngine.scorePenalty();

      expect(result.points).toBeLessThan(0);
    });
  });

  describe("scoreSkip", () => {
    it("should return -1 point for skip", () => {
      const result = scoringEngine.scoreSkip();

      expect(result.points).toBe(-1);
      expect(result.description).toBe("Card skipped");
    });

    it("should apply negative points correctly", () => {
      const result = scoringEngine.scoreSkip();

      expect(result.points).toBeLessThan(0);
    });
  });

  describe("scoring combinations", () => {
    it("should calculate correct total for easy word + hard phrase", () => {
      const easy = scoringEngine.scoreEasyWord();
      const hard = scoringEngine.scoreHardPhrase();

      expect(easy.points + hard.points).toBe(4);
    });

    it("should calculate correct total for hard phrase with penalty", () => {
      const hard = scoringEngine.scoreHardPhrase();
      const penalty = scoringEngine.scorePenalty();

      expect(hard.points + penalty.points).toBe(2);
    });

    it("should calculate correct total for skip and penalty", () => {
      const skip = scoringEngine.scoreSkip();
      const penalty = scoringEngine.scorePenalty();

      expect(skip.points + penalty.points).toBe(-2);
    });
  });
});
