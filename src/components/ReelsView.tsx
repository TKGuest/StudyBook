import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { playSound } from '../utils/soundEffects';
import { 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Play, 
  Pause, 
  Bookmark, 
  Volume2, 
  VolumeX, 
  MoreHorizontal, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Send, 
  Music, 
  Check, 
  UserPlus, 
  UserCheck, 
  Copy, 
  Film 
} from 'lucide-react';

interface LocalComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timestamp: string;
  likes: number;
  hasLiked?: boolean;
}

export const ReelsView: React.FC = () => {
  const { reels, toggleReelLike, user } = useApp();
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [playingStates, setPlayingStates] = useState<Record<string, boolean>>({});
  const [mutedStates, setMutedStates] = useState<Record<string, boolean>>({});
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`sb_following_reels_${user?.id || 'guest'}`);
      return saved ? JSON.parse(saved) : {};
    } catch (_) { return {}; }
  });

  const [savedReels, setSavedReels] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`sb_saved_reels_${user?.id || 'guest'}`);
      return saved ? JSON.parse(saved) : {};
    } catch (_) { return {}; }
  });

  useEffect(() => {
    if (user?.id) {
      try {
        const savedFollow = localStorage.getItem(`sb_following_reels_${user.id}`);
        setFollowingStates(savedFollow ? JSON.parse(savedFollow) : {});
        const savedSaved = localStorage.getItem(`sb_saved_reels_${user.id}`);
        setSavedReels(savedSaved ? JSON.parse(savedSaved) : {});
      } catch (_) {}
    }
  }, [user?.id]);
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});
  const [showCommentPanel, setShowCommentPanel] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [showRipple, setShowRipple] = useState<{ id: string; playing: boolean } | null>(null);

  // Comments state per reel
  const [commentsMap, setCommentsMap] = useState<Record<string, LocalComment[]>>({});

  const [newCommentText, setNewCommentText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Auto-play active reel & pause others
  useEffect(() => {
    reels.forEach((reel, idx) => {
      const vid = videoRefs.current[reel.id];
      if (vid) {
        if (idx === activeReelIndex) {
          const isExplicitlyPaused = playingStates[reel.id] === false;
          if (!isExplicitlyPaused) {
            vid.play().catch(() => {});
          }
        } else {
          vid.pause();
        }
      }
    });
  }, [activeReelIndex, reels, playingStates]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const index = Math.round(scrollTop / clientHeight);
    if (index >= 0 && index < reels.length && index !== activeReelIndex) {
      setActiveReelIndex(index);
    }
  };

  const scrollToReel = (index: number) => {
    if (index < 0 || index >= reels.length || !containerRef.current) return;
    const targetY = index * containerRef.current.clientHeight;
    containerRef.current.scrollTo({ top: targetY, behavior: 'smooth' });
    setActiveReelIndex(index);
  };

  const togglePlay = (id: string) => {
    const vid = videoRefs.current[id];
    const isCurrentlyPlaying = playingStates[id] !== false; // default playing
    const nextState = !isCurrentlyPlaying;

    setPlayingStates(prev => ({ ...prev, [id]: nextState }));
    setShowRipple({ id, playing: nextState });
    setTimeout(() => setShowRipple(null), 600);

    if (vid) {
      if (nextState) vid.play().catch(() => {});
      else vid.pause();
    }
  };

  const toggleMute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound('toggle');
    const vid = videoRefs.current[id];
    const isMuted = mutedStates[id] ?? true; // Default muted for browser autoplay policies
    const nextMuted = !isMuted;

    setMutedStates(prev => ({ ...prev, [id]: nextMuted }));
    if (vid) vid.muted = nextMuted;
  };

  const toggleFollow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound('pop');
    setFollowingStates(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (user?.id) {
        try { localStorage.setItem(`sb_following_reels_${user.id}`, JSON.stringify(next)); } catch (_) {}
      }
      return next;
    });
  };

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound('pop');
    setSavedReels(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (user?.id) {
        try { localStorage.setItem(`sb_saved_reels_${user.id}`, JSON.stringify(next)); } catch (_) {}
      }
      return next;
    });
  };

  const handleAddComment = (reelId: string) => {
    if (!newCommentText.trim()) return;
    playSound('send');
    const commentObj: LocalComment = {
      id: `c_${Date.now()}`,
      authorName: user.name || 'StudyBook User',
      authorAvatar: user.avatar,
      text: newCommentText.trim(),
      timestamp: 'Just now',
      likes: 0
    };

    setCommentsMap(prev => ({
      ...prev,
      [reelId]: [...(prev[reelId] || []), commentObj]
    }));
    setNewCommentText('');
  };

  const toggleCommentLike = (reelId: string, commentId: string) => {
    setCommentsMap(prev => ({
      ...prev,
      [reelId]: (prev[reelId] || []).map(c => {
        if (c.id === commentId) {
          const hasLiked = !c.hasLiked;
          return {
            ...c,
            hasLiked,
            likes: hasLiked ? c.likes + 1 : c.likes - 1
          };
        }
        return c;
      })
    }));
  };

  const handleDownloadWorksheet = (reel: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (reel.worksheet) {
      alert(`Downloaded worksheet:\n"${reel.worksheet.title}" (${reel.worksheet.size}) to your collection!`);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-57px)] bg-neutral-950 text-white flex justify-center items-center overflow-hidden">
      {/* Facebook Reels Top Banner */}
      <div className="absolute top-3 left-4 z-30 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
        <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-400 flex items-center justify-center p-0.5">
          <Film className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-xs font-bold font-display tracking-wide text-white">Facebook Reels</span>
      </div>

      {/* Main Reels Vertical Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full md:max-w-[420px] md:h-[calc(100vh-70px)] md:max-h-[750px] overflow-y-auto snap-y snap-mandatory scrollbar-none md:rounded-3xl md:shadow-2xl md:border md:border-neutral-800 bg-black relative"
      >
        {reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4 text-neutral-400">
            <div className="h-16 w-16 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 border border-neutral-800">
              <Film className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-white">Chưa có Reels học tập nào</h3>
            <p className="text-xs text-neutral-400 max-w-xs">Hãy đăng tải hoặc chia sẻ video bài giảng ngắn đầu tiên của bạn lên StudyBook!</p>
          </div>
        ) : (
          reels.map((reel, index) => {
          const isPlaying = playingStates[reel.id] !== false;
          const isMuted = mutedStates[reel.id] ?? true;
          const isFollowing = followingStates[reel.id];
          const isSaved = savedReels[reel.id];
          const isCaptionExpanded = expandedCaptions[reel.id];
          const reelComments = commentsMap[reel.id] || [];
          const totalComments = reel.comments + reelComments.length;

          return (
            <div 
              key={reel.id}
              className="snap-start relative w-full h-full flex flex-col justify-between overflow-hidden bg-black select-none"
            >
              {/* Video Player */}
              <div 
                onClick={() => togglePlay(reel.id)}
                className="absolute inset-0 w-full h-full cursor-pointer flex items-center justify-center bg-neutral-900"
              >
                <video
                  ref={el => { videoRefs.current[reel.id] = el; }}
                  src={reel.videoUrl}
                  loop
                  playsInline
                  muted={isMuted}
                  className="w-full h-full object-cover"
                />

                {/* Animated Center Play/Pause Ripple Overlay */}
                {showRipple?.id === reel.id && (
                  <div className="absolute z-20 pointer-events-none flex items-center justify-center h-20 w-20 rounded-full bg-black/60 backdrop-blur-md animate-ping">
                    {showRipple.playing ? (
                      <Play className="h-10 w-10 text-white fill-white ml-1" />
                    ) : (
                      <Pause className="h-10 w-10 text-white fill-white" />
                    )}
                  </div>
                )}

                {/* Subtle Gradient Overlays for Controls & Text Readability */}
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
              </div>

              {/* Top Controls Bar Inside Reel */}
              <div className="relative z-20 p-4 flex justify-between items-center pointer-events-auto mt-10 md:mt-0">
                <span className="text-[10px] font-bold bg-blue-600/90 text-white px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  {reel.subject}
                </span>

                {/* Mute/Unmute Audio Toggle */}
                <button
                  onClick={(e) => toggleMute(reel.id, e)}
                  className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors border border-white/10"
                  title={isMuted ? 'Mute' : 'Unmute'}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>

              {/* Right Side Action Icons Column (Facebook Reels style) */}
              <div className="absolute right-2.5 bottom-5 z-20 flex flex-col gap-4 items-center pointer-events-auto">
                {/* Like / Reaction */}
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleReelLike(reel.id); }}
                  className="flex flex-col items-center group cursor-pointer focus:outline-none"
                >
                  <div className={`p-3 rounded-full backdrop-blur-md transition-transform active:scale-125 shadow-lg ${
                    reel.hasLiked 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-black/40 hover:bg-black/60 text-white border border-white/10'
                  }`}>
                    <ThumbsUp className={`h-5 w-5 ${reel.hasLiked ? 'fill-white' : ''}`} />
                  </div>
                  <span className="text-[11px] font-bold mt-1 text-white shadow-sm">
                    {reel.likes.toLocaleString()}
                  </span>
                </button>

                {/* Comment Drawer Trigger */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowCommentPanel(reel.id); }}
                  className="flex flex-col items-center group cursor-pointer focus:outline-none"
                >
                  <div className="p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-transform active:scale-110 border border-white/10 shadow-lg">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold mt-1 text-white shadow-sm">
                    {totalComments.toLocaleString()}
                  </span>
                </button>

                {/* Share Button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowShareModal(reel.id); }}
                  className="flex flex-col items-center group cursor-pointer focus:outline-none"
                >
                  <div className="p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-transform active:scale-110 border border-white/10 shadow-lg">
                    <Share2 className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold mt-1 text-white shadow-sm">Chia sẻ</span>
                </button>

                {/* Save / Bookmark Button */}
                <button 
                  onClick={(e) => toggleSave(reel.id, e)}
                  className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  title="Save video"
                >
                  <div className={`p-3 rounded-full backdrop-blur-md transition-transform active:scale-110 shadow-lg ${
                    isSaved ? 'bg-amber-500 text-white' : 'bg-black/40 hover:bg-black/60 text-white border border-white/10'
                  }`}>
                    <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-white' : ''}`} />
                  </div>
                  <span className="text-[11px] font-bold mt-1 text-white shadow-sm">
                    {isSaved ? 'Saved' : 'Save'}
                  </span>
                </button>

                {/* Spinning Audio Record Disk */}
                <div className="mt-1 h-8 w-8 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center animate-spin" style={{ animationDuration: '4s' }}>
                  <Music className="h-3.5 w-3.5 text-blue-400" />
                </div>
              </div>

              {/* Bottom Left Author & Caption Info Overlay (Pinned strictly to bottom) */}
              <div className="absolute left-3.5 right-16 bottom-3 z-20 flex flex-col gap-2 pointer-events-auto">
                {/* Author Info & Follow Button */}
                <div className="flex items-center gap-2">
                  <img 
                    src={reel.tutorAvatar} 
                    alt={reel.tutorName} 
                    className="h-8 w-8 rounded-full object-cover border border-white/80 shadow-md" 
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white shadow-sm">{reel.tutorName}</span>
                    <button
                      onClick={(e) => toggleFollow(reel.id, e)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 border border-white/20 shadow-sm ${
                        isFollowing 
                          ? 'bg-white/20 text-white hover:bg-white/30' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="h-3 w-3" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3" />
                          Follow
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Caption / Description */}
                <div className="text-[12px] text-gray-100 font-sans leading-snug">
                  <p className={isCaptionExpanded ? '' : 'line-clamp-2'}>
                    {reel.caption}
                  </p>
                  {reel.caption.length > 80 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedCaptions(prev => ({ ...prev, [reel.id]: !prev[reel.id] })); }}
                      className="text-gray-300 font-semibold hover:underline mt-0.5 text-[10px]"
                    >
                      {isCaptionExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                  )}
                </div>

                {/* Audio Track Line */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-300 font-medium">
                  <Music className="h-3 w-3 text-blue-400 shrink-0" />
                  <span className="truncate">Âm thanh gốc - {reel.tutorName} • {reel.subject}</span>
                </div>

                {/* Download Worksheet Attached Button */}
                {reel.worksheet && (
                  <button
                    onClick={(e) => handleDownloadWorksheet(reel, e)}
                    className="w-fit flex items-center gap-2 bg-blue-600/90 hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] shadow-lg transition-all active:scale-95 border border-blue-400/30 cursor-pointer mt-0.5"
                  >
                    <Bookmark className="h-3.5 w-3.5 shrink-0 fill-white" />
                    <span className="truncate">Tải bài học (PDF)</span>
                  </button>
                )}
              </div>

              {/* Bottom Video Progress Seekbar Animation */}
              <div className="relative z-20 w-full h-1 bg-white/20">
                <div 
                  className={`h-full bg-blue-500 transition-all duration-300 ${isPlaying ? 'animate-pulse w-full' : 'w-1/2'}`} 
                />
              </div>

              {/* Facebook Reels Comments Slide-in Panel */}
              {showCommentPanel === reel.id && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-x-0 bottom-0 top-1/4 z-40 bg-neutral-900 rounded-t-2xl border-t border-neutral-700 flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
                >
                  {/* Comments Header */}
                  <div className="p-3.5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/90">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-400" />
                      Bình luận ({totalComments})
                    </span>
                    <button 
                      onClick={() => setShowCommentPanel(null)}
                      className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-neutral-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Comments Scrollable List */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {reelComments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-xs">
                        Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
                      </div>
                    ) : (
                      reelComments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 items-start">
                          <img 
                            src={comment.authorAvatar} 
                            alt={comment.authorName} 
                            className="h-8 w-8 rounded-full object-cover shrink-0" 
                          />
                          <div className="flex-1">
                            <div className="bg-neutral-800 p-2.5 rounded-2xl text-xs">
                              <span className="font-bold text-gray-200 block mb-0.5">{comment.authorName}</span>
                              <p className="text-gray-300 font-sans leading-relaxed">{comment.text}</p>
                            </div>
                            <div className="flex items-center gap-4 mt-1 ml-2 text-[10px] text-gray-400">
                              <span>{comment.timestamp}</span>
                              <button 
                                onClick={() => toggleCommentLike(reel.id, comment.id)}
                                className={`font-semibold hover:underline ${comment.hasLiked ? 'text-blue-400' : 'hover:text-gray-200'}`}
                              >
                                {comment.hasLiked ? 'Liked' : 'Like'} ({comment.likes})
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input Box at Bottom */}
                  <div className="p-3 border-t border-neutral-800 bg-neutral-900 flex gap-2 items-center">
                    <img 
                      src={user.avatar} 
                      alt="User" 
                      className="h-8 w-8 rounded-full object-cover shrink-0 border border-neutral-700" 
                    />
                    <input 
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(reel.id)}
                      placeholder="Write a public comment..."
                      className="flex-1 bg-neutral-800 text-white rounded-full px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
                    />
                    <button 
                      onClick={() => handleAddComment(reel.id)}
                      disabled={!newCommentText.trim()}
                      className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Share Dialog Modal */}
              {showShareModal === reel.id && (
                <div 
                  onClick={() => setShowShareModal(null)}
                  className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                >
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-xs bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 text-white shadow-2xl animate-in zoom-in-95 duration-200"
                  >
                    <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                      <span className="font-bold text-sm">Share Reel</span>
                      <button onClick={() => setShowShareModal(null)} className="p-1 text-gray-400 hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <button 
                        onClick={() => {
                          alert('Reel link copied to clipboard!');
                          setShowShareModal(null);
                        }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 transition-colors"
                      >
                        <Copy className="h-5 w-5 text-blue-400" />
                        <span className="text-[10px] text-gray-300">Copy Link</span>
                      </button>

                      <button 
                        onClick={() => {
                          alert('Shared to your StudyBook feed!');
                          setShowShareModal(null);
                        }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 transition-colors"
                      >
                        <Share2 className="h-5 w-5 text-emerald-400" />
                        <span className="text-[10px] text-gray-300">Share to Feed</span>
                      </button>

                      <button 
                        onClick={() => {
                          alert('Reel sent to study group chat!');
                          setShowShareModal(null);
                        }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 transition-colors"
                      >
                        <Send className="h-5 w-5 text-purple-400" />
                        <span className="text-[10px] text-gray-300">Send Direct</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
        )}
      </div>

      {/* Desktop Up/Down Fast Scroll Navigation Controls */}
      <div className="hidden md:flex flex-col gap-3 ml-4">
        <button
          onClick={() => scrollToReel(activeReelIndex - 1)}
          disabled={activeReelIndex === 0}
          className="p-3 rounded-full bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-900 transition-colors shadow-lg"
          title="Reel trước"
        >
          <ChevronUp className="h-5 w-5" />
        </button>

        <button
          onClick={() => scrollToReel(activeReelIndex + 1)}
          disabled={activeReelIndex === reels.length - 1}
          className="p-3 rounded-full bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-900 transition-colors shadow-lg"
          title="Reel tiếp theo"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
