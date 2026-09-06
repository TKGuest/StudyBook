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
}

export interface BlockedUser {
  id: string;
  name: string;
  avatar?: string;
  blockedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
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
  blockedUserIds?: string[];
}

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
  content: string;
  text?: string; // Text field alias for algorithm processing
  subject: string; // Math, Physics, English, Chemistry, Exam Prep, Biology
  grade?: string; // e.g., 'Grade 10', 'College', 'All'
  gradeLevel?: string; // Grade level alias for algorithm processing
  language?: string; // e.g., 'English', 'Vietnamese', 'All'
  likes?: number; // Total like count alias for algorithm processing
  timestamp: string;
  createdDate?: string | Date; // Date alias for algorithm processing
  attachment?: {
    type: 'pdf' | 'doc' | 'link' | 'youtube';
    title: string;
    url: string;
    size?: string;
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
  blockedUserIds?: string[];
  authorBlockedUserIds?: string[];
}

export interface StudyGroup {
  id: string;
  name: string;
  coverImage: string;
  description: string;
  category: string;
  memberCount: number;
  countdownDate?: string; // Target date for major exams
  countdownLabel?: string; // e.g., "National Math Finals"
  files: {
    id: string;
    title: string;
    uploader: string;
    date: string;
    size: string;
    type: string;
  }[];
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
  videoUrl: string; // Standard video or placeholder color
  caption: string;
  subject: string;
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
  category: 'textbooks' | 'hardware' | 'notes' | 'other';
  distance: number; // in km
  seller: {
    name: string;
    avatar: string;
    rating: number;
  };
  description: string;
  isFree?: boolean;
}

export interface Message {
  id: string;
  sender: User;
  content: string;
  timestamp: string;
  isImage?: boolean;
}

export interface GroupChat {
  groupId: string;
  groupName: string;
  messages: Message[];
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  role?: string;
  institution?: string;
  addedAt: string;
  isOnline?: boolean;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderEmail?: string;
  receiverId: string;
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
  timestamp: string;
  isImage?: boolean;
  read?: boolean;
}

export interface DirectChat {
  id: string; // e.g. "dm_userA_userB"
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
  blockedUsers?: BlockedUser[];
}
