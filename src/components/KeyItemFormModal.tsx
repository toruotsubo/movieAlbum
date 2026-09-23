'use client';

import React, { useState, useEffect } from 'react';
import { KeyItemGroup } from '@/lib/types';
import { useApp } from '@/components/AppProvider';
import { RatingStars } from '@/components/RatingStars';
import { getKeyFieldLabel } from '@/lib/utils';
import { X, Save } from 'lucide-react';

interface KeyItemFormModalProps {
  isOpen: boolean;
  group: KeyItemGroup | null;
  initialCastKana?: string;
  onSave: (data: { key_signature: string; cast_kana: string; tags: string; rating?: number }) => Promise<void>;
  onClose: () => void;
}

export const KeyItemFormModal: React.FC<KeyItemFormModalProps> = ({
  isOpen,
  group,
  initialCastKana = '',
  onSave,
  onClose,
}) => {
  const { settings, showKana, t } = useApp();
  const [castKana, setCastKana] = useState('');
  const [tags, setTags] = useState('');
  const [rating, setRating] = useState<number>(3);
  const [saving, setSaving] = useState(false);
  const loadedGroupKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !group) {
      loadedGroupKeyRef.current = null;
      return;
    }

    if (loadedGroupKeyRef.current !== group.key_signature) {
      loadedGroupKeyRef.current = group.key_signature;
      setCastKana(initialCastKana || '');
      setTags(group.tags || '');
      setRating(group.rating || 3);
    }
  }, [isOpen, group, initialCastKana]);

  if (!isOpen || !group) return null;

  const keyFieldId = settings?.key_fields && settings.key_fields.length > 0 ? settings.key_fields[0] : 'genre';
  const isCastKey = Boolean(settings?.key_fields?.includes('cast') || (group?.key_values && 'cast' in group.key_values));
  const keyLabel = getKeyFieldLabel(keyFieldId, settings, t);
  const titleString = Object.values(group.key_values).join(' / ');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        key_signature: group.key_signature,
        cast_kana: castKana.trim(),
        tags: tags.trim(),
        rating,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save key item details:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-lg rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div>
            <h2 className="text-lg font-bold text-white">
              {titleString}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Rating Field (Key Item Specific) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('key_modal_rating_label')} ({keyLabel})
            </label>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <RatingStars
                rating={rating}
                onChange={(newRating) => setRating(newRating)}
                size="lg"
              />
            </div>
          </div>

          {/* Cast Kana Field (Only shown in Japanese when key field is 'cast') */}
          {showKana && isCastKey && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {t('key_modal_cast_kana_label')}
              </label>
              <input
                type="text"
                value={castKana}
                onChange={(e) => setCastKana(e.target.value)}
                placeholder={t('key_modal_cast_kana_placeholder')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <p className="text-[11px] text-slate-500">
                {t('key_modal_cast_kana_note', { title: titleString })}
              </p>
            </div>
          )}

          {/* Tags Field (Key Item Specific) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('key_modal_tags_label')} ({keyLabel})
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t('key_modal_tags_placeholder')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 shadow-lg shadow-blue-600/30 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? t('saving') : t('save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
