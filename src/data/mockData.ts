import { User, Post, StudyGroup, TutorPage, Reel, MarketplaceItem, GroupChat, AppSettings } from '../types';

export const SILHOUETTE_AVATAR = 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%2394a3b8%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23cbd5e1%22/%3E%3Cpath d=%22M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z%22/%3E%3C/svg%3E';

export const currentUser: User = {
  id: 'u_current',
  name: '',
  avatar: SILHOUETTE_AVATAR,
  role: 'student',
  streak: 0,
  streakLevel: 'none',
  badges: [],
  institution: '',
  hasCompletedOnboarding: false
};

export const sampleUsers: Record<string, User> = {};

export const initialPosts: Post[] = [];

export const initialGroups: StudyGroup[] = [];

export const initialTutors: TutorPage[] = [];

export const initialReels: Reel[] = [];

export const initialMarketplaceItems: MarketplaceItem[] = [];

export const initialGroupChats: GroupChat[] = [];

export const defaultSettings: AppSettings = {
  darkMode: false,
  incognitoMode: false,
  language: ['vi'],
  region: 'VN',
  subjectWeights: {
    Math: 1,
    Physics: 1,
    English: 1,
    Chemistry: 1
  },
  muteTags: [],
  spoilerProtection: false,
  ttsEnabled: true
};
