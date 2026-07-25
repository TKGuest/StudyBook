import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AcademicReactionType, Post } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  ThumbsUp,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
  Send, 
  Paperclip, 
  Volume2, 
  Eye, 
  EyeOff, 
  Download, 
  ExternalLink, 
  Youtube, 
  BookOpen, 
  Award,
  MoreHorizontal,
  Bookmark,
  Share2,
  Trash2,
  Check,
  ChevronDown,
  X,
  FileText,
  Video,
  Upload,
  Lock,
  BadgeCheck
} from 'lucide-react';

interface FeedViewProps {
  searchQuery: string;
  savedOnly?: boolean;
}

export const FeedView: React.FC<FeedViewProps> = ({ searchQuery, savedOnly = false }) => {
  const { 
    posts, 
    setPosts, 
    addPost, 
    deletePost,
    reactToPost, 
    addComment, 
    deleteComment,
    markHelpfulComment, 
    savePostToLibrary, 
    speakText, 
    isSpeaking,
    user,
    settings,
    activeFolderId,
    setActiveFolderId,
    folders
  } = useApp();

  const [newPostText, setNewPostText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [activeSubjectFilter, setActiveSubjectFilter] = useState('All');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [activeSaveMenuPostId, setActiveSaveMenuPostId] = useState<string | null>(null);
  
  // Advanced attachment states
  const [showAttachmentForm, setShowAttachmentForm] = useState(false);
  const [attachType, setAttachType] = useState<'pdf' | 'doc' | 'link' | 'youtube'>('pdf');
  const [attachTitle, setAttachTitle] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Facebook-style stories and post creation modals
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState<number>(0);
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);

  // Delete Confirmation Modal State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'post' | 'comment';
    postId: string;
    commentId?: string;
    isOwner: boolean;
    authorName?: string;
  } | null>(null);

  // Filtering based on subject filters AND Search Query AND settings.subjectWeights (if we want to reflect weights or mute tags!)
  const filteredPosts = posts.filter(post => {
    // If we're looking at Saved Items, only show posts where isSaved is true and matches folder
    if (savedOnly) {
      if (!post.isSaved) return false;
      if (activeFolderId) {
        if (activeFolderId === 'f_watch_later') {
          if (post.savedFolderId && post.savedFolderId !== 'f_watch_later') {
            return false;
          }
        } else {
          if (post.savedFolderId !== activeFolderId) {
            return false;
          }
        }
      }
    }

    // 1. Filter by subject filter tabs
    if (activeSubjectFilter !== 'All' && post.subject.toLowerCase() !== activeSubjectFilter.toLowerCase()) {
      return false;
    }

    // 2. Filter by search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const contentMatches = post.content.toLowerCase().includes(q);
      const authorMatches = post.user.name.toLowerCase().includes(q);
      const subjectMatches = post.subject.toLowerCase().includes(q);
      if (!contentMatches && !authorMatches && !subjectMatches) {
        return false;
      }
    }

    // 3. Filter by muteTags (unless it's the user's own post)
    const isMyPost = post.user.id === user.id || (post.isAnonymous && post.user.id === 'u_anon');
    if (!isMyPost) {
      const isMuted = settings.muteTags.some(tag => 
        post.content.toLowerCase().includes(tag.toLowerCase()) || 
        post.subject.toLowerCase().includes(tag.toLowerCase())
      );
      if (isMuted) return false;
    }

    return true;
  });

  const handleDownloadAttachment = (attachment: { title: string; url: string; type: string }) => {
    if (attachment.url && attachment.url !== '#') {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const content = `StudyBook Academic File Document\nTitle: ${attachment.title}\nType: ${attachment.type.toUpperCase()}\nStatus: Verified Complete`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.title.toLowerCase().endsWith('.pdf') || attachment.title.toLowerCase().endsWith('.docx') || attachment.title.toLowerCase().endsWith('.txt')
        ? attachment.title 
        : `${attachment.title}.${attachment.type === 'pdf' ? 'pdf' : 'docx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleFileChange = (file: File) => {
    // Automatically set underlying attachment type based on extension
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    setAttachType(isPdf ? 'pdf' : 'doc');

    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return null;
        if (prev >= 100) {
          clearInterval(interval);
          return null;
        }
        return prev + 30;
      });
    }, 100);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAttachUrl(dataUrl);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 500);
    };
    reader.onerror = () => {
      setUploadProgress(null);
    };
    reader.readAsDataURL(file);
    setAttachTitle(file.name);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    let typeToSend: 'pdf' | 'doc' | 'link' | 'youtube' = attachType;
    if (attachType === 'link') {
      const isYoutube = attachUrl.toLowerCase().includes('youtube.com') || attachUrl.toLowerCase().includes('youtu.be');
      if (isYoutube) {
        typeToSend = 'youtube';
      }
    }

    addPost(
      newPostText, 
      selectedSubject === 'All' ? 'Math' : selectedSubject, 
      showAttachmentForm ? typeToSend : undefined,
      showAttachmentForm ? (attachTitle.trim() || 'Untitled Attachment') : undefined,
      isAnonymous,
      showAttachmentForm ? attachUrl : undefined
    );

    // Reset fields & view filters so newly posted item is immediately visible
    setNewPostText('');
    setIsAnonymous(false);
    setShowAttachmentForm(false);
    setAttachTitle('');
    setAttachUrl('');
    setUploadProgress(null);
    setCreatePostModalOpen(false);
    setActiveSubjectFilter('All');
    if (setActiveFolderId) {
      setActiveFolderId(undefined);
    }
  };

  const handleCommentSubmit = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const commentText = commentInputs[postId] || '';
    if (!commentText.trim()) return;

    addComment(postId, commentText);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  const currentEmail = user.email || localStorage.getItem('sb_current_email') || '';
  const isAdmin = user.role === 'admin' || currentEmail.toLowerCase() === 'billkute030709@gmail.com';

  const handleDeletePost = (id: string, postOwnerId?: string, authorName?: string) => {
    setDeleteConfirmTarget({
      type: 'post',
      postId: id,
      isOwner: postOwnerId === user.id,
      authorName
    });
  };

  const handleDeleteComment = (postId: string, commentId: string, commentOwnerId?: string, authorName?: string) => {
    setDeleteConfirmTarget({
      type: 'comment',
      postId,
      commentId,
      isOwner: commentOwnerId === user.id,
      authorName
    });
  };

  const executeDelete = () => {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.type === 'post') {
      deletePost(deleteConfirmTarget.postId);
    } else if (deleteConfirmTarget.type === 'comment' && deleteConfirmTarget.commentId) {
      deleteComment(deleteConfirmTarget.postId, deleteConfirmTarget.commentId);
    }
    setDeleteConfirmTarget(null);
  };

  const mockStories = [
    {
      id: 'story_current',
      userName: 'Tạo tin',
      userAvatar: settings.incognitoMode ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' : user.avatar,
      coverImg: settings.incognitoMode ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' : user.avatar,
      isCreator: true,
      text: 'Share a quick study tip!'
    }
  ];

  // Story Progress auto-forwarding effect
  useEffect(() => {
    if (selectedStoryIndex === null) return;
    
    setStoryProgress(0);
    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          // Go to next story or close
          if (selectedStoryIndex < mockStories.length - 1) {
            setSelectedStoryIndex(prevIdx => (prevIdx !== null ? prevIdx + 1 : null));
            return 0;
          } else {
            setSelectedStoryIndex(null);
            return 0;
          }
        }
        return prev + 2.5; // Fills up in ~4 seconds
      });
    }, 100);

    return () => clearInterval(interval);
  }, [selectedStoryIndex]);

  useEffect(() => {
    if (savedOnly) {
      setActiveSubjectFilter('All');
    }
  }, [savedOnly]);

  return (
    <div className="flex-1 p-4 md:p-6 max-w-3xl mx-auto space-y-6 h-[calc(100vh-57px)] overflow-y-auto pb-20 scrollbar-thin">
      {savedOnly ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-6 shadow-sm space-y-2">
          <div className="flex items-center gap-3">
            {(() => {
              const currentFolder = folders.find(f => f.id === activeFolderId) || { name: 'Watch Later', color: 'bg-red-500' };
              return (
                <>
                  <div className={`p-3 rounded-2xl bg-gray-55 dark:bg-slate-900 flex items-center justify-center`}>
                    <div className={`h-6 w-6 rounded-full ${currentFolder.color || 'bg-blue-500'}`} />
                  </div>
                  <div>
                    <h2 className="font-display font-black text-xl text-gray-800 dark:text-white leading-tight">{currentFolder.name}</h2>
                    <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">
                      Your personal bookmarks in {currentFolder.name}.
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        <>
          {/* Top horizontal tabs for subject filtering */}
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none border-b border-gray-150 dark:border-slate-800">
            {['All', 'Math', 'Physics', 'English', 'Chemistry'].map(sub => (
              <motion.button
                key={sub}
                onClick={() => setActiveSubjectFilter(sub)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeSubjectFilter === sub 
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                {sub === 'All' ? 'All Subjects' : sub}
              </motion.button>
            ))}
          </div>

          {/* Facebook Stories Bar */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none select-none">
            {mockStories.map((story, idx) => {
              return (
                <motion.div
                  key={story.id}
                  onClick={() => {
                    if (story.isCreator) {
                      setCreatePostModalOpen(true);
                    } else {
                      setSelectedStoryIndex(idx);
                      setStoryProgress(0);
                    }
                  }}
                  whileHover={{ scale: 1.025, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-24 sm:w-28 h-36 sm:h-40 rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md border border-gray-200 dark:border-slate-800 shrink-0 bg-gray-100 dark:bg-slate-800 transition-all duration-180 group"
                >
                  {story.isCreator ? (
                    <div className="flex flex-col h-full bg-white dark:bg-slate-800">
                      <div className="flex-1 overflow-hidden relative">
                        <img 
                          src={story.userAvatar} 
                          alt="Avatar" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                        />
                      </div>
                      <div className="h-12 pt-3 pb-2 px-1 text-center relative flex flex-col justify-center items-center">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-6.5 w-6.5 rounded-full bg-blue-600 border-2 border-white dark:border-white/20 flex items-center justify-center text-white text-base font-bold">
                          +
                        </div>
                        <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200 leading-none mt-1">Tạo tin</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <img 
                        src={story.coverImg} 
                        alt="Story Cover" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />
                      
                      {/* User avatar on story */}
                      <div className="absolute top-2 left-2">
                        <img 
                          src={story.userAvatar} 
                          alt={story.userName} 
                          className="h-7 w-7 rounded-full object-cover border-2 border-blue-600 ring-1 ring-white/10" 
                        />
                      </div>

                      {/* Story text label */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-[9px] font-bold text-white line-clamp-2 leading-tight">
                          {story.text}
                        </p>
                        <span className="text-[8px] text-white/80 block mt-0.5 font-semibold truncate">
                          {story.userName}
                        </span>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Fullscreen Story Viewer Modal */}
      <AnimatePresence>
        {selectedStoryIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
            <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
              <button
                onClick={() => setSelectedStoryIndex(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Đóng tin"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm h-[580px] rounded-2xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-800"
            >
              {/* Progress Bar at the top */}
              <div className="absolute top-3 left-3 right-3 z-50 flex gap-1">
                {mockStories.filter(s => !s.isCreator).map((s, idx) => {
                  const actualStoryIdx = idx + 1; // skip creator item
                  const isCurrent = selectedStoryIndex === actualStoryIdx;
                  const isCompleted = actualStoryIdx < selectedStoryIndex;
                  return (
                    <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-100 rounded-full"
                        style={{ 
                          width: isCompleted ? '100%' : isCurrent ? `${storyProgress}%` : '0%' 
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Story Content Card */}
              {(() => {
                const activeStory = mockStories[selectedStoryIndex];
                if (!activeStory) return null;
                return (
                  <div className="h-full w-full relative flex flex-col justify-between">
                    <img 
                      src={activeStory.coverImg} 
                      alt="Story Media" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                    {/* Top Author Details */}
                    <div className="absolute top-7 left-4 right-4 flex items-center gap-2">
                      <img 
                        src={activeStory.userAvatar} 
                        alt="Author" 
                        className="h-9 w-9 rounded-full object-cover border-2 border-blue-500" 
                      />
                      <div>
                        <p className="text-xs font-bold text-white">{activeStory.userName}</p>
                        <p className="text-[9px] text-white/60 font-medium">StudyBook Story • Active</p>
                      </div>
                    </div>

                    {/* Bottom overlay text */}
                    <div className="absolute bottom-10 left-6 right-6 text-center space-y-3">
                      <p className="text-base sm:text-lg font-black text-white leading-snug drop-shadow-lg font-sans">
                        "{activeStory.text}"
                      </p>
                      <span className="inline-block bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full animate-pulse shadow-md">
                        High-School Tip
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Story Navigation arrows */}
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3 pointer-events-none">
                <button
                  disabled={selectedStoryIndex <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStoryIndex(prev => (prev !== null ? prev - 1 : null));
                  }}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white pointer-events-auto cursor-pointer disabled:opacity-20 transition-all"
                >
                  ◀
                </button>
                <button
                  disabled={selectedStoryIndex >= mockStories.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStoryIndex(prev => (prev !== null ? prev + 1 : null));
                  }}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white pointer-events-auto cursor-pointer disabled:opacity-20 transition-all"
                >
                  ▶
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Creator Box (Facebook style trigger) */}
      {!savedOnly && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 p-4 shadow-sm space-y-3">
          <div className="flex gap-3 items-center">
            <img 
              src={settings.incognitoMode ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' : user.avatar} 
              alt="Avatar" 
              className="h-10 w-10 rounded-full object-cover shrink-0"
            />
            <button
              onClick={() => setCreatePostModalOpen(true)}
              className="flex-1 rounded-full bg-gray-100 dark:bg-slate-900 px-4 py-2.5 text-left text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-slate-750 transition-all cursor-pointer border-none focus:outline-none"
            >
              {settings.incognitoMode ? 'You are in study incognito mode...' : `Hello ${user.name.split(' ')[0] || 'Student'}!`} What are you self-studying or sharing today?
            </button>
          </div>
          
          <hr className="border-gray-100 dark:border-slate-750" />
          
          {/* Short Options row resembling Facebook: live photo, feeling, document */}
          <div className="flex items-center justify-around text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 pt-0.5">
            <button 
              onClick={() => { setCreatePostModalOpen(true); setShowAttachmentForm(true); setAttachType('pdf'); }}
              className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-750 py-1.5 px-3 rounded-lg cursor-pointer transition-all font-semibold"
            >
              <FileText className="w-4 h-4 text-red-500" />
              <span>Upload PDF</span>
            </button>
            
            <button 
              onClick={() => { setCreatePostModalOpen(true); setShowAttachmentForm(true); setAttachType('link'); }}
              className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-750 py-1.5 px-3 rounded-lg cursor-pointer transition-all font-semibold"
            >
              <Video className="w-4 h-4 text-red-600" />
              <span>Video / Link URL</span>
            </button>
            
            <button 
              onClick={() => { setCreatePostModalOpen(true); setIsAnonymous(true); }}
              className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-750 py-1.5 px-3 rounded-lg cursor-pointer transition-all font-semibold"
            >
              <Lock className="w-4 h-4 text-purple-500" />
              <span>Ask Secretly</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Post Full Modal */}
      <AnimatePresence>
        {createPostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-150 dark:border-slate-700">
                <div className="w-6" /> {/* Balance */}
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-base">Tạo bài viết</h3>
                <button
                  onClick={() => setCreatePostModalOpen(false)}
                  className="p-1.5 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-650 transition-colors text-gray-500 dark:text-gray-300 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreatePost} className="p-4 flex-1 flex flex-col space-y-4">
                {/* Author Info */}
                <div className="flex items-center gap-3">
                  <img 
                    src={settings.incognitoMode ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' : user.avatar} 
                    alt="Avatar" 
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 dark:text-slate-100">
                      {isAnonymous ? 'Anonymous Student' : user.name || 'Student'}
                    </h4>
                    {/* Audience/Subject Badges */}
                    <div className="flex gap-1.5 mt-1">
                      <span className="flex items-center gap-1 text-[9px] font-semibold bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 py-0.5 px-2 rounded-md">
                        Công khai
                      </span>
                      <span className="flex items-center gap-1 text-[9px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 py-0.5 px-2 rounded-md uppercase">
                        Subject: {selectedSubject}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Text Area */}
                <textarea
                  value={newPostText}
                  onChange={e => setNewPostText(e.target.value)}
                  placeholder={`${isAnonymous ? 'You are posting anonymously...' : `Hi ${user.name.split(' ')[0] || 'there'}!`} What are you self-studying or sharing today?`}
                  className={`w-full placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-transparent border-none focus:outline-none resize-none h-32 leading-relaxed ${
                    newPostText.length < 60 ? 'text-lg font-medium' : 'text-sm font-normal'
                  }`}
                  autoFocus
                />

                {/* Subject Selector inside modal */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Category:</span>
                    <select
                      value={selectedSubject}
                      onChange={e => setSelectedSubject(e.target.value)}
                      className="bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold py-1 px-2.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Math" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Mathematics</option>
                      <option value="Physics" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Physics</option>
                      <option value="English" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">English</option>
                      <option value="Chemistry" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Chemistry</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Anonymous toggle button */}
                    <button
                      type="button"
                      onClick={() => setIsAnonymous(!isAnonymous)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                        isAnonymous 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Ask Anonymously
                    </button>

                    {/* Attachment Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowAttachmentForm(!showAttachmentForm)}
                      className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${showAttachmentForm ? 'text-blue-600' : 'text-gray-400'}`}
                      title="Attach Document"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expansible Attachment Details Form inside modal */}
                {showAttachmentForm && (
                  <div className="bg-gray-50 dark:bg-slate-750 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Study Attachment Settings</span>
                    
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <select
                          value={(attachType === 'pdf' || attachType === 'doc') ? 'doc' : 'link'}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === 'doc') {
                              setAttachType('doc');
                            } else {
                              setAttachType('link');
                            }
                            setAttachTitle('');
                            setAttachUrl('');
                            setUploadProgress(null);
                          }}
                          className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-xs py-2 px-2.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="doc" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Tài liệu học tập (PDF, DOC, DOCX...)</option>
                          <option value="link" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Tài liệu liên kết / Video (URL, YouTube)</option>
                        </select>
                      </div>

                      {/* PDF / DOC File Uploader Area */}
                      {(attachType === 'pdf' || attachType === 'doc') ? (
                        <div className="space-y-2">
                          {!attachUrl ? (
                            <div
                              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                              onDragLeave={() => setIsDragging(false)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                  handleFileChange(e.dataTransfer.files[0]);
                                }
                              }}
                              onClick={() => document.getElementById('file-upload-input')?.click()}
                              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                                isDragging 
                                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
                                  : 'border-gray-200 dark:border-slate-650 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                              }`}
                            >
                              <input
                                id="file-upload-input"
                                type="file"
                                accept={attachType === 'pdf' ? '.pdf' : '.doc,.docx,.txt,.rtf'}
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileChange(e.target.files[0]);
                                  }
                                }}
                              />
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Upload className="w-6 h-6 text-blue-500 animate-bounce" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                  Kéo thả hoặc nhấp để chọn tệp {attachType.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  Hỗ trợ tệp {attachType === 'pdf' ? 'PDF lên đến 10MB' : 'DOC, DOCX, TXT'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-150 dark:border-slate-700 flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  attachType === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {attachType.toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <input
                                    type="text"
                                    value={attachTitle}
                                    onChange={(e) => setAttachTitle(e.target.value)}
                                    placeholder="Đặt tên cho tệp học tập..."
                                    className="bg-transparent border-b border-dashed border-gray-300 dark:border-slate-600 text-xs font-semibold text-gray-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 w-full"
                                  />
                                  <span className="text-[9px] text-emerald-500 font-bold block mt-0.5">Tải lên thành công</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setAttachUrl(''); setAttachTitle(''); setUploadProgress(null); }}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          {uploadProgress !== null && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                                <span>Đang xử lý tệp...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-blue-500 h-full transition-all duration-150" 
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Fused URL Link Input */
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={attachUrl}
                            onChange={e => setAttachUrl(e.target.value)}
                            placeholder="Nhập địa chỉ liên kết URL (ví dụ: https://youtube.com/watch?v=... hoặc https://..."
                            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-650 rounded-lg text-xs py-2 px-3 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={attachTitle}
                            onChange={e => setAttachTitle(e.target.value)}
                            placeholder="Nhập tiêu đề cho liên kết / bài giảng..."
                            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-650 rounded-lg text-xs py-2 px-3 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit blue button */}
                <button
                  type="submit"
                  disabled={!newPostText.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg text-sm shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 border-none"
                >
                  <Send className="h-4 w-4" />
                  Đăng (Post to Academic Feed)
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main post listing */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-slate-700 space-y-2">
            <BookOpen className="h-10 w-10 text-gray-300 mx-auto" />
            <h3 className="font-display font-bold text-base text-gray-700 dark:text-white">No academic posts found</h3>
            <p className="text-xs text-gray-400">Try searching other keywords or choose another subject.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredPosts.map(post => {
              const hasSaved = post.isSaved;
              
              // Generate glowing ring classes for authors with daily streaks
              const getStreakRing = (streak: number) => {
                if (post.isAnonymous) return '';
                if (streak >= 100) return 'border-2 border-yellow-400 ring-2 ring-yellow-500/20';
                if (streak >= 30) return 'border-2 border-indigo-400 ring-2 ring-indigo-500/10';
                if (streak > 0) return 'border-2 border-orange-500';
                return '';
              };

              return (
                <motion.div 
                  id={`post-card-${post.id}`}
                  key={post.id} 
                  layout="position"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm space-y-4 hover:shadow-md transition-shadow duration-200 relative overflow-hidden"
                >
                {/* Category subject ribbon */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {post.subject}
                  </span>
                  {(post.user?.id === user.id || post.authorId === user.id || isAdmin) && (
                    <button 
                      onClick={() => handleDeletePost(post.id, post.authorId || post.user?.id, post.user?.name)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                      title={isAdmin && post.user?.id !== user.id ? 'Admin: Xóa bài viết này' : 'Xóa bài viết'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Header info */}
                <div className="flex gap-3">
                  <div className="relative">
                    <img 
                      src={post.isAnonymous ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' : post.user.avatar} 
                      alt="Author" 
                      className={`h-10 w-10 rounded-full object-cover ${getStreakRing(post.user.streak)}`}
                    />
                    {!post.isAnonymous && post.user.streak > 0 && (
                      <span className="absolute -bottom-1 -right-1 bg-orange-600 text-[9px] font-bold text-white px-1 rounded-full flex items-center gap-0.5">
                        <Flame className="h-2 w-2 fill-white shrink-0" />
                        {post.user.streak}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900 dark:text-white hover:underline cursor-pointer flex items-center gap-1">
                        {post.isAnonymous ? 'Anonymous Student' : post.user.name}
                        {!post.isAnonymous && (post.user.role === 'tutor' || post.user.badges?.includes('Verified Tutor') || post.user.role === 'admin') && (
                          <span title="Đã xác minh gia sư">
                            <BadgeCheck className="h-3.5 w-3.5 text-blue-500 fill-blue-500/20 shrink-0" />
                          </span>
                        )}
                      </span>
                      {post.user.role === 'tutor' && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                          <Award className="h-2.5 w-2.5 shrink-0" />
                          GIA SƯ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                      <span>{new Date(post.timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Post body */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-800 dark:text-slate-100 leading-relaxed font-sans font-normal">
                    {post.content}
                  </p>

                  {/* Attachment Block (If any) */}
                  {post.attachment && (
                    <div className="border border-gray-150 dark:border-slate-700 rounded-xl overflow-hidden flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-slate-850 hover:bg-gray-100/50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        {post.attachment.type === 'pdf' && (
                          <div className="h-10 w-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
                            PDF
                          </div>
                        )}
                        {post.attachment.type === 'doc' && (
                          <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
                            DOC
                          </div>
                        )}
                        {post.attachment.type === 'link' && (
                          <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
                            <ExternalLink className="h-5 w-5" />
                          </div>
                        )}
                        {post.attachment.type === 'youtube' && (
                          <div className="h-10 w-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                            <Youtube className="h-5 w-5 fill-red-600" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-white truncate leading-snug">
                            {post.attachment.title}
                          </p>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {post.attachment.size ? `${post.attachment.size} • Free Download` : 'Linked study website'}
                          </span>
                        </div>
                      </div>

                      {/* Download CTA buttons */}
                      {post.attachment.type === 'pdf' || post.attachment.type === 'doc' ? (
                        <button 
                          onClick={() => post.attachment && handleDownloadAttachment(post.attachment)}
                          className="flex items-center gap-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      ) : (
                        <a 
                          href={
                            post.attachment.url && post.attachment.url !== '#' 
                              ? post.attachment.url 
                              : `https://www.google.com/search?q=${encodeURIComponent(post.attachment.title)}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Visit
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Academic Post Actions */}
                <div className="pt-3 border-t border-gray-100 dark:border-slate-700 space-y-3">
                  {/* Summary Counts */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {post.reactions.helpful > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
                          <ThumbsUp className="w-3 h-3" /> {post.reactions.helpful}
                        </span>
                      )}
                      {post.reactions.insightful > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                          <Lightbulb className="w-3 h-3" /> {post.reactions.insightful}
                        </span>
                      )}
                      {post.reactions.confused > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[11px] font-semibold">
                          <HelpCircle className="w-3 h-3" /> {post.reactions.confused}
                        </span>
                      )}
                      {post.reactions.verified > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> {post.reactions.verified}
                        </span>
                      )}
                      {(post.reactions.helpful + post.reactions.insightful + post.reactions.confused + post.reactions.verified) === 0 && (
                        <span className="text-gray-400 text-[11px]">No reactions yet</span>
                      )}
                    </div>
                    <span>{post.comments.length} comments • {post.shares} shares</span>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() => reactToPost(post.id, 'helpful')}
                        className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          post.currentUserReaction === 'helpful'
                            ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>Helpful</span>
                      </button>

                      <button
                        onClick={() => reactToPost(post.id, 'insightful')}
                        className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          post.currentUserReaction === 'insightful'
                            ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Lightbulb className="h-4 w-4" />
                        <span>Insightful</span>
                      </button>

                      <button
                        onClick={() => reactToPost(post.id, 'confused')}
                        className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          post.currentUserReaction === 'confused'
                            ? 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <HelpCircle className="h-4 w-4" />
                        <span>Confused</span>
                      </button>
                    </div>
                    {/* Bookmark to Digital Binder Folder */}
                    <div className="relative flex items-center">
                      <motion.button
                        onClick={() => {
                          savePostToLibrary(post.id, post.savedFolderId || 'f_watch_later');
                        }}
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.93 }}
                        className={`flex items-center gap-1.5 py-2 px-3 rounded-l-xl transition-all cursor-pointer ${
                          hasSaved 
                            ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 font-bold' 
                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:text-gray-300'
                        } border-none`}
                        title={hasSaved ? "Remove from saved items" : "Save to Watch Later"}
                      >
                        <Bookmark className={`h-4 w-4 shrink-0 ${hasSaved ? 'fill-blue-600 text-blue-600' : ''}`} />
                        <span className="text-xs font-bold">
                          {hasSaved ? 'Saved' : 'Save'}
                        </span>
                      </motion.button>

                      <motion.button
                        onClick={() => {
                          setActiveSaveMenuPostId(activeSaveMenuPostId === post.id ? null : post.id);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.93 }}
                        className={`p-2 rounded-r-xl transition-all cursor-pointer border-l border-gray-200 dark:border-slate-700 ${
                          hasSaved
                            ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/30'
                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 dark:text-gray-300'
                        }`}
                        title="Save to specific library folder"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </motion.button>

                        {activeSaveMenuPostId === post.id && (
                          <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded-xl p-2 shadow-lg z-30 min-w-[160px] space-y-1 text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                            <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-2 py-1">Save to Folder</p>
                            
                            {folders.map(folder => {
                              const isSavedInThisFolder = post.isSaved && (post.savedFolderId === folder.id || (folder.id === 'f_watch_later' && !post.savedFolderId));
                              return (
                                <button
                                  key={folder.id}
                                  onClick={() => {
                                    savePostToLibrary(post.id, folder.id);
                                    setActiveSaveMenuPostId(null);
                                  }}
                                  className="w-full flex items-center justify-between text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 transition-all cursor-pointer border-none bg-transparent"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`h-2.5 w-2.5 rounded-full ${folder.color || 'bg-blue-500'} shrink-0`} />
                                    <span className="truncate font-medium">{folder.name}</span>
                                  </div>
                                  {isSavedInThisFolder && (
                                    <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                {/* Collapsible comments block */}
                <div className="bg-gray-50/50 dark:bg-slate-850 rounded-xl p-3 space-y-3.5">
                  <form onSubmit={e => handleCommentSubmit(post.id, e)} className="flex gap-2">
                    <input
                      type="text"
                      value={commentInputs[post.id] || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setCommentInputs(prev => ({ ...prev, [post.id]: val }));
                      }}
                      placeholder="Write an answer or study explanation..."
                      className="flex-1 bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white border border-gray-150 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button 
                      type="submit"
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-3 rounded-xl flex items-center justify-center transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>

                  {/* Comment list */}
                  {post.comments.length > 0 && (
                    <div className="space-y-3 divide-y divide-gray-100 dark:divide-slate-700">
                      {post.comments.map((comment, idx) => {
                        const isTeacher = comment.user.role === 'tutor';
                        const isBlurred = settings.spoilerProtection && (comment.content.includes('đáp án') || comment.content.includes('lời giải') || comment.content.includes('đáp số') || comment.content.toLowerCase().includes('solution') || comment.content.toLowerCase().includes('answer'));
                        const isMyComment = comment.user?.id === user.id;
                        
                        return (
                          <div key={comment.id} className={`pt-2.5 flex gap-2.5 items-start ${idx === 0 ? 'border-t-0 pt-0' : ''}`}>
                            <img src={comment.user.avatar} alt="Commentor" className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 shadow-sm">
                                <div className="flex items-center justify-between gap-1.5 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-gray-800 dark:text-white hover:underline cursor-pointer flex items-center gap-1">
                                      {comment.user.name}
                                      {(comment.user.role === 'tutor' || comment.user.badges?.includes('Verified Tutor') || comment.user.role === 'admin') && (
                                        <span title="Đã xác minh gia sư">
                                          <BadgeCheck className="h-3 w-3 text-blue-500 fill-blue-500/20 shrink-0" />
                                        </span>
                                      )}
                                    </span>
                                    {isTeacher && (
                                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-1 rounded">Gia sư</span>
                                    )}
                                    {comment.hasHelped && (
                                      <span className="text-[9px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 px-1 rounded flex items-center gap-0.5">
                                        HELPFUL
                                      </span>
                                    )}
                                  </div>
                                  {(isMyComment || isAdmin) && (
                                    <button
                                      onClick={() => handleDeleteComment(post.id, comment.id, comment.user?.id, comment.user?.name)}
                                      className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                      title={isAdmin && !isMyComment ? 'Admin: Xóa bình luận này' : 'Xóa bình luận'}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                                
                                {/* Spoiler Blur Protection Wrapper */}
                                <div className="relative">
                                  <p className={`text-xs text-gray-700 dark:text-gray-200 leading-relaxed ${isBlurred ? 'blur-sm select-none hover:blur-none transition-all duration-300 cursor-pointer' : ''}`}>
                                    {comment.content}
                                  </p>
                                  {isBlurred && (
                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] bg-gray-100/40 dark:bg-slate-800/40 text-blue-600 font-bold backdrop-blur-none pointer-events-none">
                                      CONTAINS SOLUTION / HOVER TO REVEAL
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Comment Actions (Helpful upvote) */}
                              <div className="flex items-center gap-3 mt-1 pl-2 text-[10px] text-gray-400 font-semibold">
                                <button 
                                  onClick={() => markHelpfulComment(post.id, comment.id)}
                                  className={`hover:underline flex items-center gap-1 ${comment.hasHelped ? 'text-blue-600 font-bold' : ''}`}
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  <span>{comment.helpfulCount > 0 ? `${comment.helpfulCount} Helpful` : 'Upvote answer'}</span>
                                </button>
                                <span>•</span>
                                <span>{comment.timestamp}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 rounded-xl shrink-0">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display font-extrabold text-sm text-gray-900 dark:text-white">
                    {deleteConfirmTarget.type === 'post' ? 'Xác nhận xóa bài viết' : 'Xác nhận xóa bình luận'}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
                    {isAdmin && !deleteConfirmTarget.isOwner ? (
                      <>
                        <span className="font-bold text-amber-500 block mb-1">⚠️ CẢNH BÁO QUẢN TRỊ VIÊN (ADMIN):</span>
                        Bạn đang thao tác xóa {deleteConfirmTarget.type === 'post' ? 'bài viết' : 'bình luận'} của {deleteConfirmTarget.authorName ? <strong>{deleteConfirmTarget.authorName}</strong> : 'người dùng này'}. Thao tác này không thể hoàn tác.
                      </>
                    ) : (
                      `Bạn có chắc chắn muốn xóa ${deleteConfirmTarget.type === 'post' ? 'bài viết này cùng tất cả bình luận' : 'bình luận này'} không? Thao tác này sẽ xóa vĩnh viễn.`
                    )}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-red-600/20"
                >
                  Xác nhận xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
