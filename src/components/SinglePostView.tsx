import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Post, AcademicReactionType } from '../types';
import { playSound } from '../utils/soundEffects';
import { getFullPostShareUrl } from '../utils/urlRouter';
import { 
  ArrowLeft, 
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
  ShieldAlert, 
  Users, 
  Lock, 
  Clock, 
  MessageSquare,
  AlertCircle
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
    rejectPendingPost,
    isUserBlocked
  } = useApp();

  const [commentText, setCommentText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const post = posts.find(p => p.id === postId);

  const handleCopyLink = () => {
    playSound('pop');
    const shareUrl = getFullPostShareUrl(postId);
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
    if (!commentText.trim()) return;
    addComment(postId, commentText.trim());
    setCommentText('');
    playSound('pop');
  };

  // If post doesn't exist
  if (!post) {
    return (
      <div className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-8 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Post Not Found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            This study post may have been removed, deleted by a group administrator, or the direct link is incorrect.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </button>
        </div>
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

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#F0F2F5] dark:bg-slate-900">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-xs">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Timeline</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs font-mono text-gray-400 dark:text-slate-500">
              /post/{post.id}
            </span>
            <button
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:border-slate-600 dark:hover:bg-slate-650'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Link'}</span>
            </button>
          </div>
        </div>

        {/* Group Feed Isolation Banner */}
        {post.groupId && (
          <div className="bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Cohort Post: {post.groupName || group?.name || 'Study Group'}
                  </span>
                  {!isMemberOfGroup && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-200/70 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-md">
                      Direct Link View
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300/80 mt-0.5 leading-relaxed">
                  Group posts are protected by algorithmic feed isolation and do not appear in public recommendation feeds for non-members.
                </p>
              </div>
            </div>

            {group && (
              <button
                onClick={() => {
                  setActiveTab('groups');
                }}
                className="shrink-0 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
              >
                View Cohort
              </button>
            )}
          </div>
        )}

        {/* Pending Approval Banner (for Admins / Leaders) */}
        {isPendingApproval && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Awaiting Moderator Approval
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  This post is currently in the cohort review queue and is not yet visible to all members.
                </p>
              </div>
            </div>

            {approvePendingPost && rejectPendingPost && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => approvePendingPost(post.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Approve
                </button>
                <button
                  onClick={() => rejectPendingPost(post.id)}
                  className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Post Card */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-4">
          
          {/* Post Author Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <img
                src={post.isAnonymous ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' : post.user?.avatar}
                alt="Author"
                onClick={() => {
                  if (!post.isAnonymous && (post.authorId || post.user?.id)) {
                    openUserProfile(post.authorId || post.user.id);
                  }
                }}
                className={`w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-slate-700 shrink-0 ${!post.isAnonymous ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''}`}
              />

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    onClick={() => {
                      if (!post.isAnonymous && (post.authorId || post.user?.id)) {
                        openUserProfile(post.authorId || post.user.id);
                      }
                    }}
                    className="text-sm font-bold text-gray-900 dark:text-white hover:underline cursor-pointer"
                  >
                    {post.isAnonymous ? 'Anonymous Student' : post.user?.name}
                  </span>

                  {!post.isAnonymous && isUserVerifiedTutor(post.user, post.authorId) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/80 dark:border-blue-700/80 px-2 py-0.5 rounded-full">
                      <BadgeCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>Verified Tutor</span>
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
                      className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 text-[10px] font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-2.5 h-2.5 text-blue-500" />
                      Chat
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                  <span>{new Date(post.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-200/70 dark:border-indigo-800/70">
                    <School className="w-2.5 h-2.5" />
                    {post.grade || 'All Grades'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-semibold border border-blue-200/80 dark:border-blue-800/80">
                    <BookOpen className="w-2.5 h-2.5" />
                    {post.subject || 'General'}
                  </span>
                </div>
              </div>
            </div>

            {/* Options */}
            {(isOwner || isAdmin) && (
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                title="Delete Post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Post Content */}
          <div className="text-sm sm:text-base text-gray-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </div>

          {/* Attachment */}
          {post.attachment && (
            <div className="pt-2">
              {post.attachment.type === 'pdf' ? (
                <div className="border border-red-200 dark:border-red-900/60 rounded-xl p-4 bg-red-50/50 dark:bg-red-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {post.attachment.title}
                      </p>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">Academic PDF Document</span>
                    </div>
                  </div>
                  {post.attachment.url && (
                    <a
                      href={post.attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View
                    </a>
                  )}
                </div>
              ) : post.attachment.type === 'youtube' ? (
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden p-4 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <Youtube className="w-5 h-5 fill-red-600" />
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
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Watch
                    </a>
                  )}
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                      DOC
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {post.attachment.title}
                      </p>
                      <span className="text-[10px] text-gray-400">Study Attachment</span>
                    </div>
                  </div>
                  {post.attachment.url && (
                    <a
                      href={post.attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reactions Counter Bar */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-slate-750">
            <div className="flex items-center gap-2">
              {post.reactions.helpful > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                  <ThumbsUp className="w-3 h-3" /> {post.reactions.helpful}
                </span>
              )}
              {post.reactions.insightful > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                  <Lightbulb className="w-3 h-3" /> {post.reactions.insightful}
                </span>
              )}
              {post.reactions.confused > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold text-[11px]">
                  <HelpCircle className="w-3 h-3" /> {post.reactions.confused}
                </span>
              )}
              {(post.reactions.helpful + post.reactions.insightful + post.reactions.confused) === 0 && (
                <span className="text-gray-400 text-[11px]">No reactions yet</span>
              )}
            </div>

            <span>{post.comments.length} comments • {post.shares || 0} shares</span>
          </div>

          {/* Reaction Buttons Row */}
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-gray-100 dark:border-slate-750">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => reactToPost(post.id, 'helpful')}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  post.currentUserReaction === 'helpful'
                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/40'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-750'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Helpful</span>
              </button>

              <button
                onClick={() => reactToPost(post.id, 'insightful')}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  post.currentUserReaction === 'insightful'
                    ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-750'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                <span>Insightful</span>
              </button>

              <button
                onClick={() => reactToPost(post.id, 'confused')}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  post.currentUserReaction === 'confused'
                    ? 'text-red-600 bg-red-50 dark:bg-red-950/40'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-750'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Confused</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => savePostToLibrary(post.id, post.savedFolderId || 'f_watch_later')}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  hasSaved
                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/40'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-750'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${hasSaved ? 'fill-blue-600' : ''}`} />
                <span>{hasSaved ? 'Saved' : 'Save'}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>Comments</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-750 text-xs text-gray-600 dark:text-gray-300">
              {post.comments.length}
            </span>
          </h3>

          {/* Add Comment Input */}
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
            <img
              src={user.avatar}
              alt="My Avatar"
              className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-700 shrink-0"
            />
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a helpful study response..."
              className="flex-1 bg-gray-100 dark:bg-slate-750 border-none rounded-xl text-xs py-2 px-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="p-2 bg-blue-600 disabled:opacity-40 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Comments List */}
          <div className="space-y-3 pt-2">
            {post.comments.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">
                Be the first to share your academic thoughts or solution!
              </p>
            ) : (
              post.comments.map(c => {
                const isCommentOwner = c.user?.id === user.id;
                return (
                  <div key={c.id} className="flex items-start gap-3 text-xs">
                    <img
                      src={c.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                      alt={c.user?.name}
                      className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-slate-700 shrink-0 mt-0.5"
                    />
                    <div className="flex-1 bg-gray-50 dark:bg-slate-750 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {c.user?.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">
                            {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {(isCommentOwner || isAdmin) && (
                            <button
                              onClick={() => deleteComment(post.id, c.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
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

      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-200 dark:border-slate-700 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Delete this study post?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This action is permanent and will remove the post and all its responses.
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
