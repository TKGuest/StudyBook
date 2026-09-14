/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Paperclip, 
  CheckCircle2, 
  X, 
  Send, 
  Lock, 
  Globe,
  Loader2,
  FileCheck,
  AlertTriangle,
  UploadCloud,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playSound } from '../utils/soundEffects';
import { 
  UPLOADCARE_PUBLIC_KEY, 
  MAX_FILE_SIZE_MB, 
  MAX_FILE_SIZE_BYTES, 
  ACCEPT_STRING,
  UploadedAssetMetadata,
  validateStudentFile,
  uploadToUploadcare,
  resolveAttachmentType,
  formatBytes
} from '../lib/uploadcare';
import { UploadcareUploaderModal } from './UploadcareUploaderModal';
import { motion, AnimatePresence } from 'motion/react';

interface StudyPostComposerProps {
  onPostCreated?: () => void;
  defaultSubject?: string;
  className?: string;
}

export const StudyPostComposer: React.FC<StudyPostComposerProps> = ({ 
  onPostCreated,
  defaultSubject = 'Math',
  className = ''
}) => {
  const { user, addPost, settings } = useApp();

  // Post form state
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Uploadcare Pipeline state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attachedAsset, setAttachedAsset] = useState<UploadedAssetMetadata | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Pre-upload Interception & Validation Engine
   * Enforces strict 25 MB limitation and student media type validation BEFORE
   * transferring any bytes to the Uploadcare cloud.
   */
  const processAndUploadFile = async (file: File) => {
    // 1. Intercept file and calculate file size
    const validation = validateStudentFile(file);

    // 2. Strict File Size Restriction Check (Blocked if > 25 MB)
    if (!validation.valid) {
      playSound('pop');
      setUploadError(validation.error || `File exceeds the strict ${MAX_FILE_SIZE_MB} MB limit.`);
      return;
    }

    // Clear any previous error on valid file selection
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 3. Automated live cloud transfer to Uploadcare
      const uploaded = await uploadToUploadcare(file, (percent) => {
        setUploadProgress(percent);
      });

      // 4. Intercept upload callback, extract direct CDN URL link string, and bind to Post data model
      setAttachedAsset(uploaded);
      playSound('success');
    } catch (err: any) {
      console.error('Uploadcare transfer failed:', err);
      setUploadError(err?.message || 'Failed to upload study file to Uploadcare. Please try again.');
      playSound('pop');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Selection event handler from file input trigger
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
    // Reset file input element so identical file can be reselected if needed
    e.target.value = '';
  };

  /**
   * Drag-and-drop file interception
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  /**
   * Handle Post submission: dispatches and appends the post with the Uploadcare CDN URL
   * into the main timeline feed array instantly.
   */
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !attachedAsset) || isUploading || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let attachmentType: 'image' | 'pdf' | 'doc' | 'file' | undefined = undefined;
      let attachmentTitle: string | undefined = undefined;
      let attachmentUrl: string | undefined = undefined;
      let attachmentSize: string | undefined = undefined;

      if (attachedAsset) {
        attachmentType = attachedAsset.type;
        attachmentTitle = attachedAsset.filename;
        // Bind permanent direct CDN URL string to the Post model
        attachmentUrl = attachedAsset.url;
        attachmentSize = attachedAsset.formattedSize;
      }

      // Automatically dispatch and append to main timeline array
      await addPost(
        content.trim() || (attachedAsset ? `Shared study material: ${attachedAsset.filename}` : 'Study update'),
        subject,
        attachmentType,
        attachmentTitle,
        isAnonymous,
        attachmentUrl,
        user?.grade || 'Grade 10',
        undefined,
        attachmentSize
      );

      // Reset state upon successful post
      setContent('');
      setAttachedAsset(null);
      setUploadError(null);
      setIsAnonymous(false);

      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err) {
      console.error('Failed to dispatch post:', err);
      setUploadError('Failed to publish post. Please check your network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for rendering document badge styles
  const getDocumentBadge = (type: string, filename: string) => {
    const lower = filename.toLowerCase();
    if (type === 'image') return { label: 'IMG', bg: 'bg-emerald-500', text: 'text-white' };
    if (lower.endsWith('.pdf') || type === 'pdf') return { label: 'PDF', bg: 'bg-red-500', text: 'text-white' };
    if (lower.endsWith('.pptx') || lower.endsWith('.ppt')) return { label: 'PPTX', bg: 'bg-amber-600', text: 'text-white' };
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return { label: 'DOCX', bg: 'bg-blue-600', text: 'text-white' };
    return { label: 'FILE', bg: 'bg-indigo-600', text: 'text-white' };
  };

  return (
    <div 
      id="study-post-composer"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`relative bg-white dark:bg-slate-800 rounded-2xl border transition-all ${
        isDragOver 
          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20' 
          : 'border-gray-200/80 dark:border-slate-700/80'
      } p-4 sm:p-5 shadow-xs ${className}`}
    >
      {/* Hidden File Input for Native Asset Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={handleFileInputChange}
        className="hidden"
        id="uploadcare-file-input"
      />

      <form onSubmit={handlePostSubmit} className="space-y-3.5">
        
        {/* Author Header & Subject Selector */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img 
              src={isAnonymous || settings?.incognitoMode ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' : user.avatar} 
              alt={user.name} 
              className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-500/20"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {isAnonymous ? 'Anonymous Scholar' : user.name}
                </span>
                <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  {user.grade || 'Grade 10'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                <Globe className="h-3 w-3" />
                <span>Public Study Feed • Cloud Storage</span>
              </div>
            </div>
          </div>

          {/* Subject Badge Selector */}
          <select
            id="composer-subject-selector"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="text-xs font-bold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-xl border-none focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none"
          >
            <option value="Math">📐 Math</option>
            <option value="Physics">⚡ Physics</option>
            <option value="Chemistry">🧪 Chemistry</option>
            <option value="English">📚 English</option>
            <option value="Biology">🧬 Biology</option>
            <option value="Exam Prep">🎯 Exam Prep</option>
            <option value="General">💡 General</option>
          </select>
        </div>

        {/* Text Input Area ("What are you studying today?") */}
        <div className="relative">
          <textarea
            id="composer-text-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What are you studying today?"
            rows={3}
            className="w-full bg-gray-50/70 dark:bg-slate-900/60 text-gray-900 dark:text-white placeholder-gray-400 text-sm rounded-xl p-3.5 border border-gray-200 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all resize-none leading-relaxed"
          />
        </div>

        {/* On-screen Error Banner for File Size Rejection or Validation Errors */}
        <AnimatePresence>
          {uploadError && (
            <motion.div
              id="upload-error-banner"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-start justify-between gap-3 text-red-800 dark:text-red-200 shadow-xs"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-red-900 dark:text-red-100">Upload Blocked</p>
                  <p className="mt-0.5 leading-relaxed text-red-700 dark:text-red-300">{uploadError}</p>
                  <p className="mt-1 text-[11px] text-red-600/90 dark:text-red-400 font-medium">
                    Strict community rule: Maximum file size allowed is 25 MB.
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="dismiss-error-banner-btn"
                onClick={() => setUploadError(null)}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-200 p-1 rounded-md transition-colors"
                title="Dismiss warning"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Uploading Progress Card */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              id="upload-progress-card"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                  <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                  <span>Transferring bytes to Uploadcare Cloud CDN...</span>
                </div>
                <span className="font-bold text-blue-700 dark:text-blue-300">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200/70 dark:bg-blue-900/60 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200 ease-out" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                Enforcing strict 25 MB community validation • Free permanent cloud persistence
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attached Uploadcare Asset Preview Card */}
        <AnimatePresence>
          {attachedAsset && (
            <motion.div
              id="attached-asset-preview"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                {attachedAsset.type === 'image' ? (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 border border-emerald-300 dark:border-emerald-700 bg-white">
                    <img 
                      src={attachedAsset.url} 
                      alt="Uploaded study preview" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className={`h-11 w-11 rounded-xl ${getDocumentBadge(attachedAsset.type, attachedAsset.filename).bg} ${getDocumentBadge(attachedAsset.type, attachedAsset.filename).text} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs tracking-tight`}>
                    {getDocumentBadge(attachedAsset.type, attachedAsset.filename).label}
                  </div>
                )}
                
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100 truncate">
                      {attachedAsset.filename}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5 flex-wrap">
                    <span className="font-semibold">{attachedAsset.formattedSize}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <UploadCloud className="h-3 w-3" /> Uploadcare CDN Verified
                    </span>
                    <span>•</span>
                    <a 
                      href={attachedAsset.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-bold"
                    >
                      <span>Direct URL</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Detach File Button */}
              <button
                type="button"
                id="remove-attached-asset-btn"
                onClick={() => {
                  setAttachedAsset(null);
                  playSound('pop');
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white/80 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Remove attached file"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Toolbar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-150 dark:border-slate-700/80">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            
            {/* Primary Asset Attachment Button (Uploadcare Native Input Trigger) */}
            <motion.button
              type="button"
              id="composer-attach-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isUploading}
              onClick={() => {
                playSound('click');
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all border border-blue-200 dark:border-blue-800 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Attach Study File</span>
              <span className="text-[10px] bg-blue-200/70 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded-md font-mono">
                ≤25MB
              </span>
            </motion.button>

            {/* Official Uploadcare Dialog Trigger (Cloud Sources, Camera, etc.) */}
            <button
              type="button"
              id="composer-uploadcare-modal-btn"
              onClick={() => {
                playSound('openModal');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-750 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
              title="Open full Uploadcare cloud picker (Google Drive, Camera, etc.)"
            >
              <UploadCloud className="h-3.5 w-3.5 text-indigo-500" />
              <span>Cloud & Camera</span>
            </button>

            {/* Secret / Anonymous Toggle */}
            <button
              type="button"
              id="composer-anonymous-toggle"
              onClick={() => {
                playSound('pop');
                setIsAnonymous(prev => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isAnonymous 
                  ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-750'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{isAnonymous ? 'Anonymous' : 'Ask Secretly'}</span>
            </button>
          </div>

          {/* Post Dispatch Button */}
          <motion.button
            type="submit"
            id="composer-post-submit-btn"
            disabled={(!content.trim() && !attachedAsset) || isUploading || isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Post</span>
              </>
            )}
          </motion.button>
        </div>
      </form>

      {/* Official Uploadcare File Uploader Modal */}
      <UploadcareUploaderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(asset) => {
          // Pre-validate in case modal uploader bypassed
          if (asset.size > MAX_FILE_SIZE_BYTES) {
            setUploadError(`File "${asset.filename}" (${asset.formattedSize}) exceeds the strict 25 MB limit.`);
            return;
          }
          setAttachedAsset(asset);
          setUploadError(null);
          playSound('success');
        }}
        onError={(errMessage) => {
          setUploadError(errMessage);
          playSound('pop');
        }}
      />
    </div>
  );
};
