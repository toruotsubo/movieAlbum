'use client';

import React from 'react';
import { Film } from 'lucide-react';

export const TitleBar: React.FC = () => {
  return (
    <div className="w-full h-9 bg-[#090d16] border-b border-slate-800/60 flex items-center justify-between px-4 text-xs text-slate-400 select-none app-drag shrink-0 z-50 relative">
      <div className="flex items-center gap-2">
        <Film className="w-3.5 h-3.5 text-blue-400" />
        <span className="font-semibold text-slate-300 tracking-wide text-[11px]">movieAlbum</span>
      </div>
      {/* Reserved area for Electron window controls overlay */}
      <div className="w-32 h-full app-drag" />
    </div>
  );
};
