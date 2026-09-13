import React, { useState, useMemo } from 'react';
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
  GraduationCap
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

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
    savePostToLibrary
  } = useApp();

  // Profile view strictly displays the user's own profile
  const profileUser = currentUser;

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

  // Posts authored by current user
  const userPosts = useMemo(() => {
    return posts.filter(p => !p.isAnonymous && (p.authorId === currentUser.id || p.user?.id === currentUser.id));
  }, [posts, currentUser.id]);

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

  // Handle quick post creation on timeline
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    addPost(newPostContent.trim(), newPostSubject, undefined, undefined, false, undefined, currentUser.grade);
    setNewPostContent('');
    playSound('pop');
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
            <button
              onClick={() => setIsChangingCover(true)}
              className="absolute right-3 sm:right-6 bottom-3 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-xl backdrop-blur-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Edit Cover</span>
            </button>
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
                      You
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

              {/* Action Buttons: Edit Profile */}
              <div className="flex items-center justify-center gap-2 mt-2 sm:mt-0">
                <button
                  onClick={handleOpenEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </button>
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
                  <button 
                    onClick={handleOpenEdit}
                    className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" /> Edit
                  </button>
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

              {/* Academic Highlights / Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white dark:bg-slate-850 p-3 rounded-xl border border-gray-200 dark:border-slate-750 text-center">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Published Notes</div>
                  <div className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">{userPosts.length}</div>
                </div>
                <div className="bg-white dark:bg-slate-850 p-3 rounded-xl border border-gray-200 dark:border-slate-750 text-center">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Helpful Reactions</div>
                  <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{totalReactionsReceived}</div>
                </div>
                <div className="bg-white dark:bg-slate-850 p-3 rounded-xl border border-gray-200 dark:border-slate-750 text-center">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Grade Level</div>
                  <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{profileUser.grade || 'Grade 10'}</div>
                </div>
                <div className="bg-white dark:bg-slate-850 p-3 rounded-xl border border-gray-200 dark:border-slate-750 text-center">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Saved Focus Topics</div>
                  <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {profileUser.subjects?.length || 0}
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Quick Post Box on Timeline */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <img src={profileUser.avatar} alt="You" className="h-9 w-9 rounded-full object-cover shrink-0" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
              Share an academic update, study tip, or formula sheet
            </span>
          </div>

          <form onSubmit={handleCreatePost} className="space-y-2.5">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What are you studying today? Share insights with classmates..."
              rows={2}
              className="w-full p-2.5 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
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

              <button
                type="submit"
                disabled={!newPostContent.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                Post
              </button>
            </div>
          </form>
        </div>

        {/* Timeline Posts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Your Posts & Study Notes ({userPosts.length})
            </h3>
          </div>

          {userPosts.length === 0 ? (
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

              return (
                <div 
                  key={post.id} 
                  id={`post-${post.id}`}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 shadow-xs space-y-3"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={post.user?.avatar || profileUser.avatar} alt="You" className="h-9 w-9 rounded-full object-cover" />
                      <div>
                        <span className="font-bold text-xs text-gray-900 dark:text-white">{post.user?.name || profileUser.name}</span>
                        <div className="text-[10px] text-gray-400">{post.timestamp} • {post.subject}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {post.grade && (
                        <span className="text-[10px] font-semibold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          {post.grade}
                        </span>
                      )}
                      {/* Delete Own Post */}
                      <button
                        onClick={() => {
                          if (confirm('Delete this study note from your timeline?')) {
                            deletePost(post.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-lg"
                        title="Delete post"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Post Content */}
                  <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 leading-relaxed font-normal whitespace-pre-line">
                    {post.content}
                  </p>

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
