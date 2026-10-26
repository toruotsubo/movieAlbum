'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, Settings, DatabasePlus, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from './AppProvider';
import { getKeyFieldLabel } from '@/lib/utils';

interface NavbarProps {
  onOpenSettings: () => void;
}

function NavbarContent({ onOpenSettings }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { settings, t, headerMovieCount, headerFilterText, databaseState, switchDatabase } = useApp();

  const isKeyItemsPage = pathname === '/';
  const isMoviesActive = pathname === '/movies' || pathname.startsWith('/movies/');

  const keyFields = settings?.key_fields && settings.key_fields.length > 0 ? settings.key_fields : ['genre'];
  const currentFieldParam = searchParams.get('field');
  const activeKeyField = currentFieldParam && keyFields.includes(currentFieldParam) ? currentFieldParam : keyFields[0];

  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b border-slate-800 bg-slate-900/80 backdrop-blur-md select-none">
      <div className="px-6 h-16 flex items-center justify-between">

        {/* Navigation Links */}
        <nav className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80">
          {keyFields.map((fieldId, idx) => {
            const isActive = isKeyItemsPage && activeKeyField === fieldId;
            const keyLabel = getKeyFieldLabel(fieldId, settings, t);
            const href = idx === 0 ? '/' : `/?field=${fieldId}`;

            return (
              <Link
                key={fieldId}
                href={href}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>{t('key_list_title', { key: keyLabel })}</span>
              </Link>
            );
          })}
          <Link
            href="/movies"
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              isMoviesActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            )}
          >
            <List className="w-4 h-4" />
            <span>{t('movies_list_title')}</span>
          </Link>
          {headerFilterText && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-300 bg-blue-950/60 border border-blue-800/60 px-2.5 py-1.5 rounded-lg animate-fadeIn">
              <span>{headerFilterText}</span>
              <button
                onClick={() => router.push('/movies')}
                className="p-0.5 hover:bg-blue-800/60 rounded text-blue-400 hover:text-white transition-colors"
                title={t('key_list_filter_clear')}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {headerMovieCount !== null && (
            <span className="text-xs font-medium text-slate-300 bg-slate-800/80 border border-slate-700/50 px-2.5 py-1.5 rounded-lg">
              {t('movies_list_movies_count', { count: headerMovieCount })}
            </span>
          )}
        </nav>

        {/* Actions & Drop Hint */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-700/40">
            <DatabasePlus className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>{t('drag_drop_overlay_title')}</span>
          </div>

          {/* Database file selection dropdown (when multiple databases exist) */}
          {databaseState && databaseState.databases && databaseState.databases.length > 1 && (
            <select
              value={databaseState.activeId}
              onChange={(e) => switchDatabase(e.target.value)}
              className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors max-w-[160px] truncate"
              title={t('settings_db_select')}
            >
              {databaseState.databases.map((db) => (
                <option key={db.id} value={db.id}>
                  {db.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
            title={t('nav_settings')}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export const Navbar: React.FC<NavbarProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <NavbarContent {...props} />
    </Suspense>
  );
};
