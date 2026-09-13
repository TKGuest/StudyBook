import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SILHOUETTE_AVATAR } from '../data/mockData';
import { playSound } from '../utils/soundEffects';
import { consolidateDirectChats, formatMessengerTimestamp } from '../utils/chatUtils';
import { 
  Search, 
  Bell, 
  MessageSquare, 
  ShieldAlert, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  EyeOff, 
  Award,
  Home,
  Film,
  ShoppingBag,
  Users,
  Gamepad2,
  GraduationCap,
  UserCheck,
  UserCircle2,
  FileText,
  Layers,
  X,
  School,
  ArrowRight
} from 'lucide-react';

interface HeaderProps {
  onSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchQuery }) => {
  const { 
    activeTab,
    user, 
    settings, 
    setSettings, 
    groupChats, 
    directChats,
    openDirectChat,
    openUserProfile,
    setActiveTab, 
    isSpeaking, 
    stopSpeaking,
    tutorRequests,
    approveTutorRequest,
    posts,
    groups,
    friends,
    communityUsers
  } = useApp();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessenger, setShowMessenger] = useState(false);
  const [search, setSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'people' | 'posts' | 'groups' | 'all'>('people');

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentEmail = user.email || localStorage.getItem('sb_current_email') || '';
  const isAdmin = user.role === 'admin' || currentEmail.toLowerCase() === 'billkute030709@gmail.com';

  const tutorNotifications = isAdmin ? tutorRequests.filter(r => r.status === 'pending').map(r => ({
    id: r.id,
    text: `🔔 Tutor Request: ${r.userName} (${r.userEmail || 'Student'}) requested Tutor verification!`,
    time: r.timestamp,
    isHighPriority: true,
    isTutorRequest: true,
    requestId: r.id
  })) : [];

  const [hasUnreadMessages, setHasUnreadMessages] = useState<boolean>(() => {
    try {
      const key = user?.id ? `sb_has_unread_msg_${user.id}` : 'sb_has_unread_msg';
      return localStorage.getItem(key) !== 'false';
    } catch (_) {
      return true;
    }
  });

  const [hasUnreadNotifications, setHasUnreadNotifications] = useState<boolean>(() => {
    try {
      const key = user?.id ? `sb_has_unread_notif_${user.id}` : 'sb_has_unread_notif';
      return localStorage.getItem(key) !== 'false';
    } catch (_) {
      return true;
    }
  });

  useEffect(() => {
    if (user?.id) {
      try {
        const msgKey = `sb_has_unread_msg_${user.id}`;
        const notifKey = `sb_has_unread_notif_${user.id}`;
        setHasUnreadMessages(localStorage.getItem(msgKey) !== 'false');
        setHasUnreadNotifications(localStorage.getItem(notifKey) !== 'false');
      } catch (_) {}
    }
  }, [user?.id]);

  const toggleDarkMode = () => {
    playSound('toggle');
    setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }));
  };

  const toggleIncognito = () => {
    playSound('toggle');
    setSettings(prev => ({ ...prev, incognitoMode: !prev.incognitoMode }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onSearchQuery(val);
    if (!isSearchFocused) setIsSearchFocused(true);
  };

  const clearSearch = () => {
    setSearch('');
    onSearchQuery('');
  };

  // Search Data Synthesis
  const query = search.trim().toLowerCase();

  // 1. Gather all identifiable people across the platform
  const allKnownPeople = useMemo(() => {
    const map = new Map<string, any>();
    
    // Current user
    if (user) {
      map.set(user.id, {
        id: user.id,
        name: user.name || 'Current User',
        email: user.email || '',
        avatar: user.avatar || SILHOUETTE_AVATAR,
        role: user.role || 'student',
        grade: user.grade || 'Grade 10',
        institution: user.institution || 'StudyBook Academy',
        bio: user.bio || '',
        isYou: true
      });
    }

    // Friends
    (friends || []).forEach(f => {
      if (f?.id && !map.has(f.id)) {
        map.set(f.id, {
          id: f.id,
          name: f.name || 'Student',
          email: f.email || '',
          avatar: f.avatar || SILHOUETTE_AVATAR,
          role: f.role || 'student',
          grade: f.grade || 'Grade 10',
          institution: f.institution || '',
          bio: f.bio || '',
          isFriend: true
        });
      }
    });

    // Community / registered users
    (communityUsers || []).forEach(u => {
      if (u?.id && !map.has(u.id)) {
        map.set(u.id, {
          id: u.id,
          name: u.name,
          email: u.email || '',
          avatar: u.avatar || SILHOUETTE_AVATAR,
          role: u.role || 'student',
          grade: u.grade || 'Grade 10',
          institution: u.institution || '',
          bio: u.bio || ''
        });
      }
    });

    // Authors from posts
    (posts || []).forEach(p => {
      const authorId = p.authorId || p.user?.id;
      if (authorId && !map.has(authorId) && !p.isAnonymous) {
        map.set(authorId, {
          id: authorId,
          name: p.user?.name || 'Student',
          email: p.user?.email || '',
          avatar: p.user?.avatar || SILHOUETTE_AVATAR,
          role: p.user?.role || 'student',
          grade: p.user?.grade || p.grade || 'Grade 10',
          institution: p.user?.institution || '',
          bio: p.user?.bio || ''
        });
      }
    });

    return Array.from(map.values());
  }, [user, friends, communityUsers, posts]);

  // People Matching
  const peopleResults = useMemo(() => {
    if (!query) return [];
    return allKnownPeople.filter(p => {
      const name = (p.name || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      const grade = (p.grade || '').toLowerCase();
      const inst = (p.institution || '').toLowerCase();
      const bio = (p.bio || '').toLowerCase();
      const role = (p.role || '').toLowerCase();
      return name.includes(query) || email.includes(query) || grade.includes(query) || inst.includes(query) || bio.includes(query) || role.includes(query);
    });
  }, [allKnownPeople, query]);

  // Posts Matching
  const postResults = useMemo(() => {
    if (!query) return [];
    return (posts || []).filter(p => {
      const content = (p.content || '').toLowerCase();
      const title = (p.title || '').toLowerCase();
      const subject = (p.subject || '').toLowerCase();
      const authorName = (p.user?.name || '').toLowerCase();
      const grade = (p.grade || p.user?.grade || '').toLowerCase();
      const tagMatch = (p.tags || []).some((t: string) => t.toLowerCase().includes(query));
      return content.includes(query) || title.includes(query) || subject.includes(query) || authorName.includes(query) || grade.includes(query) || tagMatch;
    });
  }, [posts, query]);

  // Groups Matching
  const groupResults = useMemo(() => {
    if (!query) return [];
    return (groups || []).filter(g => {
      const name = (g.name || '').toLowerCase();
      const desc = (g.description || '').toLowerCase();
      const cat = (g.category || '').toLowerCase();
      const tagMatch = (g.tags || []).some((t: string) => t.toLowerCase().includes(query));
      return name.includes(query) || desc.includes(query) || cat.includes(query) || tagMatch;
    });
  }, [groups, query]);

  const totalResultsCount = peopleResults.length + postResults.length + groupResults.length;

  const handleSelectPerson = (personId: string) => {
    playSound('tab');
    setIsSearchFocused(false);
    openUserProfile(personId);
  };

  const handleSelectPost = (postId: string) => {
    playSound('tab');
    setIsSearchFocused(false);
    setActiveTab('feed');
    setTimeout(() => {
      const el = document.getElementById(`post-card-${postId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-blue-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500'), 2500);
      }
    }, 200);
  };

  const handleSelectGroup = (groupId: string) => {
    playSound('tab');
    setIsSearchFocused(false);
    localStorage.setItem('sb_selected_group_id', groupId);
    window.dispatchEvent(new CustomEvent('sb_group_selected'));
    setActiveTab('groups');
  };

  // Notifications
  const mockNotifications: { id: number; text: string; time: string; isHighPriority: boolean }[] = [
    { id: 1, text: 'Welcome to StudyBook! Feel free to upload documents or create your first study group.', time: 'Just now', isHighPriority: true }
  ];

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-2 border-b border-gray-100 dark:bg-slate-900 dark:border-slate-800 shadow-sm transition-colors duration-200">
      {/* Left logo section */}
      <div className="flex items-center gap-3">
        <div 
          onClick={() => setActiveTab('feed')} 
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-display text-2xl font-bold text-white shadow-md shadow-blue-500/30">
            S
          </div>
          <span className="hidden sm:block font-display text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
            studybook
          </span>
        </div>
        
        {/* Search Bar Container */}
        <div ref={searchContainerRef} className="relative flex items-center max-w-xs md:max-w-md ml-2">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search people, posts, groups..."
            className="w-48 sm:w-72 rounded-full bg-gray-100 dark:bg-slate-800 py-1.5 pl-9 pr-8 text-sm font-sans text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:bg-white dark:focus:bg-slate-850 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Search Dropdown with Filter Tabs */}
          {isSearchFocused && search.trim().length > 0 && (
            <div className="absolute left-0 top-full mt-2 w-[340px] sm:w-[460px] md:w-[520px] max-w-[92vw] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[500px]">
              {/* Top Filter Buttons: People (default), Posts, Groups, All */}
              <div className="flex items-center gap-1.5 p-2 bg-gray-50/90 dark:bg-slate-850/90 border-b border-gray-150 dark:border-slate-800 overflow-x-auto scrollbar-none no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSearchFilter('people')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    searchFilter === 'people'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>People</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    searchFilter === 'people' ? 'bg-blue-700 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {peopleResults.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchFilter('posts')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    searchFilter === 'posts'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span>Posts</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    searchFilter === 'posts' ? 'bg-blue-700 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {postResults.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchFilter('groups')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    searchFilter === 'groups'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                  }`}
                >
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span>Groups</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    searchFilter === 'groups' ? 'bg-blue-700 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {groupResults.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchFilter('all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    searchFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5 shrink-0" />
                  <span>All</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    searchFilter === 'all' ? 'bg-blue-700 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {totalResultsCount}
                  </span>
                </button>
              </div>

              {/* Results Container */}
              <div className="overflow-y-auto flex-1 p-2 space-y-2 scrollbar-none no-scrollbar">
                {/* 1. People Section (Shows when searchFilter is 'people' or 'all') */}
                {(searchFilter === 'people' || searchFilter === 'all') && (
                  <div>
                    {searchFilter === 'all' && peopleResults.length > 0 && (
                      <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-blue-500" /> People ({peopleResults.length})
                        </span>
                        <button 
                          onClick={() => setSearchFilter('people')} 
                          className="text-blue-600 dark:text-blue-400 text-[10px] hover:underline cursor-pointer"
                        >
                          View only
                        </button>
                      </div>
                    )}

                    {peopleResults.length > 0 ? (
                      <div className="space-y-1">
                        {peopleResults.map(person => (
                          <div
                            key={person.id}
                            onClick={() => handleSelectPerson(person.id)}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={person.avatar}
                                alt={person.name}
                                className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-slate-700 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {person.name}
                                  </h4>
                                  {person.isYou && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-full">
                                      You
                                    </span>
                                  )}
                                  {person.role === 'tutor' && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full">
                                      Tutor
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                  <span>{person.institution || 'StudyBook'}</span>
                                  <span>•</span>
                                  <span>{person.grade || 'Grade 10'}</span>
                                </p>
                              </div>
                            </div>
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                              Profile <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      searchFilter === 'people' && (
                        <div className="py-8 px-4 text-center">
                          <UserCircle2 className="h-8 w-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">No people found matching "{search}"</p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            {postResults.length > 0 || groupResults.length > 0 ? (
                              <span>
                                Found results in other categories: 
                                {postResults.length > 0 && (
                                  <button onClick={() => setSearchFilter('posts')} className="text-blue-600 font-bold ml-1 hover:underline cursor-pointer">
                                    {postResults.length} Posts
                                  </button>
                                )}
                                {groupResults.length > 0 && (
                                  <button onClick={() => setSearchFilter('groups')} className="text-blue-600 font-bold ml-1 hover:underline cursor-pointer">
                                    {groupResults.length} Groups
                                  </button>
                                )}
                              </span>
                            ) : (
                              'Try searching for another name or grade.'
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* 2. Posts Section (Shows when searchFilter is 'posts' or 'all') */}
                {(searchFilter === 'posts' || searchFilter === 'all') && (
                  <div>
                    {searchFilter === 'all' && postResults.length > 0 && (
                      <div className="flex items-center justify-between px-2 py-1 pt-2 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider border-t border-gray-100 dark:border-slate-800 mt-2">
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-indigo-500" /> Posts & Documents ({postResults.length})
                        </span>
                        <button 
                          onClick={() => setSearchFilter('posts')} 
                          className="text-blue-600 dark:text-blue-400 text-[10px] hover:underline cursor-pointer"
                        >
                          View only
                        </button>
                      </div>
                    )}

                    {postResults.length > 0 ? (
                      <div className="space-y-1">
                        {postResults.map(post => (
                          <div
                            key={post.id}
                            onClick={() => handleSelectPost(post.id)}
                            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                                  {post.subject || 'General'}
                                </span>
                                <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300">
                                  {post.user?.name || 'Student'}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400">{post.grade || post.user?.grade || ''}</span>
                            </div>
                            <p className="text-xs text-gray-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                              {post.title || post.content}
                            </p>
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                {post.tags.slice(0, 3).map((tag: string) => (
                                  <span key={tag} className="text-[9px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-md">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      searchFilter === 'posts' && (
                        <div className="py-8 px-4 text-center">
                          <FileText className="h-8 w-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">No posts found matching "{search}"</p>
                          <p className="text-[11px] text-gray-400 mt-1">Try searching for subjects, tags, or question keywords.</p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* 3. Groups Section (Shows when searchFilter is 'groups' or 'all') */}
                {(searchFilter === 'groups' || searchFilter === 'all') && (
                  <div>
                    {searchFilter === 'all' && groupResults.length > 0 && (
                      <div className="flex items-center justify-between px-2 py-1 pt-2 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider border-t border-gray-100 dark:border-slate-800 mt-2">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-emerald-500" /> Study Groups ({groupResults.length})
                        </span>
                        <button 
                          onClick={() => setSearchFilter('groups')} 
                          className="text-blue-600 dark:text-blue-400 text-[10px] hover:underline cursor-pointer"
                        >
                          View only
                        </button>
                      </div>
                    )}

                    {groupResults.length > 0 ? (
                      <div className="space-y-1">
                        {groupResults.map(group => (
                          <div
                            key={group.id}
                            onClick={() => handleSelectGroup(group.id)}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                                {group.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                  {group.name}
                                </h4>
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-0.5">
                                  {group.description || `${group.category} Study Group`}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full shrink-0">
                              {group.membersCount || (group.members?.length || 1)} members
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      searchFilter === 'groups' && (
                        <div className="py-8 px-4 text-center">
                          <Users className="h-8 w-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">No study groups found matching "{search}"</p>
                          <p className="text-[11px] text-gray-400 mt-1">Try searching by topic, grade, or subject name.</p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Empty State for 'all' tab */}
                {searchFilter === 'all' && totalResultsCount === 0 && (
                  <div className="py-8 px-4 text-center">
                    <Search className="h-8 w-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">No results found for "{search}"</p>
                    <p className="text-[11px] text-gray-400 mt-1">Try checking your spelling or using more general terms.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Navigation Icons (Facebook style) - matches side navigation order */}
      <div className="hidden lg:flex items-center justify-center flex-1 max-w-2xl px-4 h-12">
        {[
          { id: 'feed', icon: Home, label: 'Academic Feed' },
          { id: 'groups', icon: Users, label: 'Study Groups' },
          { id: 'friends', icon: UserCheck, label: 'Friends & Chat' },
          { id: 'profiles', icon: UserCircle2, label: 'User Profile' },
          { id: 'reels', icon: Film, label: 'Educational Reels' },
          { id: 'marketplace', icon: ShoppingBag, label: 'Bazaar Marketplace' },
          { id: 'games', icon: Gamepad2, label: 'Quizz & Flashcards' }
        ].map(item => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (activeTab !== item.id) playSound('tab');
                if (item.id === 'profiles') {
                  openUserProfile(user?.id || 'u_current');
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center h-full relative cursor-pointer group focus:outline-none transition-colors ${
                isSelected 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title={item.label}
            >
              <div className="flex items-center justify-center p-2 rounded-xl group-hover:bg-gray-150/60 dark:group-hover:bg-slate-800 transition-all duration-180">
                <Icon className={`h-6 w-6 shrink-0 ${isSelected ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
              </div>
              {isSelected && (
                <div className="absolute bottom-0 left-2 right-2 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Incognito mode badge */}
        {settings.incognitoMode && (
          <div className="hidden md:flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-medium">
            <EyeOff className="h-3 w-3" />
            Incognito
          </div>
        )}

        {/* Quick Incognito Toggle */}
        <button
          onClick={toggleIncognito}
          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${settings.incognitoMode ? 'text-slate-600 dark:text-slate-300' : 'text-gray-400'}`}
          title={settings.incognitoMode ? 'Disable study incognito mode' : 'Enable study incognito mode'}
        >
          <EyeOff className={`h-5 w-5 ${settings.incognitoMode ? 'fill-slate-200' : ''}`} />
        </button>

        {/* TTS Stop Button */}
        {isSpeaking && (
          <button
            onClick={() => {
              playSound('pop');
              stopSpeaking();
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-full text-xs font-bold animate-pulse hover:bg-red-200 transition-colors"
            title="Stop audio reading"
          >
            <VolumeX className="h-3.5 w-3.5" />
            <span>Stop Audio</span>
          </button>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-colors"
          title="Toggle Dark Mode"
        >
          {settings.darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Messenger Chats dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowMessenger(!showMessenger);
              setShowNotifications(false);
              setHasUnreadMessages(false);
              try {
                const key = user?.id ? `sb_has_unread_msg_${user.id}` : 'sb_has_unread_msg';
                localStorage.setItem(key, 'false');
              } catch (_) {}
            }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-colors relative cursor-pointer"
            title="Chats & Messaging"
          >
            <MessageSquare className="h-5 w-5" />
            {hasUnreadMessages && (
              <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-blue-600" />
            )}
          </button>

          {showMessenger && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white">Chats & Study Partners</h3>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                  Messenger
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700/60 scrollbar-none no-scrollbar">
                {directChats.length === 0 && groupChats.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">
                    No active conversations. Open a study group or message a friend!
                  </div>
                ) : (
                  <>
                    {directChats.map(chat => {
                      const otherParticipant = chat.participants.find(p => p.id !== user.id) || chat.participants[0];
                      const lastMessage = chat.messages[chat.messages.length - 1];
                      return (
                        <div
                          key={chat.id}
                          onClick={() => {
                            setShowMessenger(false);
                            if (otherParticipant) {
                              openDirectChat(otherParticipant);
                            }
                          }}
                          className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer flex items-center gap-3 transition-colors"
                        >
                          <img
                            src={otherParticipant?.avatar || SILHOUETTE_AVATAR}
                            alt={otherParticipant?.name || 'User'}
                            className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-slate-700 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate">
                                {otherParticipant?.name || 'User'}
                              </h4>
                              {lastMessage && (
                                <span className="text-[9px] text-gray-400">
                                  {formatMessengerTimestamp(lastMessage.timestamp)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {lastMessage ? lastMessage.text : 'Start chatting...'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowMessenger(false);
              setHasUnreadNotifications(false);
              try {
                const key = user?.id ? `sb_has_unread_notif_${user.id}` : 'sb_has_unread_notif';
                localStorage.setItem(key, 'false');
              } catch (_) {}
            }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {(hasUnreadNotifications || tutorNotifications.length > 0) && (
              <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white">Notifications</h3>
                <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300 font-bold px-2 py-0.5 rounded-full">
                  {tutorNotifications.length + mockNotifications.length} New
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700 scrollbar-none no-scrollbar">
                {tutorNotifications.map(tNotif => (
                  <div key={tNotif.id} className="p-3 bg-amber-50 dark:bg-amber-950/40 space-y-2">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">{tNotif.text}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          approveTutorRequest(tNotif.requestId);
                          setShowNotifications(false);
                        }}
                        className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[10px] font-bold hover:bg-amber-700 transition-all cursor-pointer"
                      >
                        Approve Tutor
                      </button>
                    </div>
                  </div>
                ))}
                {mockNotifications.map(notif => (
                  <div key={notif.id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer">
                    <p className="text-xs text-gray-700 dark:text-gray-200">{notif.text}</p>
                    <span className="text-[10px] text-gray-400 mt-1 block">{notif.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar button (Directly opens current user profile, no streak modal) */}
        <button
          onClick={() => {
            playSound('tab');
            openUserProfile(user.id);
          }}
          className="flex items-center focus:outline-none cursor-pointer group"
          title={`View your profile (${user.name})`}
        >
          <div className="relative p-0.5">
            <img
              src={settings.incognitoMode ? SILHOUETTE_AVATAR : (user.avatar || SILHOUETTE_AVATAR)}
              alt="Profile"
              className="h-9 w-9 rounded-full object-cover border-2 border-gray-200 dark:border-slate-700 group-hover:border-blue-500 transition-all shadow-xs"
            />
          </div>
        </button>
      </div>
    </header>
  );
};
