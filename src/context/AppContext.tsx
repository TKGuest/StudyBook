import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Post, StudyGroup, GroupRole, GroupMember, GroupFile, TutorPage, Reel, MarketplaceItem, GroupChat, AppSettings, AcademicReactionType, Comment, Message, BinderFolder, TutorRequest, RequestHistoryLog, Friend, FriendRequest, DirectMessage, DirectChat, BlockedUser, CreatorScore, GroupSettings, GroupJoinRequest, GlobalAlgorithmConfig, DEFAULT_GLOBAL_ALGORITHM_CONFIG, ActiveChatNotification, ConfirmModalOptions } from '../types';
import { currentUser, initialPosts, initialGroups, initialTutors, initialReels, initialMarketplaceItems, initialGroupChats, defaultSettings, SILHOUETTE_AVATAR, initialFriends, initialFriendRequests, initialDirectChats, initialCommunityUsers } from '../data/mockData';
import { ALGORITHM_CONFIG } from '../utils/feedAlgorithm';
import { playSound } from '../utils/soundEffects';
import { isPlaceholderBinhChat, consolidateDirectChats, isFakeOrBotTutor, isFakeMarketplaceItem } from '../utils/chatUtils';
import { 
  canUserRemoveSpam, 
  canUserManageMembers, 
  canUserPinFiles, 
  canUserAssignLeader,
  canUserAssignModerator, 
  getUserGroupRole,
  canUserPostInGroup,
  checkUserCanPostInGroup,
  canUserChatInGroup,
  checkUserCanChatInGroup,
  canUserJoinFreely,
  doesUserPostRequireApproval,
  validateAdminLeaveGuardrail,
  canUserDeleteGroup,
  canUserModifySettings,
  canUserReviewJoinRequests,
  canUserApprovePosts,
  canUserDeleteReel,
  interceptMarketplacePrivacySettings,
  canUserDeleteMarketplaceItem,
  isUserListingSeller
} from '../utils/permissionUtils';
import {
  extractPostIdFromUrl,
  pushPostUrl,
  pushHomeUrl
} from '../utils/urlRouter';
import { generateUniquePostId } from '../utils/postFactory';
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
  getDocs,
  setDoc, 
  updateDoc,
  deleteDoc,
  deleteField,
  collection, 
  onSnapshot, 
  query,
  where,
  writeBatch,
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
  setUserGrade: (grade: string) => Promise<void>;
  addPost: (
    content: string, 
    subject: string, 
    attachmentType?: 'pdf'|'doc'|'link'|'youtube'|'image'|'video'|'file', 
    attachmentTitle?: string, 
    isAnonymous?: boolean, 
    attachmentUrl?: string, 
    grade?: string,
    groupInfo?: { groupId: string; groupName: string; groupAvatar?: string },
    attachmentSize?: string,
    attachmentCdnUrl?: string,
    attachmentUuid?: string
  ) => Promise<string | undefined>;
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
  addReel: (reelData: Partial<Reel> & { videoUrl: string; caption: string; subject: string }) => Promise<Reel>;
  deleteReel: (reelId: string) => Promise<void>;
  createStudyGroup: (name: string, description?: string, category?: string) => Promise<string>;
  
  // Group Roles & Governance
  togglePinGroupFile: (groupId: string, fileId: string) => Promise<void>;
  deleteGroupFile: (groupId: string, fileId: string) => Promise<void>;
  updateGroupMemberRole: (groupId: string, memberId: string, newRole: GroupRole) => Promise<void>;
  removeGroupMember: (groupId: string, memberId: string) => Promise<void>;
  transferAdminOwnership: (groupId: string, newAdminId: string) => Promise<{ success: boolean; message?: string }>;
  leaveStudyGroup: (groupId: string) => Promise<{ success: boolean; message?: string }>;
  deleteStudyGroup: (groupId: string) => Promise<{ success: boolean; message?: string }>;
  updateGroupSettings: (groupId: string, newSettings: Partial<GroupSettings>) => Promise<void>;
  updateGroupDetails: (groupId: string, updates: { name?: string; description?: string; coverImage?: string }) => Promise<{ success: boolean; message?: string }>;
  requestJoinGroup: (groupId: string) => Promise<{ status: 'joined' | 'pending'; message: string }>;
  approveJoinRequest: (groupId: string, requestId: string) => Promise<void>;
  rejectJoinRequest: (groupId: string, requestId: string) => Promise<void>;
  approvePendingPost: (postId: string) => Promise<void>;
  rejectPendingPost: (postId: string) => Promise<void>;

  // Single Post URL Routing
  selectedPostId: string | null;
  openSinglePost: (postId: string) => void;
  closeSinglePost: () => void;

  // Custom GUI Confirm Modal
  confirmModal: ConfirmModalOptions | null;
  showConfirmModal: (options: ConfirmModalOptions) => void;
  closeConfirmModal: () => void;

  addMarketplaceItem: (item: Omit<MarketplaceItem, 'id' | 'seller' | 'distance'>) => void;
  deleteMarketplaceItem: (itemId: string) => Promise<void>;
  sendGroupMessage: (groupId: string, text: string) => void;
  exportResume: () => void;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  isUserVerifiedTutor: (author?: Partial<User> | null, authorId?: string) => boolean;
  
  // Tutor Verification & Admin
  tutorRequests: TutorRequest[];
  requestTutorVerification: (details?: { realName?: string; school?: string; description?: string; requestedSubjects?: string[] }) => Promise<void>;
  approveTutorRequest: (requestId: string) => Promise<void>;
  rejectTutorRequest: (requestId: string) => Promise<void>;
  deleteTutorRequest: (requestId: string) => Promise<void>;
  verifyUserAsTutor: (userId: string) => Promise<void>;

  // Focus Mode State
  completeOnboarding: (name: string, role: 'student' | 'tutor' | 'creator', institution: string, subjectWeights: AppSettings['subjectWeights'], grade?: string) => Promise<void>;

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

  // Friending & Direct Messaging across accounts
  friends: Friend[];
  friendRequests: FriendRequest[];
  directChats: DirectChat[];
  sendFriendRequest: (targetUser: { id: string; name: string; avatar: string; email?: string; role?: string; institution?: string }) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  getFriendshipStatus: (targetUserId: string) => 'none' | 'pending_sent' | 'pending_received' | 'friends';

  openDirectChat: (
    targetUser: { id: string; name: string; avatar: string; email?: string; role?: string; allowDMsFromStrangers?: boolean },
    initialMessage?: string,
    isMarketplaceInquiry?: boolean
  ) => void;
  sendDirectMessage: (chatId: string, content: string) => Promise<void>;
  closeDirectChat: (chatId: string) => void;
  openDirectChatIds: string[];

  // Pinning feature (up to 10 friends/groups)
  pinnedChatIds: string[];
  togglePinChat: (chatId: string, alternateId?: string) => { success: boolean; isPinned: boolean; message?: string };
  isChatPinned: (chatId: string, alternateId?: string) => boolean;

  // Blocking & Privacy Management
  blockedUsers: BlockedUser[];
  isUserBlocked: (userId?: string) => boolean;
  blockUser: (targetId: string, targetName: string, targetAvatar?: string) => Promise<void>;
  unblockUser: (targetId: string) => Promise<void>;
  isBlockedByAuthor: (authorId?: string, postAuthorBlockedIds?: string[]) => boolean;
  isBlockedMutual: (targetUserId?: string) => boolean;

  // Community User Profiles (Facebook Style)
  communityUsers: User[];
  setCommunityUsers: React.Dispatch<React.SetStateAction<User[]>>;
  viewingProfileUserId: string | null;
  setViewingProfileUserId: (userId: string | null) => void;
  openUserProfile: (userId: string) => void;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;

  // Following & Creator Points
  followingIds: string[];
  creatorScores: Record<string, CreatorScore>;
  toggleFollowUser: (targetUserId: string) => Promise<{ success: boolean; message?: string }>;
  toggleFollow: (targetUserId: string) => Promise<{ success: boolean; message?: string }>;
  recordCreatorInteraction: (creatorId?: string, type?: 'like' | 'comment' | 'save') => void;

  // Group Cohort Membership & Interaction Tracking
  joinedGroupIds: string[];
  groupInteractions: Record<string, {
    score: number;
    lastInteractionTimestamp?: string;
    messagesSent?: number;
    postsCreated?: number;
    filesContributed?: number;
    reactionsCount?: number;
  }>;
  recordGroupInteraction: (groupId: string, actionType: 'join' | 'message' | 'post' | 'file' | 'reaction') => void;
  toggleJoinGroup: (groupId: string) => void;

  // Global Algorithm Configuration (Customizable strictly by billkute030709@gmail.com)
  globalAlgorithmConfig: GlobalAlgorithmConfig;
  updateGlobalAlgorithmConfig: (config: Partial<GlobalAlgorithmConfig>) => Promise<{ success: boolean; message?: string }>;

  // Messenger Group Chat creation (with friends only)
  createGroupChat: (groupName: string, friendIds: string[]) => Promise<DirectChat | null>;

  // Real-Time Chat Notification System & Unread Tracking
  chatNotificationPrefs: Record<string, boolean>;
  toggleChatNotifications: (targetId: string) => boolean;
  areChatNotificationsEnabled: (targetId: string) => boolean;
  activeChatNotifications: Record<string, ActiveChatNotification>;
  dismissChatNotification: (chatId: string) => void;
  activeOpenChatId: string | null;
  setActiveOpenChatId: (chatId: string | null) => void;
  markChatAsRead: (chatId: string) => void;
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
  const resolvedPostId = p.postId || p.id || generateUniquePostId(p.groupId ? 'gpost' : 'post');

  return {
    ...p,
    id: p.id || resolvedPostId,
    postId: resolvedPostId,
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

const BOT_MEMBER_IDS = new Set(['u_elena', 'u_marcus', 'u_maya', 'u_liam']);

const normalizeGroupForUser = (g: StudyGroup, userOrId?: User | string | null): StudyGroup => {
  const currentUserId = typeof userOrId === 'string' ? userOrId : (userOrId?.id || 'u_current');
  const userObj = typeof userOrId === 'object' && userOrId ? userOrId : null;
  const currentUserName = userObj?.name || (userObj?.email ? userObj.email.split('@')[0] : 'Bill Kute');
  const currentUserAvatar = userObj?.avatar || SILHOUETTE_AVATAR;
  const isGlobalAdmin = Boolean(userObj && (userObj.role === 'admin' || userObj.email?.toLowerCase() === 'billkute030709@gmail.com'));
  const isAuthenticatedUser = currentUserId !== 'guest' && currentUserId !== 'u_current';

  // Normalize member lists & migrate old 'u_current' references
  let memberUserIds: string[] = Array.isArray(g.memberUserIds) ? [...g.memberUserIds] : [];
  let adminUserIds: string[] = Array.isArray(g.adminUserIds) ? [...g.adminUserIds] : [];
  let leaderUserIds: string[] = Array.isArray(g.leaderUserIds) ? [...g.leaderUserIds] : [];
  const memberRoles: Record<string, GroupRole> = { ...(g.memberRoles || {}) };

  // Migrate 'u_current' to real user id if different
  if (currentUserId && currentUserId !== 'u_current') {
    if (adminUserIds.includes('u_current')) {
      adminUserIds = adminUserIds.filter(id => id !== 'u_current');
      if (!adminUserIds.includes(currentUserId)) adminUserIds.push(currentUserId);
    }
    if (memberUserIds.includes('u_current')) {
      memberUserIds = memberUserIds.filter(id => id !== 'u_current');
      if (!memberUserIds.includes(currentUserId)) memberUserIds.push(currentUserId);
    }
    if (leaderUserIds.includes('u_current')) {
      leaderUserIds = leaderUserIds.filter(id => id !== 'u_current');
    }
    if (memberRoles['u_current']) {
      memberRoles[currentUserId] = memberRoles['u_current'];
      delete memberRoles['u_current'];
    }
  }

  let creatorId = g.creatorId;
  if (!creatorId && adminUserIds.length > 0) {
    creatorId = adminUserIds[0];
  }

  const isUserAdminOfGroup = Boolean(
    (creatorId && creatorId === currentUserId) ||
    adminUserIds.includes(currentUserId)
  );

  if (isUserAdminOfGroup) {
    if (!adminUserIds.includes(currentUserId)) adminUserIds = [currentUserId, ...adminUserIds.filter(id => id !== currentUserId)];
    if (!memberUserIds.includes(currentUserId)) memberUserIds.push(currentUserId);
    memberRoles[currentUserId] = 'admin';
  }

  // Make sure admin and leader ids are in memberUserIds
  adminUserIds.forEach(id => {
    if (!memberUserIds.includes(id)) memberUserIds.push(id);
    if (!memberRoles[id]) memberRoles[id] = 'admin';
  });
  leaderUserIds.forEach(id => {
    if (!memberUserIds.includes(id)) memberUserIds.push(id);
    if (!memberRoles[id]) memberRoles[id] = 'moderator';
  });

  const isMember = Boolean(
    isUserAdminOfGroup ||
    memberUserIds.includes(currentUserId) ||
    (Array.isArray(g.members) && g.members.some(m => m.id === currentUserId))
  );

  let members: GroupMember[] = Array.isArray(g.members) ? [...g.members] : [];

  // Migrate members array 'u_current' or match existing current user
  members = members.map(m => {
    if (m.id === 'u_current' || m.id === currentUserId) {
      return {
        ...m,
        id: currentUserId,
        name: currentUserName,
        avatar: currentUserAvatar,
        role: isUserAdminOfGroup ? 'admin' : (memberRoles[currentUserId] || m.role || 'member')
      };
    }
    return m;
  });

  // Ensure current user is in members list only if actually a member
  if (isMember && !members.some(m => m.id === currentUserId)) {
    members.unshift({
      id: currentUserId,
      name: currentUserName,
      avatar: currentUserAvatar,
      role: isUserAdminOfGroup ? 'admin' : (memberRoles[currentUserId] || 'member'),
      grade: userObj?.grade || 'Grade 10',
      joinedAt: 'Recently'
    });
  } else if (!isMember) {
    // If not a member, ensure they are NOT in members list or memberUserIds
    members = members.filter(m => m.id !== currentUserId && m.id !== 'u_current');
    memberUserIds = memberUserIds.filter(id => id !== currentUserId && id !== 'u_current');
    adminUserIds = adminUserIds.filter(id => id !== currentUserId && id !== 'u_current');
    leaderUserIds = leaderUserIds.filter(id => id !== currentUserId && id !== 'u_current');
  }

  // Look up known users to resolve names and avatars for other members
  let localUsersMap: Record<string, any> = {};
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const parsedLocal = JSON.parse(localStorage.getItem('sb_local_users') || '[]');
      if (Array.isArray(parsedLocal)) {
        parsedLocal.forEach((u: any) => { if (u?.id) localUsersMap[u.id] = u; });
      }
      const parsedComm = JSON.parse(localStorage.getItem('sb_community_users') || '[]');
      if (Array.isArray(parsedComm)) {
        parsedComm.forEach((u: any) => { if (u?.id) localUsersMap[u.id] = u; });
      }
    } catch (_) {}
  }

  // Ensure every member ID in memberUserIds has an entry in members array
  memberUserIds.forEach(mId => {
    if (!members.some(m => m.id === mId)) {
      const assignedRole = memberRoles[mId] || (adminUserIds.includes(mId) ? 'admin' : leaderUserIds.includes(mId) ? 'moderator' : 'member');
      const knownUser = localUsersMap[mId];
      members.push({
        id: mId,
        name: mId === currentUserId ? currentUserName : (knownUser?.name || `Student (${mId.slice(0, 6)})`),
        avatar: mId === currentUserId ? currentUserAvatar : (knownUser?.avatar || SILHOUETTE_AVATAR),
        role: assignedRole,
        grade: knownUser?.grade || 'Grade 10',
        joinedAt: 'Recently'
      });
    }
  });

  // Filter out any fake bot cohort members
  members = members.filter(m => !BOT_MEMBER_IDS.has(m.id));
  memberUserIds = memberUserIds.filter(id => !BOT_MEMBER_IDS.has(id));
  adminUserIds = adminUserIds.filter(id => !BOT_MEMBER_IDS.has(id));
  leaderUserIds = leaderUserIds.filter(id => !BOT_MEMBER_IDS.has(id));

  // Normalize roles on existing members - strictly ensure ONLY 1 admin and remove any founder text
  let hasAdminAssigned = false;
  members = members.map(m => {
    const roleFromMap = memberRoles[m.id];
    let role = (roleFromMap === 'leader' ? 'moderator' : roleFromMap) || m.role || 'member';
    if (role === 'admin') {
      if (!hasAdminAssigned && adminUserIds.includes(m.id)) {
        hasAdminAssigned = true;
      } else {
        role = 'moderator';
        if (memberRoles[m.id] === 'admin') memberRoles[m.id] = 'moderator';
      }
    }
    let joinedAt = m.joinedAt;
    if (joinedAt && joinedAt.toLowerCase().includes('founder')) {
      joinedAt = 'Recently';
    }
    return { ...m, role, joinedAt };
  });

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

  const totalMemberCount = Math.max(members.length, memberUserIds.length);

  return {
    ...g,
    creatorId,
    isMember,
    members,
    memberUserIds,
    adminUserIds,
    leaderUserIds,
    memberRoles,
    memberCount: totalMemberCount,
    membersCount: totalMemberCount,
    files: g.files || [],
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

  // Single Post URL Routing State
  const [selectedPostId, setSelectedPostId] = useState<string | null>(() => {
    return extractPostIdFromUrl();
  });

  useEffect(() => {
    const handlePopState = () => {
      const postId = extractPostIdFromUrl();
      setSelectedPostId(postId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openSinglePost = useCallback((postId: string) => {
    setSelectedPostId(postId);
    pushPostUrl(postId);
  }, []);

  const closeSinglePost = useCallback(() => {
    setSelectedPostId(null);
    pushHomeUrl();
  }, []);

  // Custom GUI Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<ConfirmModalOptions | null>(null);
  const showConfirmModal = useCallback((options: ConfirmModalOptions) => {
    setConfirmModal(options);
  }, []);
  const closeConfirmModal = useCallback(() => {
    setConfirmModal(null);
  }, []);

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
    if (typeof window !== 'undefined' && window.localStorage) {
      if (!localStorage.getItem('sb_v5_marketplace_clean')) {
        const savedM = localStorage.getItem('sb_marketplace');
        if (savedM) {
          try {
            const parsed = JSON.parse(savedM);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter(m => !isFakeMarketplaceItem(m));
              localStorage.setItem('sb_marketplace', JSON.stringify(cleaned));
            }
          } catch (_) {}
        }
        localStorage.setItem('sb_v5_marketplace_clean', 'true');
      }

      if (!localStorage.getItem('sb_v4_clean')) {
        localStorage.removeItem('sb_posts');
        localStorage.removeItem('sb_groups');
        localStorage.removeItem('sb_tutors');
        localStorage.removeItem('sb_reels');
        localStorage.removeItem('sb_marketplace');
        localStorage.removeItem('sb_group_chats');
        localStorage.setItem('sb_v4_clean', 'true');
      }
    }
  } catch (_) {}

  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem('sb_posts');
      const parsed = saved ? JSON.parse(saved) : null;
      return (Array.isArray(parsed) && parsed.length > 0) ? parsed : initialPosts;
    } catch (_) { return initialPosts; }
  });

  const [groups, setGroups] = useState<StudyGroup[]>(() => {
    try {
      const saved = localStorage.getItem('sb_groups');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(g => g.id !== 'g_1788665354922' && g.id !== 'g_english_ielts');
        }
      }
      return [];
    } catch (_) { return []; }
  });

  const [tutors, setTutors] = useState<TutorPage[]>(() => {
    try {
      const saved = localStorage.getItem('sb_tutors');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(t => !isFakeOrBotTutor(t));
          try { localStorage.setItem('sb_tutors', JSON.stringify(valid)); } catch (_) {}
          return valid;
        }
      }
      return initialTutors.filter(t => !isFakeOrBotTutor(t));
    } catch (_) { return []; }
  });

  const [reels, setReels] = useState<Reel[]>(() => {
    try {
      const saved = localStorage.getItem('sb_reels');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch (_) { return []; }
  });

  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>(() => {
    try {
      const saved = localStorage.getItem('sb_marketplace');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(m => !isFakeMarketplaceItem(m));
        }
      }
      return initialMarketplaceItems.filter(m => !isFakeMarketplaceItem(m));
    } catch (_) { return []; }
  });

  const cleanGroupChatMessages = (messages: any[]): any[] => {
    return (messages || []).filter(m => {
      const sId = String(m?.sender?.id || '').toLowerCase();
      const sName = String(m?.sender?.name || '').toLowerCase();
      if (sId === 'system' || sId === 'bot' || sId === 'admin') return false;
      if (sName.includes('ban quản lý') || sName.includes('studybook') || sName.includes('bot') || sName.includes('mai lan') || sName.includes('lucas')) return false;
      return true;
    });
  };

  const [groupChats, setGroupChats] = useState<GroupChat[]>(() => {
    try {
      const saved = localStorage.getItem('sb_group_chats');
      const loaded: GroupChat[] = saved ? JSON.parse(saved) : [];
      const filtered = (loaded || []).filter(c => c.groupId !== 'g_1788665354922' && c.groupId !== 'g_english_ielts');
      return filtered.map(c => ({
        ...c,
        messages: cleanGroupChatMessages(c.messages)
      }));
    } catch (_) { return []; }
  });

  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sb_joined_groups');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(id => id !== 'g_1788665354922' && id !== 'g_english_ielts');
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  });

  const [groupInteractions, setGroupInteractions] = useState<Record<string, {
    score: number;
    lastInteractionTimestamp?: string;
    messagesSent?: number;
    postsCreated?: number;
    filesContributed?: number;
    reactionsCount?: number;
  }>>(() => {
    try {
      const saved = localStorage.getItem('sb_group_interactions');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sb_joined_groups', JSON.stringify(joinedGroupIds));
    } catch (_) {}
  }, [joinedGroupIds]);

  useEffect(() => {
    try {
      localStorage.setItem('sb_group_interactions', JSON.stringify(groupInteractions));
    } catch (_) {}
  }, [groupInteractions]);

  const recordGroupInteraction = (
    groupId: string,
    actionType: 'join' | 'message' | 'post' | 'file' | 'reaction'
  ) => {
    if (!groupId) return;
    const now = new Date().toISOString();
    const pointValues: Record<string, number> = {
      join: 15,
      message: 6,
      post: 20,
      file: 12,
      reaction: 5
    };
    const pts = pointValues[actionType] || 5;

    // Auto join group only when explicitly joining
    if (actionType === 'join') {
      setJoinedGroupIds(prev => prev.includes(groupId) ? prev : [...prev, groupId]);
    }

    setGroupInteractions(prev => {
      const current = prev[groupId] || {
        score: 0,
        messagesSent: 0,
        postsCreated: 0,
        filesContributed: 0,
        reactionsCount: 0
      };
      return {
        ...prev,
        [groupId]: {
          ...current,
          score: current.score + pts,
          lastInteractionTimestamp: now,
          messagesSent: (current.messagesSent || 0) + (actionType === 'message' ? 1 : 0),
          postsCreated: (current.postsCreated || 0) + (actionType === 'post' ? 1 : 0),
          filesContributed: (current.filesContributed || 0) + (actionType === 'file' ? 1 : 0),
          reactionsCount: (current.reactionsCount || 0) + (actionType === 'reaction' ? 1 : 0)
        }
      };
    });
  };

  const toggleJoinGroup = async (groupId: string) => {
    if (!groupId) return;
    const isCurrentlyJoined = joinedGroupIds.includes(groupId) || groups.some(g => g.id === groupId && (g.isMember || g.memberUserIds?.includes(user.id) || g.members?.some(m => m.id === user.id)));
    if (isCurrentlyJoined) {
      await leaveStudyGroup(groupId);
    } else {
      playSound('pop');
      recordGroupInteraction(groupId, 'join');
      setJoinedGroupIds(prev => Array.from(new Set([...prev, groupId])));
      setGroups(prev => {
        const next = prev.map(g => {
          if (g.id !== groupId) return g;
          const updatedMemberIds = Array.from(new Set([...(g.memberUserIds || []), user.id]));
          const currentMembers = Array.isArray(g.members) ? [...g.members] : [];
          if (!currentMembers.some(m => m.id === user.id)) {
            currentMembers.push({
              id: user.id,
              name: user.name || 'Student',
              avatar: user.avatar || SILHOUETTE_AVATAR,
              role: 'member',
              grade: user.grade || 'Grade 10',
              joinedAt: 'Recently'
            });
          }
          const updatedRoles = { ...(g.memberRoles || {}), [user.id]: 'member' as GroupRole };
          return {
            ...g,
            isMember: true,
            memberCount: Math.max(currentMembers.length, (g.memberCount || 0) + 1),
            membersCount: Math.max(currentMembers.length, (g.membersCount || 0) + 1),
            memberUserIds: updatedMemberIds,
            members: currentMembers,
            memberRoles: updatedRoles
          };
        });
        try { localStorage.setItem('sb_groups', JSON.stringify(next)); } catch (_) {}
        return next;
      });

      if (isFirebaseConfigured) {
        try {
          const groupRef = doc(db, 'groups', groupId);
          await updateDoc(groupRef, {
            memberUserIds: arrayUnion(user.id),
            [`memberRoles.${user.id}`]: 'member'
          });
        } catch (err) {
          console.warn('Failed to join group in Firestore:', err);
        }
      }
    }
  };

  const [friends, setFriends] = useState<Friend[]>(() => {
    try {
      const saved = localStorage.getItem('sb_friends');
      const loaded: Friend[] = saved ? JSON.parse(saved) : initialFriends;
      // Strip test friends and bots
      const cleaned = (loaded || []).filter(f => {
        const idLower = String(f.id || '').toLowerCase();
        const nameLower = String(f.name || '').toLowerCase();
        return (
          idLower !== 'tut_phunggiabinh' && 
          idLower !== 'std_sarah' && 
          idLower !== 'u_sarah' &&
          idLower !== 'u_david' &&
          idLower !== 'bot_4' &&
          idLower !== 'bot4' &&
          !idLower.includes('bot') &&
          !idLower.includes('ban_quan_ly') &&
          !nameLower.includes('sarah') &&
          !nameLower.includes('bot') &&
          !nameLower.includes('ban quản lý') &&
          !nameLower.includes('ban quan ly') &&
          !nameLower.includes('studybook') &&
          !nameLower.includes('mai lan') &&
          !nameLower.includes('lucas') &&
          !nameLower.includes('system') &&
          !nameLower.includes('david kim')
        );
      });
      return cleaned;
    } catch (_) { return initialFriends; }
  });

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(() => {
    try {
      const saved = localStorage.getItem('sb_friend_requests');
      const loaded: FriendRequest[] = saved ? JSON.parse(saved) : initialFriendRequests;
      const cleaned = (loaded || []).filter(r => {
        const idLower = String(r.senderId || '').toLowerCase();
        const nameLower = String(r.senderName || '').toLowerCase();
        return (
          idLower !== 'tut_phunggiabinh' && 
          idLower !== 'std_sarah' && 
          idLower !== 'u_sarah' &&
          idLower !== 'u_david' &&
          idLower !== 'bot_4' &&
          idLower !== 'bot4' &&
          !idLower.includes('bot') &&
          !idLower.includes('ban_quan_ly') &&
          !nameLower.includes('sarah') &&
          !nameLower.includes('bot') &&
          !nameLower.includes('ban quản lý') &&
          !nameLower.includes('ban quan ly') &&
          !nameLower.includes('studybook') &&
          !nameLower.includes('mai lan') &&
          !nameLower.includes('lucas') &&
          !nameLower.includes('system') &&
          !nameLower.includes('david kim')
        );
      });
      return cleaned;
    } catch (_) { return initialFriendRequests; }
  });

  const [directChats, setDirectChats] = useState<DirectChat[]>(() => {
    try {
      const saved = localStorage.getItem('sb_direct_chats');
      const loaded: DirectChat[] = saved ? JSON.parse(saved) : initialDirectChats;
      const consolidated = consolidateDirectChats(loaded || []);
      localStorage.setItem('sb_direct_chats', JSON.stringify(consolidated));
      return consolidated;
    } catch (_) { 
      return consolidateDirectChats(initialDirectChats); 
    }
  });

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>(() => {
    try {
      const saved = localStorage.getItem('sb_blocked_users');
      return saved ? JSON.parse(saved) : [];
    } catch (_) { return []; }
  });

  // Community user profiles (Facebook-style standard profiles)
  const [communityUsers, setCommunityUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('sb_community_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(u => 
            u.id !== 'u_marcus' && 
            u.id !== 'u_elena' && 
            u.id !== 'u_maya' && 
            u.id !== 'u_liam'
          );
          return cleaned;
        }
      }
    } catch (_) {}
    return [];
  });

  // Target user profile being viewed (or null)
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);

  // Following user IDs (creator boost)
  const [followingIds, setFollowingIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sb_following_ids');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return ['u_elena']; // default follow Prof. Elena
  });

  // Creator Interaction Points & timestamps with 24-hr inactivity decay tracking
  const [creatorScores, setCreatorScores] = useState<Record<string, CreatorScore>>(() => {
    try {
      const saved = localStorage.getItem('sb_creator_scores');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      u_elena: {
        creatorId: 'u_elena',
        score: 24, // High interaction points, recent (active < 24h)
        lastInteractionTimestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        interactions: { likes: 3, comments: 0, saves: 0 }
      },
      u_maya: {
        creatorId: 'u_maya',
        score: 35, // Inactive > 24 hours (28h ago) - will decay by 10 points
        lastInteractionTimestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
        interactions: { likes: 2, comments: 1, saves: 1 }
      }
    };
  });

  const [openDirectChatIds, setOpenDirectChatIds] = useState<string[]>([]);

  // Real-Time Chat Notification Preferences (Individual friends or groups)
  const [chatNotificationPrefs, setChatNotificationPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sb_chat_notif_prefs');
      return saved ? JSON.parse(saved) : {};
    } catch (_) { return {}; }
  });

  const areChatNotificationsEnabled = useCallback((targetId: string): boolean => {
    if (!targetId) return true;
    const pref = chatNotificationPrefs[targetId];
    return pref !== false; // Enabled by default unless explicitly toggled off
  }, [chatNotificationPrefs]);

  const toggleChatNotifications = useCallback((targetId: string): boolean => {
    if (!targetId) return true;
    const current = areChatNotificationsEnabled(targetId);
    const next = !current;
    setChatNotificationPrefs(prev => {
      const updated = { ...prev, [targetId]: next };
      try {
        localStorage.setItem('sb_chat_notif_prefs', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    playSound('toggle');
    return next;
  }, [areChatNotificationsEnabled]);

  // Active chat notification popups with dynamically updating counter
  const [activeChatNotifications, setActiveChatNotifications] = useState<Record<string, ActiveChatNotification>>({});
  const [activeOpenChatId, setActiveOpenChatId] = useState<string | null>(null);

  const dismissChatNotification = useCallback((chatId: string) => {
    setActiveChatNotifications(prev => {
      if (!prev[chatId]) return prev;
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
  }, []);

  const markChatAsRead = useCallback((chatId: string) => {
    if (!chatId) return;

    // Reset Condition: Clear this counter to 0 the exact moment the user opens that specific chat box
    setActiveChatNotifications(prev => {
      if (!prev[chatId]) return prev;
      const next = { ...prev };
      delete next[chatId];
      return next;
    });

    setDirectChats(prev => {
      let changed = false;
      const updated = prev.map(chat => {
        const isMatch = chat.id === chatId || 
          chat.participants.some(p => p.id === chatId || (chatId.includes(p.id) && p.id !== user.id));
        if (isMatch) {
          const hasUnread = chat.messages.some(m => m.read === false);
          if (hasUnread || (chat.unreadCount && chat.unreadCount > 0)) {
            changed = true;
            return {
              ...chat,
              unreadCount: 0,
              messages: chat.messages.map(m => ({ ...m, read: true }))
            };
          }
        }
        return chat;
      });

      if (changed) {
        try {
          localStorage.setItem('sb_direct_chats', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      }
      return prev;
    });
  }, [user.id]);

  // Central dispatch for incoming chat messages
  const handleIncomingChatMessage = useCallback((
    chatId: string,
    sender: { id: string; name: string; avatar: string },
    messageText: string,
    targetType: 'direct' | 'group' = 'direct'
  ) => {
    // Silent Suppression: If the user is already inside the open chat box when the message arrives, do not send any popup notification or trigger counts
    const isInsideChat = (activeOpenChatId === chatId) || openDirectChatIds.includes(chatId);
    if (isInsideChat) {
      // User is actively reading the conversation: silent suppression, no popup or sound
      return;
    }

    // Check if notifications are enabled for this specific friend or group
    const isEnabled = areChatNotificationsEnabled(chatId) && areChatNotificationsEnabled(sender.id);
    if (!isEnabled) {
      return;
    }

    // Trigger only ONE single initial notification popup that text-updates the counter dynamically (e.g., "A has sent you 3 messages")
    setActiveChatNotifications(prev => {
      const existing = prev[chatId];
      const newCount = existing ? existing.count + 1 : 1;
      return {
        ...prev,
        [chatId]: {
          id: chatId,
          chatId,
          senderId: sender.id,
          senderName: sender.name,
          senderAvatar: sender.avatar,
          targetType,
          count: newCount,
          latestMessage: messageText,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      };
    });

    // Sound Effect Trigger: If the app is open on screen, play a crisp "ting" audio sound effect when a message arrives from a notification-enabled friend
    playSound('ting');
  }, [activeOpenChatId, openDirectChatIds, areChatNotificationsEnabled]);

  // Pinned chat IDs (up to 10 friends/groups)
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sb_pinned_chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 10);
      }
      if (user?.pinnedChatIds && Array.isArray(user.pinnedChatIds)) {
        return user.pinnedChatIds.slice(0, 10);
      }
    } catch (_) {}
    return [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('sb_settings');
      return saved ? JSON.parse(saved) : defaultSettings;
    } catch (_) { return defaultSettings; }
  });

  // Global Algorithm Configuration state
  const [globalAlgorithmConfig, setGlobalAlgorithmConfig] = useState<GlobalAlgorithmConfig>(() => {
    try {
      const saved = localStorage.getItem('sb_global_algorithm_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_GLOBAL_ALGORITHM_CONFIG, ...parsed };
      }
    } catch (_) {}
    return DEFAULT_GLOBAL_ALGORITHM_CONFIG;
  });

  // Real-time synchronization for global algorithm configuration
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    try {
      const unsubscribe = onSnapshot(doc(db, 'globalConfig', 'algorithm'), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<GlobalAlgorithmConfig>;
          setGlobalAlgorithmConfig(prev => {
            const merged = { ...DEFAULT_GLOBAL_ALGORITHM_CONFIG, ...prev, ...data };
            try { localStorage.setItem('sb_global_algorithm_config', JSON.stringify(merged)); } catch (_) {}
            return merged;
          });
        }
      }, (err) => {
        console.warn('Snapshot listener on globalConfig/algorithm failed:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Error setting up algorithm config listener:', e);
    }
  }, []);

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
                name: firebaseUser.displayName || user.name || (isAdmin ? 'Bill Kute (Admin)' : 'StudyBook Student'),
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
          setUser({ ...currentUser, id: 'guest', name: 'Guest', hasCompletedOnboarding: false });
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
        setGroups([]);
        try { localStorage.setItem('sb_groups', JSON.stringify([])); } catch (_) {}
      } else {
        const loaded: StudyGroup[] = [];
        snapshot.forEach((d) => {
          const g = d.data() as StudyGroup;
          if (g.id !== 'g_1788665354922' && g.id !== 'g_english_ielts') {
            loaded.push(g);
          } else {
            deleteDoc(doc(db, 'groups', d.id)).catch(console.warn);
          }
        });
        const normalized = loaded.map(g => normalizeGroupForUser(g, user));
        setGroups(normalized);
        localStorage.setItem('sb_groups', JSON.stringify(loaded));
      }
    }, (error) => {
      console.warn('Firestore groups sync failed (falling back to local):', error);
      const saved = localStorage.getItem('sb_groups');
      if (saved) {
        try { 
          const loaded = JSON.parse(saved);
          if (Array.isArray(loaded)) {
            const filtered = loaded.filter((g: StudyGroup) => g.id !== 'g_1788665354922' && g.id !== 'g_english_ielts');
            setGroups(filtered.map((g: StudyGroup) => normalizeGroupForUser(g, user))); 
            return;
          }
        } catch (_) {}
      }
      setGroups([]);
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
        snapshot.forEach((d) => {
          const tutorData = d.data() as TutorPage;
          const fullTutor = { ...tutorData, id: tutorData.id || d.id };
          if (isFakeOrBotTutor(fullTutor)) {
            // Delete fake tutor from Firestore to permanently purge it
            deleteDoc(doc(db, 'tutors', d.id)).catch(() => {});
          } else {
            loaded.push(fullTutor);
          }
        });
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
          const filtered = Array.isArray(loaded) ? loaded.filter(t => !isFakeOrBotTutor(t)) : [];
          setTutors(filtered.map((t: TutorPage) => normalizeTutorForUser(t, user.id))); 
        } catch (_) { 
          setTutors(initialTutors.filter(t => !isFakeOrBotTutor(t)).map(t => normalizeTutorForUser(t, user.id))); 
        }
      } else {
        setTutors(initialTutors.filter(t => !isFakeOrBotTutor(t)).map(t => normalizeTutorForUser(t, user.id)));
      }
    });

    // D. Sync Reels
    const unsubscribeReels = onSnapshot(collection(db, 'reels'), async (snapshot) => {
      if (snapshot.empty) {
        // Prevent injecting fake placeholder clips or auto-generating background videos when repository is empty
        setReels([]);
        try { localStorage.setItem('sb_reels', JSON.stringify([])); } catch (_) {}
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
          if (Array.isArray(loaded)) {
            setReels(loaded.map((r: Reel) => normalizeReelForUser(r, user.id))); 
            return;
          }
        } catch (_) {}
      }
      setReels([]);
    });

    // E. Sync Marketplace
    const unsubscribeMarket = onSnapshot(collection(db, 'marketplace'), async (snapshot) => {
      if (snapshot.empty) {
        setMarketplace([]);
        try { localStorage.setItem('sb_marketplace', JSON.stringify([])); } catch (_) {}
      } else {
        const loaded: MarketplaceItem[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as MarketplaceItem;
          const fullItem = { ...item, id: d.id };
          if (isFakeMarketplaceItem(fullItem)) {
            // Remove fake placeholder directly from Firestore
            deleteDoc(doc(db, 'marketplace', d.id)).catch(console.warn);
          } else {
            loaded.push(item);
          }
        });
        setMarketplace(loaded);
        localStorage.setItem('sb_marketplace', JSON.stringify(loaded));
      }
    }, (error) => {
      console.warn('Firestore marketplace sync failed (falling back to local):', error);
      const saved = localStorage.getItem('sb_marketplace');
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          setMarketplace(Array.isArray(parsed) ? parsed.filter(m => !isFakeMarketplaceItem(m)) : []); 
        } catch (_) { 
          setMarketplace([]); 
        }
      } else {
        setMarketplace([]);
      }
    });

    // F. Sync Group Chats
    const unsubscribeChats = onSnapshot(collection(db, 'groupChats'), async (snapshot) => {
      if (snapshot.empty) {
        setGroupChats([]);
        try { localStorage.setItem('sb_group_chats', JSON.stringify([])); } catch (_) {}
      } else {
        const loaded: GroupChat[] = [];
        snapshot.forEach((d) => {
          const c = d.data() as GroupChat;
          if (c.groupId !== 'g_1788665354922' && c.groupId !== 'g_english_ielts') {
            loaded.push(c);
          } else {
            deleteDoc(doc(db, 'groupChats', d.id)).catch(console.warn);
          }
        });
        const cleanedChats = loaded.map(c => ({
          ...c,
          messages: cleanGroupChatMessages(c.messages)
        }));
        setGroupChats(cleanedChats);
        localStorage.setItem('sb_group_chats', JSON.stringify(cleanedChats));
      }
    }, (error) => {
      console.warn('Firestore groupChats sync failed (falling back to local):', error);
      const saved = localStorage.getItem('sb_group_chats');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((c: any) => c.groupId !== 'g_1788665354922' && c.groupId !== 'g_english_ielts');
            const cleaned = filtered.map((c: any) => ({
              ...c,
              messages: cleanGroupChatMessages(c.messages)
            }));
            setGroupChats(cleaned);
            return;
          }
        } catch (_) {}
      }
      setGroupChats([]);
    });

    // G. Sync Direct Chats across accounts with strict participant isolation
    const unsubscribeDirectChats = onSnapshot(collection(db, 'directChats'), async (snapshot) => {
      if (snapshot.empty) {
        setDirectChats([]);
        try { localStorage.setItem('sb_direct_chats', JSON.stringify([])); } catch (_) {}
      } else {
        const loaded: DirectChat[] = [];
        const curIdLower = (user.id || 'u_current').toLowerCase();
        const curEmailLower = (user.email || '').toLowerCase();

        snapshot.forEach((d) => {
          const data = d.data() as DirectChat;
          const withId = { ...data, id: d.id };
          if (isPlaceholderBinhChat(withId)) {
            // Delete Binh placeholder chat document immediately from Firestore
            deleteDoc(doc(db, 'directChats', d.id)).catch(() => {});
            return;
          }

          // Individual DM security check: current user must be one of the participants
          const isParticipant = Array.isArray(withId.participantIds)
            ? withId.participantIds.some(pid => pid.toLowerCase() === curIdLower || pid === 'u_current' || pid === 'guest')
            : (Array.isArray(withId.participants) && withId.participants.some(p => {
                const pId = String(p?.id || '').toLowerCase();
                const pEmail = String(p?.email || '').toLowerCase();
                return pId === curIdLower || (curEmailLower && pEmail === curEmailLower) || pId === 'u_current' || pId === 'guest';
              }));

          if (!withId.isGroupChat && !isParticipant && user.id && user.id !== 'guest' && user.id !== 'u_current') {
            // Private chat between two other users: do not load or leak!
            return;
          }

          loaded.push(withId);
        });

        // Consolidate duplicates by person identity and clean stale duplicate docs in Firestore
        const consolidated = consolidateDirectChats(
          loaded,
          user.id || 'u_current',
          user.name || '',
          (staleId) => {
            deleteDoc(doc(db, 'directChats', staleId)).catch(() => {});
          }
        );

        setDirectChats(consolidated);
        try { localStorage.setItem('sb_direct_chats', JSON.stringify(consolidated)); } catch (_) {}
      }
    }, (error) => {
      console.warn('Firestore directChats sync failed (falling back to local):', error);
      const saved = localStorage.getItem('sb_direct_chats');
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          setDirectChats(consolidateDirectChats(parsed, user.id || 'u_current', user.name || '')); 
        } catch (_) { 
          setDirectChats(consolidateDirectChats(initialDirectChats, user.id || 'u_current', user.name || '')); 
        }
      }
    });

    // H. Sync Friend Requests across accounts
    const unsubscribeFriendRequests = onSnapshot(collection(db, 'friendRequests'), async (snapshot) => {
      if (snapshot.empty) {
        for (const fr of initialFriendRequests) {
          try {
            await setDoc(doc(db, 'friendRequests', fr.id), cleanForFirestore(fr));
          } catch (e) {
            console.warn('Failed to seed friend request:', e);
          }
        }
      } else {
        const loaded: FriendRequest[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as FriendRequest));
        setFriendRequests(loaded);
        localStorage.setItem('sb_friend_requests', JSON.stringify(loaded));
      }
    }, (error) => {
      console.warn('Firestore friendRequests sync failed:', error);
    });

    // I. Sync Friends strictly isolated by authenticated user (Two-Way Mutual Friendship)
    const friendsQuery = query(collection(db, 'friends'), where('userId', '==', user.id || 'u_current'));
    const unsubscribeFriends = onSnapshot(friendsQuery, async (snapshot) => {
      const loaded: Friend[] = [];
      snapshot.forEach((d) => {
        const f = d.data() as any;
        if (f && (f.friendId || f.id) && f.userId === (user.id || 'u_current')) {
          const friendObj: Friend = {
            id: f.friendId || f.id,
            userId: f.userId,
            friendId: f.friendId || f.id,
            name: f.name || 'Friend',
            avatar: f.avatar || SILHOUETTE_AVATAR,
            email: f.email,
            role: f.role,
            grade: f.grade,
            institution: f.institution,
            bio: f.bio,
            addedAt: f.addedAt || 'Recently',
            isOnline: f.isOnline ?? true,
            lastActivityTime: f.lastActivityTime
          };
          if (friendObj.id !== user.id) {
            loaded.push(friendObj);
          }
        }
      });
      setFriends(loaded);
      try { localStorage.setItem('sb_friends', JSON.stringify(loaded)); } catch (_) {}
    }, (error) => {
      console.warn('Firestore friends sync failed (falling back to local):', error);
      const saved = localStorage.getItem('sb_friends');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setFriends(parsed.filter(f => f.id !== user.id));
            return;
          }
        } catch (_) {}
      }
      setFriends([]);
    });

    // J. Sync Community Users across accounts
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      if (!snapshot.empty) {
        const loadedUsers: User[] = [];
        snapshot.forEach((d) => {
          const uData = d.data() as User;
          if (uData && uData.id) {
            loadedUsers.push(uData);
          }
        });
        if (loadedUsers.length > 0) {
          setCommunityUsers(prev => {
            const map = new Map<string, User>();
            prev.forEach(u => map.set(u.id, u));
            loadedUsers.forEach(u => map.set(u.id, { ...map.get(u.id), ...u }));
            return Array.from(map.values());
          });
        }
      }
    }, (error) => {
      console.warn('Firestore users sync failed:', error);
    });

    return () => {
      unsubscribePosts();
      unsubscribeGroups();
      unsubscribeTutors();
      unsubscribeReels();
      unsubscribeMarket();
      unsubscribeChats();
      unsubscribeDirectChats();
      unsubscribeFriendRequests();
      unsubscribeFriends();
      unsubscribeUsers();
    };
  }, [isFirebaseConfigured, user.id]);

  // Re-normalize local posts, reels, tutors, and groups whenever active user changes
  useEffect(() => {
    setPosts(prev => prev.map(p => normalizePostForUser(p, user.id)));
    setReels(prev => prev.map(r => normalizeReelForUser(r, user.id)));
    setTutors(prev => prev.map(t => normalizeTutorForUser(t, user.id)));
    setGroups(prev => prev.map(g => normalizeGroupForUser(g, user)));
  }, [user]);

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
        throw new Error('Incorrect email or password, or account is not registered yet!');
      }
    }
  };

  const executeLocalSignUp = (email: string, pass: string, name: string, role: 'student' | 'tutor' | 'creator', institution: string) => {
    const isAdmin = email.toLowerCase() === 'billkute030709@gmail.com';
    const baseUser: User = {
      id: 'u_' + Date.now(),
      name: name.trim() || (isAdmin ? 'Bill Kute (Admin)' : 'StudyBook Student'),
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
      throw new Error('This email is already in use by another account!');
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
      name: isAdmin ? 'Bill Kute (Admin)' : 'StudyBook Student',
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
          name: name.trim() || (isAdmin ? 'Bill Kute (Admin)' : 'StudyBook Student'),
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
        provider.setCustomParameters({ prompt: 'select_account' });
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
      localStorage.removeItem('sb_friends');
      localStorage.removeItem('sb_friend_requests');
      localStorage.removeItem('sb_direct_chats');
    } catch (_) {}
    setFriends([]);
    setFriendRequests([]);
    setDirectChats([]);
    if (isFirebaseConfigured) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Firebase signOut error:', err);
      }
    }
    setUser({ ...currentUser, id: 'guest', name: 'Guest', hasCompletedOnboarding: false });
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
    setGroups(prev => prev.map(g => normalizeGroupForUser(g, user)));
    setTutors(prev => prev.map(t => normalizeTutorForUser(t, user.id)));
    setReels(prev => prev.map(r => normalizeReelForUser(r, user.id)));
  }, [user]);

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
  const setUserGrade = async (grade: string) => {
    const nextUser: User = { ...user, grade };
    setUser(nextUser);
    try {
      localStorage.setItem('sb_user', JSON.stringify(nextUser));
    } catch (_) {}
    if (isFirebaseConfigured && nextUser.id) {
      try {
        await updateDoc(doc(db, 'users', nextUser.id), { grade });
      } catch (err) {
        console.warn('Could not update grade in Firestore:', err);
      }
    }
  };

  const addPost = async (
    content: string, 
    subject: string, 
    attachmentType?: 'pdf'|'doc'|'link'|'youtube'|'image'|'video'|'file', 
    attachmentTitle?: string,
    isAnonymous?: boolean,
    attachmentUrl?: string,
    grade?: string,
    groupInfo?: { groupId: string; groupName: string; groupAvatar?: string },
    attachmentSize?: string,
    attachmentCdnUrl?: string,
    attachmentUuid?: string
  ): Promise<string | undefined> => {
    const currentUserId = user.id || auth.currentUser?.uid || 'guest';
    const authorName = isAnonymous ? 'Anonymous Scholar' : (user.name || 'User');
    const postGrade = grade || user.grade || 'Grade 10';

    const authorUser: User = isAnonymous ? {
      id: currentUserId,
      name: authorName,
      avatar: SILHOUETTE_AVATAR,
      role: 'student',
      grade: postGrade,
      streak: 0,
      streakLevel: 'none',
      badges: []
    } : user;

    // Permission & Post Approval Verification for Group Posts
    let postStatus: 'published' | 'pending' = 'published';
    const isGroup = !!groupInfo?.groupId;
    if (isGroup && groupInfo?.groupId) {
      const targetGroup = groups.find(g => g.id === groupInfo.groupId);
      if (targetGroup) {
        const authCheck = checkUserCanPostInGroup(targetGroup, user);
        if (!authCheck.allowed) {
          alert(authCheck.reason || 'Posting in this study group is restricted to Admins and Group Leaders.');
          return undefined;
        }
        if (authCheck.requiresApproval) {
          postStatus = 'pending';
        }
      }
    }

    // Generate unique random post identifier the exact moment it is created
    const uniquePostId = generateUniquePostId(isGroup ? 'gpost' : 'post');

    const newPostData = {
      id: uniquePostId,
      postId: uniquePostId,
      content,
      subject,
      grade: postGrade,
      authorId: currentUserId,
      authorName,
      user: authorUser,
      status: postStatus,
      createdAt: serverTimestamp(),
      timestamp: new Date().toISOString(),
      userReactionsMap: {},
      userReactions: { helpful: 0, insightful: 0, confused: 0, verified: 0 },
      reactions: { helpful: 0, insightful: 0, confused: 0, verified: 0 },
      comments: [],
      shares: 0,
      isSaved: false,
      isAnonymous,
      blockedUserIds: user.blockedUserIds || [],
      authorBlockedUserIds: user.blockedUserIds || [],
      ...(isGroup && groupInfo?.groupId ? {
        groupId: groupInfo.groupId,
        groupName: groupInfo.groupName,
        groupAvatar: groupInfo.groupAvatar,
        isGroupPost: true
      } : {}),
      ...(attachmentType && (attachmentTitle || attachmentUrl) ? {
        attachment: {
          type: attachmentType,
          title: attachmentTitle || (attachmentType === 'image' ? 'Attached Photo' : 'Attached File'),
          url: attachmentUrl || '#',
          cdnUrl: attachmentCdnUrl || attachmentUrl,
          uuid: attachmentUuid,
          size: attachmentSize || (attachmentType === 'pdf' ? '1.5 MB' : attachmentType === 'doc' ? '850 KB' : attachmentType === 'image' ? 'Image File' : undefined)
        }
      } : {})
    };

    if (isGroup && groupInfo?.groupId) {
      recordGroupInteraction(groupInfo.groupId, 'post');
    }

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'posts', uniquePostId), cleanForFirestore(newPostData));
      } catch (err) {
        console.warn('Failed to save post to Firestore:', err);
      }
    } else {
      const rawLocalPost = {
        ...newPostData,
        id: uniquePostId,
        postId: uniquePostId,
        timestamp: new Date().toISOString()
      };
      const localPost = normalizePostForUser(rawLocalPost as any, currentUserId);
      setPosts(prev => [localPost, ...prev]);
    }

    if (postStatus === 'pending') {
      alert('Your post has been submitted and is pending approval by a Group Admin or Leader.');
    }

    playSound('send');
    return uniquePostId;
  };

  const deletePost = async (postId: string) => {
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const currentUserId = user.id || auth.currentUser?.uid || 'guest';
    const postOwnerId = targetPost.authorId || targetPost.user?.id;
    const currentEmail = user.email || localStorage.getItem('sb_current_email') || auth.currentUser?.email || '';
    const isAppAdmin = user.role === 'admin' || currentEmail.toLowerCase() === 'billkute030709@gmail.com';
    const isOwner = postOwnerId && postOwnerId === currentUserId;

    // Check if user is Group Admin or Leader for this group's post
    let isGroupModerator = false;
    if (targetPost.groupId) {
      const group = groups.find(g => g.id === targetPost.groupId);
      if (group) {
        isGroupModerator = canUserRemoveSpam(group, user);
      }
    }

    // Permission check: Owner OR App Admin OR Group Admin/Leader (spam removal)
    if (!isAppAdmin && !isOwner && !isGroupModerator) {
      console.warn(`Permission denied: User ${currentUserId} cannot delete post owned by ${postOwnerId}`);
      alert('You can only delete your own posts, or remove spam if you are a Group Admin or Leader!');
      return;
    }

    playSound('delete');

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

  const recordCreatorInteraction = (creatorId?: string, type: 'like' | 'comment' | 'save' = 'like') => {
    if (!creatorId || creatorId === user.id) return;

    const pointsToAdd = type === 'like' 
      ? ALGORITHM_CONFIG.INTERACTION_LIKE_POINTS 
      : type === 'comment' 
        ? ALGORITHM_CONFIG.INTERACTION_COMMENT_POINTS 
        : ALGORITHM_CONFIG.INTERACTION_SAVE_POINTS;

    setCreatorScores(prev => {
      const existing = prev[creatorId] || {
        creatorId,
        score: 0,
        lastInteractionTimestamp: new Date().toISOString(),
        interactions: { likes: 0, comments: 0, saves: 0 }
      };

      const nextInteractions = {
        likes: existing.interactions?.likes || 0,
        comments: existing.interactions?.comments || 0,
        saves: existing.interactions?.saves || 0,
      };
      if (type === 'like') nextInteractions.likes += 1;
      if (type === 'comment') nextInteractions.comments += 1;
      if (type === 'save') nextInteractions.saves += 1;

      const nextRecord: CreatorScore = {
        creatorId,
        score: (existing.score || 0) + pointsToAdd,
        lastInteractionTimestamp: new Date().toISOString(),
        interactions: nextInteractions
      };

      const nextMap = {
        ...prev,
        [creatorId]: nextRecord
      };

      try {
        localStorage.setItem('sb_creator_scores', JSON.stringify(nextMap));
      } catch (_) {}

      return nextMap;
    });
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

    if (newReaction) {
      playSound('like');
      // Feed Algorithm Update: The more a user interacts (likes, comments, saves) with a creator's posts, the higher that creator's point score goes
      const creatorId = !targetPost.isAnonymous ? (targetPost.authorId || targetPost.user?.id) : undefined;
      if (creatorId) {
        recordCreatorInteraction(creatorId, 'like');
      }
    } else {
      playSound('pop');
    }

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
      timestamp: 'Just now',
      helpfulCount: 0,
      hasHelped: false,
      helpedUserIds: []
    };

    const updatedPost: Post = { ...targetPost, comments: [...targetPost.comments, newComment] };
    playSound('send');

    // Feed Algorithm Update: Interaction (comment) increases creator score
    const creatorId = !targetPost.isAnonymous ? (targetPost.authorId || targetPost.user?.id) : undefined;
    if (creatorId) {
      recordCreatorInteraction(creatorId, 'comment');
    }

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
      alert('You can only delete comments created by yourself!');
      return;
    }

    const updatedComments = targetPost.comments.filter(c => c.id !== commentId);
    const updatedPost: Post = { ...targetPost, comments: updatedComments };
    playSound('delete');

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

    if (isSaved) {
      playSound('pop');
      // Feed Algorithm Update: Interaction (save) increases creator score
      const creatorId = !targetPost.isAnonymous ? (targetPost.authorId || targetPost.user?.id) : undefined;
      if (creatorId) {
        recordCreatorInteraction(creatorId, 'save');
      }
    } else {
      playSound('delete');
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
      date: new Date().toLocaleDateString('en-US')
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
    const updatedGroup = normalizeGroupForUser(rawGroup, user);

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
        const finalGroupNormalized = normalizeGroupForUser({ ...rawGroup, events: finalGroupEvents }, user);
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

  const addReel = async (reelData: Partial<Reel> & { videoUrl: string; caption: string; subject: string }): Promise<Reel> => {
    const currentUserId = user?.id || 'u_current';
    const authorName = user?.name || 'StudyBook Creator';
    const authorAvatar = user?.avatar || SILHOUETTE_AVATAR;

    const newReel: Reel = {
      id: reelData.id || `reel_${Date.now()}`,
      tutorName: reelData.tutorName || authorName,
      tutorAvatar: reelData.tutorAvatar || authorAvatar,
      authorId: currentUserId,
      videoUrl: reelData.videoUrl,
      thumbnailUrl: reelData.thumbnailUrl,
      caption: reelData.caption || '',
      subject: reelData.subject || 'Math',
      grade: reelData.grade || user?.grade || 'Grade 10',
      audioTrack: reelData.audioTrack || `Original Audio - ${authorName}`,
      likes: 0,
      baseLikes: 0,
      comments: 0,
      hasLiked: false,
      likedByUsers: [],
      worksheet: reelData.worksheet,
      createdAt: new Date().toISOString()
    };

    const normalized = normalizeReelForUser(newReel, currentUserId);

    setReels(prev => [normalized, ...prev]);

    if (isFirebaseConfigured) {
      try {
        const reelRef = doc(db, 'reels', newReel.id);
        await setDoc(reelRef, cleanForFirestore(newReel));
      } catch (err) {
        console.warn('Failed to save new reel to Firestore:', err);
      }
    }

    try {
      const saved = localStorage.getItem('sb_reels');
      const existing: Reel[] = saved ? JSON.parse(saved) : [];
      localStorage.setItem('sb_reels', JSON.stringify([cleanForFirestore(newReel), ...existing]));
    } catch (_) {}

    return normalized;
  };

  const deleteReel = async (reelId: string) => {
    const targetReel = reels.find(r => r.id === reelId);
    if (targetReel && !canUserDeleteReel(targetReel, user)) {
      alert('You can only delete reels you created, unless you are an administrator.');
      return;
    }

    setReels(prev => prev.filter(r => r.id !== reelId));

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'reels', reelId));
      } catch (err) {
        console.warn('Failed to delete reel from Firestore:', err);
      }
    }

    try {
      const saved = localStorage.getItem('sb_reels');
      if (saved) {
        const existing: Reel[] = JSON.parse(saved);
        localStorage.setItem('sb_reels', JSON.stringify(existing.filter((r: any) => r.id !== reelId)));
      }
    } catch (_) {}
  };

  const createStudyGroup = async (name: string, description?: string, category?: string) => {
    const groupId = `g_${Date.now()}`;
    const currentUserId = user.id || 'u_current';
    const newG: StudyGroup = {
      id: groupId,
      name,
      creatorId: currentUserId,
      coverImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800',
      description: description || 'A new study group co-created by learners.',
      category: category || 'General',
      memberCount: 1,
      membersCount: 1,
      adminUserIds: [currentUserId],
      leaderUserIds: [],
      memberUserIds: [currentUserId],
      memberRoles: {
        [currentUserId]: 'admin'
      },
      members: [
        {
          id: currentUserId,
          name: user.name || 'You',
          avatar: user.avatar || SILHOUETTE_AVATAR,
          role: 'admin',
          grade: user.grade,
          joinedAt: 'Recently'
        }
      ],
      files: [],
      events: []
    };

    const newChat: GroupChat = {
      groupId: groupId,
      groupName: name,
      messages: []
    };

    setGroups(prev => [...prev, newG]);
    setJoinedGroupIds(prev => Array.from(new Set([...prev, groupId])));
    setGroupChats(prev => {
      const found = prev.some(c => c.groupId === groupId);
      if (found) return prev;
      return [...prev, newChat];
    });

    recordGroupInteraction(groupId, 'join');

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'groups', groupId), cleanForFirestore(newG));
        await setDoc(doc(db, 'groupChats', groupId), cleanForFirestore(newChat));
      } catch (e) {
        console.warn('Firebase save group failed:', e);
      }
    }

    return groupId;
  };

  const togglePinGroupFile = async (groupId: string, fileId: string) => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return;

    if (!canUserPinFiles(targetGroup, user)) {
      alert('Only Group Leaders and Admins can pin or unpin study files!');
      return;
    }

    playSound('pop');

    setGroups(prev => {
      const next = prev.map(g => {
        if (g.id !== groupId) return g;
        const nextFiles = (g.files || []).map(f => {
          if (f.id !== fileId) return f;
          const nextPinned = !f.isPinned;
          return {
            ...f,
            isPinned: nextPinned,
            pinnedBy: nextPinned ? (user.name || 'Group Admin') : undefined,
            pinnedAt: nextPinned ? 'Just now' : undefined
          };
        });
        return { ...g, files: nextFiles };
      });
      try { localStorage.setItem('sb_groups', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    if (isFirebaseConfigured) {
      try {
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          const groupData = groupSnap.data() as StudyGroup;
          const updatedFiles = (groupData.files || []).map(f => {
            if (f.id !== fileId) return f;
            const nextPinned = !f.isPinned;
            return {
              ...f,
              isPinned: nextPinned,
              pinnedBy: nextPinned ? (user.name || 'Group Admin') : undefined,
              pinnedAt: nextPinned ? 'Just now' : undefined
            };
          });
          await updateDoc(groupRef, { files: updatedFiles });
        }
      } catch (err) {
        console.warn('Failed to update pinned file in Firestore:', err);
      }
    }
  };

  const deleteGroupFile = async (groupId: string, fileId: string) => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return;

    const targetFile = targetGroup.files?.find(f => f.id === fileId);
    const isUploader = targetFile && (targetFile.uploaderId === user.id || targetFile.uploader === user.name);
    const isMod = canUserRemoveSpam(targetGroup, user);

    if (!isUploader && !isMod) {
      alert('You can only delete files you uploaded, or delete files if you are a Group Leader or Admin!');
      return;
    }

    playSound('delete');

    setGroups(prev => {
      const next = prev.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          files: (g.files || []).filter(f => f.id !== fileId)
        };
      });
      try { localStorage.setItem('sb_groups', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    if (isFirebaseConfigured) {
      try {
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          const groupData = groupSnap.data() as StudyGroup;
          const updatedFiles = (groupData.files || []).filter(f => f.id !== fileId);
          await updateDoc(groupRef, { files: updatedFiles });
        }
      } catch (err) {
        console.warn('Failed to delete file from group in Firestore:', err);
      }
    }
  };

  const updateGroupMemberRole = async (groupId: string, memberId: string, newRole: GroupRole) => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return;

    if (!canUserAssignModerator(targetGroup, user)) {
      alert('Only Group Admins and Cohort Creators have permission to promote or change Moderator roles!');
      return;
    }

    playSound('pop');

    let updatedMembersList: GroupMember[] = [];
    setGroups(prev => {
      const next = prev.map(g => {
        if (g.id !== groupId) return g;
        const currentRoles = { ...(g.memberRoles || {}) };
        currentRoles[memberId] = newRole;

        let currentMembers = (g.members || []).map(m => {
          if (m.id === memberId) {
            return { ...m, role: newRole };
          }
          return m;
        });
        updatedMembersList = currentMembers;

        // Sync leaderUserIds and adminUserIds
        const adminIds = new Set(g.adminUserIds || []);
        const leaderIds = new Set(g.leaderUserIds || []);

        if (newRole === 'admin') {
          // STRICT RULE: Only 1 admin allowed!
          adminIds.clear();
          adminIds.add(memberId);
          leaderIds.delete(memberId);

          // Demote any previous admin(s) in currentRoles and currentMembers
          Object.keys(currentRoles).forEach(uid => {
            if (uid !== memberId && currentRoles[uid] === 'admin') {
              currentRoles[uid] = 'moderator';
              leaderIds.add(uid);
            }
          });
          currentRoles[memberId] = 'admin';

          currentMembers = currentMembers.map(m => {
            if (m.id === memberId) return { ...m, role: 'admin' as GroupRole };
            if (m.role === 'admin') return { ...m, role: 'moderator' as GroupRole };
            return m;
          });
          updatedMembersList = currentMembers;
        } else if (newRole === 'leader' || newRole === 'moderator') {
          leaderIds.add(memberId);
          adminIds.delete(memberId);
        } else {
          adminIds.delete(memberId);
          leaderIds.delete(memberId);
        }

        return {
          ...g,
          memberRoles: currentRoles,
          members: currentMembers,
          adminUserIds: Array.from(adminIds),
          leaderUserIds: Array.from(leaderIds)
        };
      });
      try { localStorage.setItem('sb_groups', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    if (isFirebaseConfigured) {
      try {
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        let firestoreMembers: GroupMember[] = [];
        let firestoreAdmins: string[] = [];
        let firestoreLeaders: string[] = [];
        if (groupSnap.exists()) {
          const gd = groupSnap.data() as StudyGroup;
          firestoreMembers = Array.isArray(gd.members) ? [...gd.members] : [];
          firestoreAdmins = Array.isArray(gd.adminUserIds) ? [...gd.adminUserIds] : [];
          firestoreLeaders = Array.isArray(gd.leaderUserIds) ? [...gd.leaderUserIds] : [];
        }
        firestoreMembers = firestoreMembers.map(m => m.id === memberId ? { ...m, role: newRole } : m);
        if (newRole === 'admin') {
          firestoreAdmins = [memberId];
          firestoreLeaders = firestoreLeaders.filter(id => id !== memberId);
          firestoreMembers = firestoreMembers.map(m => {
            if (m.id === memberId) return { ...m, role: 'admin' as GroupRole };
            if (m.role === 'admin') return { ...m, role: 'moderator' as GroupRole };
            return m;
          });
        } else if (newRole === 'leader' || newRole === 'moderator') {
          firestoreLeaders = Array.from(new Set([...firestoreLeaders, memberId]));
          firestoreAdmins = firestoreAdmins.filter(id => id !== memberId);
        } else {
          firestoreAdmins = firestoreAdmins.filter(id => id !== memberId);
          firestoreLeaders = firestoreLeaders.filter(id => id !== memberId);
        }

        await updateDoc(groupRef, {
          [`memberRoles.${memberId}`]: newRole,
          members: cleanForFirestore(firestoreMembers.length > 0 ? firestoreMembers : updatedMembersList),
          adminUserIds: firestoreAdmins,
          leaderUserIds: firestoreLeaders
        });
      } catch (err) {
        console.warn('Failed to update member role in Firestore:', err);
      }
    }
  };

  const removeGroupMember = async (groupId: string, memberId: string) => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return;

    if (!canUserManageMembers(targetGroup, user)) {
      alert('Only Group Leaders and Admins can manage or remove cohort members!');
      return;
    }

    playSound('delete');

    setGroups(prev => {
      const next = prev.map(g => {
        if (g.id !== groupId) return g;
        const updatedMembers = (g.members || []).filter(m => m.id !== memberId);
        const updatedMemberIds = (g.memberUserIds || []).filter(id => id !== memberId);
        const updatedRoles = { ...(g.memberRoles || {}) };
        delete updatedRoles[memberId];

        return {
          ...g,
          memberCount: Math.max(1, (g.memberCount || 1) - 1),
          membersCount: Math.max(1, (g.membersCount || 1) - 1),
          members: updatedMembers,
          memberUserIds: updatedMemberIds,
          memberRoles: updatedRoles,
          adminUserIds: (g.adminUserIds || []).filter(id => id !== memberId),
          leaderUserIds: (g.leaderUserIds || []).filter(id => id !== memberId)
        };
      });
      try { localStorage.setItem('sb_groups', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    if (isFirebaseConfigured) {
      try {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
          memberUserIds: arrayRemove(memberId),
          [`memberRoles.${memberId}`]: deleteField()
        });
      } catch (err) {
        console.warn('Failed to remove group member from Firestore:', err);
      }
    }
  };

  const transferAdminOwnership = async (groupId: string, newAdminId: string): Promise<{ success: boolean; message?: string }> => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return { success: false, message: 'Group not found' };

    const role = getUserGroupRole(targetGroup, user);
    if (role !== 'admin') {
      return { success: false, message: 'Only an existing Admin can transfer group ownership.' };
    }

    const newAdminMember = targetGroup.members?.find(m => m.id === newAdminId);
    const isLeader = targetGroup.leaderUserIds?.includes(newAdminId) || targetGroup.memberRoles?.[newAdminId] === 'leader';
    if (!isLeader) {
      return { success: false, message: 'Admin ownership must be passed to an active Group Leader.' };
    }

    playSound('pop');

    setGroups(prev => {
      const next = prev.map(g => {
        if (g.id !== groupId) return g;
        const currentRoles = { ...(g.memberRoles || {}) };
        currentRoles[newAdminId] = 'admin';
        currentRoles[user.id] = 'leader';

        const currentMembers = (g.members || []).map(m => {
          if (m.id === newAdminId) return { ...m, role: 'admin' as GroupRole };
          if (m.id === user.id) return { ...m, role: 'leader' as GroupRole };
          return m;
        });

        const adminIds = new Set(g.adminUserIds || []);
        const leaderIds = new Set(g.leaderUserIds || []);
        adminIds.clear();
        adminIds.add(newAdminId);
        leaderIds.add(user.id);
        leaderIds.delete(newAdminId);

        return {
          ...g,
          memberRoles: currentRoles,
          members: currentMembers,
          adminUserIds: Array.from(adminIds),
          leaderUserIds: Array.from(leaderIds)
        };
      });
      try { localStorage.setItem('sb_groups', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    if (isFirebaseConfigured) {
      try {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
          [`memberRoles.${newAdminId}`]: 'admin',
          [`memberRoles.${user.id}`]: 'leader',
          adminUserIds: [newAdminId],
          leaderUserIds: arrayUnion(user.id)
        });
      } catch (err) {
        console.warn('Failed to update group ownership in Firestore:', err);
      }
    }

    return { success: true, message: `Successfully transferred Admin ownership to ${newAdminMember?.name || 'Group Leader'}.` };
  };

  const leaveStudyGroup = async (groupId: string): Promise<{ success: boolean; message?: string }> => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return { success: false, message: 'Group not found' };

    const guardrail = validateAdminLeaveGuardrail(targetGroup, user);
    if (!guardrail.canLeave) {
      return { 
        success: false, 
        message: guardrail.reason || 'An Admin cannot leave the group unless they explicitly pass Admin ownership over to one of the active Group Leaders first.'
      };
    }

    playSound('delete');

    setJoinedGroupIds(prev => prev.filter(id => id !== groupId));
    setGroups(prev => {
      const next = prev.map(g => {
        if (g.id !== groupId) return g;
        const updatedMembers = (g.members || []).filter(m => m.id !== user.id);
        const updatedMemberIds = (g.memberUserIds || []).filter(id => id !== user.id);
        const updatedRoles = { ...(g.memberRoles || {}) };
        delete updatedRoles[user.id];

        return {
          ...g,
          isMember: false,
          memberCount: Math.max(0, (g.memberCount || 1) - 1),
          membersCount: Math.max(0, (g.membersCount || 1) - 1),
          members: updatedMembers,
          memberUserIds: updatedMemberIds,
          memberRoles: updatedRoles,
          adminUserIds: (g.adminUserIds || []).filter(id => id !== user.id),
          leaderUserIds: (g.leaderUserIds || []).filter(id => id !== user.id)
        };
      });
      try { localStorage.setItem('sb_groups', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    if (isFirebaseConfigured) {
      try {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
          memberUserIds: arrayRemove(user.id),
          [`memberRoles.${user.id}`]: deleteField()
        });
      } catch (err) {
        console.warn('Failed to leave group in Firestore:', err);
      }
    }

    return { success: true, message: 'You have left the study group.' };
  };

  const deleteStudyGroup = async (groupId: string): Promise<{ success: boolean; message?: string }> => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return { success: false, message: 'Group not found' };

    if (!canUserDeleteGroup(targetGroup, user)) {
      return { success: false, message: 'Admins have exclusive destructive power to delete the entire group and all associated posts.' };
    }

    playSound('delete');

    setGroups(prev => {
      const next = prev.filter(g => g.id !== groupId);
      try { localStorage.setItem('sb_groups', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    setPosts(prev => {
      const next = prev.filter(p => p.groupId !== groupId && (p as any).groupInfo?.groupId !== groupId);
      try { localStorage.setItem('sb_posts', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    setGroupChats(prev => {
      const next = prev.filter(c => c.groupId !== groupId);
      try { localStorage.setItem('sb_group_chats', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    setJoinedGroupIds(prev => {
      const next = prev.filter(id => id !== groupId);
      try { localStorage.setItem('sb_joined_groups', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    try {
      const selected = localStorage.getItem('sb_selected_group_id');
      if (selected === groupId) {
        const remaining = groups.filter(g => g.id !== groupId);
        if (remaining.length > 0) {
          localStorage.setItem('sb_selected_group_id', remaining[0].id);
        } else {
          localStorage.removeItem('sb_selected_group_id');
        }
      }
    } catch (_) {}

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'groups', groupId));
        await deleteDoc(doc(db, 'groupChats', groupId));
      } catch (err) {
        console.warn('Failed to delete group from Firestore:', err);
      }
    }

    return { success: true, message: 'Group and all associated posts were permanently deleted.' };
  };

  const updateGroupSettings = async (groupId: string, newSettings: Partial<GroupSettings>) => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return;

    if (!canUserModifySettings(targetGroup, user)) {
      alert('Only Group Leaders and Admins can configure group settings!');
      return;
    }

    playSound('pop');

    setGroups(prev => {
      const next = prev.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          settings: {
            whoCanPost: g.settings?.whoCanPost || 'all',
            whoCanChat: g.settings?.whoCanChat || 'all',
            joinPolicy: g.settings?.joinPolicy || 'free',
            requirePostApproval: Boolean(g.settings?.requirePostApproval),
            ...newSettings
          }
        };
      });
      try { localStorage.setItem('sb_groups', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    if (isFirebaseConfigured) {
      try {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
          settings: {
            ...(targetGroup.settings || {}),
            ...newSettings
          }
        });
      } catch (err) {
        console.warn('Failed to update group settings in Firestore:', err);
      }
    }
  };

  const updateGroupDetails = async (groupId: string, updates: { name?: string; description?: string; coverImage?: string }): Promise<{ success: boolean; message?: string }> => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return { success: false, message: 'Group not found' };

    const effectiveRole = getUserGroupRole(targetGroup, user);
    if (effectiveRole !== 'admin') {
      alert('Permission denied: Only the Group Admin can edit the group name, description, and banner.');
      return { success: false, message: 'Only the Group Admin can edit cohort details.' };
    }

    playSound('pop');

    const cleanUpdates: Partial<StudyGroup> = {};
    if (updates.name !== undefined && updates.name.trim()) cleanUpdates.name = updates.name.trim();
    if (updates.description !== undefined) cleanUpdates.description = updates.description.trim();
    if (updates.coverImage !== undefined && updates.coverImage.trim()) cleanUpdates.coverImage = updates.coverImage.trim();

    setGroups(prev => {
      const next = prev.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          ...cleanUpdates
        };
      });
      try { localStorage.setItem('sb_groups', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    if (isFirebaseConfigured) {
      try {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, cleanForFirestore(cleanUpdates));
      } catch (err) {
        console.warn('Failed to update group details in Firestore:', err);
      }
    }

    return { success: true, message: 'Group details updated successfully!' };
  };

  const requestJoinGroup = async (groupId: string): Promise<{ status: 'joined' | 'pending'; message: string }> => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return { status: 'joined', message: 'Group not found' };

    const freely = canUserJoinFreely(targetGroup);
    if (freely) {
      toggleJoinGroup(groupId);
      return { status: 'joined', message: 'You have joined the group!' };
    }

    const currentReqs = targetGroup.pendingJoinRequests || [];
    if (currentReqs.some(r => r.userId === user.id)) {
      return { status: 'pending', message: 'Your join request is already awaiting Admin or Group Leader review.' };
    }

    const newReq: GroupJoinRequest = {
      id: `gjr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      groupId,
      userId: user.id || 'u_current',
      userName: user.name || 'Student',
      userAvatar: user.avatar || SILHOUETTE_AVATAR,
      userGrade: user.grade || 'Grade 10',
      requestedAt: new Date().toISOString()
    };

    const updatedReqs = [...currentReqs, newReq];
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, pendingJoinRequests: updatedReqs } : g));

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'groups', groupId), {
          pendingJoinRequests: updatedReqs
        });
      } catch (e) {
        console.warn('Failed to submit join request to Firestore:', e);
      }
    }
    playSound('pop');
    return { status: 'pending', message: 'Join request sent! An Admin or Group Leader must approve your entry.' };
  };

  const approveJoinRequest = async (groupId: string, requestId: string) => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return;

    if (!canUserReviewJoinRequests(targetGroup, user)) {
      alert('Only Admins and Group Leaders can approve join requests.');
      return;
    }

    const req = targetGroup.pendingJoinRequests?.find(r => r.id === requestId);
    if (!req) return;

    playSound('pop');

    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const updatedReqs = (g.pendingJoinRequests || []).filter(r => r.id !== requestId);
      const newMember: GroupMember = {
        id: req.userId,
        name: req.userName,
        avatar: req.userAvatar,
        role: 'member',
        grade: req.userGrade || 'Grade 10',
        joinedAt: new Date().toLocaleDateString()
      };
      const memberIds = Array.from(new Set([...(g.memberUserIds || []), req.userId]));
      const memberRoles = { ...(g.memberRoles || {}), [req.userId]: 'member' as GroupRole };
      const members = [...(g.members || []), newMember];

      return {
        ...g,
        memberCount: members.length,
        membersCount: members.length,
        members,
        memberUserIds: memberIds,
        memberRoles,
        pendingJoinRequests: updatedReqs
      };
    }));

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'groups', groupId), {
          memberUserIds: arrayUnion(req.userId),
          [`memberRoles.${req.userId}`]: 'member',
          pendingJoinRequests: (targetGroup.pendingJoinRequests || []).filter(r => r.id !== requestId)
        });
      } catch (err) {
        console.warn('Failed to approve join request in Firestore:', err);
      }
    }
  };

  const rejectJoinRequest = async (groupId: string, requestId: string) => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return;

    if (!canUserReviewJoinRequests(targetGroup, user)) {
      alert('Only Admins and Group Leaders can review join requests.');
      return;
    }

    playSound('delete');

    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        pendingJoinRequests: (g.pendingJoinRequests || []).filter(r => r.id !== requestId)
      };
    }));

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'groups', groupId), {
          pendingJoinRequests: (targetGroup.pendingJoinRequests || []).filter(r => r.id !== requestId)
        });
      } catch (err) {
        console.warn('Failed to reject join request in Firestore:', err);
      }
    }
  };

  const approvePendingPost = async (postId: string) => {
    playSound('pop');

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, status: 'approved' };
    }));

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'posts', postId), { status: 'approved' });
      } catch (err) {
        console.warn('Failed to approve post in Firestore:', err);
      }
    }
  };

  const rejectPendingPost = async (postId: string) => {
    playSound('delete');
    await deletePost(postId);
  };

  const addMarketplaceItem = async (item: Omit<MarketplaceItem, 'id' | 'seller' | 'distance'>) => {
    // Safety Messaging Guard: The moment a user publishes a marketplace listing,
    // if they previously toggled "Allow direct messages from strangers" to ON, automatically force it to OFF.
    const privacyCheck = interceptMarketplacePrivacySettings(user, settings);
    if (privacyCheck.wasModified) {
      setUser(privacyCheck.user);
      setSettings(privacyCheck.settings);
      try {
        localStorage.setItem('sb_user', JSON.stringify(cleanForFirestore(privacyCheck.user)));
        localStorage.setItem('sb_settings', JSON.stringify(privacyCheck.settings));
      } catch (_) {}
    }

    const newItem: MarketplaceItem = {
      ...item,
      id: `m_${Date.now()}`,
      distance: Number((Math.random() * 4.5 + 0.2).toFixed(1)),
      seller: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        rating: 5.0
      },
      createdAt: new Date().toISOString()
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

  const deleteMarketplaceItem = async (itemId: string) => {
    const targetItem = marketplace.find(m => m.id === itemId);
    if (!targetItem) return;

    if (!canUserDeleteMarketplaceItem(targetItem, user)) {
      alert("Permission denied: Only the listing's seller or an Application Admin can delete this listing.");
      return;
    }

    // Optimistic local state update
    setMarketplace(prev => {
      const next = prev.filter(m => m.id !== itemId);
      try {
        localStorage.setItem('sb_marketplace', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    playSound('delete');

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'marketplace', itemId));
      } catch (err) {
        console.warn('Failed to delete marketplace item from Firestore:', err);
      }
    }
  };

  const sendGroupMessage = async (groupId: string, text: string) => {
    const targetChat = groupChats.find(c => c.groupId === groupId);
    if (!targetChat) return;

    const targetGroup = groups.find(g => g.id === groupId);
    if (targetGroup) {
      const authCheck = checkUserCanChatInGroup(targetGroup, user);
      if (!authCheck.allowed) {
        alert(authCheck.reason || 'Group chat is restricted to Admins and Group Leaders.');
        return;
      }
    }

    recordGroupInteraction(groupId, 'message');

    const isoNow = new Date().toISOString();
    const newMsg: Message = {
      id: `m_msg_${Date.now()}`,
      sender: user,
      content: text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      createdAt: isoNow
    };

    const updatedChat: GroupChat = {
      ...targetChat,
      messages: [...targetChat.messages, newMsg],
      lastUpdated: isoNow
    };

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    setGroupChats(prev => prev.map(c => c.groupId === groupId ? updatedChat : c));
    try {
      const all = groupChats.map(c => c.groupId === groupId ? updatedChat : c);
      localStorage.setItem('sb_group_chats', JSON.stringify(all));
    } catch (_) {}

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
    subjectWeights: AppSettings['subjectWeights'],
    grade?: string
  ) => {
    const nextUser: User = {
      ...user,
      name: name.trim() || user.name || 'StudyBook Student',
      role,
      institution,
      grade: grade || user.grade || 'Grade 10',
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
Student: ${user.name}
Consecutive Study Streak: ${user.streak} days
Streak Rank: ${user.streakLevel.toUpperCase()}
Badges Earned: ${user.badges.join(', ') || 'None'}

PLATFORM ACTIVITY & CONTRIBUTIONS:
----------------------------------------
- Saved Study Materials: ${savedCount} items
- Academic Posts Contributed: ${contributedPosts} posts
- Helpful Upvotes Received: ${posts.filter(p => p.user.id === user.id).reduce((acc, curr) => acc + curr.reactions.helpful + curr.reactions.insightful, 0)} points

SUBJECTS OF INTEREST:
${settings.subjectWeights.Math > 0 ? '- Mathematics\n' : ''}${settings.subjectWeights.Physics > 0 ? '- Physics\n' : ''}${settings.subjectWeights.English > 0 ? '- English\n' : ''}${settings.subjectWeights.Chemistry > 0 ? '- Chemistry\n' : ''}

StudyBook - Leading Academic Social Network.
Report automatically generated on ${new Date().toLocaleDateString('en-US')}.
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
        alert('Your browser or this iframe environment does not support Text-to-Speech.');
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
        alert('Text-to-Speech cannot be initialized in the current iframe environment.');
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
    const getPriority = (status: string) => {
      if (status === 'approved') return 3;
      if (status === 'rejected') return 2;
      return 1; // pending
    };

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

        // Keep the record with higher status priority (approved > rejected > pending)
        const winner = getPriority(r.status) >= getPriority(existing.status) ? r : existing;
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

  const isUserVerifiedTutor = useCallback((author?: Partial<User> | null, authorId?: string): boolean => {
    if (!author && !authorId) return false;
    const resolvedId = authorId || author?.id;
    const authorName = author?.name;
    const authorEmail = author?.email;

    // 1. If this post/comment belongs to current active logged-in user
    const hasValidUserName = Boolean(user.name && user.name.trim().length > 1 && user.name !== 'User' && user.name !== 'Anonymous Scholar');
    const isCurrentActiveUser =
      Boolean((resolvedId && (resolvedId === user.id || (auth.currentUser?.uid && resolvedId === auth.currentUser.uid)))) ||
      Boolean((authorEmail && user.email && authorEmail.toLowerCase() === user.email.toLowerCase())) ||
      Boolean((authorName && hasValidUserName && authorName.trim().toLowerCase() === user.name.trim().toLowerCase()));

    if (isCurrentActiveUser) {
      if (user.role === 'admin') return true;
      if (user.role === 'tutor' || (user.badges || []).includes('Verified Tutor')) return true;
      return false;
    }

    // 2. Check tutor requests history for explicit approval or rejection/revocation
    if (tutorRequests && tutorRequests.length > 0) {
      const matchReq = tutorRequests.find(r =>
        Boolean((resolvedId && (r.userId === resolvedId || r.id === resolvedId || r.id === `tr_${resolvedId}`))) ||
        Boolean((authorEmail && r.userEmail && r.userEmail.toLowerCase() === authorEmail.toLowerCase())) ||
        Boolean((authorName && ((r.realName && r.realName.trim().toLowerCase() === authorName.trim().toLowerCase()) || (r.userName && r.userName.trim().toLowerCase() === authorName.trim().toLowerCase()))))
      );
      if (matchReq) {
        if (matchReq.status === 'approved') return true;
        if (matchReq.status === 'rejected' || matchReq.status === 'pending') return false;
      }
    }

    // 3. Check official verified tutors list
    if (tutors && tutors.length > 0) {
      const matchTutor = tutors.find(t =>
        !isFakeOrBotTutor(t) && (
          Boolean((resolvedId && t.id === resolvedId)) ||
          Boolean((authorName && t.name.trim().toLowerCase() === authorName.trim().toLowerCase()))
        )
      );
      if (matchTutor) {
        return matchTutor.verified === true;
      }
    }

    // 4. Fallback to author's user object properties
    if (author?.role === 'admin') return true;
    if (author?.role === 'tutor' || (author?.badges || []).includes('Verified Tutor')) return true;

    return false;
  }, [user.id, user.name, user.email, user.role, user.badges, tutorRequests, tutors]);

  const syncUserTutorStatusAcrossPosts = async (
    targetUserId: string,
    targetName?: string,
    targetEmail?: string,
    isTutor: boolean = true
  ) => {
    const cleanTargetName = targetName?.trim().toLowerCase();
    const cleanTargetEmail = targetEmail?.trim().toLowerCase();

    // 1. Update local state for all posts and their comments
    setPosts(prev => {
      const updated = prev.map(p => {
        const matchesAuthor =
          (p.user?.id && (p.user.id === targetUserId || p.user.id === `u_${targetUserId}`)) ||
          (p.authorId && (p.authorId === targetUserId || p.authorId === `u_${targetUserId}`)) ||
          (cleanTargetEmail && p.user?.email && p.user.email.toLowerCase() === cleanTargetEmail) ||
          (cleanTargetName && p.authorName && p.authorName.trim().toLowerCase() === cleanTargetName) ||
          (cleanTargetName && p.user?.name && p.user.name.trim().toLowerCase() === cleanTargetName);

        let updatedPost = p;
        if (matchesAuthor) {
          const currentBadges = p.user?.badges || [];
          const newBadges = isTutor
            ? Array.from(new Set([...currentBadges, 'Verified Tutor']))
            : currentBadges.filter(b => b !== 'Verified Tutor');
          const newRole: User['role'] = isTutor ? 'tutor' : (p.user?.role === 'admin' ? 'admin' : 'student');
          
          updatedPost = {
            ...updatedPost,
            user: {
              ...updatedPost.user,
              role: newRole,
              badges: newBadges
            }
          };
        }

        if (updatedPost.comments && updatedPost.comments.length > 0) {
          const updatedComments = updatedPost.comments.map(c => {
            const matchesCommentAuthor =
              (c.user?.id && (c.user.id === targetUserId || c.user.id === `u_${targetUserId}`)) ||
              (cleanTargetEmail && c.user?.email && c.user.email.toLowerCase() === cleanTargetEmail) ||
              (cleanTargetName && c.user?.name && c.user.name.trim().toLowerCase() === cleanTargetName);

            if (matchesCommentAuthor) {
              const currentBadges = c.user?.badges || [];
              const newBadges = isTutor
                ? Array.from(new Set([...currentBadges, 'Verified Tutor']))
                : currentBadges.filter(b => b !== 'Verified Tutor');
              const newRole: User['role'] = isTutor ? 'tutor' : (c.user?.role === 'admin' ? 'admin' : 'student');
              return {
                ...c,
                user: {
                  ...c.user,
                  role: newRole,
                  badges: newBadges
                }
              };
            }
            return c;
          });
          updatedPost = { ...updatedPost, comments: updatedComments };
        }

        return updatedPost;
      });

      try {
        localStorage.setItem('sb_posts', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    // 2. Propagate to Firestore posts collection
    if (isFirebaseConfigured) {
      try {
        const postsRef = collection(db, 'posts');
        const snap = await getDocs(postsRef);
        const updates: Promise<any>[] = [];

        snap.forEach(docSnap => {
          const data = docSnap.data() as Post;
          const matchesAuthor =
            (data.user?.id && (data.user.id === targetUserId || data.user.id === `u_${targetUserId}`)) ||
            (data.authorId && (data.authorId === targetUserId || data.authorId === `u_${targetUserId}`)) ||
            (cleanTargetEmail && data.user?.email && data.user.email.toLowerCase() === cleanTargetEmail) ||
            (cleanTargetName && data.authorName && data.authorName.trim().toLowerCase() === cleanTargetName) ||
            (cleanTargetName && data.user?.name && data.user.name.trim().toLowerCase() === cleanTargetName);

          let hasCommentMatch = false;
          const updatedComments = (data.comments || []).map(c => {
            const matchesCommentAuthor =
              (c.user?.id && (c.user.id === targetUserId || c.user.id === `u_${targetUserId}`)) ||
              (cleanTargetEmail && c.user?.email && c.user.email.toLowerCase() === cleanTargetEmail) ||
              (cleanTargetName && c.user?.name && c.user.name.trim().toLowerCase() === cleanTargetName);
            if (matchesCommentAuthor) {
              hasCommentMatch = true;
              const currentBadges = c.user?.badges || [];
              const newBadges = isTutor
                ? Array.from(new Set([...currentBadges, 'Verified Tutor']))
                : currentBadges.filter(b => b !== 'Verified Tutor');
              const newRole = isTutor ? 'tutor' : (c.user?.role === 'admin' ? 'admin' : 'student');
              return {
                ...c,
                user: {
                  ...c.user,
                  role: newRole,
                  badges: newBadges
                }
              };
            }
            return c;
          });

          if (matchesAuthor || hasCommentMatch) {
            const currentBadges = data.user?.badges || [];
            const newBadges = matchesAuthor
              ? (isTutor ? Array.from(new Set([...currentBadges, 'Verified Tutor'])) : currentBadges.filter(b => b !== 'Verified Tutor'))
              : currentBadges;
            const newRole = matchesAuthor
              ? (isTutor ? 'tutor' : (data.user?.role === 'admin' ? 'admin' : 'student'))
              : (data.user?.role || 'student');

            const postDocRef = doc(db, 'posts', docSnap.id);
            updates.push(
              setDoc(postDocRef, {
                user: {
                  ...data.user,
                  role: newRole,
                  badges: newBadges
                },
                comments: updatedComments
              }, { merge: true }).catch(err => {
                console.warn(`Failed to update post ${docSnap.id} in Firestore:`, err);
              })
            );
          }
        });

        if (updates.length > 0) {
          await Promise.all(updates);
        }
      } catch (err) {
        console.warn('Failed to propagate tutor status update across Firestore posts:', err);
      }
    }
  };

  // 3. Automated real-time synchronization for past posts and comments when tutor privileges change
  useEffect(() => {
    setPosts(prevPosts => {
      let changed = false;
      const updated = prevPosts.map(p => {
        let postChanged = false;
        const authorIsTutor = !p.isAnonymous && isUserVerifiedTutor(p.user, p.authorId);
        const currentBadges = p.user?.badges || [];
        const hasBadge = currentBadges.includes('Verified Tutor');

        let updatedUser = p.user;
        if (authorIsTutor && !hasBadge) {
          updatedUser = {
            ...p.user,
            role: p.user?.role === 'admin' ? 'admin' : 'tutor',
            badges: Array.from(new Set([...currentBadges, 'Verified Tutor']))
          };
          postChanged = true;
        } else if (!authorIsTutor && hasBadge && p.user?.role !== 'admin') {
          updatedUser = {
            ...p.user,
            role: 'student',
            badges: currentBadges.filter(b => b !== 'Verified Tutor')
          };
          postChanged = true;
        }

        let updatedComments = p.comments;
        if (p.comments && p.comments.length > 0) {
          const newComments = p.comments.map(c => {
            const commentAuthorIsTutor = isUserVerifiedTutor(c.user, c.user?.id);
            const cBadges = c.user?.badges || [];
            const cHasBadge = cBadges.includes('Verified Tutor');

            if (commentAuthorIsTutor && !cHasBadge) {
              postChanged = true;
              const nextRole: User['role'] = c.user?.role === 'admin' ? 'admin' : 'tutor';
              return {
                ...c,
                user: {
                  ...c.user,
                  role: nextRole,
                  badges: Array.from(new Set([...cBadges, 'Verified Tutor']))
                }
              };
            } else if (!commentAuthorIsTutor && cHasBadge && c.user?.role !== 'admin') {
              postChanged = true;
              const nextRole: User['role'] = 'student';
              return {
                ...c,
                user: {
                  ...c.user,
                  role: nextRole,
                  badges: cBadges.filter(b => b !== 'Verified Tutor')
                }
              };
            }
            return c;
          });
          if (postChanged) {
            updatedComments = newComments;
          }
        }

        if (postChanged) {
          changed = true;
          return {
            ...p,
            user: updatedUser,
            comments: updatedComments
          };
        }
        return p;
      });

      if (changed) {
        try {
          localStorage.setItem('sb_posts', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      }
      return prevPosts;
    });
  }, [user.role, user.badges, tutorRequests, tutors, isUserVerifiedTutor]);

  const requestTutorVerification = async (details?: { realName?: string; school?: string; description?: string; requestedSubjects?: string[] }) => {
    const currentEmail = user.email || localStorage.getItem('sb_current_email') || auth.currentUser?.email || '';
    const isAdmin = user.role === 'admin' || currentEmail.toLowerCase() === 'billkute030709@gmail.com';

    const realName = details?.realName?.trim() || user.name;
    const school = details?.school?.trim() || user.institution || 'Independent Educator';
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
      await syncUserTutorStatusAcrossPosts(user.id, user.name, user.email, true);
      playSound('success');
      return;
    }

    playSound('send');

    const reqId = `tr_${user.id}`;
    const nowStr = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const existing = tutorRequests.find(r => r.userId === user.id || r.id === reqId || (currentEmail && r.userEmail === currentEmail));
    const newLog: RequestHistoryLog = {
      timestamp: nowStr,
      action: 'Submitted Tutor Verification Request',
      performedBy: user.name,
      details: `Name: ${realName} | School: ${school} | Subjects: ${requestedSubjects.join(', ')}`
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
    playSound('success');
    const nowStr = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const updatedLogs: RequestHistoryLog[] = [
      { timestamp: nowStr, action: 'Approved & Granted Tutor Privileges', performedBy: 'Admin' },
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

    // Sync all posts and comments authored by this user across state and Firestore
    await syncUserTutorStatusAcrossPosts(req.userId, req.realName || req.userName, req.userEmail, true);

    setTutors(prev => {
      if (prev.some(t => t.id === req.userId)) {
        return prev.map(t => t.id === req.userId ? { ...t, name: req.realName || t.name, verified: true } : t);
      } else {
        const newTutor: TutorPage = {
          id: req.userId,
          name: req.realName || req.userName,
          avatar: req.userAvatar,
          bio: req.description || `Verified Educator & Tutor at ${req.school || 'Independent'}. Specializations: ${req.requestedSubjects?.join(', ') || 'Academic Subjects'}.`,
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
    playSound('delete');
    const nowStr = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const updatedLogs: RequestHistoryLog[] = [
      { timestamp: nowStr, action: 'Declined / Revoked Tutor Privileges', performedBy: 'Admin' },
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

    // Set tutor page verified to false if exists
    setTutors(prev => prev.map(t => (t.id === req.userId || (req.userEmail && t.id === req.userEmail)) ? { ...t, verified: false } : t));

    // Sync all past posts & comments authored by this user to remove Verified Tutor badge
    await syncUserTutorStatusAcrossPosts(req.userId, req.realName || req.userName, req.userEmail, false);
  };

  const deleteTutorRequest = async (requestId: string) => {
    const req = tutorRequests.find(r => r.id === requestId || r.userId === requestId);
    if (!req) return;
    playSound('delete');

    setTutorRequests(prev => prev.filter(r => r.id !== req.id && r.userId !== req.userId));

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'tutorRequests', req.id));
      } catch (err) {
        console.warn('Failed to delete tutor request in Firestore:', err);
      }
    }

    // If deleting an approved request, revoke tutor status and update posts
    if (req.status === 'approved') {
      if (user.id === req.userId && user.role !== 'admin') {
        const updatedUser: User = { 
          ...user, 
          role: 'student', 
          badges: user.badges.filter(b => b !== 'Verified Tutor')
        };
        setUser(updatedUser);
        localStorage.setItem('sb_user', JSON.stringify(updatedUser));
      }
      setTutors(prev => prev.map(t => (t.id === req.userId || (req.userEmail && t.id === req.userEmail)) ? { ...t, verified: false } : t));
      await syncUserTutorStatusAcrossPosts(req.userId, req.realName || req.userName, req.userEmail, false);
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

    // Sync all posts authored by this user
    await syncUserTutorStatusAcrossPosts(userId, undefined, undefined, true);

    alert(`User verified as Tutor successfully!`);
  };

  // Friending Actions
  const sendFriendRequest = async (targetUser: { id: string; name: string; avatar: string; email?: string; role?: string; institution?: string }) => {
    if (!targetUser.id || targetUser.id === user.id) return;

    // Block Rule: If a user blocks someone (or is blocked by them), they cannot view that profile, send a friend request, or follow them.
    if (isBlockedMutual(targetUser.id)) {
      alert("Action restricted: You cannot send a friend request to this user due to privacy blocking restrictions.");
      return;
    }

    if (friends.some(f => f.id === targetUser.id)) return;

    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newReq: FriendRequest = {
      id: `freq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: user.id || 'guest',
      senderName: user.name || 'StudyBook Learner',
      senderAvatar: user.avatar || SILHOUETTE_AVATAR,
      senderEmail: user.email,
      receiverId: targetUser.id,
      receiverName: targetUser.name,
      receiverAvatar: targetUser.avatar,
      receiverEmail: targetUser.email,
      status: 'pending',
      timestamp: formattedTime
    };

    setFriendRequests(prev => {
      const filtered = prev.filter(r => !(r.senderId === user.id && r.receiverId === targetUser.id));
      const next = [...filtered, newReq];
      localStorage.setItem('sb_friend_requests', JSON.stringify(next));
      return next;
    });

    playSound('send');

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'friendRequests', newReq.id), cleanForFirestore(newReq));
      } catch (e) {
        console.warn('Firebase send friend request failed:', e);
      }
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    const req = friendRequests.find(r => r.id === requestId);
    if (!req) return;

    // User A (Sender) represented as a Friend for User B (Current User)
    const userAFriendForB: Friend = {
      id: req.senderId,
      userId: user.id,
      friendId: req.senderId,
      name: req.senderName,
      avatar: req.senderAvatar,
      email: req.senderEmail,
      addedAt: 'Just now',
      isOnline: true,
      lastActivityTime: new Date().toISOString()
    };

    // User B (Current User) represented as a Friend for User A (Sender)
    const userBFriendForA: Friend = {
      id: user.id,
      userId: req.senderId,
      friendId: user.id,
      name: user.name || 'Friend',
      avatar: user.avatar || SILHOUETTE_AVATAR,
      email: user.email,
      role: user.role,
      institution: user.institution,
      grade: user.grade,
      bio: user.bio,
      addedAt: 'Just now',
      isOnline: true,
      lastActivityTime: new Date().toISOString()
    };

    // 1. Optimistically update local state for current user (User B)
    setFriends(prev => {
      if (prev.some(f => f.id === userAFriendForB.id || (f as any).friendId === userAFriendForB.id)) return prev;
      const next = [...prev, userAFriendForB];
      localStorage.setItem('sb_friends', JSON.stringify(next));
      return next;
    });

    setFriendRequests(prev => {
      const next = prev.map(r => r.id === requestId ? { ...r, status: 'accepted' as const } : r);
      localStorage.setItem('sb_friend_requests', JSON.stringify(next));
      return next;
    });

    setUser(prev => {
      const existing = prev.friendIds || [];
      if (existing.includes(req.senderId)) return prev;
      const updated = { ...prev, friendIds: [...existing, req.senderId] };
      try { localStorage.setItem('sb_user', JSON.stringify(updated)); } catch (_) {}
      return updated;
    });

    // Automatically initialize active conversation thread with the new friend
    const dmKeyA = user.id || 'guest';
    const dmKeyB = req.senderId;
    const initialChatId = `dm_${[dmKeyA, dmKeyB].sort().join('_')}`;
    const isoNow = new Date().toISOString();

    setDirectChats(prev => {
      const alreadyHasChat = prev.some(c => 
        c.id === initialChatId || 
        c.participants.some(p => p.id === req.senderId)
      );
      if (alreadyHasChat) return prev;

      const newFriendChat: DirectChat = {
        id: initialChatId,
        participantIds: [dmKeyA, dmKeyB],
        participants: [
          { id: user.id || 'guest', name: user.name || 'You', avatar: user.avatar || SILHOUETTE_AVATAR, role: user.role },
          { id: req.senderId, name: req.senderName, avatar: req.senderAvatar, email: req.senderEmail }
        ],
        messages: [],
        lastUpdated: isoNow
      };

      const next = consolidateDirectChats([...prev, newFriendChat], user.id || 'u_current', user.name || '');
      try { localStorage.setItem('sb_direct_chats', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    playSound('pop');

    // 2. Perform atomic mutual two-way update in Firestore database
    if (isFirebaseConfigured) {
      try {
        const batch = writeBatch(db);

        // A. Update friend request status to accepted
        batch.update(doc(db, 'friendRequests', requestId), { 
          status: 'accepted',
          acceptedAt: new Date().toISOString()
        });

        // B. Add User A's ID to User B's friends list
        batch.set(doc(db, 'friends', `${user.id}_${req.senderId}`), cleanForFirestore(userAFriendForB));

        // C. Simultaneously add User B's ID to User A's friends list
        batch.set(doc(db, 'friends', `${req.senderId}_${user.id}`), cleanForFirestore(userBFriendForA));

        // D. Update user profile documents with reciprocal friendIds
        batch.set(doc(db, 'users', user.id), {
          friendIds: arrayUnion(req.senderId)
        }, { merge: true });

        batch.set(doc(db, 'users', req.senderId), {
          friendIds: arrayUnion(user.id)
        }, { merge: true });

        await batch.commit();
      } catch (e) {
        console.warn('Firebase two-way mutual accept friend request failed:', e);
      }
    }
  };

  const declineFriendRequest = async (requestId: string) => {
    setFriendRequests(prev => {
      const next = prev.map(r => r.id === requestId ? { ...r, status: 'declined' as const } : r);
      localStorage.setItem('sb_friend_requests', JSON.stringify(next));
      return next;
    });

    playSound('delete');

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'friendRequests', requestId), { status: 'declined' });
      } catch (e) {
        console.warn('Firebase decline friend request failed:', e);
      }
    }
  };

  const cancelFriendRequest = async (requestId: string) => {
    setFriendRequests(prev => {
      const next = prev.filter(r => r.id !== requestId);
      try {
        localStorage.setItem('sb_friend_requests', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    playSound('delete');

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'friendRequests', requestId));
      } catch (e) {
        console.warn('Firebase cancel friend request failed:', e);
      }
    }
  };

  const removeFriend = async (friendId: string) => {
    setFriends(prev => {
      const next = prev.filter(f => f.id !== friendId && (f as any).friendId !== friendId);
      localStorage.setItem('sb_friends', JSON.stringify(next));
      return next;
    });

    setUser(prev => {
      const existing = prev.friendIds || [];
      const updated = { ...prev, friendIds: existing.filter(id => id !== friendId) };
      try { localStorage.setItem('sb_user', JSON.stringify(updated)); } catch (_) {}
      return updated;
    });

    playSound('delete');

    if (isFirebaseConfigured) {
      try {
        const batch = writeBatch(db);
        // Mutual reciprocal deletion in Firestore
        batch.delete(doc(db, 'friends', `${user.id}_${friendId}`));
        batch.delete(doc(db, 'friends', `${friendId}_${user.id}`));
        batch.set(doc(db, 'users', user.id), {
          friendIds: arrayRemove(friendId)
        }, { merge: true });
        batch.set(doc(db, 'users', friendId), {
          friendIds: arrayRemove(user.id)
        }, { merge: true });
        await batch.commit();
      } catch (e) {
        console.warn('Firebase mutual remove friend failed:', e);
      }
    }
  };

  const getFriendshipStatus = (targetUserId: string): 'none' | 'pending_sent' | 'pending_received' | 'friends' => {
    if (friends.some(f => f.id === targetUserId || (f as any).friendId === targetUserId)) return 'friends';
    if (user.friendIds && user.friendIds.includes(targetUserId)) return 'friends';

    const sent = friendRequests.find(r => r.senderId === user.id && r.receiverId === targetUserId && r.status === 'pending');
    if (sent) return 'pending_sent';

    const received = friendRequests.find(r => r.receiverId === user.id && r.senderId === targetUserId && r.status === 'pending');
    if (received) return 'pending_received';

    return 'none';
  };

  // Blocking & Privacy Management
  const isUserBlocked = (userId?: string): boolean => {
    if (!userId) return false;
    return blockedUsers.some(b => b.id === userId);
  };

  const isBlockedByAuthor = (authorId?: string, postAuthorBlockedIds?: string[]): boolean => {
    if (!authorId) return false;
    if (Array.isArray(postAuthorBlockedIds) && postAuthorBlockedIds.includes(user.id)) return true;
    return false;
  };

  const isBlockedMutual = (targetUserId?: string): boolean => {
    if (!targetUserId) return false;
    if (isUserBlocked(targetUserId)) return true;
    if (isBlockedByAuthor(targetUserId)) return true;
    const targetObj = communityUsers.find(u => u.id === targetUserId);
    if (targetObj?.blockedUserIds && targetObj.blockedUserIds.includes(user.id)) return true;
    return false;
  };

  const blockUser = async (targetId: string, targetName: string, targetAvatar?: string) => {
    if (!targetId || targetId === user.id) return;

    const newBlocked: BlockedUser = {
      id: targetId,
      name: targetName || 'User',
      avatar: targetAvatar || SILHOUETTE_AVATAR,
      blockedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const next = [...blockedUsers.filter(b => b.id !== targetId), newBlocked];
    setBlockedUsers(next);
    localStorage.setItem('sb_blocked_users', JSON.stringify(next));

    // Remove from friends
    setFriends(prev => {
      const nextFriends = prev.filter(f => f.id !== targetId);
      localStorage.setItem('sb_friends', JSON.stringify(nextFriends));
      return nextFriends;
    });

    // Close any open chat with this user
    setOpenChatIds(prev => prev.filter(id => !id.includes(targetId)));
    setOpenDirectChatIds(prev => prev.filter(id => !id.includes(targetId)));

    // Update local user state
    setUser(prev => {
      const updated = {
        ...prev,
        blockedUserIds: next.map(b => b.id)
      };
      localStorage.setItem('sb_user', JSON.stringify(updated));
      return updated;
    });

    // Update posts authored by this user to include the blocked ID so target cannot view them
    setPosts(prev => prev.map(p => {
      if (p.authorId === user.id || p.user?.id === user.id) {
        return {
          ...p,
          blockedUserIds: Array.from(new Set([...(p.blockedUserIds || []), targetId])),
          authorBlockedUserIds: Array.from(new Set([...(p.authorBlockedUserIds || []), targetId]))
        };
      }
      return p;
    }));

    if (isFirebaseConfigured && user.id) {
      try {
        await setDoc(doc(db, 'users', user.id), {
          blockedUserIds: next.map(b => b.id)
        }, { merge: true });
      } catch (e) {
        console.warn('Failed to sync blocked user to Firestore:', e);
      }
    }

    playSound('delete');
  };

  const unblockUser = async (targetId: string) => {
    const next = blockedUsers.filter(b => b.id !== targetId);
    setBlockedUsers(next);
    localStorage.setItem('sb_blocked_users', JSON.stringify(next));

    setUser(prev => {
      const updated = {
        ...prev,
        blockedUserIds: next.map(b => b.id)
      };
      localStorage.setItem('sb_user', JSON.stringify(updated));
      return updated;
    });

    // Also remove from authored posts
    setPosts(prev => prev.map(p => {
      if (p.authorId === user.id || p.user?.id === user.id) {
        return {
          ...p,
          blockedUserIds: (p.blockedUserIds || []).filter(id => id !== targetId),
          authorBlockedUserIds: (p.authorBlockedUserIds || []).filter(id => id !== targetId)
        };
      }
      return p;
    }));

    if (isFirebaseConfigured && user.id) {
      try {
        await setDoc(doc(db, 'users', user.id), {
          blockedUserIds: next.map(b => b.id)
        }, { merge: true });
      } catch (e) {
        console.warn('Failed to sync unblock to Firestore:', e);
      }
    }

    playSound('pop');
  };

  // Facebook Style User Profile & Follow Actions
  const toggleFollowUser = async (targetUserId: string): Promise<{ success: boolean; message?: string }> => {
    if (!targetUserId || targetUserId === user.id) {
      return { success: false, message: "Cannot follow yourself." };
    }

    // Block Rule: If a user blocks someone (or is blocked by them), they cannot view that profile, send a friend request, or follow them.
    if (isBlockedMutual(targetUserId)) {
      alert("Action restricted: You cannot follow this user due to privacy blocking restrictions.");
      return { success: false, message: "Blocked user restriction" };
    }

    const isAlreadyFollowing = followingIds.includes(targetUserId);
    const nextFollowing = isAlreadyFollowing
      ? followingIds.filter(id => id !== targetUserId)
      : [...followingIds, targetUserId];

    setFollowingIds(nextFollowing);
    try {
      localStorage.setItem('sb_following_ids', JSON.stringify(nextFollowing));
    } catch (_) {}

    // Update community user's follower count
    setCommunityUsers(prev => prev.map(u => {
      if (u.id === targetUserId) {
        const currentCount = u.followersCount || 0;
        const newCount = isAlreadyFollowing ? Math.max(0, currentCount - 1) : currentCount + 1;
        const currentFollowers = Array.isArray(u.followedByUsers) ? u.followedByUsers : [];
        const nextFollowers = isAlreadyFollowing
          ? currentFollowers.filter(id => id !== user.id)
          : [...currentFollowers, user.id];
        return {
          ...u,
          followersCount: newCount,
          followedByUsers: nextFollowers
        };
      }
      return u;
    }));

    // Update current user's following count
    setUser(prev => {
      const updated = {
        ...prev,
        followingCount: nextFollowing.length,
        followingUserIds: nextFollowing
      };
      try {
        localStorage.setItem('sb_user', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    if (isAlreadyFollowing) {
      playSound('pop');
    } else {
      playSound('like');
    }

    if (isFirebaseConfigured && user.id) {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          followingUserIds: nextFollowing,
          followingCount: nextFollowing.length
        });
      } catch (err) {
        console.warn('Failed to sync following to Firestore:', err);
      }
    }

    return { success: true };
  };

  const toggleFollow = toggleFollowUser;

  const openUserProfile = (userId: string) => {
    playSound('tab');
    setViewingProfileUserId(userId);
    setActiveTab('profiles');
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem('sb_user', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    setCommunityUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updates } : u));

    if (isFirebaseConfigured && user.id) {
      try {
        await setDoc(doc(db, 'users', user.id), cleanForFirestore(updates), { merge: true });
      } catch (err) {
        console.warn('Failed to update profile in Firestore:', err);
      }
    }
    playSound('pop');
  };

  // Direct Messaging Actions across accounts
  const openDirectChat = (
    targetUser: { id: string; name: string; avatar: string; email?: string; role?: string; allowDMsFromStrangers?: boolean },
    initialMessage?: string,
    isMarketplaceInquiry?: boolean
  ) => {
    if (!targetUser.id) return;

    // Check if blocked
    if (isUserBlocked(targetUser.id)) {
      alert(`You have blocked ${targetUser.name}. To direct message them, please unblock them in Settings.`);
      return;
    }

    const isFriend = friends.some(f => 
      f.id === targetUser.id || 
      (targetUser.email && f.email && f.email.toLowerCase() === targetUser.email.toLowerCase()) ||
      (f.name.toLowerCase() === targetUser.name.toLowerCase())
    );

    // Check stranger DM permission (bypassed if explicit marketplace inquiry or admin)
    if (!isMarketplaceInquiry && targetUser.allowDMsFromStrangers === false && !isFriend && user.role !== 'admin') {
      alert(`${targetUser.name} only accepts direct messages from approved friends. Please send them a friend request first!`);
      return;
    }

    const targetName = (targetUser.name || '').trim().toLowerCase();
    const targetEmail = (targetUser.email || '').trim().toLowerCase();
    const targetId = (targetUser.id || '').trim().toLowerCase();

    // Check if target user has already created a chat with current user
    const existing = directChats.find(c => {
      if (c.id === `dm_${targetUser.id}`) return true;
      return c.participants.some(p => {
        const pId = (p.id || '').toLowerCase();
        const pName = (p.name || '').trim().toLowerCase();
        const pEmail = (p.email || '').trim().toLowerCase();
        // Skip current user
        if (pId === (user.id || '').toLowerCase() || pId === 'u_current' || pId === 'guest' || pName === (user.name || '').trim().toLowerCase()) {
          return false;
        }
        if (targetId && pId === targetId) return true;
        if (targetEmail && pEmail && pEmail === targetEmail) return true;
        if (targetName && pName && pName === targetName) return true;
        return false;
      });
    });

    const peerKey = targetUser.id || (targetUser.name || 'peer').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const myKey = user.id || 'guest';
    const chatId = existing ? existing.id : `dm_${[myKey, peerKey].sort().join('_')}`;

    if (!existing) {
      const newChat: DirectChat = {
        id: chatId,
        participants: [
          { id: user.id || 'guest', name: user.name || 'You', avatar: user.avatar || SILHOUETTE_AVATAR, role: user.role },
          { id: targetUser.id, name: targetUser.name, avatar: targetUser.avatar, email: targetUser.email, role: targetUser.role }
        ],
        messages: [],
        lastUpdated: new Date().toISOString()
      };

      setDirectChats(prev => {
        const next = consolidateDirectChats([...prev, newChat], user.id || 'u_current', user.name || '');
        localStorage.setItem('sb_direct_chats', JSON.stringify(next));
        return next;
      });

      if (isFirebaseConfigured) {
        setDoc(doc(db, 'directChats', chatId), cleanForFirestore(newChat)).catch(e => console.warn('Firebase create direct chat failed:', e));
      }
    }

    // If initial inquiry message is provided (e.g. from marketplace listing), send it directly
    if (initialMessage && initialMessage.trim()) {
      const msgContent = initialMessage.trim();
      const isoNow = new Date().toISOString();
      const formattedClockTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const newMsg: DirectMessage = {
        id: `dm_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: user.id || 'guest',
        senderName: user.name || 'You',
        senderAvatar: user.avatar || SILHOUETTE_AVATAR,
        receiverId: targetUser.id || 'receiver',
        receiverName: targetUser.name,
        receiverAvatar: targetUser.avatar,
        content: msgContent,
        timestamp: formattedClockTime,
        createdAt: isoNow,
        read: false
      };

      setDirectChats(prev => {
        const chatExists = prev.some(c => c.id === chatId);
        let updated: DirectChat[];
        if (chatExists) {
          updated = prev.map(c => {
            if (c.id === chatId) {
              const isDup = c.messages.some(m => m.content === msgContent && m.senderId === (user.id || 'guest'));
              if (isDup) return c;
              return {
                ...c,
                messages: [...c.messages, newMsg],
                lastUpdated: isoNow
              };
            }
            return c;
          });
        } else {
          updated = [...prev, {
            id: chatId,
            participants: [
              { id: user.id || 'guest', name: user.name || 'You', avatar: user.avatar || SILHOUETTE_AVATAR, role: user.role },
              { id: targetUser.id, name: targetUser.name, avatar: targetUser.avatar, email: targetUser.email, role: targetUser.role }
            ],
            messages: [newMsg],
            lastUpdated: isoNow
          }];
        }
        localStorage.setItem('sb_direct_chats', JSON.stringify(updated));
        return updated;
      });

      if (isFirebaseConfigured) {
        setDoc(doc(db, 'directChats', chatId), {
          messages: arrayUnion(cleanForFirestore(newMsg)),
          lastUpdated: isoNow
        }, { merge: true }).catch(e => console.warn('Firebase marketplace initial DM failed:', e));
      }
    }

    // Open chat window and ensure no duplicate window for the same person
    setOpenChatIds(prev => {
      const cleaned = prev.filter(id => {
        if (id === chatId) return true;
        if (id.startsWith('dm_')) {
          const chat = directChats.find(c => c.id === id);
          const isSame = chat?.participants.some(p => 
            (targetUser.id && p.id === targetUser.id) ||
            (targetUser.name && p.name && p.name.trim().toLowerCase() === targetUser.name.trim().toLowerCase())
          );
          if (isSame) return false;
        }
        return true;
      });
      if (cleaned.includes(chatId)) return cleaned;
      return [...cleaned, chatId].slice(-3);
    });

    setOpenDirectChatIds(prev => {
      if (prev.includes(chatId)) return prev;
      return [...prev, chatId].slice(-3);
    });

    // Reset Condition: Clear counter to 0 the exact moment the user opens that specific chat box
    markChatAsRead(chatId);
    setActiveOpenChatId(chatId);

    playSound('pop');
  };

  const sendDirectMessage = async (chatId: string, content: string) => {
    if (!content.trim()) return;

    // Check if target recipient is blocked
    const chat = directChats.find(c => c.id === chatId);
    const otherP = chat?.participants.find(p => p.id !== user.id);
    if (otherP && isUserBlocked(otherP.id)) {
      alert('You have blocked this user. Unblock them in Settings to send messages.');
      return;
    }

    const otherId = otherP?.id || (chatId.startsWith('gc_') || chatId.startsWith('group_') ? 'group' : (chatId.replace('dm_', '').split('_').find(id => id !== user.id) || 'unknown'));
    const isoNow = new Date().toISOString();
    const formattedClockTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newMsg: DirectMessage = {
      id: `dm_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: user.id || 'guest',
      senderName: user.name || 'StudyBook Learner',
      senderAvatar: user.avatar || SILHOUETTE_AVATAR,
      receiverId: otherId,
      receiverName: otherP?.name,
      receiverAvatar: otherP?.avatar,
      content: content.trim(),
      timestamp: formattedClockTime,
      createdAt: isoNow,
      read: false
    };

    setDirectChats(prev => {
      const targetIndex = prev.findIndex(c => c.id === chatId);
      let updatedList: DirectChat[] = [];

      if (targetIndex >= 0) {
        const existingChat = prev[targetIndex];
        const updatedChat: DirectChat = {
          ...existingChat,
          type: existingChat.isGroupChat ? 'group_chat' : 'individual_dm',
          participantIds: [user.id || 'guest', otherId].filter(id => id && id !== 'unknown' && id !== 'group'),
          messages: [...existingChat.messages, newMsg],
          lastUpdated: isoNow
        };
        updatedList = [...prev];
        updatedList[targetIndex] = updatedChat;
      } else {
        const newChat: DirectChat = {
          id: chatId,
          type: 'individual_dm',
          participantIds: [user.id || 'guest', otherId].filter(id => id && id !== 'unknown' && id !== 'group'),
          participants: [
            { id: user.id, name: user.name, avatar: user.avatar },
            ...(otherP ? [otherP] : [])
          ],
          messages: [newMsg],
          lastUpdated: isoNow
        };
        updatedList = [...prev, newChat];
      }

      const consolidated = consolidateDirectChats(updatedList, user.id || 'u_current', user.name || '');
      localStorage.setItem('sb_direct_chats', JSON.stringify(consolidated));

      // Also update friend's lastActivityTime in friends state and localStorage
      if (otherP) {
        setFriends(fList => {
          const next = fList.map(f => {
            if (f.id === otherP.id || (f.email && otherP.email && f.email.toLowerCase() === otherP.email.toLowerCase())) {
              return { ...f, lastActivityTime: isoNow };
            }
            return f;
          });
          try { localStorage.setItem('sb_friends', JSON.stringify(next)); } catch (_) {}
          return next;
        });
      }

      if (isFirebaseConfigured) {
        const chatToSave = consolidated.find(c => c.id === chatId) || updatedList.find(c => c.id === chatId);
        if (chatToSave) {
          setDoc(doc(db, 'directChats', chatId), cleanForFirestore(chatToSave)).catch(e => console.warn('Firebase save direct message failed:', e));
        }
      }

      return consolidated;
    });

    playSound('send');
  };

  const closeDirectChat = (chatId: string) => {
    setOpenDirectChatIds(prev => prev.filter(id => id !== chatId));
    setOpenChatIds(prev => prev.filter(id => id !== chatId));
    if (activeOpenChatId === chatId) {
      setActiveOpenChatId(null);
    }
  };

  const isChatPinned = (chatId: string, alternateId?: string): boolean => {
    if (!chatId && !alternateId) return false;
    return pinnedChatIds.some(id => {
      const match1 = chatId && (id === chatId || id.replace('group_', '') === chatId || `group_${id}` === chatId);
      const match2 = alternateId && (id === alternateId || id.replace('group_', '') === alternateId || `group_${id}` === alternateId);
      return Boolean(match1 || match2);
    });
  };

  const togglePinChat = (chatId: string, alternateId?: string): { success: boolean; isPinned: boolean; message?: string } => {
    const currentlyPinned = isChatPinned(chatId, alternateId);
    if (currentlyPinned) {
      playSound('pop');
      const nextPinned = pinnedChatIds.filter(id => 
        id !== chatId && 
        id !== alternateId && 
        id.replace('group_', '') !== chatId && 
        `group_${id}` !== chatId &&
        (!alternateId || (id.replace('group_', '') !== alternateId && `group_${id}` !== alternateId))
      );
      setPinnedChatIds(nextPinned);
      try { localStorage.setItem('sb_pinned_chats', JSON.stringify(nextPinned)); } catch (_) {}
      
      const updatedUser: User = { ...user, pinnedChatIds: nextPinned };
      setUser(updatedUser);
      try { localStorage.setItem('sb_user', JSON.stringify(updatedUser)); } catch (_) {}

      if (isFirebaseConfigured && user.id) {
        setDoc(doc(db, 'users', user.id), { pinnedChatIds: nextPinned }, { merge: true }).catch(err => {
          console.warn('Failed to sync pinned chats to Firestore:', err);
        });
      }
      return { success: true, isPinned: false, message: 'Unpinned conversation' };
    } else {
      if (pinnedChatIds.length >= 10) {
        return { 
          success: false, 
          isPinned: false, 
          message: 'Maximum limit of 10 pinned chats reached. Please unpin another chat first.' 
        };
      }
      playSound('pop');
      const targetIdToSave = chatId;
      const nextPinned = [targetIdToSave, ...pinnedChatIds].slice(0, 10);
      setPinnedChatIds(nextPinned);
      try { localStorage.setItem('sb_pinned_chats', JSON.stringify(nextPinned)); } catch (_) {}

      const updatedUser: User = { ...user, pinnedChatIds: nextPinned };
      setUser(updatedUser);
      try { localStorage.setItem('sb_user', JSON.stringify(updatedUser)); } catch (_) {}

      if (isFirebaseConfigured && user.id) {
        setDoc(doc(db, 'users', user.id), { pinnedChatIds: nextPinned }, { merge: true }).catch(err => {
          console.warn('Failed to sync pinned chats to Firestore:', err);
        });
      }
      return { success: true, isPinned: true, message: 'Pinned conversation to top' };
    }
  };

  const updateGlobalAlgorithmConfig = async (newConfig: Partial<GlobalAlgorithmConfig>): Promise<{ success: boolean; message?: string }> => {
    const currentEmail = (user.email || localStorage.getItem('sb_current_email') || auth.currentUser?.email || '').toLowerCase();
    if (currentEmail !== 'billkute030709@gmail.com') {
      return { success: false, message: 'Only billkute030709@gmail.com is authorized to modify global algorithm settings.' };
    }

    const updated: GlobalAlgorithmConfig = {
      ...globalAlgorithmConfig,
      ...newConfig,
      updatedAt: new Date().toISOString(),
      updatedBy: 'billkute030709@gmail.com'
    };

    setGlobalAlgorithmConfig(updated);
    try {
      localStorage.setItem('sb_global_algorithm_config', JSON.stringify(updated));
    } catch (_) {}

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'globalConfig', 'algorithm'), cleanForFirestore(updated), { merge: true });
      } catch (err) {
        console.warn('Failed to save global algorithm config to Firestore:', err);
      }
    }

    return { success: true, message: 'Global algorithm configuration updated and applied successfully!' };
  };

  const createGroupChat = async (groupName: string, friendIds: string[]): Promise<DirectChat | null> => {
    if (!groupName.trim()) {
      throw new Error('Group chat name is required');
    }
    if (!Array.isArray(friendIds) || friendIds.length === 0) {
      throw new Error('Please select at least one friend to add to the group chat.');
    }

    // Only allow friends to be added
    const selectedFriends = friends.filter(f => friendIds.includes(f.id));
    if (selectedFriends.length === 0) {
      throw new Error('Added members must be on your friends list.');
    }

    const newChatId = `gc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newChat: DirectChat = {
      id: newChatId,
      isGroupChat: true,
      groupName: groupName.trim(),
      adminId: user.id || 'u_current',
      participants: [
        {
          id: user.id || 'u_current',
          name: user.name || 'You',
          avatar: user.avatar || SILHOUETTE_AVATAR,
          email: user.email,
          role: user.role
        },
        ...selectedFriends.map(f => ({
          id: f.id,
          name: f.name,
          avatar: f.avatar || SILHOUETTE_AVATAR,
          email: f.email,
          role: f.role
        }))
      ],
      messages: [
        {
          id: `dm_msg_${Date.now()}`,
          senderId: user.id || 'u_current',
          senderName: user.name || 'You',
          senderAvatar: user.avatar || SILHOUETTE_AVATAR,
          receiverId: 'group',
          content: `👋 Created group chat "${groupName.trim()}" with ${selectedFriends.map(f => f.name).join(', ')}.`,
          timestamp: 'Just now',
          read: true
        }
      ],
      lastUpdated: new Date().toISOString()
    };

    setDirectChats(prev => {
      const updated = [newChat, ...prev];
      const consolidated = consolidateDirectChats(updated, user.id || 'u_current', user.name || '');
      try {
        localStorage.setItem('sb_direct_chats', JSON.stringify(consolidated));
      } catch (_) {}
      return consolidated;
    });

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'directChats', newChatId), cleanForFirestore(newChat));
      } catch (e) {
        console.warn('Firebase save group chat failed:', e);
      }
    }

    playSound('pop');
    return newChat;
  };

  return (
    <AppContext.Provider value={{
      globalAlgorithmConfig,
      updateGlobalAlgorithmConfig,
      createGroupChat,
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

      friends,
      friendRequests,
      directChats,
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      cancelFriendRequest,
      removeFriend,
      getFriendshipStatus,

      openDirectChat,
      sendDirectMessage,
      closeDirectChat,
      openDirectChatIds,

      pinnedChatIds,
      togglePinChat,
      isChatPinned,

      chatNotificationPrefs,
      toggleChatNotifications,
      areChatNotificationsEnabled,
      activeChatNotifications,
      dismissChatNotification,
      activeOpenChatId,
      setActiveOpenChatId,
      markChatAsRead,

      blockedUsers,
      isUserBlocked,
      blockUser,
      unblockUser,
      isBlockedByAuthor,
      isBlockedMutual,

      communityUsers,
      setCommunityUsers,
      viewingProfileUserId,
      setViewingProfileUserId,
      openUserProfile,
      updateUserProfile,

      followingIds,
      creatorScores,
      toggleFollowUser,
      toggleFollow,
      recordCreatorInteraction,

      joinedGroupIds,
      groupInteractions,
      recordGroupInteraction,
      toggleJoinGroup,
      
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
      
      setUserGrade,
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
      addReel,
      deleteReel,
      createStudyGroup,
      togglePinGroupFile,
      deleteGroupFile,
      updateGroupMemberRole,
      removeGroupMember,
      transferAdminOwnership,
      leaveStudyGroup,
      deleteStudyGroup,
      updateGroupSettings,
      updateGroupDetails,
      requestJoinGroup,
      approveJoinRequest,
      rejectJoinRequest,
      approvePendingPost,
      rejectPendingPost,
      selectedPostId,
      openSinglePost,
      closeSinglePost,
      confirmModal,
      showConfirmModal,
      closeConfirmModal,
      addMarketplaceItem,
      deleteMarketplaceItem,
      sendGroupMessage,
      exportResume,
      speakText,
      stopSpeaking,
      isSpeaking,
      isUserVerifiedTutor,
      
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
