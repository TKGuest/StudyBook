import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { playSound } from '../utils/soundEffects';
import {
  X,
  Upload,
  Film,
  FileText,
  Check,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RefreshCw
} from 'lucide-react';

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newReelId: string) => void;
}

export const CreateReelModal: React.FC<CreateReelModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, addReel } = useApp();

  const [videoUrl, setVideoUrl] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const [caption, setCaption] = useState('');
  const [subject, setSubject] = useState('Math');
  const [grade, setGrade] = useState(user?.grade || 'Grade 10');
  const [audioTrack, setAudioTrack] = useState(`Original Audio - ${user?.name || 'Student'}`);
  const [hasWorksheet, setHasWorksheet] = useState(false);
  const [worksheetTitle, setWorksheetTitle] = useState('');
  const [worksheetSize, setWorksheetSize] = useState('');
  const [worksheetUrl, setWorksheetUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Video preview player states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please select a valid video file (MP4, WebM, MOV).');
      return;
    }

    setErrorMsg('');
    const objectUrl = URL.createObjectURL(file);
    setVideoUrl(objectUrl);
    setVideoFileName(file.name);
    playSound('pop');

    if (!caption) {
      setCaption(`Quick study summary on ${subject}! 📚 #StudyTips #${subject}`);
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Automated PDF Worksheet Validation: exclusively accept PDF document types
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMsg('Worksheet attachment strictly accepts PDF documents only (.pdf).');
      playSound('error');
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }

    // Automatically read physical file size from file.size property
    const bytes = file.size;
    let formattedSize = '0 KB';
    if (bytes >= 1024 * 1024) {
      formattedSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      formattedSize = `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    setWorksheetTitle(file.name);
    setWorksheetSize(formattedSize);
    const objectUrl = URL.createObjectURL(file);
    setWorksheetUrl(objectUrl);
    setErrorMsg('');
    playSound('pop');
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    playSound('toggle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) {
      setErrorMsg('Please upload a video for your reel.');
      return;
    }

    if (!caption.trim()) {
      setErrorMsg('Please enter a caption describing your study reel.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    playSound('send');

    try {
      const newReel = await addReel({
        videoUrl,
        caption: caption.trim(),
        subject,
        grade,
        audioTrack: audioTrack.trim() || `Original Audio - ${user?.name || 'Student'}`,
        worksheet: hasWorksheet && worksheetTitle.trim() ? {
          title: worksheetTitle.trim().endsWith('.pdf') ? worksheetTitle.trim() : `${worksheetTitle.trim()}.pdf`,
          url: worksheetUrl || '#',
          size: worksheetSize || 'Auto-detected'
        } : undefined
      });

      setIsSubmitting(false);
      onClose();
      if (onSuccess) {
        onSuccess(newReel.id);
      }
    } catch (err) {
      console.error('Failed to create reel:', err);
      setIsSubmitting(false);
      setErrorMsg('Something went wrong while publishing your reel. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        onClick={e => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 flex flex-col overflow-hidden text-gray-900 dark:text-gray-100"
      >
        {/* Header (Facebook Reels Style) */}
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between bg-gray-50/70 dark:bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-amber-400 flex items-center justify-center text-white shadow-sm">
              <Film className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-gray-900 dark:text-white">
                Create Educational Reel
              </h2>
              <p className="text-xs text-gray-500 dark:text-neutral-400">Share a short bite-sized lesson, experiment, or study technique</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body: Two columns on desktop */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Video Selector & 9:16 Vertical Preview (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-center gap-3">
            <span className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wider self-start">
              Reel Video Preview (9:16)
            </span>

            {/* Vertical Video Phone Frame */}
            <div className="relative w-full max-w-[260px] aspect-[9/16] bg-neutral-950 rounded-2xl overflow-hidden shadow-xl border-2 border-gray-300 dark:border-neutral-700 flex flex-col items-center justify-center group">
              {videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    loop
                    autoPlay
                    playsInline
                    muted={isMuted}
                    onClick={handleTogglePlay}
                    className="w-full h-full object-cover cursor-pointer"
                  />

                  {/* Gradient Overlay for bottom text preview */}
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

                  {/* Play/Pause Button Overlay */}
                  <button
                    onClick={handleTogglePlay}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all shadow-md cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                  </button>

                  {/* Audio Mute/Unmute */}
                  <button
                    onClick={handleToggleMute}
                    className="absolute top-3 left-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all shadow-md cursor-pointer"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  </button>

                  {/* Preview of bottom caption & user tag */}
                  <div className="absolute left-3 right-3 bottom-3 text-white pointer-events-none space-y-1">
                    <div className="flex items-center gap-1.5">
                      <img 
                        src={user?.avatar} 
                        alt="Avatar" 
                        className="h-5 w-5 rounded-full object-cover border border-white"
                      />
                      <span className="text-[11px] font-bold truncate">{user?.name || 'You'}</span>
                      <span className="text-[9px] bg-blue-600 px-1.5 py-0.2 rounded-full font-semibold">{subject}</span>
                    </div>
                    <p className="text-[10px] text-gray-200 line-clamp-2 leading-tight">
                      {caption || 'Your study reel caption preview will appear here...'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center space-y-3 flex flex-col items-center justify-center h-full text-neutral-400">
                  <div className="h-14 w-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-blue-400 shadow-inner">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-200">No video selected</p>
                    <p className="text-[11px] text-neutral-400 mt-1">Select an educational video to upload</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-[200px]">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Change video button if already picked - consolidated into single Upload button */}
            {videoUrl && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload</span>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Right Column: Reel Details Form (7 cols) */}
          <form onSubmit={handleSubmit} className="md:col-span-7 flex flex-col space-y-4">
            {/* Direct Video URL toggle */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Or enter Direct Video URL (.mp4 / .webm):
                </label>
              </div>
              <input
                type="url"
                value={videoUrl}
                onChange={e => { setVideoUrl(e.target.value); setErrorMsg(''); }}
                placeholder="https://example.com/study-video.mp4"
                className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            {/* Reel Caption */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Reel Caption & Description <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400">{caption.length}/500</span>
              </div>
              <textarea
                value={caption}
                onChange={e => { setCaption(e.target.value); setErrorMsg(''); }}
                maxLength={500}
                rows={3}
                placeholder="Explain the concept in a few sentences... (e.g. Quick breakdown of Newton's 3rd Law using ice skate demos! ⛸️)"
                className="w-full p-3 rounded-xl text-xs bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
              />
            </div>

            {/* Subject and Target Grade in row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="Math">Math (Toán)</option>
                  <option value="Physics">Physics (Vật lý)</option>
                  <option value="Chemistry">Chemistry (Hóa học)</option>
                  <option value="Biology">Biology (Sinh học)</option>
                  <option value="English">English (Tiếng Anh)</option>
                  <option value="Literature">Literature (Ngữ văn)</option>
                  <option value="Other">Other / Computer Science</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Target Grade
                </label>
                <select
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                  <option value="College">College / University</option>
                </select>
              </div>
            </div>

            {/* Automated PDF Worksheet Validation: exclusively accept PDF document types with auto-detected size */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-200 dark:border-neutral-700/80 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasWorksheet}
                  onChange={e => {
                    setHasWorksheet(e.target.checked);
                    if (!e.target.checked) {
                      setWorksheetTitle('');
                      setWorksheetSize('');
                      setWorksheetUrl('');
                    }
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-red-500" />
                  Attach Free Study Notes / Worksheet (PDF only)
                </span>
              </label>

              {hasWorksheet && (
                <div className="pt-1 space-y-2 animate-in fade-in duration-150">
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />

                  {worksheetTitle ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {worksheetTitle}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            PDF Document • {worksheetSize} (Auto-detected file size)
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWorksheetTitle('');
                          setWorksheetSize('');
                          setWorksheetUrl('');
                          if (pdfInputRef.current) pdfInputRef.current.value = '';
                        }}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
                        title="Remove worksheet"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => pdfInputRef.current?.click()}
                      className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 text-gray-600 dark:text-gray-300 text-xs font-semibold flex items-center justify-center gap-2 bg-white dark:bg-neutral-900 transition-all cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-blue-500" />
                      <span>Select Worksheet PDF Document (.pdf)</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Modal Actions - Consolidated without Audience row */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-200 dark:border-neutral-800 mt-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !videoUrl}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Publish Reel
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
