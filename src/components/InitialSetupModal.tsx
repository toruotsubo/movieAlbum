'use client';

import React, { useState, useEffect } from 'react';
import { AppSettings, ALL_BASE_FIELDS, DEFAULT_FIELD_ORDER, DatabaseState } from '../lib/types';
import { Check, Radio, Circle, RotateCcw, GripVertical, Lock, Plus, Trash2, Globe, ChevronDown, ExternalLink, FileText, Copy, CheckCheck, ChevronRight, Settings, Scale } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from './AppProvider';
import { LanguageSetting } from '../lib/translations';
import { ConfirmModal } from './ConfirmModal';
import { APP_VERSION } from '../lib/version';
import { useFocusTrap } from '../lib/useFocusTrap';

interface InitialSetupModalProps {
  isOpen: boolean;
  currentSettings: AppSettings | null;
  databaseState?: DatabaseState;
  onSwitchDatabase?: (id: string) => Promise<void>;
  onCreateDatabase?: (name?: string) => Promise<void>;
  onDuplicateDatabase?: (name?: string) => Promise<void>;
  onDeleteDatabase?: (id: string) => Promise<void>;
  onSave: (settings: {
    is_initialized: boolean;
    cast_label?: string | null;
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
  onDuplicateDatabase,
  onDeleteDatabase,
  onSave,
  onResetData,
  onClose,
}) => {
  const { t } = useApp();
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
  const [databaseName, setDatabaseName] = useState('設定ファイル_00');
  const [castLabel, setCastLabel] = useState('');
  const [custom1, setCustom1] = useState('');
  const [custom2, setCustom2] = useState('');
  const [custom3, setCustom3] = useState('');
  const [custom1DisplayInList, setCustom1DisplayInList] = useState(true);
  const [custom2DisplayInList, setCustom2DisplayInList] = useState(true);
  const [custom3DisplayInList, setCustom3DisplayInList] = useState(true);
  const [selectedKeyFields, setSelectedKeyFields] = useState<string[]>(['genre']);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageSetting>('auto');
  const [activeTab, setActiveTab] = useState<'settings' | 'licenses'>('settings');

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

  // License state
  const [showLicenseText, setShowLicenseText] = useState(false);
  const [licenseText, setLicenseText] = useState<string>('');
  const [isLicenseCopied, setIsLicenseCopied] = useState(false);
  const [isLoadingLicense, setIsLoadingLicense] = useState(false);

  // Third-party licenses state
  const [showThirdPartyLicenses, setShowThirdPartyLicenses] = useState(false);
  const [thirdPartyLicensesText, setThirdPartyLicensesText] = useState<string>('');
  const [isThirdPartyCopied, setIsThirdPartyCopied] = useState(false);
  const [isLoadingThirdParty, setIsLoadingThirdParty] = useState(false);

  const handleOpenExternal = (url: string) => {
    if (window.api?.openExternal) {
      window.api.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleToggleLicense = async () => {
    if (!showLicenseText) {
      if (!licenseText) {
        setIsLoadingLicense(true);
        try {
          if (window.api?.getFFmpegLicense) {
            const txt = await window.api.getFFmpegLicense();
            setLicenseText(txt);
          } else {
            setLicenseText('GNU General Public License v3.0\nhttps://www.gnu.org/licenses/gpl-3.0.html');
          }
        } catch (err) {
          console.error('Failed to load license text:', err);
        } finally {
          setIsLoadingLicense(false);
        }
      }
      setShowLicenseText(true);
    } else {
      setShowLicenseText(false);
    }
  };

  const handleCopyLicense = () => {
    if (licenseText) {
      navigator.clipboard.writeText(licenseText);
      setIsLicenseCopied(true);
      setTimeout(() => setIsLicenseCopied(false), 2000);
    }
  };

  const handleToggleThirdParty = async () => {
    if (!showThirdPartyLicenses) {
      if (!thirdPartyLicensesText) {
        setIsLoadingThirdParty(true);
        try {
          if (window.api?.getThirdPartyLicenses) {
            const txt = await window.api.getThirdPartyLicenses();
            setThirdPartyLicensesText(txt);
          } else {
            setThirdPartyLicensesText('Third-Party Licenses: Electron, Next.js, React, Tailwind CSS, Lucide React (MIT/Apache-2.0)');
          }
        } catch (err) {
          console.error('Failed to load third party licenses:', err);
        } finally {
          setIsLoadingThirdParty(false);
        }
      }
      setShowThirdPartyLicenses(true);
    } else {
      setShowThirdPartyLicenses(false);
    }
  };

  const handleCopyThirdParty = () => {
    if (thirdPartyLicensesText) {
      navigator.clipboard.writeText(thirdPartyLicensesText);
      setIsThirdPartyCopied(true);
      setTimeout(() => setIsThirdPartyCopied(false), 2000);
    }
  };

  const isLoadedRef = React.useRef(false);
  const loadedDbIdRef = React.useRef<string | null>(null);

  // Sync settings when modal opens or current DB switches
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('settings');
      isLoadedRef.current = false;
      loadedDbIdRef.current = null;
      return;
    }

    const currentDbId = databaseState?.activeId || 'default';
    if (isOpen && currentSettings && (!isLoadedRef.current || loadedDbIdRef.current !== currentDbId)) {
      isLoadedRef.current = true;
      loadedDbIdRef.current = currentDbId;
      setDatabaseName(currentSettings.database_name || '設定ファイル_00');
      setCastLabel(currentSettings.cast_label || '');
      setCustom1(currentSettings.custom_field_1_name || '');
      setCustom2(currentSettings.custom_field_2_name || '');
      setCustom3(currentSettings.custom_field_3_name || '');
      setCustom1DisplayInList(currentSettings.custom_field_1_display_in_list !== false);
      setCustom2DisplayInList(currentSettings.custom_field_2_display_in_list !== false);
      setCustom3DisplayInList(currentSettings.custom_field_3_display_in_list !== false);
      setSelectedLanguage(currentSettings.language || 'auto');

      if (currentSettings.key_fields && currentSettings.key_fields.length > 0) {
        setSelectedKeyFields(currentSettings.key_fields.slice(0, 3));
      } else {
        setSelectedKeyFields(['genre']);
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

  // Check if a field is disabled (custom field with empty name)
  const isFieldDisabled = (id: string): boolean => {
    if (id === 'custom_field_1') return !custom1.trim();
    if (id === 'custom_field_2') return !custom2.trim();
    if (id === 'custom_field_3') return !custom3.trim();
    return false;
  };

  // Helper to get field label by ID
  const getFieldLabel = (id: string): string => {
    if (id === 'title') return t('field_title');
    if (id === 'genre') return t('field_genre');
    if (id === 'cast') return castLabel.trim() || t('field_cast');
    if (id === 'release_year') return t('field_release_year');
    if (id === 'release_date') return t('field_release_date');
    if (id === 'rating') return t('field_rating');
    if (id === 'custom_field_1') return custom1.trim() || t('field_custom_1_default');
    if (id === 'custom_field_2') return custom2.trim() || t('field_custom_2_default');
    if (id === 'custom_field_3') return custom3.trim() || t('field_custom_3_default');
    return id;
  };

  // Automatically remove disabled custom fields from selected key fields
  useEffect(() => {
    if (!isOpen) return;
    const disabledIds: string[] = [];
    if (!custom1.trim()) disabledIds.push('custom_field_1');
    if (!custom2.trim()) disabledIds.push('custom_field_2');
    if (!custom3.trim()) disabledIds.push('custom_field_3');

    if (disabledIds.length > 0) {
      setSelectedKeyFields((prev) => {
        const filtered = prev.filter((id) => !disabledIds.includes(id));
        if (filtered.length === prev.length) return prev;
        return filtered.length > 0 ? filtered : ['genre'];
      });
    }
  }, [isOpen, custom1, custom2, custom3]);

  if (!isOpen) return null;

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

  const handleDuplicateDatabase = async () => {
    if (onDuplicateDatabase) {
      const baseName = currentDbDisplayName || databaseName.trim() || '設定ファイル_00';
      const copyName = t('settings_db_copy_name', { name: baseName });
      await onDuplicateDatabase(copyName);
    }
  };

  const executeDeleteDb = async () => {
    setShowDeleteDbConfirm(false);
    if (onDeleteDatabase && databaseState?.activeId) {
      await onDeleteDatabase(databaseState.activeId);
    }
  };

  const handleToggleKeyField = (fieldId: string) => {
    if (isFieldDisabled(fieldId)) return;
    if (selectedKeyFields.includes(fieldId)) {
      if (selectedKeyFields.length > 1) {
        setSelectedKeyFields(selectedKeyFields.filter((id) => id !== fieldId));
      }
    } else {
      if (selectedKeyFields.length < 3) {
        setSelectedKeyFields([...selectedKeyFields, fieldId]);
      }
    }
  };

  const handleSave = () => {
    const fullFieldOrder = ['title', 'rating', ...reorderableFieldIds];
    const validKeyFields = selectedKeyFields.filter((id) => !isFieldDisabled(id));
    onSave({
      is_initialized: true,
      database_name: databaseName.trim() || '設定ファイル_00',
      cast_label: castLabel.trim() || null,
      custom_field_1_name: custom1.trim() || null,
      custom_field_2_name: custom2.trim() || null,
      custom_field_3_name: custom3.trim() || null,
      custom_field_1_display_in_list: custom1DisplayInList,
      custom_field_2_display_in_list: custom2DisplayInList,
      custom_field_3_display_in_list: custom3DisplayInList,
      key_fields: validKeyFields.length > 0 ? validKeyFields : ['genre'],
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
    setCastLabel('');
    setCustom1('');
    setCustom2('');
    setCustom3('');
    setCustom1DisplayInList(true);
    setCustom2DisplayInList(true);
    setCustom3DisplayInList(true);
    setSelectedKeyFields(['genre']);
    setSelectedLanguage('auto');
    setReorderableFieldIds(DEFAULT_FIELD_ORDER.filter((id) => id !== 'title' && id !== 'rating'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div ref={modalRef} className="glass-card w-full max-w-4xl rounded-2xl border border-slate-700/60 shadow-2xl p-6 md:p-8 space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto select-none">
        {/* Tab Navigation & Version */}
        <div className="flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center gap-2 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer',
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              )}
            >
              <Settings className="w-4 h-4" />
              <span>{t('settings_tab_settings')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('licenses')}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer',
                activeTab === 'licenses'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              )}
            >
              <Scale className="w-4 h-4" />
              <span>{t('settings_tab_licenses')}</span>
            </button>
          </div>
          <span className="text-xs font-mono text-slate-400 select-none pr-2">
            v{APP_VERSION}
          </span>
        </div>

        {activeTab === 'settings' ? (
          <>
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
              placeholder={t('settings_db_placeholder')}
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
              {t('settings_section2')}
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950/70 border border-blue-500/40 text-blue-300 font-semibold">
              {t('settings_key_fields_count', { count: selectedKeyFields.length }) || `キー項目: ${selectedKeyFields.length} / 3`}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {t('settings_section2_desc')}
          </p>

          <div className="space-y-2">
            {/* Title (Fixed at position 1) */}
            {(() => {
              const titleKeyIndex = selectedKeyFields.indexOf('title');
              const isTitleSelected = titleKeyIndex !== -1;
              return (
                <div
                  onClick={() => handleToggleKeyField('title')}
                  className={clsx(
                    'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer select-none',
                    isTitleSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isTitleSelected ? (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                        {titleKeyIndex + 1}
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-slate-600/80 flex items-center justify-center shrink-0" />
                    )}
                    <span>{t('field_title')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                    <Lock className="w-3 h-3" />
                    <span>{t('settings_fixed_position')}</span>
                  </div>
                </div>
              );
            })()}

            {/* Rating (Fixed at position 2, directly under Title) */}
            {(() => {
              const ratingKeyIndex = selectedKeyFields.indexOf('rating');
              const isRatingSelected = ratingKeyIndex !== -1;
              return (
                <div
                  onClick={() => handleToggleKeyField('rating')}
                  className={clsx(
                    'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer select-none',
                    isRatingSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isRatingSelected ? (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                        {ratingKeyIndex + 1}
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-slate-600/80 flex items-center justify-center shrink-0" />
                    )}
                    <span>{t('field_rating')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                    <Lock className="w-3 h-3" />
                    <span>{t('settings_fixed_position')}</span>
                  </div>
                </div>
              );
            })()}

            {/* Reorderable Items List */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              {reorderableFieldIds.map((fieldId, index) => {
                const isDisabled = isFieldDisabled(fieldId);
                const keyIndex = selectedKeyFields.indexOf(fieldId);
                const isSelected = !isDisabled && keyIndex !== -1;
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <div
                    key={fieldId}
                    draggable={!isDisabled && canDragIndex === index}
                    onDragStart={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                        return;
                      }
                      handleDragStart(e, index);
                    }}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      if (isDisabled) return;
                      handleToggleKeyField(fieldId);
                    }}
                    className={clsx(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all select-none',
                      isDisabled
                        ? 'bg-slate-900/30 border-slate-800/40 text-slate-500 opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500 cursor-pointer'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 cursor-pointer',
                      !isDisabled && isDragging && 'opacity-40 border-dashed border-blue-400',
                      !isDisabled && isDragOver && 'border-blue-400 bg-blue-600/10 scale-[1.01]'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={clsx(
                          'p-1 rounded transition-colors',
                          isDisabled
                            ? 'text-slate-700 cursor-not-allowed'
                            : 'cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300'
                        )}
                        title={isDisabled ? undefined : t('settings_drag_to_reorder')}
                        onMouseEnter={() => {
                          if (!isDisabled) setCanDragIndex(index);
                        }}
                        onMouseLeave={() => setCanDragIndex(null)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                          {keyIndex + 1}
                        </span>
                      ) : (
                        <span
                          className={clsx(
                            'w-5 h-5 rounded-full border flex items-center justify-center shrink-0',
                            isDisabled ? 'border-slate-700/50' : 'border-slate-600/80'
                          )}
                        />
                      )}

                      {fieldId === 'cast' ? (
                        <input
                          type="text"
                          value={castLabel}
                          onChange={(e) => setCastLabel(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          placeholder={t('field_cast')}
                          className="bg-slate-950/80 border border-slate-700/80 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-2.5 py-1 text-sm text-white placeholder-slate-400 focus:outline-none w-48 sm:w-64 select-text"
                        />
                      ) : (
                        <span className="truncate">{getFieldLabel(fieldId)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {fieldId.startsWith('custom_field_') && (
                        <label
                          className={clsx(
                            'flex items-center gap-1.5 text-xs select-none',
                            isDisabled
                              ? 'text-slate-600 cursor-not-allowed'
                              : 'text-slate-300 hover:text-white cursor-pointer'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isDisabled) e.preventDefault();
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={isDisabled}
                            checked={
                              fieldId === 'custom_field_1'
                                ? custom1DisplayInList
                                : fieldId === 'custom_field_2'
                                ? custom2DisplayInList
                                : custom3DisplayInList
                            }
                            onChange={(e) => {
                              if (isDisabled) return;
                              if (fieldId === 'custom_field_1') setCustom1DisplayInList(e.target.checked);
                              else if (fieldId === 'custom_field_2') setCustom2DisplayInList(e.target.checked);
                              else if (fieldId === 'custom_field_3') setCustom3DisplayInList(e.target.checked);
                            }}
                            className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 w-3.5 h-3.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          />
                          <span>{t('settings_custom_display_in_list')}</span>
                        </label>
                      )}
                      <span className={clsx('text-xs font-mono', isDisabled ? 'text-slate-700' : 'text-slate-600')}>
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 3: Language Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
            {t('settings_section3')}
          </h3>

          <div className="relative max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Globe className="w-4 h-4" />
            </div>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as LanguageSetting)}
              className="w-full appearance-none bg-slate-900/80 border border-slate-700/70 hover:border-slate-600 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
            >
              {[
                { id: 'auto', label: t('settings_lang_auto') },
                { id: 'ja', label: t('settings_lang_ja') },
                { id: 'en', label: t('settings_lang_en') },
                { id: 'zh-CN', label: t('settings_lang_zh_CN') },
                { id: 'zh-TW', label: t('settings_lang_zh_TW') },
              ].map((langOpt) => (
                <option key={langOpt.id} value={langOpt.id} className="bg-slate-900 text-white">
                  {langOpt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </>
    ) : (
      /* Section: Open Source Licenses */
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white text-sm">{t('settings_ffmpeg_title')}</span>
                  <span className="text-xs font-medium text-blue-400">
                    {t('settings_ffmpeg_license_badge')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {t('settings_ffmpeg_desc')}
                </p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {t('settings_ffmpeg_source_desc')}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {t('settings_ffmpeg_source_request')}
                </p>
              </div>
            </div>

            {/* External Links */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => handleOpenExternal('https://ffmpeg.org')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('settings_ffmpeg_official_site')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenExternal('https://www.gyan.dev/ffmpeg/builds/')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('settings_ffmpeg_build_site')}</span>
              </button>
              <button
                type="button"
                onClick={handleToggleLicense}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>{showLicenseText ? t('settings_ffmpeg_hide_license') : t('settings_ffmpeg_view_license')}</span>
              </button>
            </div>

            {/* License Text Area */}
            {showLicenseText && (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">GNU General Public License v3.0</span>
                  <button
                    type="button"
                    onClick={handleCopyLicense}
                    className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    {isLicenseCopied ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">{t('settings_ffmpeg_copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('settings_ffmpeg_copy')}</span>
                      </>
                    )}
                  </button>
                </div>
                {isLoadingLicense ? (
                  <div className="py-6 text-center text-xs text-slate-500">Loading...</div>
                ) : (
                  <pre className="max-h-52 overflow-y-auto p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
                    {licenseText}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Third-Party OSS Box */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-semibold text-white text-sm">{t('settings_third_party_title')}</span>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {t('settings_third_party_desc')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={handleToggleThirdParty}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>{showThirdPartyLicenses ? t('settings_third_party_hide_license') : t('settings_third_party_view_license')}</span>
              </button>
            </div>

            {showThirdPartyLicenses && (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">Third-Party Licenses</span>
                  <button
                    type="button"
                    onClick={handleCopyThirdParty}
                    className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    {isThirdPartyCopied ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">{t('settings_ffmpeg_copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('settings_ffmpeg_copy')}</span>
                      </>
                    )}
                  </button>
                </div>
                {isLoadingThirdParty ? (
                  <div className="py-6 text-center text-xs text-slate-500">Loading...</div>
                ) : (
                  <pre className="max-h-52 overflow-y-auto p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
                    {thirdPartyLicensesText}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'settings' && (
              <>
                {!hasMultipleDbs ? (
                  <button
                    type="button"
                    onClick={handleResetData}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/40 bg-red-600/10 text-red-400 hover:bg-red-600/20 font-medium text-sm transition-colors whitespace-nowrap"
                    title={t('settings_reset_data_tooltip')}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{t('resetData')}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteDbConfirm(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/40 bg-red-600/10 text-red-400 hover:bg-red-600/20 font-medium text-sm transition-colors whitespace-nowrap"
                    title={t('settings_delete_db')}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{t('settings_delete_db')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAddDatabase}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-500/40 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 font-medium text-sm transition-colors whitespace-nowrap"
                  title={t('settings_add_db')}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('settings_add_db')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDuplicateDatabase}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-500/40 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 font-medium text-sm transition-colors whitespace-nowrap"
                  title={t('settings_duplicate_db')}
                >
                  <Copy className="w-4 h-4" />
                  <span>{t('settings_duplicate_db')}</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'licenses' ? (
              <button
                type="button"
                onClick={onClose || (() => setActiveTab('settings'))}
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {t('close')}
              </button>
            ) : (
              <>
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
              </>
            )}
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

