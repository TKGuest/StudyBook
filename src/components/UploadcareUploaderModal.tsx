/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Cloud, ShieldAlert } from 'lucide-react';
import { FileUploaderRegular } from '@uploadcare/react-uploader';
import '@uploadcare/react-uploader/core.css';
import { 
  UPLOADCARE_PUBLIC_KEY, 
  MAX_FILE_SIZE_BYTES, 
  UploadedAssetMetadata, 
  resolveAttachmentType, 
  formatBytes 
} from '../lib/uploadcare';

interface UploadcareUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (asset: UploadedAssetMetadata) => void;
  onError?: (errorMessage: string) => void;
}

export const UploadcareUploaderModal: React.FC<UploadcareUploaderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError
}) => {
  if (!isOpen) return null;

  // Intercept completion from Uploadcare Web Component / React Uploader
  const handleFileUploadSuccess = (fileEntry: any) => {
    try {
      if (!fileEntry) return;

      const uuid = fileEntry.uuid || fileEntry.cdnUrlModifiers || '';
      const cdnUrl = fileEntry.cdnUrl || `https://ucarecdn.com/${uuid}/`;
      const filename = fileEntry.name || fileEntry.fileName || 'study-document';
      const size = fileEntry.size || fileEntry.fileSize || 0;
      const mimetype = fileEntry.mimeType || 'application/octet-stream';
      const cleanUrl = `${cdnUrl.replace(/\/$/, '')}/${encodeURIComponent(filename)}`;

      const asset: UploadedAssetMetadata = {
        url: cleanUrl,
        cdnUrl,
        uuid,
        filename,
        mimetype,
        size,
        type: resolveAttachmentType(filename, mimetype),
        formattedSize: formatBytes(size)
      };

      onSuccess(asset);
      onClose();
    } catch (err: any) {
      console.error('Error handling Uploadcare file upload success:', err);
      onError?.(err?.message || 'Failed to process uploaded file.');
    }
  };

  const handleFileUploadFailed = (fileEntry: any) => {
    const errorMsg = fileEntry?.errors?.[0]?.message || 'File upload failed. Please verify file format and size.';
    onError?.(errorMsg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-150 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 rounded-xl">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Uploadcare Study File Uploader
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Max 25 MB • Images, PDFs, Word (.docx), PowerPoint (.pptx)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-150 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Community Limit Banner */}
        <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800/60 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Strict 25 MB restriction active. Files exceeding this size are blocked automatically.</span>
        </div>

        {/* Uploadcare File Uploader Regular Component */}
        <div className="p-6 flex flex-col items-center justify-center min-h-[220px]">
          <FileUploaderRegular
            pubkey={UPLOADCARE_PUBLIC_KEY}
            maxLocalFileSizeBytes={MAX_FILE_SIZE_BYTES}
            multiple={false}
            imgOnly={false}
            sourceList="local, url, camera, dropbox, gdrive"
            className="w-full flex justify-center my-uc-uploader"
            onFileUploadSuccess={handleFileUploadSuccess}
            onFileUploadFailed={handleFileUploadFailed}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-slate-850 border-t border-gray-150 dark:border-slate-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
