'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppSettings, Movie, KeyItemGroup } from '../lib/types';
import { Navbar } from './Navbar';
import { TitleBar } from './TitleBar';
import { InitialSetupModal } from './InitialSetupModal';
import { MovieFormModal } from './MovieFormModal';
import { KeyItemFormModal } from './KeyItemFormModal';
import { ConfirmModal } from './ConfirmModal';
import { DragDropWrapper } from './DragDropWrapper';
import { isVideoFile, findInitialCastKana } from '../lib/utils';

import { Language, TranslationKey, t as translate } from '../lib/translations';

interface AppContextType {
  settings: AppSettings | null;
  movies: Movie[];
  keyGroups: KeyItemGroup[];
  loading: boolean;
  lang: Language;
  showKana: boolean;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  refreshData: () => Promise<void>;
  updateMovieRating: (id: number, rating: number) => Promise<void>;
  updateKeyItemRating: (signature: string, rating: number) => Promise<void>;
  openMoviePlayer: (filePath: string) => Promise<void>;
  openEditMovieModal: (movie: Partial<Movie>) => void;
  openEditKeyItemModal: (group: KeyItemGroup) => void;
  openSettingsModal: () => void;
  resetData: () => Promise<void>;
  deleteMovie: (id: number) => Promise<void>;
  headerMovieCount: number | null;
  setHeaderMovieCount: (count: number | null) => void;
  headerFilterText: string | null;
  setHeaderFilterText: (text: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [keyGroups, setKeyGroups] = useState<KeyItemGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerMovieCount, setHeaderMovieCount] = useState<number | null>(null);
  const [headerFilterText, setHeaderFilterText] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<Language>('ja');

  // Detect OS Language
  useEffect(() => {
    if (typeof window !== 'undefined' && window.navigator) {
      const navLang = window.navigator.language || '';
      setDetectedLang(navLang.toLowerCase().startsWith('ja') ? 'ja' : 'en');
    }
  }, []);

  const currentLang: Language = React.useMemo(() => {
    if (settings?.language === 'ja') return 'ja';
    if (settings?.language === 'en') return 'en';
    return detectedLang;
  }, [settings?.language, detectedLang]);

  const showKana = currentLang === 'ja';

  const tFunc = React.useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return translate(key, currentLang, params);
    },
    [currentLang]
  );

  // Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeMovie, setActiveMovie] = useState<Partial<Movie> | null>(null);

  const [isKeyItemFormOpen, setIsKeyItemFormOpen] = useState(false);
  const [activeKeyGroup, setActiveKeyGroup] = useState<KeyItemGroup | null>(null);

  const [errorModalState, setErrorModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  } | null>(null);

  const refreshData = async () => {
    if (typeof window === 'undefined' || !window.api) {
      setLoading(false);
      return;
    }
    try {
      const currentSettings = await window.api.getSettings();
      setSettings(currentSettings);

      if (!currentSettings.is_initialized) {
        setIsSettingsOpen(true);
      }

      const allMovies = await window.api.getMovies();
      setMovies(allMovies);

      const groups = await window.api.getKeyItemGroups();
      setKeyGroups(groups);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSaveSettings = async (newSettings: any) => {
    if (window.api) {
      const updated = await window.api.saveSettings(newSettings);
      setSettings(updated);
      await refreshData();
    }
  };

  const updateMovieRating = async (id: number, rating: number) => {
    // Optimistic Update
    setMovies((prev) => prev.map((m) => (m.id === id ? { ...m, rating } : m)));
    if (window.api) {
      await window.api.updateMovieRating(id, rating);
      await refreshData();
    }
  };

  const updateKeyItemRating = async (signature: string, rating: number) => {
    // Optimistic Update
    setKeyGroups((prev) =>
      prev.map((g) => (g.key_signature === signature ? { ...g, rating } : g))
    );
    if (window.api) {
      await window.api.updateKeyItemRating(signature, rating);
      await refreshData();
    }
  };

  const openMoviePlayer = async (filePath: string) => {
    if (window.api) {
      const result = await window.api.openMoviePlayer(filePath);
      if (!result.success) {
        const msg =
          result.code === 'FILE_NOT_FOUND'
            ? tFunc('error_file_not_found')
            : tFunc('error_player_launch_failed');
        setErrorModalState({
          isOpen: true,
          title: tFunc('error_title'),
          description: msg,
        });
      }
    }
  };

  const openEditMovieModal = (movie: Partial<Movie>) => {
    setActiveMovie(movie);
    setIsFormOpen(true);
  };

  const handleSaveMovie = async (movieData: Partial<Movie>) => {
    if (!window.api) return;
    if (movieData.id) {
      await window.api.updateMovie(movieData as any);
    } else {
      await window.api.addMovie(movieData as any);
    }
    await refreshData();
  };

  const handleFileDrop = async (filePath: string, fileName: string) => {
    if (!isVideoFile(filePath || fileName)) {
      return;
    }

    let existingMovie = movies.find((m) => m.file_path === filePath);
    if (!existingMovie && window.api) {
      existingMovie = (await window.api.getMovieByPath(filePath)) || undefined;
    }

    if (existingMovie) {
      openEditMovieModal(existingMovie);
    } else {
      let meta = null;
      if (window.api?.extractMetadata) {
        meta = await window.api.extractMetadata(filePath);
      }

      openEditMovieModal({
        file_path: filePath,
        file_name: fileName,
        title: fileName.replace(/\.[^/.]+$/, ''),
        rating: 3,
        duration: meta?.duration || null,
        width: meta?.width || null,
        height: meta?.height || null,
        frame_rate: meta?.frame_rate || null,
        file_size: meta?.file_size || null,
      });
    }
  };

  const handleResetData = async () => {
    if (window.api) {
      const resetSettings = await window.api.resetData();
      setSettings(resetSettings);
      await refreshData();
    }
  };

  const openEditKeyItemModal = (group: KeyItemGroup) => {
    setActiveKeyGroup(group);
    setIsKeyItemFormOpen(true);
  };

  const handleSaveKeyItemDetails = async (data: { key_signature: string; cast_kana: string; tags: string; rating?: number }) => {
    if (window.api) {
      await window.api.updateKeyItemDetails(data);
      await refreshData();
    }
  };

  const handleDeleteMovie = async (id: number) => {
    if (window.api) {
      await window.api.deleteMovie(id);
      setMovies((prev) => prev.filter((m) => m.id !== id));
      await refreshData();
    }
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        movies,
        keyGroups,
        loading,
        lang: currentLang,
        showKana,
        t: tFunc,
        refreshData,
        updateMovieRating,
        updateKeyItemRating,
        openMoviePlayer,
        openEditMovieModal,
        openEditKeyItemModal,
        openSettingsModal: () => setIsSettingsOpen(true),
        resetData: handleResetData,
        deleteMovie: handleDeleteMovie,
        headerMovieCount,
        setHeaderMovieCount,
        headerFilterText,
        setHeaderFilterText,
      }}
    >
      <DragDropWrapper onFileDrop={handleFileDrop}>
        <TitleBar />
        <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>

        <InitialSetupModal
          isOpen={isSettingsOpen}
          currentSettings={settings}
          onSave={handleSaveSettings}
          onResetData={handleResetData}
          onClose={settings?.is_initialized ? () => setIsSettingsOpen(false) : undefined}
        />

        <MovieFormModal
          isOpen={isFormOpen}
          movie={activeMovie}
          settings={settings}
          onSave={handleSaveMovie}
          onDelete={handleDeleteMovie}
          onClose={() => {
            setIsFormOpen(false);
            setActiveMovie(null);
          }}
        />

        <KeyItemFormModal
          isOpen={isKeyItemFormOpen}
          group={activeKeyGroup}
          initialCastKana={findInitialCastKana(activeKeyGroup, movies)}
          onSave={handleSaveKeyItemDetails}
          onClose={() => {
            setIsKeyItemFormOpen(false);
            setActiveKeyGroup(null);
          }}
        />

        {errorModalState && (
          <ConfirmModal
            isOpen={errorModalState.isOpen}
            title={errorModalState.title}
            description={errorModalState.description}
            confirmText="OK"
            showCancel={false}
            variant="danger"
            onConfirm={() => setErrorModalState(null)}
            onClose={() => setErrorModalState(null)}
          />
        )}
      </DragDropWrapper>
    </AppContext.Provider>
  );
};
