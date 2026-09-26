'use client';

import React from 'react';
import { AppSettings, DEFAULT_FIELD_ORDER } from '../../lib/types';
import { RatingStars } from '../RatingStars';
import { useApp } from '../AppProvider';
import { getKeyFieldLabel, split8DigitYear } from '../../lib/utils';

export interface MovieFormData {
  title: string;
  genre: string;
  cast: string;
  castKana: string;
  releaseYear: number | string;
  releaseDate: string;
  rating: number;
  comment: string;
  tags: string;
  custom1: string;
  custom2: string;
  custom3: string;
  isGrouped: boolean;
}

interface MovieMetadataFieldsProps {
  formData: MovieFormData;
  settings: AppSettings | null;
  showKana: boolean;
  onFieldChange: <K extends keyof MovieFormData>(field: K, value: MovieFormData[K]) => void;
  onToggleGrouping: () => void;
}

export const MovieMetadataFields: React.FC<MovieMetadataFieldsProps> = ({
  formData,
  settings,
  showKana,
  onFieldChange,
  onToggleGrouping,
}) => {
  const { t } = useApp();

  const handleReleaseYearChange = (rawVal: string) => {
    const normalized = rawVal.trim().replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    const splitResult = split8DigitYear(normalized);
    if (splitResult) {
      onFieldChange('releaseYear', splitResult.year);
      onFieldChange('releaseDate', splitResult.date);
      return;
    }
    if (/^\d*$/.test(normalized)) {
      onFieldChange('releaseYear', normalized);
    }
  };

  const handleReleaseYearBlur = () => {
    const splitResult = split8DigitYear(formData.releaseYear);
    if (splitResult) {
      onFieldChange('releaseYear', splitResult.year);
      onFieldChange('releaseDate', splitResult.date);
    }
  };

  const getKeyFieldsLabel = () => {
    const keyFields = settings?.key_fields || ['genre'];
    return keyFields.map((kf) => getKeyFieldLabel(kf, settings, t)).join(' / ');
  };

  const order = settings?.field_order || DEFAULT_FIELD_ORDER;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Title */}
      <div className="md:col-span-2">
        <label className="text-xs text-slate-400 mb-1 block">{t('field_title')}</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onFieldChange('title', e.target.value)}
          placeholder={t('form_title_placeholder')}
          className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Rating (Under Title) */}
      <div className="md:col-span-2 flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <span className="text-sm text-slate-300 font-medium">{t('form_rating_label')}</span>
        <RatingStars rating={formData.rating} onChange={(r) => onFieldChange('rating', r)} size="lg" />
      </div>

      {/* Dynamic Field Ordering */}
      {order.map((fieldId) => {
        if (fieldId === 'title' || fieldId === 'rating') return null;

        if (fieldId === 'genre') {
          return (
            <div key="genre">
              <label className="text-xs text-slate-400 mb-1 block">{t('field_genre')}</label>
              <input
                type="text"
                value={formData.genre}
                onChange={(e) => onFieldChange('genre', e.target.value)}
                placeholder={t('form_genre_placeholder')}
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          );
        }

        if (fieldId === 'cast') {
          return (
            <React.Fragment key="cast">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">{t('field_cast')}</label>
                <input
                  type="text"
                  value={formData.cast}
                  onChange={(e) => onFieldChange('cast', e.target.value)}
                  placeholder={t('form_cast_placeholder')}
                  className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              {showKana && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">{t('field_cast_kana')}</label>
                  <input
                    type="text"
                    value={formData.castKana}
                    onChange={(e) => onFieldChange('castKana', e.target.value)}
                    placeholder={t('form_cast_kana_placeholder')}
                    className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </React.Fragment>
          );
        }

        if (fieldId === 'release_year') {
          return (
            <div key="release_year">
              <label className="text-xs text-slate-400 mb-1 block">{t('form_release_year_label')}</label>
              <input
                type="text"
                inputMode="numeric"
                value={formData.releaseYear}
                onChange={(e) => handleReleaseYearChange(e.target.value)}
                onBlur={handleReleaseYearBlur}
                placeholder={t('form_release_year_placeholder')}
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          );
        }

        if (fieldId === 'release_date') {
          return (
            <div key="release_date">
              <label className="text-xs text-slate-400 mb-1 block">{t('form_release_date_label')}</label>
              <input
                type="text"
                value={formData.releaseDate}
                onChange={(e) => onFieldChange('releaseDate', e.target.value)}
                placeholder={t('form_release_date_placeholder')}
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          );
        }

        if (fieldId.startsWith('custom_field_')) {
          const num = fieldId.replace('custom_field_', '') as '1' | '2' | '3';
          const customName =
            num === '1'
              ? settings?.custom_field_1_name
              : num === '2'
              ? settings?.custom_field_2_name
              : settings?.custom_field_3_name;

          if (!customName) return null;

          const val = num === '1' ? formData.custom1 : num === '2' ? formData.custom2 : formData.custom3;
          const fieldKey = `custom${num}` as 'custom1' | 'custom2' | 'custom3';

          return (
            <div key={fieldId}>
              <label className="text-xs text-slate-400 mb-1 block">{customName}</label>
              <input
                type="text"
                value={val}
                onChange={(e) => onFieldChange(fieldKey, e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          );
        }

        return null;
      })}

      {/* Comment */}
      <div className="md:col-span-2">
        <label className="text-xs text-slate-400 mb-1 block">{t('field_comment')}</label>
        <textarea
          value={formData.comment}
          onChange={(e) => onFieldChange('comment', e.target.value)}
          rows={3}
          placeholder={t('form_comment_placeholder')}
          className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Tags */}
      <div className="md:col-span-2">
        <label className="text-xs text-slate-400 mb-1 block">{t('field_tags')}</label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => onFieldChange('tags', e.target.value)}
          placeholder={t('form_tags_placeholder')}
          className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Grouping Option */}
      <div className="md:col-span-2 flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="space-y-0.5">
          <span className="text-sm font-semibold text-slate-200 block">{t('form_grouping_label')}</span>
          <span className="text-xs text-slate-400 block">
            {t('form_grouping_desc', { keyFields: getKeyFieldsLabel() })}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleGrouping}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            formData.isGrouped
              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          {formData.isGrouped ? t('on') : t('off')}
        </button>
      </div>
    </div>
  );
};
