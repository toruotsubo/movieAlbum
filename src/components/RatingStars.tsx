'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from './AppProvider';

interface RatingStarsProps {
  rating: number; // 1 - 5
  onChange?: (newRating: number) => void;
  readOnly?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  onChange,
  readOnly = false,
  size = 'md',
}) => {
  const { t } = useApp();
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div
      className="flex items-center gap-1"
      onMouseLeave={() => !readOnly && setHoverRating(null)}
      onClick={(e) => e.stopPropagation()} // Prevent parent click events
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const isFilled = starIndex <= displayRating;
        return (
          <button
            key={starIndex}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHoverRating(starIndex)}
            onClick={() => !readOnly && onChange && onChange(starIndex)}
            className={clsx(
              'transition-all duration-150 transform hover:scale-110 focus:outline-none',
              readOnly ? 'cursor-default' : 'cursor-pointer'
            )}
            title={t('rating_tooltip', { rating: starIndex })}
          >
            <Star
              className={clsx(
                starSizes[size],
                isFilled
                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                  : 'fill-slate-700/50 text-slate-500'
              )}
            />
          </button>
        );
      })}
    </div>
  );
};
