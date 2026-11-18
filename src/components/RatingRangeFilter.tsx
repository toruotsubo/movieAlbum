'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from './AppProvider';

interface RatingRangeFilterProps {
  value: [number, number];
  onChange: (range: [number, number]) => void;
}

type DragTarget = 'min' | 'max' | 'both' | null;

export const RatingRangeFilter: React.FC<RatingRangeFilterProps> = ({
  value,
  onChange,
}) => {
  const { t } = useApp();
  const [min, max] = value;
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const pivotRef = useRef<number>(min);

  const isFiltered = min > 1 || max < 5;

  const getValueFromClientX = useCallback((clientX: number): number => {
    if (!trackRef.current) return 1;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 1;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(1 + ratio * 4);
  }, []);

  useEffect(() => {
    if (!dragTarget) return;

    const handlePointerMove = (e: PointerEvent) => {
      const val = getValueFromClientX(e.clientX);
      if (dragTarget === 'both') {
        const pivot = pivotRef.current;
        if (val < pivot) {
          setDragTarget('min');
          onChange([val, pivot]);
        } else if (val > pivot) {
          setDragTarget('max');
          onChange([pivot, val]);
        } else {
          onChange([pivot, pivot]);
        }
      } else if (dragTarget === 'min') {
        onChange([Math.min(val, max), max]);
      } else if (dragTarget === 'max') {
        onChange([min, Math.max(val, min)]);
      }
    };

    const handlePointerUp = () => {
      setDragTarget(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragTarget, getValueFromClientX, min, max, onChange]);

  const handleThumbPointerDown = (which: 'min' | 'max', e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (min === max) {
      pivotRef.current = min;
      setDragTarget('both');
    } else {
      setDragTarget(which);
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const clickedVal = getValueFromClientX(e.clientX);

    if (min === max) {
      if (clickedVal < min) {
        onChange([clickedVal, max]);
        setDragTarget('min');
      } else if (clickedVal > max) {
        onChange([min, clickedVal]);
        setDragTarget('max');
      } else {
        pivotRef.current = min;
        setDragTarget('both');
      }
      return;
    }

    const distMin = Math.abs(clickedVal - min);
    const distMax = Math.abs(clickedVal - max);

    if (clickedVal <= min || (distMin < distMax)) {
      onChange([Math.min(clickedVal, max), max]);
      setDragTarget('min');
    } else if (clickedVal >= max || (distMax < distMin)) {
      onChange([min, Math.max(clickedVal, min)]);
      setDragTarget('max');
    } else {
      // Equidistant between min and max: move min if left of center, max if right
      onChange([clickedVal, max]);
      setDragTarget('min');
    }
  };

  const handleKeyDown = (which: 'min' | 'max', e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (which === 'min') {
        onChange([Math.max(1, min - 1), max]);
      } else {
        onChange([min, Math.max(min, max - 1)]);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (which === 'min') {
        onChange([Math.min(max, min + 1), max]);
      } else {
        onChange([min, Math.min(5, max + 1)]);
      }
    }
  };

  const minPercent = ((min - 1) / 4) * 100;
  const maxPercent = ((max - 1) / 4) * 100;

  const displayLabel =
    !isFiltered
      ? t('all')
      : min === max
        ? `★${min}`
        : `★${min}〜${max}`;

  return (
    <div className="flex items-center gap-2 select-none">
      <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
        <Star className="w-3.5 h-3.5 text-slate-400" />
        {t('movies_list_filter_rating')}
      </span>

      <div
        className={clsx(
          'flex items-center gap-3 px-3 py-1.5 rounded-xl border transition-colors',
          isFiltered
            ? 'bg-blue-600/15 border-blue-500/60'
            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
        )}
      >
        <span className="text-[11px] font-medium text-slate-400">★1</span>

        {/* Slider Track */}
        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          className="relative w-24 sm:w-28 h-5 flex items-center cursor-pointer touch-none"
        >
          {/* Base Track */}
          <div className="w-full h-1.5 rounded-full bg-slate-700/80 relative">
            {/* Step Dots (1..5) */}
            {[1, 2, 3, 4, 5].map((step) => {
              const pct = ((step - 1) / 4) * 100;
              const inRange = step >= min && step <= max;
              return (
                <span
                  key={step}
                  style={{ left: `${pct}%` }}
                  className={clsx(
                    'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-colors pointer-events-none',
                    inRange ? 'bg-blue-400' : 'bg-slate-600'
                  )}
                />
              );
            })}

            {/* Active Range Bar */}
            <div
              style={{
                left: `${minPercent}%`,
                width: `${maxPercent - minPercent}%`,
              }}
              className="absolute top-0 bottom-0 rounded-full bg-blue-500 transition-all duration-75"
            />
          </div>

          {/* Min Thumb */}
          <div
            role="slider"
            tabIndex={0}
            aria-valuemin={1}
            aria-valuemax={max}
            aria-valuenow={min}
            aria-label="Minimum rating"
            style={{ left: `${minPercent}%` }}
            onPointerDown={(e) => handleThumbPointerDown('min', e)}
            onKeyDown={(e) => handleKeyDown('min', e)}
            className={clsx(
              'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-500 shadow-md transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-grab active:cursor-grabbing hover:scale-110',
              min === 5 ? 'z-20' : 'z-10'
            )}
          />

          {/* Max Thumb */}
          <div
            role="slider"
            tabIndex={0}
            aria-valuemin={min}
            aria-valuemax={5}
            aria-valuenow={max}
            aria-label="Maximum rating"
            style={{ left: `${maxPercent}%` }}
            onPointerDown={(e) => handleThumbPointerDown('max', e)}
            onKeyDown={(e) => handleKeyDown('max', e)}
            className={clsx(
              'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-500 shadow-md transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-grab active:cursor-grabbing hover:scale-110',
              min === 5 ? 'z-10' : 'z-20'
            )}
          />
        </div>

        <span className="text-[11px] font-medium text-slate-400">★5</span>

        {/* Current Range Readout */}
        <span
          className={clsx(
            'text-xs font-semibold min-w-[44px] text-center pl-1 border-l border-slate-800',
            isFiltered ? 'text-blue-200' : 'text-slate-300'
          )}
        >
          {displayLabel}
        </span>
      </div>
    </div>
  );
};

