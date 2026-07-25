import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Post, StudyGroup, TutorPage, Reel, MarketplaceItem, GroupChat, AppSettings, AcademicReactionType, Comment, Message, BinderFolder, TutorRequest, RequestHistoryLog } from '../types';
import { currentUser, initialPosts, initialGroups, initialTutors, initialReels, initialMarketplaceItems, initialGroupChats, defaultSettings, SILHOUETTE_AVATAR } from '../data/mockData';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  deleteField,
  collection, 
  onSnapshot, 
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  groups: StudyGroup[];
  setGroups: React.Dispatch<React.SetStateAction<StudyGroup[]>>;
  tutors: TutorPage[];
  setTutors: React.Dispatch<React.SetStateAction<TutorPage[]>>;
  reels: Reel[];
  setReels: React.Dispatch<React.SetStateAction<Reel[]>>;
  marketplace: MarketplaceItem[];
  setMarketplace: React.Dispatch<React.SetStateAction<MarketplaceItem[]>>;
  groupChats: GroupChat[];
  setGroupChats: React.Dispatch<React.SetStateAction<GroupChat[]>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  
  folders: BinderFolder[];
  addFolder: (name: string, color: string, subject?: string) => void;
  activeFolderId: string | undefined;
  setActiveFolderId: (id: string | undefined) => void;
  
  // Custom interactive helper methods
  addPost: (content: string, subject: string, attachmentType?: 'pdf'|'doc'|'link'|'youtube', attachmentTitle?: string, isAnonymous?: boolean, attachmentUrl?: string) => void;
  deletePost: (postId: string) => Promise<void>;
  reactToPost: (postId: string, reaction: AcademicReactionType) => void;
  addComment: (postId: string, content: string) => void;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  markHelpfulComment: (postId: string, commentId: string) => void;
  savePostToLibrary: (postId: string, folderId?: string) => void;
  toggleFollowTutor: (tutorId: string) => void;
  addTutorReview: (tutorId: string, rating: number, text: string) => void;
  toggleEventGoing: (groupId: string, eventId: string) => void;
  toggleReelLike: (reelId: string) => void;
  createStudyGroup: (name: string, description?: string, category?: string) => Promise<string>;
  addMarketplaceItem: (item: Omit<MarketplaceItem, 'id' | 'seller' | 'distance'>) => void;
  sendGroupMessage: (groupId: string, text: string) => void;
  exportResume: () => void;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  
  // Tutor Verification & Admin
  tutorRequests: TutorRequest[];
  requestTutorVerification: (details?: { realName?: string; school?: string; description?: string; requestedSubjects?: string[] }) => Promise<void>;
  approveTutorRequest: (requestId: string) => Promise<void>;
  rejectTutorRequest: (requestId: string) => Promise<void>;
  deleteTutorRequest: (requestId: string) => Promise<void>;
  verifyUserAsTutor: (userId: string) => Promise<void>;

  // Focus Mode State
  completeOnboarding: (name: string, role: 'student' | 'tutor' | 'creator', institution: string, subjectWeights: AppSettings['subjectWeights']) => Promise<void>;

  // Firebase auth & connection details
  isFirebaseConnected: boolean;
  isFirebaseLoading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, role: 'student' | 'tutor' | 'creator', institution: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  // Offline Bypass
  isOfflineBypass: boolean;
  setIsOfflineBypass: (bypass: boolean) => void;
  isLocalLoggedIn: boolean;

  // Floating Chat Box states (Facebook Messenger)
  openChatIds: string[];
  openChatWindow: (groupId: string) => void;
  closeChatWindow: (groupId: string) => void;
}

const safeGetTime = (ts?: string) => {
  if (!ts) return 0;
  const t = new Date(ts).getTime();
  if (!isNaN(t)) return t;
  if (ts.includes('Vừa xong') || ts.includes('Just now')) return Date.now();
  return 0;
};

const getTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const processUserStreak = (u: User): User => {
  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  const lastLogin = u.lastLoginDate;

  if (lastLogin === today) {
    return u;
  }

  let newStreak = u.streak || 0;
  if (lastLogin === yesterday) {
    newStreak += 1;
  } else {
    newStreak = 1;
  }

  const streakLevel: 'none' | 'bronze' | 'silver' | 'gold' =
    newStreak >= 100 ? 'gold' :
    newStreak >= 30 ? 'silver' :
    newStreak >= 1 ? 'bronze' : 'none';

  return {
    ...u,
    streak: newStreak,
    streakLevel,
    lastLoginDate: today
  };
};

const getReactionTypeFromValue = (val: any): AcademicReactionType | null => {
  if (!val) return null;
  if (typeof val === 'string') {
    if (['helpful', 'insightful', 'confused', 'verified'].includes(val)) {
      return val as AcademicReactionType;
    }
    return null;
  }
  if (typeof val === 'object') {
    for (const type of ['helpful', 'insightful', 'confused', 'verified'] as AcademicReactionType[]) {
      if (val[type] === true) return type;
    }
  }
  return null;
};

const normalizePostForUser = (p: Post, userId: string): Post => {
  const currentUserId = userId || 'guest';
  const reactionTypes: AcademicReactionType[] = ['helpful', 'insightful', 'confused'];

  const cleanedMap: Record<string, AcademicReactionType> = {};
  const reactionCountsFromMap: Record<AcademicReactionType, number> = {
    helpful: 0,
    insightful: 0,
    confused: 0
  };

  if (p.userReactionsMap && typeof p.userReactionsMap === 'object') {
    Object.keys(p.userReactionsMap).forEach(uid => {
      const reaction = getReactionTypeFromValue(p.userReactionsMap![uid]);
      if (reaction && reaction !== ('verified' as any)) {
        cleanedMap[uid] = reaction;
        reactionCountsFromMap[reaction] += 1;
      }
    });
  }

  const currentUserReaction = cleanedMap[currentUserId] || null;

  const combinedCounts = { ...reactionCountsFromMap };
  if (p.userReactions && typeof p.userReactions === 'object') {
    reactionTypes.forEach(type => {
      const mapCount = reactionCountsFromMap[type];
      const fallbackCount = typeof p.userReactions[type] === 'number' 
        ? p.userReactions[type] 
        : (p.userReactions[type] ? 1 : 0);
      
      combinedCounts[type] = Math.max(mapCount, fallbackCount);
    });
  }

  const comments = (p.comments || []).map(c => {
    const helpedIds = Array.isArray(c.helpedUserIds) ? [...c.helpedUserIds] : [];
    const baseHelpfulCount = typeof c.baseHelpfulCount === 'number'
      ? c.baseHelpfulCount
      : Math.max(0, (c.helpfulCount || 0) - (helpedIds.includes(currentUserId) ? 1 : 0));

    const userHasHelped = helpedIds.includes(currentUserId);

    return {
      ...c,
      baseHelpfulCount,
      helpedUserIds: helpedIds,
      hasHelped: userHasHelped,
      helpfulCount: baseHelpfulCount + (userHasHelped ? 1 : 0)
    };
  });

  const savedByUsersMap = { ...(p.savedByUsersMap || {}) };
  const activeSaveObj = savedByUsersMap[currentUserId];
  const isSaved = !!activeSaveObj?.isSaved;
  const savedFolderId = activeSaveObj?.savedFolderId;

  return {
    ...p,
    userReactionsMap: cleanedMap,
    reactions: combinedCounts,
    userReactions: {
      helpful: currentUserReaction === 'helpful',
      insightful: currentUserReaction === 'insightful',
      confused: currentUserReaction === 'confused'
    },
    currentUserReaction: currentUserReaction,
    comments,
    isSaved,
    savedFolderId,
    savedByUsersMap
  };
};

const normalizeReelForUser = (r: Reel, userId: string): Reel => {
  const currentUserId = userId || 'guest';
  const isAuthenticatedUser = currentUserId !== 'guest' && currentUserId !== 'u_current';
  let likedByUsers: string[] = Array.isArray(r.likedByUsers) ? [...r.likedByUsers] : [];
  if (isAuthenticatedUser) {
    likedByUsers = likedByUsers.filter(id => id !== 'guest' && id !== 'u_current');
  }
  const baseLikes = typeof r.baseLikes === 'number'
    ? r.baseLikes
    : Math.max(0, (r.likes || 0) - likedByUsers.length);
  const hasLiked = likedByUsers.includes(currentUserId);

  return {
    ...r,
    baseLikes,
    likedByUsers,
    hasLiked,
    likes: baseLikes + (hasLiked ? 1 : 0)
  };
};

const normalizeTutorForUser = (t: TutorPage, userId: string): TutorPage => {
  const currentUserId = userId || 'guest';
  const isAuthenticatedUser = currentUserId !== 'guest' && currentUserId !== 'u_current';
  let followedByUsers: string[] = Array.isArray(t.followedByUsers) ? [...t.followedByUsers] : [];
  if (isAuthenticatedUser) {
    followedByUsers = followedByUsers.filter(id => id !== 'guest' && id !== 'u_current');
  }
  const baseFollowers = typeof t.baseFollowers === 'number'
    ? t.baseFollowers
    : Math.max(0, (t.followers || 0) - followedByUsers.length);
  const isFollowing = followedByUsers.includes(currentUserId);

  return {
    ...t,
    baseFollowers,
    followedByUsers,
    isFollowing,
    followers: baseFollowers + (isFollowing ? 1 : 0)
  };
};

const normalizeGroupForUser = (g: StudyGroup, userId: string): StudyGroup => {
  const currentUserId = userId || 'guest';
  const isAuthenticatedUser = currentUserId !== 'guest' && currentUserId !== 'u_current';
  const normalizedEvents = (g.events || []).map(ev => {
    let attendeeUserIds: string[] = Array.isArray(ev.attendeeUserIds) ? [...ev.attendeeUserIds] : [];
    if (isAuthenticatedUser) {
      attendeeUserIds = attendeeUserIds.filter(id => id !== 'guest' && id !== 'u_current');
    }
    const baseAttendees = typeof ev.baseAttendees === 'number'
      ? ev.baseAttendees
      : Math.max(0, (ev.attendees || 0) - attendeeUserIds.length);
    const isGoing = attendeeUserIds.includes(currentUserId);

    return {
      ...ev,
      baseAttendees,
      attendeeUserIds,
      isGoing,
      attendees: baseAttendees + (isGoing ? 1 : 0)
    };
  });

  return {
    ...g,
    events: normalizedEvents
  };
};

const cleanForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'function' || typeof obj === 'symbol') return undefined;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanForFirestore).filter(v => v !== undefined);
  
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined && typeof val !== 'function' && typeof val !== 'symbol') {
      const cleanedVal = cleanForFirestore(val);
      if (cleanedVal !== undefined) {
        cleaned[key] = cleanedVal;
      }
    }
  }
  return cleaned;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>(undefined);
  const [openChatIds, setOpenChatIds] = useState<string[]>([]);

  const openChatWindow = (groupId: string) => {
    setOpenChatIds(prev => {
      if (prev.includes(groupId)) return prev;
      return [...prev, groupId].slice(-3); // Maximum 3 chats open on screen simultaneously
    });
  };

  const closeChatWindow = (groupId: string) => {
    setOpenChatIds(prev => prev.filter(id => id !== groupId));
  };
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);
  const [isOfflineBypass, setIsOfflineBypassState] = useState<boolean>(() => {
    try { return localStorage.getItem('sb_offline_bypass') === 'true'; } catch (_) { return false; }
  });

  const setIsOfflineBypass = (bypass: boolean) => {
    setIsOfflineBypassState(bypass);
    try { localStorage.setItem('sb_offline_bypass', bypass ? 'true' : 'false'); } catch (_) {}
  };

  const [isLocalLoggedIn, setIsLocalLoggedIn] = useState<boolean>(() => {
    try { return localStorage.getItem('sb_local_logged_in') === 'true'; } catch (_) { return false; }
  });

  const [user, setUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('sb_user');
      const savedEmail = (localStorage.getItem('sb_current_email') || '').toLowerCase();
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (!parsed.avatar || parsed.avatar.includes('photo-1535713875002')) {
            parsed.avatar = SILHOUETTE_AVATAR;
          }
          if (parsed.email?.toLowerCase() === 'billkute030709@gmail.com' || savedEmail === 'billkute030709@gmail.com') {
            parsed.role = 'admin';
            parsed.email = 'billkute030709@gmail.com';
          }
          return parsed;
        }
      }
      if (savedEmail === 'billkute030709@gmail.com') {
        return {
          ...currentUser,
          id: 'u_admin_bill',
          name: 'Bill Kute (Admin)',
          email: 'billkute030709@gmail.com',
          avatar: SILHOUETTE_AVATAR,
          role: 'admin',
          badges: ['Admin', 'Verified Tutor'],
          hasCompletedOnboarding: true
        };
      }
    } catch (_) {}
    return { ...currentUser, avatar: SILHOUETTE_AVATAR, hasCompletedOnboarding: false };
  });
  
  // Ensure old mock items in localStorage are cleared once
  try {
    if (typeof window !== 'undefined' && window.localStorage && !localStorage.getItem('sb_v4_clean')) {
      localStorage.removeItem('sb_posts');
      localStorage.removeItem('sb_groups');
      localStorage.removeItem('sb_tutors');
      localStorage.removeItem('sb_reels');
      localStorage.removeItem('sb_marketplace');
      localStorage.removeItem('sb_group_chats');
      localStorage.setItem('sb_v4_clean', 'true');
    }
  } catch (_) {}

  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem('sb_posts');
      return saved ? JSON.parse(saved) : initialPosts;
    } catch (_) { return initialPosts; }
  });

  const [groups, setGroups] = useState<StudyGroup[]>(() => {
    try {
      const saved = localStorage.getItem('sb_groups');
      return saved ? JSON.parse(saved) : initialGroups;
    } catch (_) { return initialGroups; }
  });

  const [tutors, setTutors] = useState<TutorPage[]>(() => {
    try {
      const saved = localStorage.getItem('sb_tutors');
      return saved ? JSON.parse(saved) : initialTutors;
    } catch (_) { return initialTutors; }
  });

  const [reels, setReels] = useState<Reel[]>(() => {
    try {
      const saved = localStorage.getItem('sb_reels');
      return saved ? JSON.parse(saved) : initialReels;
    } catch (_) { return initialReels; }
  });

  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>(() => {
    try {
      const saved = localStorage.getItem('sb_marketplace');
      return saved ? JSON.parse(saved) : initialMarketplaceItems;
    } catch (_) { return initialMarketplaceItems; }
  });

  const [groupChats, setGroupChats] = useState<GroupChat[]>(() => {
    try {
      const saved = localStorage.getItem('sb_group_chats');
      return saved ? JSON.parse(saved) : initialGroupChats;
    } catch (_) { return initialGroupChats; }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('sb_settings');
      return saved ? JSON.parse(saved) : defaultSettings;
    } catch (_) { return defaultSettings; }
  });

  const getFoldersForUser = (userId: string): BinderFolder[] => {
    const activeUid = userId || 'guest';
    const key = `sb_folders_${activeUid}`;
    const saved = localStorage.getItem(key) || localStorage.getItem('sb_folders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(f => f.id !== 'f_exam_prep' && f.id !== 'f_helpful_resources');
        }
      } catch (_) {}
    }
    return [
      { id: 'f_watch_later', name: 'Watch Later', color: 'bg-red-500' }
    ];
  };

  const [folders, setFolders] = useState<BinderFolder[]>(() => {
    return getFoldersForUser(user?.id || 'guest');
  });

  useEffect(() => {
    if (user?.id) {
      setFolders(getFoldersForUser(user.id));
      setPosts(prev => prev.map(p => normalizePostForUser(p, user.id)));
    }
  }, [user?.id]);

  const addFolder = (name: string, color: string, subject?: string) => {
    const newFolder: BinderFolder = {
      id: 'f_' + Date.now(),
      name,
      color: color || 'bg-blue-500',
      subject
    };
    setFolders(prev => {
      const next = [...prev, newFolder];
      const activeUid = user?.id || 'guest';
      const key = `sb_folders_${activeUid}`;
      localStorage.setItem(key, JSON.stringify(next));
      if (isFirebaseConfigured && activeUid !== 'guest') {
        setDoc(doc(db, 'users', activeUid), { folders: cleanForFirestore(next) }, { merge: true }).catch(console.error);
      }
      return next;
    });
  };

  const [isSpeaking, setIsSpeaking] = useState(false);

  // Automatic daily streak processing on mount / active user change
  useEffect(() => {
    setUser(prev => {
      const updated = processUserStreak(prev);
      if (updated.streak !== prev.streak || updated.lastLoginDate !== prev.lastLoginDate) {
        localStorage.setItem('sb_user', JSON.stringify(updated));
        if (isFirebaseConfigured) {
          setDoc(doc(db, 'users', updated.id), cleanForFirestore(updated)).catch(e => {
            console.warn('Failed to sync streak update to Firestore:', e);
          });
        }
      }
      return updated;
    });
  }, [isFirebaseConnected]);

  // 1. Firebase Authentication State Listener with Offline Fallback try/catch
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsFirebaseConnected(false);
      setIsFirebaseLoading(false);
      return;
    }

    setIsFirebaseLoading(true);
    let initialCheckPerformed = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsFirebaseLoading(true);
      try {
        if (firebaseUser) {
          setIsFirebaseConnected(true);
          if (firebaseUser.email) {
            localStorage.setItem('sb_current_email', firebaseUser.email.toLowerCase());
          }
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          
          let userSnap;
          try {
            userSnap = await getDoc(userDocRef);
            if (userSnap && userSnap.exists()) {
              const userData = userSnap.data() as User;
              if (firebaseUser.email) {
                userData.email = firebaseUser.email;
              }
              if (firebaseUser.email?.toLowerCase() === 'billkute030709@gmail.com') {
                userData.role = 'admin';
                userData.email = 'billkute030709@gmail.com';
              }
              if (!userData.avatar || userData.avatar.includes('photo-1535713875002')) {
                userData.avatar = SILHOUETTE_AVATAR;
              }
              const updatedUser = processUserStreak(userData);
              setUser(updatedUser);
              localStorage.setItem('sb_user', JSON.stringify(updatedUser));
              if (updatedUser.streak !== userData.streak || updatedUser.lastLoginDate !== userData.lastLoginDate || userData.avatar === SILHOUETTE_AVATAR || userData.role === 'admin') {
                await setDoc(userDocRef, cleanForFirestore(updatedUser), { merge: true });
              }
            } else {
              const isAdmin = firebaseUser.email?.toLowerCase() === 'billkute030709@gmail.com';
              const baseUser: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || user.name || (isAdmin ? 'Bill Kute (Admin)' : 'Học viên StudyBook'),
                email: firebaseUser.email || (isAdmin ? 'billkute030709@gmail.com' : undefined),
                avatar: firebaseUser.photoURL || SILHOUETTE_AVATAR,
                role: isAdmin ? 'admin' : (user.role || 'student'),
                streak: 1,
                streakLevel: 'bronze',
                badges: user.badges || (isAdmin ? ['Admin', 'Verified Tutor'] : ['Study Warrior']),
                institution: user.institution || '',
                hasCompletedOnboarding: false
              };
              const newUser = processUserStreak(baseUser);
              try {
                await setDoc(userDocRef, cleanForFirestore(newUser));
              } catch (setErr) {
                console.warn('Failed to save user doc to Firestore:', setErr);
              }
              setUser(newUser);
              localStorage.setItem('sb_user', JSON.stringify(newUser));
            }
          } catch (offlineErr) {
            console.warn('Failed to fetch user doc because client is offline or key is invalid:', offlineErr);
            // Fallback to local storage for this user or standard mock user
            const saved = localStorage.getItem('sb_user');
            if (saved) {
              try {
                const savedUser = JSON.parse(saved);
                if (savedUser && (savedUser.id === firebaseUser.uid || savedUser.id)) {
                  const updatedUser = processUserStreak(savedUser);
                  setUser(updatedUser);
                }
              } catch (_) {
                setUser(processUserStreak(currentUser));
              }
            } else {
              setUser(processUserStreak({
                ...currentUser,
                id: firebaseUser.uid
              }));
            }
          }
        } else {
          setIsFirebaseConnected(false);
          const isLocal = localStorage.getItem('sb_local_logged_in') === 'true';
          const savedStr = localStorage.getItem('sb_user');
          if (isLocal && savedStr) {
            try {
              const savedUser = JSON.parse(savedStr);
              if (savedUser && savedUser.id && savedUser.id !== 'guest') {
                setUser(processUserStreak(savedUser));
                return;
              }
            } catch (_) {}
          }
          // Reset user state to guest when unauthenticated or signed out
          setUser({ ...currentUser, id: 'guest', name: 'Khách', hasCompletedOnboarding: false });
        }
      } catch (err) {
        console.error('onAuthStateChanged main error handler:', err);
        setIsFirebaseConnected(false);
      } finally {
        initialCheckPerformed = true;
        setIsFirebaseLoading(false);
      }
    });

    return () => unsubscribe();
  }, [isFirebaseConfigured]);

  // 1. Live Firestore real-time listener for Posts
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const currentUserId = user.id || auth.currentUser?.uid || 'guest';
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

    const unsubscribePosts = onSnapshot(
      postsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          // Auto-seed posts if database is empty
          initialPosts.forEach(async (post) => {
            try {
              await setDoc(doc(db, 'posts', post.id), cleanForFirestore({
                ...post,
                createdAt: serverTimestamp()
              }));
            } catch (e) {
              console.warn('Failed to seed post:', e);
            }
          });
        } else {
          const loadedPosts: Post[] = [];
          snapshot.forEach((docSnap) => {
            const rawData = { id: docSnap.id, ...docSnap.data() } as Post;
            const normalized = normalizePostForUser(rawData, currentUserId);
            loadedPosts.push(normalized);
          });
          setPosts(loadedPosts);
        }
      },
      (error) => {
        console.warn('Firestore posts live listener error:', error);
      }
    );

    // B. Sync Groups
    const unsubscribeGroups = onSnapshot(collection(db, 'groups'), async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed groups
        for (const g of initialGroups) {
          try {
            await setDoc(doc(db, 'groups', g.id), cleanForFirestore(g));
          } catch (e) {
            console.warn('Failed to seed group:', e);
          }
        }
      } else {
        const loaded: StudyGroup[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as StudyGroup));
        const normalized = loaded.map(g => normalizeGroupForUser(g, user.id));
        setGroups(normalized);
        localStorage.setItem('sb_groups', JSON.stringify(loaded));
      }
    }, (error) => {
      console.warn('Firestore groups sync failed (falling back to local):', error);
      const saved = localStorage.getItem('sb_groups');
      if (saved) {
        try { 
          const loaded = JSON.parse(saved);
          setGroups(loaded.map((g: StudyGroup) => normalizeGroupForUser(g, user.id))); 
        } catch (_) { 
          setGroups(initialGroups.map(g => normalizeGroupForUser(g, user.id))); 
        }
      } else {
        setGroups(initialGroups.map(g => normalizeGroupForUser(g, user.id)));
      }
    });

    // C. Sync Tutors
    const unsubscribeTutors = onSnapshot(collection(db, 'tutors'), async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed tutors
        for (const t of initialTutors) {
          try {
            await setDoc(doc(db, 'tutors', t.id), cleanForFirestore(t));
          } catch (e) {
            console.warn('Failed to seed tutor:', e);
          }
        }
      } else {
        const loaded: TutorPage[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as TutorPage));
        const normalized = loaded.map(t => normalizeTutorForUser(t, user.id));
        setTutors(normalized);
        localStorage.setItem('sb_tutors', JSON.stringify(loaded));
      }
    }, (error) => {
      console.warn('Firestore tutors sync failed (falling back to local):', error);
      const saved = localStorage.getItem('sb_tutors');
      if (saved) {
        try { 
          const loaded = JSON.parse(saved);
          setTutors(loaded.map((t: TutorPage) => normalizeTutorForUser(t, user.id))); 
        } catch (_) { 
          setTutors(initialTutors.map(t => normalizeTutorForUser(t, user.id))); 
        }
      } else {
        setTutors(initialTutors.map(t => normalizeTutorForUser(t, user.id)));
      }
    });

    // D. Sync Reels
    const unsubscribeReels = onSnapshot(collection(db, 'reels'), async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed reels
        for (const r of initialReels) {
          try {
            await setDoc(doc(db, 'reels', r.id), cleanForFirestore(r));
          } catch (e) {
            console.warn('Failed to seed reel:', e);
          }
        }
      } else {
        const loaded: Reel[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as Reel));
        const normalized = loaded.map(r => normalizeReelForUser(r, user.id));
        setReels(normalized);
        localStorage.setItem('sb_reels', JSON.stringify(loaded));
      }
    }, (error) => {
      console.warn('Firestore reels sync failed (falling back to local):', error);
      const saved = localStorage.getItem('sb_reels');
      if (saved) {
        try { 
          const loaded = JSON.parse(saved);
          setReels(loaded.map((r: Reel) => normalizeReelForUser(r, user.id))); 
        } catch (_) { 
          setReels(initialReels.map(r => normalizeReelForUser(r, user.id))); 
        }
      } else {
        setReels(initialReels.map(r => normalizeReelForUser(r, user.id)));
      }
    });

    // E. Sync Marketplace
    const unsubscribeMarket = onSnapshot(collection(db, 'marketplace'), async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed marketplace
        for (const m of initialMarketplaceItems) {
          try {
            await setDoc(doc(db, 'marketplace', m.id), cleanForFirestore(m));
          } catch (e) {
            console.warn('Failed to seed marketplace item:', e);
          }
        }
      } else {
        const loaded: MarketplaceItem[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as MarketplaceItem));
        setMarketplace(loaded);
        localStorage.setItem('sb_marketplace', JSON.stringify(loaded));
      }
    }, (error) => {
      console.warn('Firestore marketplace sync failed (falling back to local):', error);
      const saved = localStorage.getItem('sb_marketplace');
      if (saved) {
        try { setMarketplace(JSON.parse(saved)); } catch (_) { setMarketplace(initialMarketplaceItems); }
      } else {
        setMarketplace(initialMarketplaceItems);
      }
    });

    // F. Sync Group Chats
    const unsubscribeChats = onSnapshot(collection(db, 'groupChats'), async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed group chats
        for (const c of initialGroupChats) {
          try {
            await setDoc(doc(db, 'groupChats', c.groupId), cleanForFirestore(c));
          } catch (e) {
            console.warn('Failed to seed group chat:', e);
          }
        }
      } else {
        const loaded: GroupChat[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as GroupChat));
        setGroupChats(loaded);
        localStorage.setItem('sb_group_chats', JSON.stringify(loaded));
      }
    }, (error) => {
      console.warn('Firestore groupChats sync failed (falling back to local):', error);
      const saved = localStorage.getItem('sb_group_chats');
      if (saved) {
        try { setGroupChats(JSON.parse(saved)); } catch (_) { setGroupChats(initialGroupChats); }
      } else {
        setGroupChats(initialGroupChats);
      }
    });

    return () => {
      unsubscribePosts();
      unsubscribeGroups();
      unsubscribeTutors();
      unsubscribeReels();
      unsubscribeMarket();
      unsubscribeChats();
    };
  }, [isFirebaseConfigured, user.id]);

  // Re-normalize local posts, reels, tutors, and groups whenever active user changes
  useEffect(() => {
    setPosts(prev => prev.map(p => normalizePostForUser(p, user.id)));
    setReels(prev => prev.map(r => normalizeReelForUser(r, user.id)));
    setTutors(prev => prev.map(t => normalizeTutorForUser(t, user.id)));
    setGroups(prev => prev.map(g => normalizeGroupForUser(g, user.id)));
  }, [user.id]);

  // Auth Functions
  const isApiKeyError = (err: any) => {
    if (!err) return false;
    const code = String(err.code || '');
    const msg = String(err.message || '');
    return code.includes('api-key-not-valid') || code.includes('invalid-api-key') || msg.includes('api-key-not-valid') || msg.includes('invalid-api-key') || msg.includes('API key not valid');
  };

  const executeLocalSignIn = (email: string, pass: string) => {
    const localUsersStr = localStorage.getItem('sb_local_users');
    const localUsers = localUsersStr ? JSON.parse(localUsersStr) : [];
    const found = localUsers.find((u: any) => u.email?.toLowerCase() === email.toLowerCase() && u.password === pass);
    const isAdmin = email.toLowerCase() === 'billkute030709@gmail.com';

    if (found) {
      const updatedUser = processUserStreak({
        ...found.user,
        email: email.toLowerCase(),
        role: isAdmin ? 'admin' : found.user.role
      });
      setUser(updatedUser);
      setIsLocalLoggedIn(true);
      localStorage.setItem('sb_local_logged_in', 'true');
      localStorage.setItem('sb_user', JSON.stringify(updatedUser));
    } else {
      if (email.toLowerCase() === 'demo@studybook.vn' || email.toLowerCase() === 'bill@studybook.vn' || isAdmin) {
        const hasOnboarded = localStorage.getItem(`sb_onboarded_${email.toLowerCase()}`) === 'true';
        const emailPrefix = email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        const demoUser: User = {
          id: `u_${emailPrefix}`,
          name: isAdmin ? 'Bill Kute (Admin)' : email.toLowerCase() === 'bill@studybook.vn' ? 'Bill Kute' : 'Demo Student',
          email: email.toLowerCase(),
          avatar: SILHOUETTE_AVATAR,
          role: isAdmin ? 'admin' : 'student',
          streak: 1,
          streakLevel: 'bronze',
          badges: isAdmin ? ['Admin', 'Verified Tutor'] : ['Top Contributor', 'Math Whiz'],
          institution: '',
          hasCompletedOnboarding: hasOnboarded
        };
        const updatedUser = processUserStreak(demoUser);
        setUser(updatedUser);
        setIsLocalLoggedIn(true);
        localStorage.setItem('sb_local_logged_in', 'true');
        localStorage.setItem('sb_user', JSON.stringify(updatedUser));
      } else {
        throw new Error('Email hoặc mật khẩu không chính xác hoặc tài khoản chưa được đăng ký!');
      }
    }
  };

  const executeLocalSignUp = (email: string, pass: string, name: string, role: 'student' | 'tutor' | 'creator', institution: string) => {
    const isAdmin = email.toLowerCase() === 'billkute030709@gmail.com';
    const baseUser: User = {
      id: 'u_' + Date.now(),
      name: name.trim() || (isAdmin ? 'Bill Kute (Admin)' : 'Học viên StudyBook'),
      email: email.toLowerCase(),
      avatar: SILHOUETTE_AVATAR,
      role: isAdmin ? 'admin' : role,
      streak: 1,
      streakLevel: 'bronze',
      badges: isAdmin ? ['Admin', 'Verified Tutor'] : ['Study Warrior'],
      institution,
      hasCompletedOnboarding: false
    };
    const newUser = processUserStreak(baseUser);
    
    const localUsersStr = localStorage.getItem('sb_local_users');
    const localUsers = localUsersStr ? JSON.parse(localUsersStr) : [];
    
    if (localUsers.some((u: any) => u.email?.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email này đã được sử dụng bởi tài khoản khác!');
    }

    localUsers.push({ email, password: pass, user: newUser });
    localStorage.setItem('sb_local_users', JSON.stringify(localUsers));
    
    setUser(newUser);
    setIsLocalLoggedIn(true);
    localStorage.setItem('sb_local_logged_in', 'true');
    localStorage.setItem('sb_user', JSON.stringify(newUser));
  };

  const executeLocalGoogleSignIn = () => {
    const currentEmail = localStorage.getItem('sb_current_email') || '';
    const isAdmin = currentEmail.toLowerCase() === 'billkute030709@gmail.com';
    const googleUser: User = processUserStreak({
      id: 'u_google_' + Date.now(),
      name: isAdmin ? 'Bill Kute (Admin)' : 'Học viên StudyBook',
      email: currentEmail || undefined,
      avatar: SILHOUETTE_AVATAR,
      role: isAdmin ? 'admin' : 'student',
      streak: 1,
      streakLevel: 'bronze',
      badges: isAdmin ? ['Admin', 'Verified Tutor'] : ['Study Warrior'],
      institution: '',
      hasCompletedOnboarding: false
    });
    setUser(googleUser);
    setIsLocalLoggedIn(true);
    localStorage.setItem('sb_local_logged_in', 'true');
    localStorage.setItem('sb_user', JSON.stringify(googleUser));
  };

  const signIn = async (email: string, pass: string) => {
    localStorage.setItem('sb_current_email', email.toLowerCase());
    if (isFirebaseConfigured) {
      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (err: any) {
        if (isApiKeyError(err)) {
          console.warn('Firebase Auth API key invalid, falling back to local sign in:', err);
          executeLocalSignIn(email, pass);
          return;
        }
        throw err;
      }
    } else {
      executeLocalSignIn(email, pass);
    }
  };

  const signUp = async (email: string, pass: string, name: string, role: 'student' | 'tutor' | 'creator', institution: string) => {
    localStorage.setItem('sb_current_email', email.toLowerCase());
    if (isFirebaseConfigured) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const isAdmin = email.toLowerCase() === 'billkute030709@gmail.com';
        const baseUser: User = {
          id: cred.user.uid,
          name: name.trim() || (isAdmin ? 'Bill Kute (Admin)' : 'Học viên StudyBook'),
          email: email.toLowerCase(),
          avatar: SILHOUETTE_AVATAR,
          role: isAdmin ? 'admin' : role,
          streak: 1,
          streakLevel: 'bronze',
          badges: isAdmin ? ['Admin', 'Verified Tutor'] : ['Study Warrior'],
          institution,
          hasCompletedOnboarding: false
        };
        const newUser = processUserStreak(baseUser);
        try {
          await setDoc(doc(db, 'users', cred.user.uid), cleanForFirestore(newUser));
        } catch (setErr) {
          console.warn('Failed to save user doc in Firestore:', setErr);
        }
        setUser(newUser);
      } catch (err: any) {
        if (isApiKeyError(err)) {
          console.warn('Firebase Auth API key invalid, falling back to local sign up:', err);
          executeLocalSignUp(email, pass, name, role, institution);
          return;
        }
        throw err;
      }
    } else {
      executeLocalSignUp(email, pass, name, role, institution);
    }
  };

  const signInWithGoogle = async () => {
    if (isFirebaseConfigured) {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (err: any) {
        if (isApiKeyError(err)) {
          console.warn('Firebase Auth API key invalid, falling back to local Google sign in:', err);
          executeLocalGoogleSignIn();
          return;
        }
        throw err;
      }
    } else {
      executeLocalGoogleSignIn();
    }
  };

  const logout = async () => {
    setIsOfflineBypass(false);
    setIsLocalLoggedIn(false);
    try {
      localStorage.removeItem('sb_offline_bypass');
      localStorage.removeItem('sb_local_logged_in');
      localStorage.removeItem('sb_user');
      localStorage.removeItem('sb_current_email');
    } catch (_) {}
    if (isFirebaseConfigured) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Firebase signOut error:', err);
      }
    }
    setUser({ ...currentUser, id: 'guest', name: 'Khách', hasCompletedOnboarding: false });
  };

  // Persistence Effects (Always sync to local storage as high-resilience cache)
  useEffect(() => {
    if (user && user.id && user.id !== 'guest') {
      try { localStorage.setItem('sb_user', JSON.stringify(user)); } catch (_) {}
    } else {
      try { localStorage.removeItem('sb_user'); } catch (_) {}
    }
  }, [user]);

  // Re-normalize state whenever active user ID changes to guarantee account isolation
  useEffect(() => {
    setPosts(prev => prev.map(p => normalizePostForUser(p, user.id)));
    setGroups(prev => prev.map(g => normalizeGroupForUser(g, user.id)));
    setTutors(prev => prev.map(t => normalizeTutorForUser(t, user.id)));
    setReels(prev => prev.map(r => normalizeReelForUser(r, user.id)));
  }, [user.id]);

  useEffect(() => {
    try { localStorage.setItem('sb_posts', JSON.stringify(posts.map(cleanForFirestore))); } catch (_) {}
  }, [posts]);

  useEffect(() => {
    try { localStorage.setItem('sb_groups', JSON.stringify(groups.map(cleanForFirestore))); } catch (_) {}
  }, [groups]);

  useEffect(() => {
    try { localStorage.setItem('sb_tutors', JSON.stringify(tutors.map(cleanForFirestore))); } catch (_) {}
  }, [tutors]);

  useEffect(() => {
    try { localStorage.setItem('sb_reels', JSON.stringify(reels.map(cleanForFirestore))); } catch (_) {}
  }, [reels]);

  useEffect(() => {
    try { localStorage.setItem('sb_marketplace', JSON.stringify(marketplace)); } catch (_) {}
  }, [marketplace]);

  useEffect(() => {
    try { localStorage.setItem('sb_group_chats', JSON.stringify(groupChats)); } catch (_) {}
  }, [groupChats]);

  useEffect(() => {
    try { localStorage.setItem('sb_settings', JSON.stringify(settings)); } catch (_) {}
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // Interactive functions
  const addPost = async (
    content: string, 
    subject: string, 
    attachmentType?: 'pdf'|'doc'|'link'|'youtube', 
    attachmentTitle?: string,
    isAnonymous?: boolean,
    attachmentUrl?: string
  ) => {
    const currentUserId = user.id || auth.currentUser?.uid || 'guest';
    const authorName = isAnonymous ? 'Học sinh ẩn danh' : (user.name || 'Người dùng');

    const authorUser: User = isAnonymous ? {
      id: currentUserId,
      name: authorName,
      avatar: SILHOUETTE_AVATAR,
      role: 'student',
      streak: 0,
      streakLevel: 'none',
      badges: []
    } : user;

    const newPostData = {
      content,
      subject,
      authorId: currentUserId,
      authorName,
      user: authorUser,
      createdAt: serverTimestamp(),
      timestamp: new Date().toISOString(),
      userReactionsMap: {},
      userReactions: { helpful: 0, insightful: 0, confused: 0, verified: 0 },
      reactions: { helpful: 0, insightful: 0, confused: 0, verified: 0 },
      comments: [],
      shares: 0,
      isSaved: false,
      isAnonymous,
      ...(attachmentType && attachmentTitle ? {
        attachment: {
          type: attachmentType,
          title: attachmentTitle,
          url: attachmentUrl || '#',
          size: attachmentType === 'pdf' ? '1.5 MB' : attachmentType === 'doc' ? '850 KB' : undefined
        }
      } : {})
    };

    if (isFirebaseConfigured) {
      try {
        await addDoc(collection(db, 'posts'), cleanForFirestore(newPostData));
      } catch (err) {
        console.warn('Failed to save post to Firestore:', err);
      }
    } else {
      const rawLocalPost = {
        id: `p_${Date.now()}`,
        ...newPostData,
        timestamp: new Date().toISOString()
      };
      const localPost = normalizePostForUser(rawLocalPost as any, currentUserId);
      setPosts(prev => [localPost, ...prev]);
    }
  };

  const deletePost = async (postId: string) => {
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const currentUserId = user.id || auth.currentUser?.uid || 'guest';
    const postOwnerId = targetPost.authorId || targetPost.user?.id;
    const currentEmail = user.email || localStorage.getItem('sb_current_email') || auth.currentUser?.email || '';
    const isAdmin = user.role === 'admin' || currentEmail.toLowerCase() === 'billkute030709@gmail.com';

    // Permission check: Owner OR Admin
    if (!isAdmin && postOwnerId && postOwnerId !== currentUserId) {
      console.warn(`Permission denied: User ${currentUserId} cannot delete post owned by ${postOwnerId}`);
      alert('Bạn chỉ có thể xóa bài viết do chính bạn đăng!');
      return;
    }

    setPosts(prev => {
      const next = prev.filter(p => p.id !== postId);
      localStorage.setItem('sb_posts', JSON.stringify(next));
      return next;
    });

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'posts', postId));
      } catch (err) {
        console.warn('Failed to delete post from Firestore:', err);
      }
    }
  };

  const reactToPost = async (postId: string, reaction: AcademicReactionType) => {
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const currentUserId = user.id || auth.currentUser?.uid || 'guest';

    const existingMap: Record<string, AcademicReactionType> = {};
    if (targetPost.userReactionsMap && typeof targetPost.userReactionsMap === 'object') {
      Object.entries(targetPost.userReactionsMap).forEach(([uid, val]) => {
        const r = getReactionTypeFromValue(val);
        if (r && uid) existingMap[uid] = r;
      });
    }

    const currentReaction = existingMap[currentUserId] || null;
    const newReaction = currentReaction === reaction ? null : reaction;

    const newMap = { ...existingMap };
    if (newReaction === null) {
      delete newMap[currentUserId];
    } else {
      newMap[currentUserId] = reaction;
    }

    const rawPost: Post = {
      ...targetPost,
      userReactionsMap: newMap
    };

    const updatedPost = normalizePostForUser(rawPost, currentUserId);

    setPosts(prev => {
      const next = prev.map(p => p.id === postId ? updatedPost : p);
      
      // Clean local storage payload to guarantee account data isolation
      const cachedPosts = next.map(p => {
        if (p.id === postId) {
          const { currentUserReaction, ...rest } = p;
          return rest;
        }
        return p;
      });
      localStorage.setItem('sb_posts', JSON.stringify(cachedPosts));
      
      return next;
    });

    if (isFirebaseConfigured) {
      try {
        const postRef = doc(db, 'posts', postId);
        const fieldPath = `userReactionsMap.${currentUserId}`;

        if (newReaction === null) {
          await updateDoc(postRef, { [fieldPath]: deleteField() });
        } else {
          await updateDoc(postRef, { [fieldPath]: reaction });
        }
      } catch (err) {
        try {
          const postRef = doc(db, 'posts', postId);
          await setDoc(postRef, cleanForFirestore(rawPost), { merge: true });
        } catch (setErr) {
          console.warn('Failed to save reaction to Firestore:', setErr);
        }
      }
    }
  };

  const addComment = async (postId: string, content: string) => {
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const newComment: Comment = {
      id: `c_${Date.now()}`,
      postId,
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        streak: user.streak,
        streakLevel: user.streakLevel,
        badges: user.badges
      },
      content,
      timestamp: 'Vừa xong',
      helpfulCount: 0,
      hasHelped: false,
      helpedUserIds: []
    };

    const updatedPost: Post = { ...targetPost, comments: [...targetPost.comments, newComment] };

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    setPosts(prev => {
      const next = prev.map(p => p.id === postId ? updatedPost : p);
      localStorage.setItem('sb_posts', JSON.stringify(next));
      return next;
    });

    // --- FIREBASE WRITE WITH ATOMIC MERGE ---
    if (isFirebaseConfigured) {
      try {
        const postRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(postRef);
        let mergedComments = updatedPost.comments;

        if (docSnap.exists()) {
          const firestoreData = docSnap.data() as Post;
          const existingComments = firestoreData.comments || [];
          if (!existingComments.some(c => c.id === newComment.id)) {
            mergedComments = [...existingComments, newComment];
          } else {
            mergedComments = existingComments;
          }
        }

        const postForFirestore = cleanForFirestore({
          ...updatedPost,
          comments: mergedComments
        });
        await setDoc(postRef, postForFirestore, { merge: true });
      } catch (err) {
        console.warn('Failed to save comment to Firestore:', err);
      }
    }
  };

  const deleteComment = async (postId: string, commentId: string) => {
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const currentUserId = user.id || auth.currentUser?.uid || 'guest';
    const targetComment = targetPost.comments.find(c => c.id === commentId);
    if (!targetComment) return;

    const currentEmail = user.email || localStorage.getItem('sb_current_email') || auth.currentUser?.email || '';
    const isAdmin = user.role === 'admin' || currentEmail.toLowerCase() === 'billkute030709@gmail.com';

    // Permission check: Owner OR Admin
    if (!isAdmin && targetComment.user?.id && targetComment.user.id !== currentUserId) {
      console.warn(`Permission denied: User ${currentUserId} cannot delete comment owned by ${targetComment.user.id}`);
      alert('Bạn chỉ có thể xóa bình luận do chính bạn tạo!');
      return;
    }

    const updatedComments = targetPost.comments.filter(c => c.id !== commentId);
    const updatedPost: Post = { ...targetPost, comments: updatedComments };

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    setPosts(prev => {
      const next = prev.map(p => p.id === postId ? updatedPost : p);
      localStorage.setItem('sb_posts', JSON.stringify(next));
      return next;
    });

    // --- FIREBASE WRITE WITH ATOMIC MERGE ---
    if (isFirebaseConfigured) {
      try {
        const postRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(postRef);
        let finalComments = updatedComments;

        if (docSnap.exists()) {
          const firestoreData = docSnap.data() as Post;
          const existingComments = firestoreData.comments || [];
          finalComments = existingComments.filter(c => c.id !== commentId);
        }

        const postForFirestore = cleanForFirestore({
          ...updatedPost,
          comments: finalComments
        });
        await setDoc(postRef, postForFirestore, { merge: true });
      } catch (err) {
        console.warn('Failed to delete comment from Firestore:', err);
      }
    }
  };

  const markHelpfulComment = async (postId: string, commentId: string) => {
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const applyCommentHelpToggle = (commentsList: Comment[]) => {
      return commentsList.map(c => {
        if (c.id !== commentId) return c;

        const baseHelpfulCount = typeof c.baseHelpfulCount === 'number'
          ? c.baseHelpfulCount
          : (typeof c.helpfulCount === 'number' ? c.helpfulCount : 0);

        const currentHelpedUserIds = Array.isArray(c.helpedUserIds) 
          ? c.helpedUserIds 
          : (c.hasHelped ? [user.id] : []);
        
        const userHasHelped = currentHelpedUserIds.includes(user.id);
        let newHelpedUserIds: string[];
        if (userHasHelped) {
          newHelpedUserIds = currentHelpedUserIds.filter(id => id !== user.id);
        } else {
          newHelpedUserIds = [...currentHelpedUserIds, user.id];
        }

        return {
          ...c,
          baseHelpfulCount,
          helpedUserIds: newHelpedUserIds,
          hasHelped: newHelpedUserIds.includes(user.id),
          helpfulCount: baseHelpfulCount + newHelpedUserIds.length
        };
      });
    };

    const updatedComments = applyCommentHelpToggle(targetPost.comments);
    const rawPost: Post = { ...targetPost, comments: updatedComments };
    const updatedPost = normalizePostForUser(rawPost, user.id);

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    setPosts(prev => {
      const next = prev.map(p => p.id === postId ? updatedPost : p);
      localStorage.setItem('sb_posts', JSON.stringify(next));
      return next;
    });

    // --- FIREBASE WRITE WITH ATOMIC MERGE ---
    if (isFirebaseConfigured) {
      try {
        const postRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(postRef);
        let finalComments = updatedComments;

        if (docSnap.exists()) {
          const firestoreData = docSnap.data() as Post;
          finalComments = applyCommentHelpToggle(firestoreData.comments || targetPost.comments);
        }

        const postForFirestore = cleanForFirestore({
          ...updatedPost,
          comments: finalComments
        });
        await setDoc(postRef, postForFirestore, { merge: true });
      } catch (err) {
        console.warn('Failed to update comment help state in Firestore:', err);
      }
    }
  };

  const savePostToLibrary = async (postId: string, folderId: string = 'f_watch_later') => {
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const currentUserId = user.id;
    const savedByUsersMap = { ...(targetPost.savedByUsersMap || {}) };
    const currentSavedState = savedByUsersMap[currentUserId] || { isSaved: false };

    let isSaved: boolean;
    let newFolderId: string | undefined;

    if (currentSavedState.isSaved && currentSavedState.savedFolderId === folderId) {
      isSaved = false;
      newFolderId = undefined;
    } else {
      isSaved = true;
      newFolderId = folderId;
    }

    savedByUsersMap[currentUserId] = { isSaved, savedFolderId: newFolderId };

    const rawPost: Post = {
      ...targetPost,
      savedByUsersMap
    };
    const updatedPost = normalizePostForUser(rawPost, currentUserId);

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));

    // --- FIREBASE WRITE WITH ATOMIC MERGE ---
    if (isFirebaseConfigured) {
      try {
        const postRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(postRef);
        let mergedSavedByUsersMap = { ...savedByUsersMap };

        if (docSnap.exists()) {
          const firestoreData = docSnap.data() as Post;
          const firestoreSavedMap = firestoreData.savedByUsersMap || {};
          mergedSavedByUsersMap = {
            ...firestoreSavedMap,
            [currentUserId]: { isSaved, savedFolderId: newFolderId }
          };
        }

        const finalPost = normalizePostForUser({
          ...targetPost,
          savedByUsersMap: mergedSavedByUsersMap
        }, currentUserId);

        await setDoc(postRef, cleanForFirestore(finalPost), { merge: true });
      } catch (err) {
        console.warn('Failed to update saved post state in Firestore:', err);
      }
    }
  };

  const toggleFollowTutor = async (tutorId: string) => {
    const targetTutor = tutors.find(t => t.id === tutorId);
    if (!targetTutor) return;

    const currentUserId = user.id;
    const followedByUsers = Array.isArray(targetTutor.followedByUsers) ? [...targetTutor.followedByUsers] : [];
    const alreadyFollowing = followedByUsers.includes(currentUserId);

    let nextFollowedBy: string[];
    if (alreadyFollowing) {
      nextFollowedBy = followedByUsers.filter(id => id !== currentUserId);
    } else {
      nextFollowedBy = [...followedByUsers, currentUserId];
    }

    const rawTutor: TutorPage = {
      ...targetTutor,
      followedByUsers: nextFollowedBy
    };
    const updatedTutor = normalizeTutorForUser(rawTutor, currentUserId);

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    setTutors(prev => prev.map(t => t.id === tutorId ? updatedTutor : t));

    // --- FIREBASE WRITE WITH ATOMIC MERGE ---
    if (isFirebaseConfigured) {
      try {
        const tutorRef = doc(db, 'tutors', tutorId);
        const docSnap = await getDoc(tutorRef);
        let finalFollowedBy = nextFollowedBy;
        if (docSnap.exists()) {
          const firestoreData = docSnap.data() as TutorPage;
          const existingFollowedBy = Array.isArray(firestoreData.followedByUsers) ? firestoreData.followedByUsers : [];
          if (alreadyFollowing) {
            finalFollowedBy = existingFollowedBy.filter(id => id !== currentUserId);
          } else {
            finalFollowedBy = Array.from(new Set([...existingFollowedBy, currentUserId]));
          }
        }
        const finalTutorNormalized = normalizeTutorForUser({ ...rawTutor, followedByUsers: finalFollowedBy }, currentUserId);
        await setDoc(tutorRef, cleanForFirestore(finalTutorNormalized), { merge: true });
      } catch (err) {
        console.warn('Failed to update follow state in Firestore:', err);
      }
    }
  };

  const addTutorReview = async (tutorId: string, rating: number, content: string) => {
    const targetTutor = tutors.find(t => t.id === tutorId);
    if (!targetTutor) return;

    const newReview = {
      id: `r_${Date.now()}`,
      authorName: user.name,
      authorAvatar: user.avatar,
      rating,
      content,
      date: new Date().toLocaleDateString('vi-VN')
    };

    const updatedTutor = {
      ...targetTutor,
      reviews: [newReview, ...targetTutor.reviews]
    };

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    setTutors(prev => prev.map(t => t.id === tutorId ? updatedTutor : t));

    // --- FIREBASE WRITE WITH EXPLICIT TRY-CATCH ---
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'tutors', tutorId), cleanForFirestore(updatedTutor));
      } catch (err) {
        console.warn('Failed to save tutor review to Firestore:', err);
      }
    }
  };

  const toggleEventGoing = async (groupId: string, eventId: string) => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return;

    const currentUserId = user.id;
    const updatedEvents = targetGroup.events.map(ev => {
      if (ev.id !== eventId) return ev;

      const attendeeUserIds = Array.isArray(ev.attendeeUserIds) ? [...ev.attendeeUserIds] : [];
      const alreadyGoing = attendeeUserIds.includes(currentUserId);

      let nextAttendees: string[];
      if (alreadyGoing) {
        nextAttendees = attendeeUserIds.filter(id => id !== currentUserId);
      } else {
        nextAttendees = [...attendeeUserIds, currentUserId];
      }

      return {
        ...ev,
        attendeeUserIds: nextAttendees
      };
    });

    const rawGroup: StudyGroup = { ...targetGroup, events: updatedEvents };
    const updatedGroup = normalizeGroupForUser(rawGroup, currentUserId);

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    setGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));

    // --- FIREBASE WRITE WITH ATOMIC MERGE ---
    if (isFirebaseConfigured) {
      try {
        const groupRef = doc(db, 'groups', groupId);
        const docSnap = await getDoc(groupRef);
        let finalGroupEvents = updatedEvents;
        if (docSnap.exists()) {
          const firestoreData = docSnap.data() as StudyGroup;
          const existingEvents = firestoreData.events || [];
          finalGroupEvents = existingEvents.map(ev => {
            if (ev.id !== eventId) return ev;
            const existingAttendees = Array.isArray(ev.attendeeUserIds) ? ev.attendeeUserIds : [];
            const isGoing = existingAttendees.includes(currentUserId);
            const nextAttendees = isGoing 
              ? existingAttendees.filter(id => id !== currentUserId)
              : Array.from(new Set([...existingAttendees, currentUserId]));
            return { ...ev, attendeeUserIds: nextAttendees };
          });
        }
        const finalGroupNormalized = normalizeGroupForUser({ ...rawGroup, events: finalGroupEvents }, currentUserId);
        await setDoc(groupRef, cleanForFirestore(finalGroupNormalized), { merge: true });
      } catch (err) {
        console.warn('Failed to update event going state in Firestore:', err);
      }
    }
  };

  const toggleReelLike = async (reelId: string) => {
    const targetReel = reels.find(r => r.id === reelId);
    if (!targetReel) return;

    const currentUserId = user.id;
    const currentLikedBy = Array.isArray(targetReel.likedByUsers) ? [...targetReel.likedByUsers] : [];
    const alreadyLiked = currentLikedBy.includes(currentUserId);

    let nextLikedBy: string[];
    if (alreadyLiked) {
      nextLikedBy = currentLikedBy.filter(id => id !== currentUserId);
    } else {
      nextLikedBy = [...currentLikedBy, currentUserId];
    }

    const rawReel: Reel = {
      ...targetReel,
      likedByUsers: nextLikedBy
    };
    const updatedReel = normalizeReelForUser(rawReel, currentUserId);

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    setReels(prev => prev.map(r => r.id === reelId ? updatedReel : r));

    // --- FIREBASE WRITE WITH ATOMIC MERGE ---
    if (isFirebaseConfigured) {
      try {
        const reelRef = doc(db, 'reels', reelId);
        const docSnap = await getDoc(reelRef);
        let finalLikedBy = nextLikedBy;
        if (docSnap.exists()) {
          const firestoreData = docSnap.data() as Reel;
          const existingLikedBy = Array.isArray(firestoreData.likedByUsers) ? firestoreData.likedByUsers : [];
          if (alreadyLiked) {
            finalLikedBy = existingLikedBy.filter(id => id !== currentUserId);
          } else {
            finalLikedBy = Array.from(new Set([...existingLikedBy, currentUserId]));
          }
        }
        const finalReelNormalized = normalizeReelForUser({ ...rawReel, likedByUsers: finalLikedBy }, currentUserId);
        await setDoc(reelRef, cleanForFirestore(finalReelNormalized), { merge: true });
      } catch (err) {
        console.warn('Failed to save reel like to Firestore:', err);
      }
    }
  };

  const createStudyGroup = async (name: string, description?: string, category?: string) => {
    const groupId = `g_${Date.now()}`;
    const newG: StudyGroup = {
      id: groupId,
      name,
      coverImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800',
      description: description || 'A new study group co-created by learners.',
      category: category || 'General',
      memberCount: 1,
      files: [],
      events: []
    };

    const newChat: GroupChat = {
      groupId: groupId,
      groupName: name,
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          sender: {
            id: 'system',
            name: 'Ban Quản Lý StudyBook',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
            role: 'creator',
            streak: 0,
            streakLevel: 'none',
            badges: []
          },
          content: `Chào mừng bạn đến với nhóm học tập "${name}"! Hãy bắt đầu thảo luận, chia sẻ tài liệu và lên lịch học nhóm ngay nhé!`,
          timestamp: 'Vừa xong'
        }
      ]
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'groups', groupId), cleanForFirestore(newG));
        await setDoc(doc(db, 'groupChats', groupId), cleanForFirestore(newChat));
      } catch (e) {
        console.warn('Firebase save group failed:', e);
      }
    } else {
      setGroups(prev => [...prev, newG]);
      setGroupChats(prev => {
        const found = prev.some(c => c.groupId === groupId);
        if (found) return prev;
        return [...prev, newChat];
      });
    }

    return groupId;
  };

  const addMarketplaceItem = async (item: Omit<MarketplaceItem, 'id' | 'seller' | 'distance'>) => {
    const newItem: MarketplaceItem = {
      ...item,
      id: `m_${Date.now()}`,
      distance: Number((Math.random() * 4.5 + 0.2).toFixed(1)),
      seller: {
        name: user.name,
        avatar: user.avatar,
        rating: 5.0
      }
    };

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    setMarketplace(prev => [newItem, ...prev]);

    // --- FIREBASE WRITE WITH EXPLICIT TRY-CATCH ---
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'marketplace', newItem.id), cleanForFirestore(newItem));
      } catch (err) {
        console.warn('Failed to save marketplace item to Firestore:', err);
      }
    }
  };

  const sendGroupMessage = async (groupId: string, text: string) => {
    const targetChat = groupChats.find(c => c.groupId === groupId);
    if (!targetChat) return;

    const newMsg: Message = {
      id: `m_msg_${Date.now()}`,
      sender: user,
      content: text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedChat = {
      ...targetChat,
      messages: [...targetChat.messages, newMsg]
    };

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    setGroupChats(prev => prev.map(c => c.groupId === groupId ? updatedChat : c));

    // --- FIREBASE WRITE WITH EXPLICIT TRY-CATCH ---
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'groupChats', groupId), cleanForFirestore(updatedChat));
      } catch (err) {
        console.warn('Failed to save group message to Firestore:', err);
      }
    }
  };

  const completeOnboarding = async (
    name: string,
    role: 'student' | 'tutor' | 'creator',
    institution: string,
    subjectWeights: AppSettings['subjectWeights']
  ) => {
    const nextUser: User = {
      ...user,
      name: name.trim() || user.name || 'Học viên StudyBook',
      role,
      institution,
      hasCompletedOnboarding: true
    };
    
    const nextSettings = {
      ...settings,
      subjectWeights
    };

    setSettings(nextSettings);
    
    // Save onboarding completed flag for current email to localStorage
    const currentEmail = localStorage.getItem('sb_current_email');
    if (currentEmail) {
      localStorage.setItem(`sb_onboarded_${currentEmail.toLowerCase()}`, 'true');
    }
    
    // Write to localStorage first to guarantee completion status is saved locally immediately
    localStorage.setItem('sb_user', JSON.stringify(nextUser));
    localStorage.setItem('sb_settings', JSON.stringify(nextSettings));
    
    // Also update in local users list if present
    const localUsersStr = localStorage.getItem('sb_local_users');
    if (localUsersStr) {
      try {
        const localUsers = JSON.parse(localUsersStr);
        const updatedUsers = localUsers.map((u: any) => {
          if (u.user.id === nextUser.id) {
            return { ...u, user: nextUser };
          }
          return u;
        });
        localStorage.setItem('sb_local_users', JSON.stringify(updatedUsers));
      } catch (err) {
        console.error('Failed to update local users list:', err);
      }
    }
    
    // Instantly transition local state to prevent UI freeze
    setUser(nextUser);

    if (isFirebaseConfigured) {
      // Async background write so that firestore latency or retry hangs do not block the user interface
      setDoc(doc(db, 'users', nextUser.id), cleanForFirestore(nextUser)).catch(err => {
        console.error('Failed to sync onboarding to Firestore in background:', err);
      });
    }
  };

  const exportResume = () => {
    const savedCount = posts.filter(p => p.isSaved).length;
    const contributedPosts = posts.filter(p => p.user.id === user.id && !p.isAnonymous).length;
    
    const content = `
========================================
   STUDYBOOK ACADEMIC PROFILE PORTFOLIO
========================================
Học viên: ${user.name}
Chuỗi ngày học tập (Streak): ${user.streak} ngày
Xếp hạng danh hiệu: ${user.streakLevel.toUpperCase()}
Danh hiệu đạt được: ${user.badges.join(', ') || 'Chưa có'}

HOẠT ĐỘNG TRÊN NỀN TẢNG:
----------------------------------------
- Tài liệu học tập đã lưu: ${savedCount} tài liệu
- Bài viết học thuật đóng góp: ${contributedPosts} bài viết
- Số lượt upvote nhận được (Tương đương điểm hữu ích): ${posts.filter(p => p.user.id === user.id).reduce((acc, curr) => acc + curr.reactions.helpful + curr.reactions.insightful, 0)} points

MÔN HỌC QUAN TÂM (Subjects of Interest):
${settings.subjectWeights.Math > 0 ? '- Toán Học\n' : ''}${settings.subjectWeights.Physics > 0 ? '- Vật Lý\n' : ''}${settings.subjectWeights.English > 0 ? '- Tiếng Anh\n' : ''}${settings.subjectWeights.Chemistry > 0 ? '- Hóa Học\n' : ''}

StudyBook - Mạng xã hội học tập dẫn đầu Việt Nam.
Báo cáo được trích xuất tự động vào ngày ${new Date().toLocaleDateString('vi-VN')}.
    `;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StudyBook_Academic_Resume_${user.name.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const speakText = (text: string) => {
    try {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        typeof window.SpeechSynthesisUtterance === 'undefined'
      ) {
        alert('Trình duyệt hoặc môi trường iframe này không hỗ trợ tính năng Đọc Văn Bản (Text-to-Speech).');
        return;
      }
      
      const cleanText = text.replace(/[*#_`~]/g, '');
      let utterance: SpeechSynthesisUtterance | null = null;
      
      try {
        const UtteranceCtor = window.SpeechSynthesisUtterance;
        if (typeof UtteranceCtor === 'function') {
          utterance = new UtteranceCtor(cleanText);
        }
      } catch (e) {
        console.warn('SpeechSynthesisUtterance constructor unavailable or blocked in iframe sandbox:', e);
      }

      if (!utterance) {
        alert('Tính năng Đọc Văn Bản (Text-to-Speech) không hỗ trợ khởi tạo trong môi trường iframe hiện tại.');
        return;
      }

      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('speechSynthesis.cancel failed:', e);
      }

      const voices = (function() {
        try {
          return window.speechSynthesis.getVoices() || [];
        } catch (e) {
          return [];
        }
      })();

      const viVoice = voices.find(voice => voice.lang && (voice.lang.includes('vi') || voice.lang.includes('VI')));
      if (viVoice) {
        utterance.voice = viVoice;
      }
      
      utterance.rate = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('speechSynthesis.speak failed:', e);
        setIsSpeaking(false);
      }
    } catch (err) {
      console.warn('Speech synthesis outer error:', err);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (err) {
      console.warn('Stop speaking error:', err);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Helper to deduplicate requests so an account only has 1 request record
  const deduplicateRequests = (reqs: TutorRequest[]): TutorRequest[] => {
    const map = new Map<string, TutorRequest>();
    reqs.forEach(r => {
      const key = r.userId || r.userEmail || r.id;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, r);
      } else {
        const mergedLogs = [
          ...(existing.historyLogs || []),
          ...(r.historyLogs || [])
        ].filter((v, i, a) => a.findIndex(t => t.timestamp === v.timestamp && t.action === v.action) === i);

        // Keep the pending one or the latest one
        const winner = (r.status === 'pending' && existing.status !== 'pending') ? r : existing;
        map.set(key, {
          ...winner,
          historyLogs: mergedLogs.length > 0 ? mergedLogs : winner.historyLogs
        });
      }
    });
    return Array.from(map.values());
  };

  // Tutor Verification & Admin State
  const [tutorRequests, setTutorRequests] = useState<TutorRequest[]>(() => {
    try {
      const saved = localStorage.getItem('sb_tutor_requests');
      return saved ? deduplicateRequests(JSON.parse(saved)) : [];
    } catch (_) { return []; }
  });

  // Sync tutor requests from Firestore
  useEffect(() => {
    if (!isFirebaseConfigured) {
      try { localStorage.setItem('sb_tutor_requests', JSON.stringify(deduplicateRequests(tutorRequests))); } catch (_) {}
      return;
    }

    const unsubscribe = onSnapshot(collection(db, 'tutorRequests'), (snapshot) => {
      const loaded: TutorRequest[] = [];
      snapshot.forEach((d) => loaded.push({ id: d.id, ...d.data() } as TutorRequest));
      const deduplicated = deduplicateRequests(loaded);
      setTutorRequests(deduplicated);
      try { localStorage.setItem('sb_tutor_requests', JSON.stringify(deduplicated)); } catch (_) {}
    }, (err) => {
      console.warn('Firestore tutorRequests sync error:', err);
    });

    return () => unsubscribe();
  }, [isFirebaseConfigured]);

  const requestTutorVerification = async (details?: { realName?: string; school?: string; description?: string; requestedSubjects?: string[] }) => {
    const currentEmail = user.email || localStorage.getItem('sb_current_email') || auth.currentUser?.email || '';
    const isAdmin = user.role === 'admin' || currentEmail.toLowerCase() === 'billkute030709@gmail.com';

    const realName = details?.realName?.trim() || user.name;
    const school = details?.school?.trim() || user.institution || 'Không thuộc trường nào';
    const description = details?.description?.trim() || '';
    const requestedSubjects = details?.requestedSubjects || ['Math', 'Physics'];

    if (isAdmin) {
      const updatedUser: User = {
        ...user,
        role: 'tutor',
        badges: Array.from(new Set([...user.badges, 'Verified Tutor']))
      };
      setUser(updatedUser);
      localStorage.setItem('sb_user', JSON.stringify(updatedUser));
      return;
    }

    const reqId = `tr_${user.id}`;
    const nowStr = new Date().toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const existing = tutorRequests.find(r => r.userId === user.id || r.id === reqId || (currentEmail && r.userEmail === currentEmail));
    const newLog: RequestHistoryLog = {
      timestamp: nowStr,
      action: 'Nộp yêu cầu xác minh Gia sư',
      performedBy: user.name,
      details: `Họ tên: ${realName} | Trường: ${school} | Môn: ${requestedSubjects.join(', ')}`
    };

    const newReq: TutorRequest = {
      id: reqId,
      userId: user.id,
      userName: user.name,
      realName,
      school,
      description,
      userAvatar: user.avatar,
      userEmail: currentEmail,
      timestamp: nowStr,
      status: 'pending',
      requestedSubjects,
      historyLogs: existing?.historyLogs ? [newLog, ...existing.historyLogs] : [newLog]
    };

    setTutorRequests(prev => deduplicateRequests([newReq, ...prev.filter(r => r.userId !== user.id && r.id !== reqId && r.userEmail !== currentEmail)]));

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'tutorRequests', newReq.id), cleanForFirestore(newReq));
      } catch (err) {
        console.warn('Failed to save tutor request to Firestore:', err);
      }
    }
  };

  const approveTutorRequest = async (requestId: string) => {
    const req = tutorRequests.find(r => r.id === requestId || r.userId === requestId);
    if (!req) return;
    const nowStr = new Date().toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const updatedLogs: RequestHistoryLog[] = [
      { timestamp: nowStr, action: 'Cấp quyền & Duyệt Gia Sư', performedBy: 'Admin (Quản trị viên)' },
      ...(req.historyLogs || [])
    ];

    setTutorRequests(prev => prev.map(r => (r.id === req.id || r.userId === req.userId) ? { ...r, status: 'approved', historyLogs: updatedLogs } : r));

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'tutorRequests', req.id), cleanForFirestore({ ...req, status: 'approved', historyLogs: updatedLogs }), { merge: true });
        const userRef = doc(db, 'users', req.userId);
        await setDoc(userRef, { 
          role: 'tutor', 
          name: req.realName || req.userName,
          institution: req.school || '',
          badges: arrayUnion('Verified Tutor') 
        }, { merge: true });
      } catch (err) {
        console.warn('Failed to approve tutor request in Firestore:', err);
      }
    }

    if (user.id === req.userId) {
      const updatedUser: User = { 
        ...user, 
        name: req.realName || user.name,
        institution: req.school || user.institution,
        role: 'tutor', 
        badges: Array.from(new Set([...user.badges, 'Verified Tutor'])) 
      };
      setUser(updatedUser);
      localStorage.setItem('sb_user', JSON.stringify(updatedUser));
    }

    setTutors(prev => {
      if (prev.some(t => t.id === req.userId)) {
        return prev.map(t => t.id === req.userId ? { ...t, name: req.realName || t.name, verified: true } : t);
      } else {
        const newTutor: TutorPage = {
          id: req.userId,
          name: req.realName || req.userName,
          avatar: req.userAvatar,
          bio: req.description || `Gia sư / Giáo viên thuộc trường ${req.school || 'Tự do'}. Chuyên môn: ${req.requestedSubjects?.join(', ') || 'Các môn học'}.`,
          coverPhoto: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=1200',
          subjects: req.requestedSubjects || ['Math', 'Physics'],
          verified: true,
          followers: 1,
          baseFollowers: 1,
          followedByUsers: [],
          reviews: []
        };
        return [newTutor, ...prev];
      }
    });
  };

  const rejectTutorRequest = async (requestId: string) => {
    const req = tutorRequests.find(r => r.id === requestId || r.userId === requestId);
    if (!req) return;
    const nowStr = new Date().toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const updatedLogs: RequestHistoryLog[] = [
      { timestamp: nowStr, action: 'Từ chối / Thu hồi quyền Gia Sư', performedBy: 'Admin (Quản trị viên)' },
      ...(req.historyLogs || [])
    ];

    setTutorRequests(prev => prev.map(r => (r.id === req.id || r.userId === req.userId) ? { ...r, status: 'rejected', historyLogs: updatedLogs } : r));

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'tutorRequests', req.id), cleanForFirestore({ ...req, status: 'rejected', historyLogs: updatedLogs }), { merge: true });
        const userRef = doc(db, 'users', req.userId);
        await setDoc(userRef, { 
          role: 'student',
          badges: arrayRemove('Verified Tutor') 
        }, { merge: true });
      } catch (err) {
        console.warn('Failed to reject tutor request in Firestore:', err);
      }
    }

    if (user.id === req.userId && user.role !== 'admin') {
      const updatedUser: User = { 
        ...user, 
        role: 'student', 
        badges: user.badges.filter(b => b !== 'Verified Tutor')
      };
      setUser(updatedUser);
      localStorage.setItem('sb_user', JSON.stringify(updatedUser));
    }
  };

  const deleteTutorRequest = async (requestId: string) => {
    const req = tutorRequests.find(r => r.id === requestId || r.userId === requestId);
    if (!req) return;

    setTutorRequests(prev => prev.filter(r => r.id !== req.id && r.userId !== req.userId));

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'tutorRequests', req.id));
      } catch (err) {
        console.warn('Failed to delete tutor request in Firestore:', err);
      }
    }
  };

  const verifyUserAsTutor = async (userId: string) => {
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', userId), { role: 'tutor', badges: arrayUnion('Verified Tutor') }, { merge: true });
      } catch (e) {
        console.warn('Failed to verify user as tutor in Firestore:', e);
      }
    }
    setTutors(prev => prev.map(t => t.id === userId ? { ...t, verified: true } : t));
    if (user.id === userId) {
      const updatedUser: User = { ...user, role: 'tutor', badges: Array.from(new Set([...user.badges, 'Verified Tutor'])) };
      setUser(updatedUser);
      localStorage.setItem('sb_user', JSON.stringify(updatedUser));
    }
    alert(`Đã xác minh người dùng làm Gia sư thành công!`);
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      user,
      setUser,
      posts,
      setPosts,
      groups,
      setGroups,
      tutors,
      setTutors,
      reels,
      setReels,
      marketplace,
      setMarketplace,
      groupChats,
      setGroupChats,
      settings,
      setSettings,
      
      tutorRequests,
      requestTutorVerification,
      approveTutorRequest,
      rejectTutorRequest,
      deleteTutorRequest,
      verifyUserAsTutor,

      folders,
      addFolder,
      activeFolderId,
      setActiveFolderId,
      
      addPost,
      deletePost,
      reactToPost,
      addComment,
      deleteComment,
      markHelpfulComment,
      savePostToLibrary,
      toggleFollowTutor,
      addTutorReview,
      toggleEventGoing,
      toggleReelLike,
      createStudyGroup,
      addMarketplaceItem,
      sendGroupMessage,
      exportResume,
      speakText,
      stopSpeaking,
      isSpeaking,
      
      completeOnboarding,

      isFirebaseConnected,
      isFirebaseLoading,
      signIn,
      signUp,
      signInWithGoogle,
      logout,
      isOfflineBypass,
      setIsOfflineBypass,
      isLocalLoggedIn,
      openChatIds,
      openChatWindow,
      closeChatWindow
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
