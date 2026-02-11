'use client';

import { CardRevealedData } from '@/types';

interface CardRevealOverlayProps {
  cardRevealed: CardRevealedData;
}

export function CardRevealOverlay({ cardRevealed }: CardRevealOverlayProps) {
  const { card, reason, pointsEarned } = cardRevealed;

  const getReasonText = () => {
    switch (reason) {
      case 'easy':
        return 'Easy Word Guessed!';
      case 'hard':
        return 'Hard Phrase Guessed!';
      case 'skip':
        return 'Card Skipped';
      case 'no':
        return 'NO! Called';
      default:
        return 'Card Completed';
    }
  };

  const getReasonColor = () => {
    switch (reason) {
      case 'easy':
      case 'hard':
        return 'text-green-400';
      case 'skip':
      case 'no':
        return 'text-red-400';
      default:
        return 'text-caveman-tan';
    }
  };

  const getPointsColor = () => {
    return pointsEarned > 0 ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="caveman-card p-8 max-w-2xl w-full mx-4 animate-scale-in">
        <div className={`text-3xl font-bold mb-6 text-center ${getReasonColor()}`}>
          {getReasonText()}
        </div>

        <div className="bg-caveman-brown/30 rounded-lg p-6 mb-6">
          <div className="text-center mb-4">
            <div className="text-sm text-caveman-tan/60 mb-2">Easy Word</div>
            <div className="text-4xl font-bold text-caveman-orange">
              {card.easyWord}
            </div>
          </div>

          <div className="border-t-2 border-caveman-tan/20 my-4"></div>

          <div className="text-center">
            <div className="text-sm text-caveman-tan/60 mb-2">Hard Phrase</div>
            <div className="text-2xl font-semibold text-caveman-tan">
              {card.hardPhrase}
            </div>
          </div>
        </div>

        <div className={`text-center text-3xl font-bold ${getPointsColor()}`}>
          {pointsEarned > 0 ? '+' : ''}{pointsEarned} {Math.abs(pointsEarned) === 1 ? 'point' : 'points'}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
