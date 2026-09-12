'use client';

import React from 'react';
export const TitleBar: React.FC = () => {
  return (
    <div className="w-full h-9 bg-[#090d16] border-b border-slate-800/60 flex items-center justify-between px-4 text-xs text-slate-400 select-none app-drag shrink-0 z-50 relative">
      <div className="flex items-center gap-2">
        <img
          src="/icon.png"
          alt="movieAlbum"
          className="w-4 h-4 object-contain rounded-sm select-none pointer-events-none"
          draggable={false}
        />
        <span className="font-semibold text-slate-300 tracking-wide text-[11px]">movieAlbum</span>
      </div>
      {/* Reserved area for Electron window controls overlay */}
      <div className="w-32 h-full app-drag" />
    </div>
  );
};
