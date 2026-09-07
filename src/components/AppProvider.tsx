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
import { getSplitValues, getKanaForCast, isVideoFile } from '../lib/utils';

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
    let savedMovie: Movie;
    if (movieData.id) {
      savedMovie = await window.api.updateMovie(movieData as any);
    } else {
      savedMovie = await window.api.addMovie(movieData as any);
    }

    // Sync grouping siblings
    const keyFields = settings?.key_fields || ['genre'];
    const currentMovies = await window.api.getMovies();

    if (savedMovie.is_grouped) {
      // Grouping ON: Find matches and set parent_movie_id
      const matches = currentMovies.filter((m) => {
        if (m.id === savedMovie.id) return false;

        if ((m.title || null) !== (savedMovie.title || null)) return false;
        if ((m.genre || null) !== (savedMovie.genre || null)) return false;
        if ((m.release_year || null) !== (savedMovie.release_year || null)) return false;
        if ((m.release_date || null) !== (savedMovie.release_date || null)) return false;

        // Check each key field
        for (const kf of keyFields) {
          if (((m as any)[kf] || null) !== ((savedMovie as any)[kf] || null)) return false;
        }

        return true;
      });

      for (const sibling of matches) {
        await window.api.updateMovie({ id: sibling.id, parent_movie_id: savedMovie.id });
      }
    } else {
      // Grouping OFF: Clear parent_movie_id for any siblings linked to this parent
      const siblings = currentMovies.filter((m) => m.parent_movie_id === savedMovie.id);
      for (const sibling of siblings) {
        await window.api.updateMovie({ id: sibling.id, parent_movie_id: null });
      }
    }

    // Refresh groups and all data
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
      // グループ化解除: 親動画に紐づく子動画のparent_movie_idをクリア
      const currentMovies = await window.api.getMovies();
      const siblings = currentMovies.filter((m) => m.parent_movie_id === id);
      for (const sibling of siblings) {
        await window.api.updateMovie({ id: sibling.id, parent_movie_id: null });
      }

      // 自身がグループ化されていた場合もグループ化を解除
      const targetMovie = currentMovies.find((m) => m.id === id);
      if (targetMovie && (targetMovie.is_grouped || targetMovie.parent_movie_id)) {
        await window.api.updateMovie({ id, is_grouped: false, parent_movie_id: null });
      }

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
          initialCastKana={(() => {
            if (!activeKeyGroup) return '';
            const keyFields = settings?.key_fields || ['genre'];
            const targetCastVal = activeKeyGroup.key_values['cast'];

            for (const m of movies) {
              let combinations: Record<string, string>[] = [{}];
              for (const kf of keyFields) {
                const values = getSplitValues((m as any)[kf]);
                const nextCombinations: Record<string, string>[] = [];
                for (const comb of combinations) {
                  for (const val of values) {
                    nextCombinations.push({ ...comb, [kf]: val });
                  }
                }
                combinations = nextCombinations;
              }
              const isMatch = combinations.some((comb) => JSON.stringify(comb) === activeKeyGroup.key_signature);
              if (isMatch) {
                if (targetCastVal && m.cast && m.cast_kana) {
                  const kana = getKanaForCast(m.cast, m.cast_kana, targetCastVal);
                  if (kana) return kana;
                }
                if (m.cast_kana) return m.cast_kana;
              }
            }
            return '';
          })()}
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
