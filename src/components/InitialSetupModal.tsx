'use client';

import React, { useState, useEffect } from 'react';
import { AppSettings, ALL_BASE_FIELDS, DEFAULT_FIELD_ORDER, DatabaseState } from '../lib/types';
import { Settings, Check, Radio, Circle, RotateCcw, GripVertical, Lock, Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from './AppProvider';
import { LanguageSetting } from '../lib/translations';
import { ConfirmModal } from './ConfirmModal';

interface InitialSetupModalProps {
  isOpen: boolean;
  currentSettings: AppSettings | null;
  databaseState?: DatabaseState;
  onSwitchDatabase?: (id: string) => Promise<void>;
  onCreateDatabase?: (name?: string) => Promise<void>;
  onDeleteDatabase?: (id: string) => Promise<void>;
  onSave: (settings: {
    is_initialized: boolean;
    custom_field_1_name: string | null;
    custom_field_2_name: string | null;
    custom_field_3_name: string | null;
    custom_field_1_display_in_list?: boolean;
    custom_field_2_display_in_list?: boolean;
    custom_field_3_display_in_list?: boolean;
    key_fields: string[];
    field_order?: string[];
    language?: LanguageSetting;
    database_name?: string;
  }) => void;
  onResetData?: () => Promise<void>;
  onClose?: () => void;
}

export const InitialSetupModal: React.FC<InitialSetupModalProps> = ({
  isOpen,
  currentSettings,
  databaseState,
  onSwitchDatabase,
  onCreateDatabase,
  onDeleteDatabase,
  onSave,
  onResetData,
  onClose,
}) => {
  const { t } = useApp();
  const [databaseName, setDatabaseName] = useState('設定ファイル_00');
  const [custom1, setCustom1] = useState('');
  const [custom2, setCustom2] = useState('');
  const [custom3, setCustom3] = useState('');
  const [custom1DisplayInList, setCustom1DisplayInList] = useState(true);
  const [custom2DisplayInList, setCustom2DisplayInList] = useState(true);
  const [custom3DisplayInList, setCustom3DisplayInList] = useState(true);
  const [selectedKeyField, setSelectedKeyField] = useState<string>('genre');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageSetting>('auto');

  // 'title' と 'rating' 以外の項目の並び順ID配列
  const [reorderableFieldIds, setReorderableFieldIds] = useState<string[]>([
    'genre',
    'cast',
    'release_year',
    'release_date',
    'custom_field_1',
    'custom_field_2',
    'custom_field_3',
  ]);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [canDragIndex, setCanDragIndex] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteDbConfirm, setShowDeleteDbConfirm] = useState(false);

  const isLoadedRef = React.useRef(false);
  const loadedDbIdRef = React.useRef<string | null>(null);

  // Sync settings when modal opens or current DB switches
  useEffect(() => {
    if (!isOpen) {
      isLoadedRef.current = false;
      loadedDbIdRef.current = null;
      return;
    }

    const currentDbId = databaseState?.activeId || 'default';
    if (isOpen && currentSettings && (!isLoadedRef.current || loadedDbIdRef.current !== currentDbId)) {
      isLoadedRef.current = true;
      loadedDbIdRef.current = currentDbId;
      setDatabaseName(currentSettings.database_name || '設定ファイル_00');
      setCustom1(currentSettings.custom_field_1_name || '');
      setCustom2(currentSettings.custom_field_2_name || '');
      setCustom3(currentSettings.custom_field_3_name || '');
      setCustom1DisplayInList(currentSettings.custom_field_1_display_in_list !== false);
      setCustom2DisplayInList(currentSettings.custom_field_2_display_in_list !== false);
      setCustom3DisplayInList(currentSettings.custom_field_3_display_in_list !== false);
      setSelectedLanguage(currentSettings.language || 'auto');

      if (currentSettings.key_fields && currentSettings.key_fields.length > 0) {
        setSelectedKeyField(currentSettings.key_fields[0]);
      } else {
        setSelectedKeyField('genre');
      }

      // Initialize field_order without 'title' and 'rating'
      const defaultNonFixed = DEFAULT_FIELD_ORDER.filter((id) => id !== 'title' && id !== 'rating');
      if (currentSettings.field_order && currentSettings.field_order.length > 0) {
        const savedNonFixed = currentSettings.field_order.filter((id) => id !== 'title' && id !== 'rating');
        // Ensure missing fields are appended
        const missing = defaultNonFixed.filter((id) => !savedNonFixed.includes(id));
        setReorderableFieldIds([...savedNonFixed, ...missing]);
      } else {
        setReorderableFieldIds(defaultNonFixed);
      }
    }
  }, [isOpen, currentSettings, databaseState?.activeId]);

  if (!isOpen) return null;

  // Helper to get field label by ID
  const getFieldLabel = (id: string): string => {
    if (id === 'title') return t('field_title');
    if (id === 'genre') return t('field_genre');
    if (id === 'cast') return t('field_cast');
    if (id === 'release_year') return t('field_release_year');
    if (id === 'release_date') return t('field_release_date');
    if (id === 'rating') return t('field_rating');
    if (id === 'custom_field_1') return custom1.trim() || t('field_custom_1_default');
    if (id === 'custom_field_2') return custom2.trim() || t('field_custom_2_default');
    if (id === 'custom_field_3') return custom3.trim() || t('field_custom_3_default');
    return id;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...reorderableFieldIds];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, moved);

    setReorderableFieldIds(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const hasMultipleDbs = Boolean(databaseState && databaseState.databases && databaseState.databases.length > 1);
  const currentDbItem = databaseState?.databases.find((d) => d.id === databaseState?.activeId);
  const currentDbDisplayName = currentDbItem?.name || databaseName;

  const handleDbSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    if (newId && onSwitchDatabase) {
      await onSwitchDatabase(newId);
    }
  };

  const handleAddDatabase = async () => {
    if (onCreateDatabase) {
      await onCreateDatabase();
    }
  };

  const executeDeleteDb = async () => {
    setShowDeleteDbConfirm(false);
    if (onDeleteDatabase && databaseState?.activeId) {
      await onDeleteDatabase(databaseState.activeId);
    }
  };

  const handleSave = () => {
    const fullFieldOrder = ['title', 'rating', ...reorderableFieldIds];
    onSave({
      is_initialized: true,
      database_name: databaseName.trim() || '設定ファイル_00',
      custom_field_1_name: custom1.trim() || null,
      custom_field_2_name: custom2.trim() || null,
      custom_field_3_name: custom3.trim() || null,
      custom_field_1_display_in_list: custom1DisplayInList,
      custom_field_2_display_in_list: custom2DisplayInList,
      custom_field_3_display_in_list: custom3DisplayInList,
      key_fields: [selectedKeyField], // Always single selection
      field_order: fullFieldOrder,
      language: selectedLanguage,
    });
    if (onClose) onClose();
  };

  const handleResetData = () => {
    setShowResetConfirm(true);
  };

  const executeResetData = async () => {
    if (onResetData) {
      await onResetData();
    }
    setCustom1('');
    setCustom2('');
    setCustom3('');
    setCustom1DisplayInList(true);
    setCustom2DisplayInList(true);
    setCustom3DisplayInList(true);
    setSelectedKeyField('genre');
    setSelectedLanguage('auto');
    setReorderableFieldIds(DEFAULT_FIELD_ORDER.filter((id) => id !== 'title' && id !== 'rating'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-card w-full max-w-2xl rounded-2xl border border-slate-700/60 shadow-2xl p-6 md:p-8 space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto select-none">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-700/60 pb-4">
          <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('settings_title')}</h2>
          </div>
        </div>

        {/* Database File Section (Always at the top) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-blue-400 block">
            {t('settings_db_name')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={databaseName}
              onChange={(e) => setDatabaseName(e.target.value)}
              placeholder="例: 設定ファイル_00"
              className="flex-1 bg-slate-900/80 border border-slate-700/70 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 select-text"
            />
            {hasMultipleDbs && databaseState && (
              <select
                value={databaseState.activeId}
                onChange={handleDbSelectChange}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                title={t('settings_db_select')}
              >
                {databaseState.databases.map((db) => (
                  <option key={db.id} value={db.id}>
                    {db.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Section 1: User defined fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
            {t('settings_section1')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 mb-1 block">{t('settings_custom_item1')}</label>
              <input
                type="text"
                value={custom1}
                onChange={(e) => setCustom1(e.target.value)}
                placeholder={t('settings_custom_item1_placeholder')}
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 select-text"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 mb-1 block">{t('settings_custom_item2')}</label>
              <input
                type="text"
                value={custom2}
                onChange={(e) => setCustom2(e.target.value)}
                placeholder={t('settings_custom_item2_placeholder')}
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 select-text"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 mb-1 block">{t('settings_custom_item3')}</label>
              <input
                type="text"
                value={custom3}
                onChange={(e) => setCustom3(e.target.value)}
                placeholder={t('settings_custom_item3_placeholder')}
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 select-text"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Key item selection & Reordering */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
            {t('settings_section2')}
          </h3>
          <p className="text-xs text-slate-400">
            {t('settings_section2_desc')}
          </p>

          <div className="space-y-2">
            {/* Title (Fixed at position 1) */}
            <div
              onClick={() => setSelectedKeyField('title')}
              className={clsx(
                'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer select-none',
                selectedKeyField === 'title'
                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              )}
            >
              <div className="flex items-center gap-3">
                {selectedKeyField === 'title' ? (
                  <Radio className="w-5 h-5 text-blue-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                )}
                <span>{t('field_title')}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                <Lock className="w-3 h-3" />
                <span>{t('settings_fixed_position')}</span>
              </div>
            </div>

            {/* Rating (Fixed at position 2, directly under Title) */}
            <div
              onClick={() => setSelectedKeyField('rating')}
              className={clsx(
                'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer select-none',
                selectedKeyField === 'rating'
                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              )}
            >
              <div className="flex items-center gap-3">
                {selectedKeyField === 'rating' ? (
                  <Radio className="w-5 h-5 text-blue-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                )}
                <span>{t('field_rating')}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                <Lock className="w-3 h-3" />
                <span>{t('settings_fixed_position')}</span>
              </div>
            </div>

            {/* Reorderable Items List */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              {reorderableFieldIds.map((fieldId, index) => {
                const isSelected = selectedKeyField === fieldId;
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <div
                    key={fieldId}
                    draggable={canDragIndex === index}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedKeyField(fieldId)}
                    className={clsx(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer select-none',
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200',
                      isDragging && 'opacity-40 border-dashed border-blue-400',
                      isDragOver && 'border-blue-400 bg-blue-600/10 scale-[1.01]'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300 rounded transition-colors"
                        title={t('settings_drag_to_reorder')}
                        onMouseEnter={() => setCanDragIndex(index)}
                        onMouseLeave={() => setCanDragIndex(null)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {isSelected ? (
                        <Radio className="w-5 h-5 text-blue-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                      )}

                      <span className="truncate">{getFieldLabel(fieldId)}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {fieldId.startsWith('custom_field_') && (
                        <label
                          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={
                              fieldId === 'custom_field_1'
                                ? custom1DisplayInList
                                : fieldId === 'custom_field_2'
                                ? custom2DisplayInList
                                : custom3DisplayInList
                            }
                            onChange={(e) => {
                              if (fieldId === 'custom_field_1') setCustom1DisplayInList(e.target.checked);
                              else if (fieldId === 'custom_field_2') setCustom2DisplayInList(e.target.checked);
                              else if (fieldId === 'custom_field_3') setCustom3DisplayInList(e.target.checked);
                            }}
                            className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>{t('settings_custom_display_in_list')}</span>
                        </label>
                      )}
                      <span className="text-xs text-slate-600 font-mono">#{index + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 3: Language Selection */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
            {t('settings_section3')}
          </h3>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'auto', label: t('settings_lang_auto') },
              { id: 'ja', label: t('settings_lang_ja') },
              { id: 'en', label: t('settings_lang_en') },
            ].map((langOpt) => {
              const isSelected = selectedLanguage === langOpt.id;
              return (
                <button
                  key={langOpt.id}
                  type="button"
                  onClick={() => setSelectedLanguage(langOpt.id as LanguageSetting)}
                  className={clsx(
                    'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left',
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  )}
                >
                  {isSelected ? (
                    <Radio className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <span className="truncate">{langOpt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!hasMultipleDbs ? (
              <button
                type="button"
                onClick={handleResetData}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/40 bg-red-600/10 text-red-400 hover:bg-red-600/20 font-medium text-sm transition-colors"
                title={t('settings_reset_data_tooltip')}
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('resetData')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteDbConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/40 bg-red-600/10 text-red-400 hover:bg-red-600/20 font-medium text-sm transition-colors"
                title={t('settings_delete_db')}
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('settings_delete_db')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddDatabase}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-500/40 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 font-medium text-sm transition-colors"
              title={t('settings_add_db')}
            >
              <Plus className="w-4 h-4" />
              <span>{t('settings_add_db')}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {t('cancel')}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{t('saveSettings')}</span>
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        title={t('resetData')}
        description={t('confirmResetData')}
        confirmText={t('resetData')}
        cancelText={t('cancel')}
        variant="danger"
        onConfirm={executeResetData}
        onClose={() => setShowResetConfirm(false)}
      />

      <ConfirmModal
        isOpen={showDeleteDbConfirm}
        title={t('settings_delete_db')}
        description={t('confirmDeleteDb', { name: currentDbDisplayName })}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        variant="danger"
        onConfirm={executeDeleteDb}
        onClose={() => setShowDeleteDbConfirm(false)}
      />
    </div>
  );
};

