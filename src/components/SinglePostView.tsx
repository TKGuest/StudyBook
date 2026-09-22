import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AcademicReactionType } from '../types';
import { playSound } from '../utils/soundEffects';
import { getFullPostShareUrl } from '../utils/urlRouter';
import { 
  ArrowLeft, 
  X,
  Share2, 
  Copy, 
  Check, 
  ThumbsUp, 
  Lightbulb, 
  HelpCircle, 
  Bookmark, 
  School, 
  BookOpen, 
  BadgeCheck, 
  ExternalLink, 
  Youtube, 
  FileCheck, 
  Send, 
  Trash2, 
  Lock, 
  Clock, 
  MessageSquare,
  AlertCircle,
  Download
} from 'lucide-react';
import { motion } from 'motion/react';

interface SinglePostViewProps {
  postId: string;
  onBack: () => void;
}

export const SinglePostView: React.FC<SinglePostViewProps> = ({ postId, onBack }) => {
  const { 
    posts, 
    user, 
    reactToPost, 
    addComment, 
    deleteComment, 
    deletePost, 
    savePostToLibrary, 
    openDirectChat, 
    openUserProfile,
    isUserVerifiedTutor,
    groups,
    setActiveTab,
    approvePendingPost,
    rejectPendingPost
  } = useApp();

  const [commentText, setCommentText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Close modal on Escape key press (standard Facebook behavior)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const post = posts.find(p => p.id === postId || p.postId === postId);

  const handleCopyLink = () => {
    playSound('pop');
    const shareUrl = getFullPostShareUrl(post?.postId || post?.id || postId);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !post) return;
    addComment(post.id, commentText.trim());
    setCommentText('');
    playSound('pop');
  };

  // If post doesn't exist
  if (!post) {
    return (
      <div 
        id="single-post-modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) onBack();
        }}
        className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 text-center shadow-2xl relative"
        >
          <button
            onClick={onBack}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Post Not Found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            This study post may have been removed or the direct link is incorrect.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </button>
        </motion.div>
      </div>
    );
  }

  const isOwner = post.user?.id === user.id || post.authorId === user.id;
  const currentEmail = user.email || localStorage.getItem('sb_current_email') || '';
  const isAdmin = user.role === 'admin' || currentEmail.toLowerCase() === 'billkute030709@gmail.com';
  const hasSaved = post.isSaved;

  // Check group details if this is a group post
  const group = post.groupId ? groups.find(g => g.id === post.groupId) : null;
  const isMemberOfGroup = group ? (group.isMember || group.memberUserIds?.includes(user.id)) : true;
  const isPendingApproval = post.status === 'pending';

  const isPhotoPost = post.attachment && post.attachment.type === 'image' && !!post.attachment.url;
  const isVideoPost = post.attachment && post.attachment.type === 'video' && !!post.attachment.url;

  return (
    <div 
      id="single-post-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onBack();
        }
      }}
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-xs flex items-center justify-center p-0 sm:p-3 md:p-6 overflow-hidden animate-in fade-in duration-200"
    >
      {/* Facebook-style Close Button floating at top-right */}
      <button
        onClick={onBack}
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[90] p-2.5 rounded-full bg-black/70 hover:bg-black/95 text-white shadow-2xl transition-transform hover:scale-105 cursor-pointer backdrop-blur-md border border-white/20"
        title="Close (Esc)"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`w-full h-full flex overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-800 ${
          isPhotoPost
            ? 'sm:max-w-6xl sm:max-h-[92vh] sm:rounded-2xl bg-black flex-col md:flex-row'
            : 'sm:max-w-2xl sm:max-h-[90vh] sm:rounded-2xl bg-white dark:bg-slate-900 flex-col'
        }`}
      >
        {/* If Photo Post: Left side is the Facebook Theater Dark View */}
        {isPhotoPost && (
          <div className="flex-1 bg-black flex flex-col items-center justify-center relative min-h-[260px] md:min-h-[500px] overflow-hidden p-2 sm:p-4 group">
            <img
              src={post.attachment?.url}
              alt={post.attachment?.title || 'Study photo'}
              className="max-w-full max-h-[50vh] md:max-h-[82vh] object-contain select-none"
            />
            {/* Quick image action overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/80 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="truncate font-medium flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                {post.attachment?.title}
              </span>
              <a
                href={post.attachment?.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold ml-2 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Full Resolution
              </a>
            </div>
          </div>
        )}

        {/* Right side for Photo Post, or Central View for Standard Post */}
        <div 
          className={`flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 ${
            isPhotoPost ? 'w-full md:w-[420px] lg:w-[460px] border-t md:border-t-0 md:border-l border-gray-200 dark:border-slate-800' : 'w-full'
          }`}
        >
          {/* Top Bar Header */}
          <div className="px-4 py-3 border-b border-gray-150 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Timeline</span>
              </button>
              <span className="text-gray-300 dark:text-slate-700">/</span>
              <span className="text-[11px] font-mono text-gray-400 dark:text-slate-500 truncate max-w-[130px] sm:max-w-[180px]">
                /post/{post.postId || post.id}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyLink}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700 border-gray-200 dark:border-slate-750'
                }`}
                title="Copy direct link to share"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden xs:inline">{copiedLink ? 'Copied' : 'Share Link'}</span>
              </button>

              <button
                onClick={onBack}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close viewer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Post & Comments Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Cohort Post Banner */}
            {post.groupId && (
              <div className="bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70 rounded-xl p-3 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-blue-900 dark:text-blue-200">
                      Cohort: {post.groupName || group?.name || 'Study Group'}
                    </span>
                    {!isMemberOfGroup && (
                      <span className="text-[9px] font-extrabold uppercase bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1.5 py-0.2 rounded">
                        Direct Link
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                    This post originates from an isolated study group feed.
                  </p>
                </div>
              </div>
            )}

            {/* Pending Approval Banner */}
            {isPendingApproval && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Awaiting Moderator Approval
                  </span>
                </div>
                {approvePendingPost && rejectPendingPost && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => approvePendingPost(post.id)}
                      className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectPendingPost(post.id)}
                      className="px-2.5 py-1 bg-rose-100 text-rose-700 text-[11px] font-bold rounded-lg cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Author Header Row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <img
                  src={post.isAnonymous ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' : post.user?.avatar}
                  alt="Author"
                  onClick={() => {
                    if (!post.isAnonymous && (post.authorId || post.user?.id)) {
                      onBack();
                      openUserProfile(post.authorId || post.user.id);
                    }
                  }}
                  className={`w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-slate-700 shrink-0 ${!post.isAnonymous ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''}`}
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      onClick={() => {
                        if (!post.isAnonymous && (post.authorId || post.user?.id)) {
                          onBack();
                          openUserProfile(post.authorId || post.user.id);
                        }
                      }}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:underline cursor-pointer"
                    >
                      {post.isAnonymous ? 'Anonymous Scholar' : post.user?.name}
                    </span>

                    {!post.isAnonymous && isUserVerifiedTutor(post.user, post.authorId) && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-700 px-1.5 py-0.2 rounded-full">
                        <BadgeCheck className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                        <span>Tutor</span>
                      </span>
                    )}

                    {!post.isAnonymous && post.user?.id && post.user.id !== user.id && (
                      <button
                        onClick={() => {
                          playSound('pop');
                          openDirectChat({
                            id: post.user.id,
                            name: post.user.name,
                            avatar: post.user.avatar,
                            email: post.user.email,
                            role: post.user.role,
                            allowDMsFromStrangers: post.user.allowDMsFromStrangers
                          });
                        }}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 text-[10px] font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-2.5 h-2.5 text-blue-500" />
                        Chat
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex-wrap">
                    <span>{new Date(post.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                      <School className="w-2.5 h-2.5" />
                      {post.grade || 'All Grades'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                      <BookOpen className="w-2.5 h-2.5" />
                      {post.subject || 'General'}
                    </span>
                  </div>
                </div>
              </div>

              {(isOwner || isAdmin) && (
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  title="Delete Post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Post Content Text */}
            <div className="text-xs sm:text-sm text-gray-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </div>

            {/* If NOT photo post (already rendered on left), render attachment here (video, pdf, doc, youtube, etc.) */}
            {!isPhotoPost && post.attachment && (
              <div className="pt-1">
                {isVideoPost ? (
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-black">
                    <video
                      src={post.attachment.url}
                      controls
                      className="w-full max-h-[380px] object-contain"
                    />
                  </div>
                ) : post.attachment.type === 'pdf' ? (
                  <div className="border border-red-200 dark:border-red-900/60 rounded-xl p-3.5 bg-red-50/50 dark:bg-red-950/20 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {post.attachment.title}
                        </p>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {post.attachment.size || 'Academic PDF Document'}
                        </span>
                      </div>
                    </div>
                    {post.attachment.url && (
                      <a
                        href={post.attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" /> View
                      </a>
                    )}
                  </div>
                ) : post.attachment.type === 'youtube' ? (
                  <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-3.5 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <Youtube className="w-4 h-4 fill-red-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {post.attachment.title}
                        </p>
                        <span className="text-[10px] text-gray-400">YouTube Educational Video</span>
                      </div>
                    </div>
                    {post.attachment.url && (
                      <a
                        href={post.attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Watch
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-3.5 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                        DOC
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {post.attachment.title}
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {post.attachment.size || 'Study Material'}
                        </span>
                      </div>
                    </div>
                    {post.attachment.url && (
                      <a
                        href={post.attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Reactions Counter Row */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                {post.reactions.helpful > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold text-[10px]">
                    <ThumbsUp className="w-2.5 h-2.5" /> {post.reactions.helpful}
                  </span>
                )}
                {post.reactions.insightful > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                    <Lightbulb className="w-2.5 h-2.5" /> {post.reactions.insightful}
                  </span>
                )}
                {post.reactions.confused > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold text-[10px]">
                    <HelpCircle className="w-2.5 h-2.5" /> {post.reactions.confused}
                  </span>
                )}
                {(post.reactions.helpful + post.reactions.insightful + post.reactions.confused) === 0 && (
                  <span className="text-gray-400 text-[11px]">No reactions yet</span>
                )}
              </div>

              <span className="text-[11px]">{post.comments.length} comments • {post.shares || 0} shares</span>
            </div>

            {/* Reaction Action Buttons Row */}
            <div className="flex items-center justify-between gap-1 py-1 border-y border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => reactToPost(post.id, 'helpful')}
                  className={`flex items-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    post.currentUserReaction === 'helpful'
                      ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/40'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                  title="Mark as Helpful"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Helpful</span>
                </button>

                <button
                  onClick={() => reactToPost(post.id, 'insightful')}
                  className={`flex items-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    post.currentUserReaction === 'insightful'
                      ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                  title="Mark as Insightful"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Insightful</span>
                </button>

                <button
                  onClick={() => reactToPost(post.id, 'confused')}
                  className={`flex items-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    post.currentUserReaction === 'confused'
                      ? 'text-red-600 bg-red-50 dark:bg-red-950/40'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                  title="Mark as Confused"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Confused</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => savePostToLibrary(post.id, post.savedFolderId || 'f_watch_later')}
                  className={`flex items-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    hasSaved
                      ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/40'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                  title={hasSaved ? 'Remove from Saved' : 'Save post'}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${hasSaved ? 'fill-blue-600' : ''}`} />
                  <span className="hidden xs:inline">{hasSaved ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Share post link"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Share</span>
                </button>
              </div>
            </div>

            {/* Comments Thread Section */}
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center justify-between">
                <span>Discussion & Responses</span>
                <span className="text-[11px] text-gray-400 font-normal">
                  {post.comments.length} comments
                </span>
              </h4>

              {post.comments.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4 bg-gray-50/50 dark:bg-slate-800/50 rounded-xl">
                  No responses yet. Be the first to share an answer or thoughts!
                </p>
              ) : (
                post.comments.map(c => {
                  const isCommentOwner = c.user?.id === user.id;
                  return (
                    <div key={c.id} className="flex items-start gap-2.5 text-xs">
                      <img
                        src={c.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                        alt={c.user?.name}
                        className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-slate-700 shrink-0 mt-0.5"
                      />
                      <div className="flex-1 bg-gray-50 dark:bg-slate-800 rounded-xl p-2.5 border border-gray-100 dark:border-slate-750">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {c.user?.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400">
                              {c.timestamp?.includes('T')
                                ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : (c.timestamp || 'Just now')}
                            </span>
                            {(isCommentOwner || isAdmin) && (
                              <button
                                onClick={() => deleteComment(post.id, c.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sticky Comment Form Footer */}
          <div className="p-3 border-t border-gray-150 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
              <img
                src={user.avatar}
                alt="My Avatar"
                className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-slate-700 shrink-0"
              />
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-gray-100 dark:bg-slate-800 border-none rounded-xl text-xs py-2 px-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="p-2 bg-blue-600 disabled:opacity-40 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer shrink-0"
                title="Send comment"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-700 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Delete this study post?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This action is permanent and will remove the post and all its responses from the feed.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deletePost(post.id);
                  setDeleteConfirmOpen(false);
                  onBack();
                }}
                className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
