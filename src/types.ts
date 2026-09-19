export const GRADE_LEVELS = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'College'
] as const;

export type GradeLevel = typeof GRADE_LEVELS[number];

export interface AlgorithmScoreBreakdown {
  totalScore: number;
  freshnessScore: number;
  hoursAgo: number;
  decayAmount: number;
  decayRatePerHour: number; // 2.5 pts/hr
  baseFreshness: number; // 50 pts
  gradeMatchBoost: number;
  popularityScore: number;
  subjectScore: number;
  isGradeMatch: boolean;
  postGrade?: string;
  userGrade?: string;
  likesScore?: number;
  languageBoost?: number;
  seenPenalty?: number;
  isSeen?: boolean;
  // Creator Points & Inactivity Decay
  creatorScore?: number;
  isFollowingCreator?: boolean;
  creatorFollowBoost?: number;
  creatorInteractionScore?: number;
  creatorDecayAmount?: number;
  creatorInactivityHours?: number;
  // Group Post & Interaction Score Boost
  groupBoost?: number;
  isGroupPost?: boolean;
  groupInteractionScore?: number;
}

export interface BlockedUser {
  id: string;
  name: string;
  avatar?: string;
  blockedAt?: string;
}

export interface CreatorInteractions {
  likes: number;
  comments: number;
  saves: number;
}

export interface CreatorScore {
  creatorId: string;
  score: number; // Accumulated interaction points
  lastInteractionTimestamp: string; // ISO string of last like, comment, or save
  interactions: CreatorInteractions;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  coverPhoto?: string;
  bio?: string;
  role: 'student' | 'tutor' | 'creator' | 'admin';
  streak: number; // consecutive days
  streakLevel: 'none' | 'bronze' | 'silver' | 'gold';
  badges: string[]; // e.g., 'Top Contributor', 'Math Whiz', 'Verified Tutor'
  institution?: string;
  grade?: string; // Grade 1 to Grade 12 or College
  language?: string; // Preferred language (e.g. English, Vietnamese)
  seenPostIds?: string[]; // IDs of posts already viewed by user
  hasCompletedOnboarding?: boolean;
  lastLoginDate?: string; // YYYY-MM-DD
  allowDMsFromStrangers?: boolean;
  hideProfilePosts?: boolean;
  blockedUserIds?: string[];
  followersCount?: number;
  followingCount?: number;
  followedByUsers?: string[];
  followingUserIds?: string[];
  subjects?: string[];
  joinedGroupIds?: string[];
  pinnedChatIds?: string[];
  friendIds?: string[];
  groupInteractions?: Record<string, {
    score: number;
    lastInteractionTimestamp?: string;
    messagesSent?: number;
    postsCreated?: number;
    filesContributed?: number;
    reactionsCount?: number;
  }>;
}

export type UserProfile = User;

export interface RequestHistoryLog {
  timestamp: string;
  action: string;
  performedBy?: string;
  details?: string;
}

export interface TutorRequest {
  id: string;
  userId: string;
  userName: string;
  realName?: string;
  school?: string;
  description?: string;
  userAvatar: string;
  userEmail?: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedSubjects?: string[];
  historyLogs?: RequestHistoryLog[];
}

export type AcademicReactionType = 'helpful' | 'insightful' | 'confused';

export interface Comment {
  id: string;
  postId: string;
  user: User;
  content: string;
  timestamp: string;
  helpfulCount: number;
  baseHelpfulCount?: number;
  hasHelped?: boolean;
  helpedUserIds?: string[];
}

export interface Post {
  id: string;
  user: User;
  authorId?: string;
  authorName?: string;
  title?: string;
  content: string;
  text?: string; // Text field alias for algorithm processing
  tags?: string[];
  subject: string; // Math, Physics, English, Chemistry, Exam Prep, Biology
  grade?: string; // e.g., 'Grade 10', 'College', 'All'
  gradeLevel?: string; // Grade level alias for algorithm processing
  language?: string; // e.g., 'English', 'Vietnamese', 'All'
  likes?: number; // Total like count alias for algorithm processing
  timestamp: string;
  createdDate?: string | Date; // Date alias for algorithm processing
  attachment?: {
    type: 'pdf' | 'doc' | 'link' | 'youtube' | 'image' | 'video' | 'file';
    title: string;
    url: string;
    size?: string;
    mimetype?: string;
  };
  reactions: {
    helpful: number;
    insightful: number;
    confused: number;
    verified?: number;
  };
  baseReactions?: {
    helpful: number;
    insightful: number;
    confused: number;
    verified?: number;
  };
  currentUserReaction?: AcademicReactionType | null;
  userReactions?: {
    helpful?: boolean;
    insightful?: boolean;
    confused?: boolean;
    verified?: boolean;
  };
  userReactionsMap?: Record<string, AcademicReactionType | Partial<Record<AcademicReactionType, boolean>>>;
  comments: Comment[];
  shares: number;
  isSaved?: boolean;
  savedFolderId?: string;
  savedByUsersMap?: Record<string, { isSaved: boolean; savedFolderId?: string }>;
  isAnonymous?: boolean;
  groupId?: string;
  groupName?: string;
  groupAvatar?: string;
  blockedUserIds?: string[];
  authorBlockedUserIds?: string[];
  status?: 'approved' | 'pending' | 'rejected';
}

export type GroupRole = 'admin' | 'leader' | 'moderator' | 'member';
export const GroupRole = {
  ADMIN: 'admin' as const,
  LEADER: 'leader' as const,
  MODERATOR: 'moderator' as const,
  MEMBER: 'member' as const,
};

export interface GroupJoinRequest {
  id: string;
  groupId?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userEmail?: string;
  userGrade?: string;
  name?: string;
  avatar?: string;
  grade?: string;
  requestedAt: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface GroupSettings {
  whoCanPost: 'all' | 'admin_and_leader'; // Who can post? (Admin and Group Leader only OR Everyone)
  whoCanChat: 'all' | 'admin_and_leader'; // Who can participate in group chat? (Admin and Group Leader only OR Everyone)
  joinPolicy: 'free' | 'approval'; // Can people join freely? (Yes = instant entry OR No = must be approved by an Admin or Group Leader)
  requirePostApproval: boolean; // If members are allowed to post, do their posts need to be approved before becoming public? (Yes = holds post in approval queue OR No = publishes instantly)
}

export interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  role: GroupRole;
  email?: string;
  grade?: string;
  joinedAt?: string;
}

export interface GroupFile {
  id: string;
  title: string;
  uploader: string;
  uploaderId?: string;
  date: string;
  size: string;
  type: string;
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  coverImage: string;
  description: string;
  category: string;
  creatorId?: string;
  memberCount: number;
  membersCount?: number;
  members?: GroupMember[];
  isMember?: boolean;
  memberUserIds?: string[];
  leaderUserIds?: string[];
  adminUserIds?: string[];
  memberRoles?: Record<string, GroupRole>;
  settings?: GroupSettings;
  pendingJoinRequests?: GroupJoinRequest[];
  tags?: string[];
  countdownDate?: string; // Target date for major exams
  countdownLabel?: string; // e.g., "National Math Finals"
  files: GroupFile[];
  events: {
    id: string;
    title: string;
    tutor: string;
    time: string;
    attendees: number;
    baseAttendees?: number;
    isGoing?: boolean;
    attendeeUserIds?: string[];
  }[];
}

export interface Review {
  id: string;
  authorName: string;
  authorAvatar: string;
  rating: number;
  content: string;
  date: string;
}

export interface TutorPage {
  id: string;
  name: string;
  avatar: string;
  coverPhoto: string;
  bio: string;
  followers: number;
  baseFollowers?: number;
  isFollowing?: boolean;
  followedByUsers?: string[];
  subjects: string[];
  reviews: Review[];
  verified: boolean;
}

export interface Reel {
  id: string;
  tutorName: string;
  tutorAvatar: string;
  authorId?: string;
  videoUrl: string; // Standard video or placeholder color
  thumbnailUrl?: string;
  caption: string;
  subject: string;
  grade?: string;
  audioTrack?: string;
  likes: number;
  baseLikes?: number;
  comments: number;
  hasLiked?: boolean;
  likedByUsers?: string[];
  worksheet?: {
    title: string;
    url: string;
    size: string;
  };
  createdAt?: string;
  timestamp?: string;
  createdDate?: string;
  algorithmScore?: number;
  scoreBreakdown?: AlgorithmScoreBreakdown;
  seenPenalty?: number;
  isSeen?: boolean;
}

export interface BinderFolder {
  id: string;
  name: string;
  color: string;
  subject?: string;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  price: number; // 0 for free
  image: string;
  images?: string[]; // multi-image attachment uploads for product listings
  category: 'textbooks' | 'hardware' | 'notes' | 'other';
  distance: number; // in km
  seller: {
    id?: string;
    name: string;
    avatar: string;
    rating: number;
  };
  description: string;
  isFree?: boolean;
  createdAt?: string;
}

export interface Message {
  id: string;
  sender: User;
  content: string;
  timestamp: string;
  isImage?: boolean;
  createdAt?: string;
}

export interface GroupChat {
  groupId: string;
  type?: 'study_group';
  groupName: string;
  messages: Message[];
  lastUpdated?: string;
}

export interface Friend {
  id: string;
  userId?: string; // Owning user ID in Firestore
  friendId?: string; // Friend's user ID
  name: string;
  avatar: string;
  email?: string;
  role?: string;
  grade?: string;
  institution?: string;
  bio?: string;
  addedAt: string;
  isOnline?: boolean;
  lastActivityTime?: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderEmail?: string;
  receiverId: string;
  receiverName?: string;
  receiverAvatar?: string;
  receiverEmail?: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName?: string;
  receiverAvatar?: string;
  content: string;
  text?: string;
  timestamp: string;
  isImage?: boolean;
  read?: boolean;
  createdAt?: string;
}

export interface DirectChat {
  id: string; // e.g. "dm_userA_userB" or "gc_..."
  type?: 'individual_dm' | 'group_chat';
  isGroupChat?: boolean;
  groupName?: string;
  groupAvatar?: string;
  adminId?: string;
  participantIds?: string[]; // Strictly IDs of participating users for secure Firestore indexing and querying
  participants: {
    id: string;
    name: string;
    avatar: string;
    email?: string;
    role?: string;
  }[];
  messages: DirectMessage[];
  lastUpdated: string;
  unreadCount?: number;
}

export interface ActiveChatNotification {
  id: string; // e.g. senderId or chatId
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  targetType: 'direct' | 'group';
  count: number; // dynamically updated counter e.g. 1, 2, 3...
  latestMessage: string;
  timestamp: string;
  title?: string;
}

export interface ChatNotificationConfig {
  targetId: string; // friend ID or group ID
  enabled: boolean;
  updatedAt?: string;
}

export interface GlobalAlgorithmConfig {
  baseFreshness: number; // default: 50
  decayPerHour: number; // default: 2.5
  freshnessMaxScore: number; // default: 50
  freshnessDecayRatePerHour: number; // default: 2.5

  gradeMatchBoost: number; // default: 35
  gradeMatchingScore: number; // default: 35
  allGradesBoost: number; // default: 15
  languageMatchBoost: number; // default: 25
  followCreatorBoost: number; // default: 35
  creatorFollowBoost: number; // default: 35
  groupMemberPostBoost: number; // default: 20

  verifiedReactionWeight: number; // default: 5
  verifiedSolutionScore: number; // default: 10
  insightfulReactionWeight: number; // default: 3
  helpfulReactionWeight: number; // default: 3
  reactionScore: number; // default: 3
  commentWeight: number; // default: 2
  commentScore: number; // default: 2
  randomizeBuckets: boolean;

  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_GLOBAL_ALGORITHM_CONFIG: GlobalAlgorithmConfig = {
  baseFreshness: 50,
  decayPerHour: 2.5,
  freshnessMaxScore: 50,
  freshnessDecayRatePerHour: 2.5,

  gradeMatchBoost: 35,
  gradeMatchingScore: 35,
  allGradesBoost: 15,
  languageMatchBoost: 25,
  followCreatorBoost: 35,
  creatorFollowBoost: 35,
  groupMemberPostBoost: 20,

  verifiedReactionWeight: 5,
  verifiedSolutionScore: 10,
  insightfulReactionWeight: 3,
  helpfulReactionWeight: 3,
  reactionScore: 3,
  commentWeight: 2,
  commentScore: 2,
  randomizeBuckets: false
};

export interface AppSettings {
  darkMode: boolean;
  incognitoMode: boolean;
  language: string[]; // ['en', 'vi', etc]
  region: string;
  subjectWeights: {
    Math: number;
    Physics: number;
    English: number;
    Chemistry: number;
    Other?: number;
  };
  muteTags: string[];
  spoilerProtection: boolean;
  ttsEnabled: boolean;
  soundEnabled?: boolean;
  soundVolume?: number; // 0 to 1
  showStreakToOthers?: boolean;
  allowDMsFromStrangers?: boolean;
  hideProfilePosts?: boolean;
  blockedUsers?: BlockedUser[];
}
