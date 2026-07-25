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
  hasCompletedOnboarding?: boolean;
  lastLoginDate?: string; // YYYY-MM-DD
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
  content: string;
  subject: string; // Math, Physics, English, Chemistry, Exam Prep, Biology
  timestamp: string;
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
  price: number; // 0 for VNĐ (freebie)
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
  };
  muteTags: string[];
  spoilerProtection: boolean;
  ttsEnabled: boolean;
}
