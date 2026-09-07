'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud } from 'lucide-react';
import { useApp } from './AppProvider';
import { isVideoFile } from '@/lib/utils';
import { ConfirmModal } from './ConfirmModal';

interface DragDropWrapperProps {
  children: React.ReactNode;
  onFileDrop: (filePath: string, fileName: string) => void;
}

export const DragDropWrapper: React.FC<DragDropWrapperProps> = ({ children, onFileDrop }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showInvalidModal, setShowInvalidModal] = useState(false);
  const { t } = useApp();

  // Prevent default window drag and drop navigation
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);

    return () => {
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    };
  }, []);

  const isFileDrag = (e: React.DragEvent) => {
    if (e.dataTransfer && e.dataTransfer.types) {
      return Array.from(e.dataTransfer.types).includes('Files');
    }
    return false;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFileDrag(e)) {
      if (!isDragging) setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if exiting outer container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Get OS File Path using Electron webUtils API (Electron 30+ compliant)
      let filePath = '';
      if (typeof window !== 'undefined' && window.api?.getPathForFile) {
        filePath = window.api.getPathForFile(file);
      } else {
        filePath = (file as any).path || '';
      }

      console.log('Dropped file:', file.name, 'Path:', filePath);

      // Check if dropped file is a video file
      if (!isVideoFile(filePath || file.name, file.type)) {
        setShowInvalidModal(true);
        return;
      }

      if (filePath) {
        onFileDrop(filePath, file.name);
      } else {
        alert(t('error_cannot_get_file_path'));
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative min-h-screen"
    >
      {children}

      {/* Dragging Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md border-4 border-dashed border-blue-500/80 animate-fadeIn pointer-events-none">
          <div className="p-6 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 mb-4 animate-bounce">
            <UploadCloud className="w-16 h-16" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t('drag_drop_overlay_title')}</h2>
          <p className="text-slate-300 text-sm">{t('drag_drop_overlay_desc')}</p>
        </div>
      )}

      {/* Invalid File Alert Modal */}
      <ConfirmModal
        isOpen={showInvalidModal}
        title={t('drag_drop_invalid_title')}
        description={t('drag_drop_invalid_file')}
        confirmText="OK"
        showCancel={false}
        variant="warning"
        onConfirm={() => setShowInvalidModal(false)}
        onClose={() => setShowInvalidModal(false)}
      />
    </div>
  );
};
