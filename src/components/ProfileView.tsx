import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Edit3, 
  BookOpen, 
  School, 
  Check, 
  X, 
  Heart, 
  Bookmark, 
  MessageSquare, 
  Sparkles, 
  Plus, 
  Camera, 
  Trash2, 
  Award,
  Send,
  UserCheck,
  Calendar,
  Layers,
  GraduationCap,
  Download,
  FileText,
  ExternalLink,
  EyeOff,
  Lock,
  UserPlus,
  Paperclip,
  Upload,
  Clock
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';
import { User } from '../types';

const PRESET_COVERS = [
  { id: 'tech', name: 'Tech & Hardware', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200' },
  { id: 'space', name: 'Cosmos & Physics', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200' },
  { id: 'library', name: 'Classic Library', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=1200' },
  { id: 'minimal', name: 'Minimal Modern', url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1200' }
];

const STUDY_FOCUS_OPTIONS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Environmental Science',
  'Medicine & Health',
  'English & Literature',
  'History & Social Studies',
  'Economics & Business',
  'Psychology',
  'Philosophy',
  'Political Science',
  'Art & Design',
  'Music & Performing Arts',
  'Foreign Languages',
  'General Studies'
];

export const ProfileView: React.FC = () => {
  const { 
    user: currentUser, 
    updateUserProfile,
    posts,
    addPost,
    deletePost,
    reactToPost,
    addComment,
    savePostToLibrary,
    viewingProfileUserId,
    communityUsers,
    friends,
    getFriendshipStatus,
    sendFriendRequest,
    settings,
    openSinglePost,
    showConfirmModal
  } = useApp();

  // Profile view displays current user or target profile if set
  const profileUser: User = useMemo(() => {
    if (!viewingProfileUserId || viewingProfileUserId === currentUser.id) {
      return currentUser;
    }
    const foundCommunity = communityUsers?.find(u => u.id === viewingProfileUserId);
    if (foundCommunity) return foundCommunity;
    const foundFriend = friends?.find(f => f.id === viewingProfileUserId);
    if (foundFriend) {
      return {
        id: foundFriend.id,
        name: foundFriend.name,
        email: foundFriend.email || `${foundFriend.name.toLowerCase().replace(/\s+/g, '')}@studybook.org`,
        avatar: foundFriend.avatar,
        grade: foundFriend.grade || 'Grade 10',
        streak: 1,
        streakLevel: 'none' as const,
        badges: [],
        bio: foundFriend.bio,
        role: (foundFriend.role === 'tutor' || foundFriend.role === 'creator' || foundFriend.role === 'admin') ? foundFriend.role : 'student',
        institution: foundFriend.institution
      };
    }
    const foundPost = posts.find(p => p.authorId === viewingProfileUserId || p.user?.id === viewingProfileUserId);
    if (foundPost?.user) return foundPost.user;
    return {
      id: viewingProfileUserId,
      name: 'Fellow Student',
      email: 'student@studybook.org',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      grade: 'Grade 10',
      streak: 1,
      streakLevel: 'none' as const,
      badges: [],
      role: 'student' as const
    };
  }, [viewingProfileUserId, currentUser, communityUsers, friends, posts]);

  const isOwnProfile = profileUser.id === currentUser.id;
  const friendshipStatus = getFriendshipStatus(profileUser.id);
  const isFriend = friendshipStatus === 'friends';
  const areProfilePostsHidden = !isOwnProfile && Boolean(profileUser.hideProfilePosts) && !isFriend;

  // Edit Profile Modal / Form State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser.name || '');
  const [editBio, setEditBio] = useState(currentUser.bio || '');
  const [editGrade, setEditGrade] = useState(currentUser.grade || 'Grade 10');
  const [editInstitution, setEditInstitution] = useState(currentUser.institution || '');
  const [editStudyFocus, setEditStudyFocus] = useState(
    (currentUser.subjects && currentUser.subjects[0]) === 'Math' ? 'Mathematics' : ((currentUser.subjects && currentUser.subjects[0]) || 'Mathematics')
  );
  const [selectedCover, setSelectedCover] = useState(currentUser.coverPhoto || PRESET_COVERS[0].url);

  // Cover photo picker modal
  const [isChangingCover, setIsChangingCover] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState('');

  // Timeline posts state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Quick post composition directly on profile timeline
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostSubject, setNewPostSubject] = useState('General');
  const [postAttachUrl, setPostAttachUrl] = useState('');
  const [postAttachTitle, setPostAttachTitle] = useState('');
  const [postAttachType, setPostAttachType] = useState<'pdf' | 'doc' | 'image' | 'video' | 'file'>('file');
  const [postAttachSize, setPostAttachSize] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Posts authored by profile user
  const userPosts = useMemo(() => {
    return posts.filter(p => !p.isAnonymous && (p.authorId === profileUser.id || p.user?.id === profileUser.id));
  }, [posts, profileUser.id]);

  // Aggregate user engagement stats
  const totalReactionsReceived = useMemo(() => {
    return userPosts.reduce((acc, p) => {
      const h = p.reactions?.helpful || 0;
      const i = p.reactions?.insightful || 0;
      return acc + h + i;
    }, 0);
  }, [userPosts]);

  // Handle open edit profile
  const handleOpenEdit = () => {
    setEditName(currentUser.name || '');
    setEditBio(currentUser.bio || '');
    setEditGrade(currentUser.grade || 'Grade 10');
    setEditInstitution(currentUser.institution || '');
    const firstSubject = (currentUser.subjects && currentUser.subjects.length > 0)
      ? (currentUser.subjects[0] === 'Math' ? 'Mathematics' : currentUser.subjects[0])
      : 'Mathematics';
    setEditStudyFocus(firstSubject);
    setSelectedCover(currentUser.coverPhoto || PRESET_COVERS[0].url);
    setIsEditingProfile(true);
  };

  // Handle save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile({
      name: editName.trim() || currentUser.name || 'Student',
      bio: editBio.trim(),
      grade: editGrade,
      institution: editInstitution.trim(),
      subjects: [editStudyFocus],
      coverPhoto: selectedCover
    });
    playSound('pop');
    setIsEditingProfile(false);
  };

  // Handle file selection in quick composer
  const handleProfileFileChange = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let type: 'pdf' | 'doc' | 'image' | 'video' | 'file' = 'file';
    if (ext === 'pdf') type = 'pdf';
    else if (['doc', 'docx', 'ppt', 'pptx', 'txt'].includes(ext || '')) type = 'doc';
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) type = 'image';
    else if (['mp4', 'webm', 'mov'].includes(ext || '')) type = 'video';
    
    setPostAttachType(type);
    setPostAttachTitle(file.name);
    setPostAttachSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPostAttachUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle quick post creation on timeline
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !postAttachUrl) return;
    
    addPost(
      newPostContent.trim() || `Shared ${postAttachTitle}`,
      newPostSubject,
      postAttachUrl ? postAttachType : undefined,
      postAttachTitle || undefined,
      false,
      postAttachUrl || undefined,
      currentUser.grade,
      undefined,
      postAttachSize
    );
    setNewPostContent('');
    setPostAttachUrl('');
    setPostAttachTitle('');
    setPostAttachSize(undefined);
    playSound('pop');
  };

  // Download attachment handler
  const handleDownloadAttachment = (attachment: { title: string; url: string; type?: string }) => {
    if (attachment.url && attachment.url !== '#' && !attachment.url.startsWith('data:')) {
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
    } else if (attachment.url && attachment.url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.title || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const content = `StudyBook Academic Resource\nTitle: ${attachment.title}\nType: ${attachment.type || 'DOCUMENT'}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.title || 'document.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Handle comment submit
  const handleCommentSubmit = (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    addComment(postId, text);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setExpandedComments(prev => ({ ...prev, [postId]: true }));
  };

  return (
    <div id="profile-view-container" className="flex-1 overflow-y-auto bg-[#F0F2F5] dark:bg-slate-900 h-[calc(100vh-57px)] scrollbar-none no-scrollbar">
      <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4">
        
        {/* Main Facebook Profile Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
          
          {/* Cover Photo Banner */}
          <div className="h-44 sm:h-64 relative bg-linear-to-r from-blue-600 via-indigo-600 to-sky-700 overflow-hidden group">
            {profileUser.coverPhoto ? (
              <img 
                src={profileUser.coverPhoto} 
                alt="Cover" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-linear-to-r from-blue-700 to-indigo-800 opacity-90" />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />

            {/* Change Cover Photo Button */}
            {isOwnProfile && (
              <button
                onClick={() => setIsChangingCover(true)}
                className="absolute right-3 sm:right-6 bottom-3 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-xl backdrop-blur-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Edit Cover</span>
              </button>
            )}
          </div>

          {/* Profile Info Header & Avatar Overlay */}
          <div className="px-4 sm:px-6 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
              
              {/* Avatar & Identifiers */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
                <div className="relative shrink-0">
                  <img 
                    src={profileUser.avatar} 
                    alt={profileUser.name} 
                    className="h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-lg bg-white" 
                  />
                </div>

                <div className="mb-2">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h1 className="font-display font-extrabold text-xl sm:text-2xl text-gray-900 dark:text-white">
                      {profileUser.name || 'Student'}
                    </h1>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                      {isOwnProfile ? 'You' : (isFriend ? 'Friend' : 'Student')}
                    </span>
                    {profileUser.role === 'tutor' && (
                      <span className="inline-flex items-center text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full">
                        Verified Tutor
                      </span>
                    )}
                    {profileUser.badges?.map(badge => (
                      <span key={badge} className="inline-flex items-center text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        {badge}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 mt-1 font-medium">
                    <School className="h-3.5 w-3.5 text-gray-400" />
                    <span>{profileUser.institution || 'StudyBook Academy'}</span>
                    <span>•</span>
                    <span>{profileUser.grade || 'Grade 10'}</span>
                  </p>

                </div>
              </div>

              {/* Action Buttons: Edit Profile or Friend Actions */}
              <div className="flex items-center justify-center gap-2 mt-2 sm:mt-0">
                {isOwnProfile ? (
                  <button
                    onClick={handleOpenEdit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Profile
                  </button>
                ) : isFriend ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                    <UserCheck className="h-4 w-4" /> Friends
                  </span>
                ) : friendshipStatus === 'pending_sent' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                    <Clock className="h-4 w-4 animate-pulse" /> Request Sent
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      sendFriendRequest({
                        id: profileUser.id,
                        name: profileUser.name,
                        avatar: profileUser.avatar,
                        email: profileUser.email,
                        role: profileUser.role,
                        institution: profileUser.institution
                      });
                      playSound('pop');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" /> Add Friend
                  </button>
                )}
              </div>

            </div>

            {/* Profile Details (Bio & Study Focus) */}
            <div className="space-y-4 pt-2 border-t border-gray-150 dark:border-slate-700">
              
              {/* Bio Card */}
              <div className="bg-gray-50 dark:bg-slate-850 p-4 rounded-xl border border-gray-200 dark:border-slate-750">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                    Bio & Academic Focus
                  </span>
                  {isOwnProfile && (
                    <button 
                      onClick={handleOpenEdit}
                      className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="h-3 w-3" /> Edit
                    </button>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-200 leading-relaxed font-normal">
                  {profileUser.bio || 'Add a bio to introduce your academic interests, subjects you love, and study goals!'}
                </p>

                {/* Academic Subjects Chips */}
                {profileUser.subjects && profileUser.subjects.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-200 dark:border-slate-750">
                    <span className="text-[10px] text-gray-400 font-semibold mr-1">Study Focus:</span>
                    {profileUser.subjects.map(s => (
                      <span key={s} className="text-[10px] font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 border border-blue-150 dark:border-blue-900 px-2.5 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* Profile Privacy Banner for Owner */}
        {isOwnProfile && (currentUser.hideProfilePosts || settings.hideProfilePosts) && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 text-xs shadow-xs">
            <EyeOff className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="leading-snug">
              <span className="font-bold">Profile Privacy Mode Active:</span> Your profile posts and files are hidden from non-friends visiting your profile directly. They still appear on the algorithmic Feed.
            </div>
          </div>
        )}

        {/* Quick Post Box on Timeline (Only on Own Profile) */}
        {isOwnProfile && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <img src={profileUser.avatar} alt="You" className="h-9 w-9 rounded-full object-cover shrink-0" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                Share an academic update, study tip, formula sheet, or file
              </span>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-2.5">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What are you studying today? Share notes or attach study files with classmates..."
                rows={2}
                className="w-full p-2.5 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              
              {/* Attached file chip */}
              {postAttachTitle && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-700 dark:text-blue-300">
                  <span className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold truncate">{postAttachTitle}</span>
                    {postAttachSize && <span className="text-[10px] text-gray-400 dark:text-slate-400 shrink-0">({postAttachSize})</span>}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => {
                      setPostAttachUrl('');
                      setPostAttachTitle('');
                      setPostAttachSize(undefined);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 hover:text-red-500 cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400 font-medium">Subject:</span>
                    <select
                      value={newPostSubject}
                      onChange={(e) => setNewPostSubject(e.target.value)}
                      className="text-xs bg-gray-100 dark:bg-slate-700 border-none rounded-lg px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none"
                    >
                      <option value="General">General</option>
                      <option value="Math">Math</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                      <option value="Literature">Literature</option>
                      <option value="History">History</option>
                      <option value="Computer Science">Computer Science</option>
                    </select>
                  </div>

                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.mp4"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProfileFileChange(file);
                    }} 
                  />

                  {/* Attach File Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer font-medium"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-blue-500" />
                    <span>{postAttachTitle ? 'Replace File' : 'Attach File'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!newPostContent.trim() && !postAttachUrl}
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  Post
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Timeline Posts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-blue-600" />
              {isOwnProfile ? 'Your Posts & Study Notes' : `${profileUser.name}'s Posts & Study Notes`} ({areProfilePostsHidden ? '0' : userPosts.length})
            </h3>
          </div>

          {areProfilePostsHidden ? (
            /* Friend-locked privacy card when non-friend views user profile with hideProfilePosts enabled */
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-8 text-center space-y-4 shadow-sm">
              <div className="h-16 w-16 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-150 dark:border-blue-900/60 shadow-xs">
                <Lock className="h-8 w-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="font-display font-bold text-base text-gray-900 dark:text-white">
                  Timeline Posts are Friends-Only
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {profileUser.name} has chosen to keep their profile posts and file attachments private to approved friends. Connect as friends to view their academic notes, formula sheets, and questions.
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                {friendshipStatus === 'none' ? (
                  <button
                    type="button"
                    onClick={() => {
                      sendFriendRequest({
                        id: profileUser.id,
                        name: profileUser.name,
                        avatar: profileUser.avatar,
                        email: profileUser.email,
                        role: profileUser.role,
                        institution: profileUser.institution
                      });
                      playSound('pop');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Add Friend to Unlock Timeline</span>
                  </button>
                ) : friendshipStatus === 'pending_sent' ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-900/50">
                    <Clock className="h-3.5 w-3.5 animate-pulse" />
                    <span>Friend Request Sent — Awaiting Approval</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : userPosts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-8 text-center">
              <BookOpen className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
              <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300">No study notes published yet</h4>
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Share questions, formulas, or summaries above to begin building your academic profile timeline!
              </p>
            </div>
          ) : (
            userPosts.map(post => {
              const hasLiked = post.currentUserReaction === 'helpful' || post.currentUserReaction === 'insightful';
              const commentsOpen = expandedComments[post.id];
              const isAuthor = post.authorId === currentUser.id || post.user?.id === currentUser.id;

              return (
                <div 
                  key={post.id} 
                  id={`post-${post.id}`}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 shadow-xs space-y-3"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={post.user?.avatar || profileUser.avatar} alt="Author" className="h-9 w-9 rounded-full object-cover" />
                      <div>
                        <span className="font-bold text-xs text-gray-900 dark:text-white">{post.user?.name || profileUser.name}</span>
                        <div 
                          onClick={() => openSinglePost(post.postId || post.id)}
                          className="text-[10px] text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                          title="Click to view post closely"
                        >
                          {post.timestamp} • {post.subject}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {post.grade && (
                        <span className="text-[10px] font-semibold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          {post.grade}
                        </span>
                      )}
                      {/* Delete Own Post */}
                      {isAuthor && (
                        <button
                          onClick={() => {
                            showConfirmModal({
                              title: 'Delete Study Note?',
                              message: 'This post will be permanently removed from your timeline. This action cannot be undone.',
                              confirmText: 'Delete Post',
                              variant: 'danger',
                              icon: 'trash',
                              onConfirm: () => deletePost(post.id)
                            });
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-lg cursor-pointer"
                          title="Delete post"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Post Content - Clickable to view closely */}
                  <p 
                    onClick={() => openSinglePost(post.postId || post.id)}
                    className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 leading-relaxed font-normal whitespace-pre-line cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Click to view post closely"
                  >
                    {post.content}
                  </p>

                  {/* Attachment Block (Images, PDFs, Documents, Media) */}
                  {post.attachment && (
                    <div className="mt-2.5">
                      {post.attachment.type === 'image' || post.attachment.url?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ? (
                        <div 
                          className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900 group relative cursor-pointer"
                          onClick={() => openSinglePost(post.postId || post.id)}
                          title="Click to view photo closely"
                        >
                          <img 
                            src={post.attachment.url} 
                            alt={post.attachment.title}
                            className="w-full max-h-[380px] object-contain transition-transform duration-200 group-hover:scale-[1.01]"
                          />
                          <div className="p-2.5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 bg-gray-50/90 dark:bg-slate-800/90 border-t border-gray-150 dark:border-slate-700">
                            <span className="font-semibold truncate flex items-center gap-1.5">
                              <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                              <span className="truncate">{post.attachment.title}</span>
                            </span>
                            <span className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold text-xs shrink-0 ml-2">
                              <ExternalLink className="h-3.5 w-3.5" /> View Closely
                            </span>
                          </div>
                        </div>
                      ) : post.attachment.type === 'video' ? (
                        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-black">
                          <video 
                            src={post.attachment.url} 
                            controls 
                            className="w-full max-h-[360px] object-contain"
                          />
                        </div>
                      ) : (
                        <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden flex items-center justify-between p-3.5 bg-gray-50/80 dark:bg-slate-850 hover:bg-gray-100/80 dark:hover:bg-slate-800 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            {post.attachment.type === 'pdf' || post.attachment.title?.toLowerCase().endsWith('.pdf') ? (
                              <div className="h-10 w-10 bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                PDF
                              </div>
                            ) : post.attachment.type === 'doc' || post.attachment.title?.toLowerCase().match(/\.(docx?|odt)$/) ? (
                              <div className="h-10 w-10 bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                DOC
                              </div>
                            ) : post.attachment.title?.toLowerCase().match(/\.(pptx?|key)$/) ? (
                              <div className="h-10 w-10 bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                PPT
                              </div>
                            ) : (
                              <div className="h-10 w-10 bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                <FileText className="h-5 w-5" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-800 dark:text-white truncate leading-snug">
                                {post.attachment.title}
                              </p>
                              <span className="text-[10px] text-gray-400 mt-0.5 block">
                                {post.attachment.size ? `${post.attachment.size} • Study Document` : 'Academic Attachment'}
                              </span>
                            </div>
                          </div>

                          <button 
                            type="button"
                            onClick={() => post.attachment && handleDownloadAttachment(post.attachment)}
                            className="flex items-center gap-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer shrink-0 ml-2"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interaction Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      {/* Helpful/Like Button */}
                      <button
                        onClick={() => reactToPost(post.id, 'helpful')}
                        className={`flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
                          hasLiked ? 'text-blue-600 font-bold' : 'hover:text-blue-600 text-gray-500'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${hasLiked ? 'fill-blue-600 text-blue-600' : ''}`} />
                        <span>{(post.reactions?.helpful || 0) + (post.reactions?.insightful || 0)}</span>
                        <span className="hidden sm:inline">Helpful</span>
                      </button>

                      {/* Comment Toggle */}
                      <button
                        onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        className="flex items-center gap-1.5 font-semibold hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>{post.comments?.length || 0}</span>
                        <span className="hidden sm:inline">Comments</span>
                      </button>

                      {/* Save / Bookmark */}
                      <button
                        onClick={() => savePostToLibrary(post.id)}
                        className={`flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
                          post.isSaved ? 'text-amber-600 font-bold' : 'hover:text-amber-600 text-gray-500'
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${post.isSaved ? 'fill-amber-600 text-amber-600' : ''}`} />
                        <span className="hidden sm:inline">{post.isSaved ? 'Saved' : 'Save'}</span>
                      </button>
                    </div>

                    {/* Facebook-style View Closely Modal trigger */}
                    <button
                      type="button"
                      onClick={() => openSinglePost(post.postId || post.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      title="View post closely like Facebook"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>View Closely</span>
                    </button>
                  </div>

                  {/* Expandable Comments Section */}
                  {commentsOpen && (
                    <div className="pt-2 border-t border-gray-100 dark:border-slate-700 space-y-2">
                      {post.comments && post.comments.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none no-scrollbar pr-1">
                          {post.comments.map(c => (
                            <div key={c.id} className="flex gap-2 bg-gray-50 dark:bg-slate-850 p-2.5 rounded-xl text-xs">
                              <img src={c.user?.avatar} alt={c.user?.name} className="h-6 w-6 rounded-full object-cover shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[11px] text-gray-900 dark:text-gray-100">{c.user?.name}</span>
                                  <span className="text-[9px] text-gray-400">{c.timestamp}</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 mt-0.5">{c.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">No responses yet.</p>
                      )}

                      {/* Comment Input */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCommentSubmit(post.id);
                          }}
                          placeholder="Write a response..."
                          className="flex-1 px-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={() => handleCommentSubmit(post.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full border border-gray-200 dark:border-slate-700 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-150 dark:border-slate-700">
              <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <Edit3 className="h-4 w-4 text-blue-600" />
                Edit Profile Information
              </h3>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto scrollbar-none no-scrollbar">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Academic Grade */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Academic Grade</label>
                <select
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                  <option value="College">College / University</option>
                  <option value="Graduate">Graduate / Researcher</option>
                </select>
              </div>

              {/* School / Institution */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">School / Institution</label>
                <input
                  type="text"
                  value={editInstitution}
                  onChange={(e) => setEditInstitution(e.target.value)}
                  placeholder="e.g. Westwood Academy, Cambridge Prep"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Academic Bio */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Bio & About</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Write a short academic bio about your interests, favorite subjects, or study goals..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Study Focus */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Study Focus</label>
                <select
                  value={editStudyFocus}
                  onChange={(e) => setEditStudyFocus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {!STUDY_FOCUS_OPTIONS.includes(editStudyFocus) && editStudyFocus && (
                    <option value={editStudyFocus}>{editStudyFocus}</option>
                  )}
                  <optgroup label="Sciences & Mathematics" className="font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800">
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Computer Science">Computer Science & Programming</option>
                    <option value="Environmental Science">Environmental Science</option>
                    <option value="Medicine & Health">Medicine & Health</option>
                  </optgroup>
                  <optgroup label="Humanities & Social Sciences" className="font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800">
                    <option value="English & Literature">English & Literature</option>
                    <option value="History & Social Studies">History & Social Studies</option>
                    <option value="Economics & Business">Economics & Business</option>
                    <option value="Psychology">Psychology</option>
                    <option value="Philosophy">Philosophy</option>
                    <option value="Political Science">Political Science</option>
                  </optgroup>
                  <optgroup label="Arts & General" className="font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800">
                    <option value="Art & Design">Art & Design</option>
                    <option value="Music & Performing Arts">Music & Performing Arts</option>
                    <option value="Foreign Languages">Foreign Languages</option>
                    <option value="General Studies">General Studies</option>
                  </optgroup>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-150 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Cover Photo Modal */}
      {isChangingCover && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-gray-200 dark:border-slate-700 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-150 dark:border-slate-700">
              <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-blue-600" />
                Select Cover Photo
              </h3>
              <button
                onClick={() => setIsChangingCover(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Preset Academic Banners:</span>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_COVERS.map(cover => (
                  <button
                    key={cover.id}
                    type="button"
                    onClick={() => {
                      updateUserProfile({ coverPhoto: cover.url });
                      setIsChangingCover(false);
                      playSound('pop');
                    }}
                    className="group relative h-20 rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all cursor-pointer"
                  >
                    <img src={cover.url} alt={cover.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md">
                      {cover.name}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-150 dark:border-slate-700">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Or Paste Custom Image URL:</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customCoverUrl}
                    onChange={(e) => setCustomCoverUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      if (customCoverUrl.trim()) {
                        updateUserProfile({ coverPhoto: customCoverUrl.trim() });
                        setIsChangingCover(false);
                        playSound('pop');
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
