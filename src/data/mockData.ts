import { User, Post, StudyGroup, TutorPage, Reel, MarketplaceItem, GroupChat, AppSettings, Friend, FriendRequest, DirectChat } from '../types';

export const SILHOUETTE_AVATAR = 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%2394a3b8%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23cbd5e1%22/%3E%3Cpath d=%22M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z%22/%3E%3C/svg%3E';

export const currentUser: User = {
  id: 'u_current',
  name: '',
  avatar: SILHOUETTE_AVATAR,
  role: 'student',
  grade: 'Grade 10',
  language: 'English',
  seenPostIds: [],
  streak: 0,
  streakLevel: 'none',
  badges: [],
  institution: '',
  hasCompletedOnboarding: false
};

export const sampleUsers: Record<string, User> = {
  u_sarah: {
    id: 'u_sarah',
    name: 'Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    role: 'student',
    grade: 'Grade 10',
    streak: 14,
    streakLevel: 'bronze',
    badges: ['Honor Roll', 'Math Whiz'],
    institution: 'Oakridge High School'
  },
  u_marcus: {
    id: 'u_marcus',
    name: 'Marcus Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    role: 'student',
    grade: 'Grade 11',
    streak: 42,
    streakLevel: 'silver',
    badges: ['Physics Club', 'Top Solver'],
    institution: 'Westwood Academy'
  },
  u_elena: {
    id: 'u_elena',
    name: 'Prof. Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    role: 'tutor',
    grade: 'College',
    streak: 85,
    streakLevel: 'gold',
    badges: ['Verified Tutor', 'STEM Educator'],
    institution: 'Metro State University'
  },
  u_david: {
    id: 'u_david',
    name: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    role: 'student',
    grade: 'Grade 10',
    streak: 7,
    streakLevel: 'bronze',
    badges: ['Chemistry Explorer'],
    institution: 'Lincoln Science High'
  },
  u_maya: {
    id: 'u_maya',
    name: 'Maya Patel',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    role: 'student',
    grade: 'Grade 12',
    streak: 110,
    streakLevel: 'gold',
    badges: ['IELTS 8.5', 'National Scholar'],
    institution: 'Cambridge Prep'
  }
};

export const initialPosts: Post[] = [
  {
    id: 'p_fresh_1',
    user: sampleUsers.u_sarah,
    authorId: sampleUsers.u_sarah.id,
    authorName: sampleUsers.u_sarah.name,
    content: 'Just finished writing a clean summary sheet for Quadratic Formula & Parabola Graphing with step-by-step vertex shortcuts! Let me know if you want the PDF worksheet.',
    subject: 'Math',
    grade: 'Grade 10',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago (~0.25h) -> Freshness ~49.4 pts
    reactions: { helpful: 8, insightful: 5, confused: 1, verified: 1 },
    comments: [
      {
        id: 'c_1',
        postId: 'p_fresh_1',
        user: sampleUsers.u_david,
        content: 'This vertex shortcut saved me so much time on practice test #3! Thank you!',
        timestamp: '10 mins ago',
        helpfulCount: 3
      }
    ],
    shares: 4,
    attachment: {
      type: 'pdf',
      title: 'Grade10_Quadratic_Shortcuts_Summary.pdf',
      url: '#',
      size: '1.2 MB'
    }
  },
  {
    id: 'p_fresh_2',
    user: sampleUsers.u_david,
    authorId: sampleUsers.u_david.id,
    authorName: sampleUsers.u_david.name,
    content: 'Quick quiz question for Grade 10 Chem: Why does electronegativity increase across a period from left to right on the periodic table? Drop your reasoning below without looking it up!',
    subject: 'Chemistry',
    grade: 'Grade 10',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago -> Freshness = 50 - 2.5*2 = 45.0 pts
    reactions: { helpful: 14, insightful: 9, confused: 2, verified: 0 },
    comments: [
      {
        id: 'c_2',
        postId: 'p_fresh_2',
        user: sampleUsers.u_sarah,
        content: 'Effective nuclear charge increases while energy levels remain identical, pulling valence electrons tighter!',
        timestamp: '1 hour ago',
        helpfulCount: 6
      }
    ],
    shares: 2
  },
  {
    id: 'p_physics_marcus',
    user: sampleUsers.u_marcus,
    authorId: sampleUsers.u_marcus.id,
    authorName: sampleUsers.u_marcus.name,
    content: 'Grade 11 Physics: Exploring Conservation of Angular Momentum with interactive turntable simulations. Here is a curated document showing derivation formulas.',
    subject: 'Physics',
    grade: 'Grade 11',
    timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), // 6 hours ago -> Freshness = 50 - 2.5*6 = 35.0 pts
    reactions: { helpful: 18, insightful: 12, confused: 0, verified: 1 },
    comments: [],
    shares: 7,
    attachment: {
      type: 'doc',
      title: 'Angular_Momentum_Derivations_G11.docx',
      url: '#',
      size: '890 KB'
    }
  },
  {
    id: 'p_college_elena',
    user: sampleUsers.u_elena,
    authorId: sampleUsers.u_elena.id,
    authorName: sampleUsers.u_elena.name,
    content: 'College Lecture Series: Multivariable Calculus cheat sheet and double integral polar coordinate transforms. Essential for second-year engineering and physics majors.',
    subject: 'Math',
    grade: 'College',
    timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), // 12 hours ago -> Freshness = 50 - 2.5*12 = 20.0 pts
    reactions: { helpful: 32, insightful: 25, confused: 3, verified: 4 },
    comments: [],
    shares: 19,
    attachment: {
      type: 'pdf',
      title: 'Multivariable_Calculus_Transforms_College.pdf',
      url: '#',
      size: '2.4 MB'
    }
  },
  {
    id: 'p_older_maya',
    user: sampleUsers.u_maya,
    authorId: sampleUsers.u_maya.id,
    authorName: sampleUsers.u_maya.name,
    content: 'Grade 12 Academic English: Writing high-scoring argumentative essays. The 5-paragraph structure vs. nuanced thematic development.',
    subject: 'English',
    grade: 'Grade 12',
    timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(), // 20 hours ago -> Freshness = 50 - 2.5*20 = 0.0 pts (decayed)
    reactions: { helpful: 12, insightful: 7, confused: 1, verified: 1 },
    comments: [],
    shares: 5
  },
  {
    id: 'p_middle_g8',
    user: sampleUsers.u_david,
    authorId: sampleUsers.u_david.id,
    authorName: sampleUsers.u_david.name,
    content: 'Grade 8 Science: Cell Division (Mitosis vs Meiosis) visual diagram chart. Explaining chromosomes, interphase, and cytokinesis in simple terms.',
    subject: 'Biology',
    grade: 'Grade 8',
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4 hours ago -> Freshness = 50 - 2.5*4 = 40.0 pts
    reactions: { helpful: 9, insightful: 6, confused: 0, verified: 1 },
    comments: [],
    shares: 3
  },
  {
    id: 'p_elementary_g5',
    user: sampleUsers.u_sarah,
    authorId: sampleUsers.u_sarah.id,
    authorName: sampleUsers.u_sarah.name,
    content: 'Grade 5 Math: Master fraction addition & subtraction with visual pizza slice models! Great for beginners learning common denominators.',
    subject: 'Math',
    grade: 'Grade 5',
    timestamp: new Date(Date.now() - 1 * 3600 * 1000).toISOString(), // 1 hour ago -> Freshness = 50 - 2.5*1 = 47.5 pts
    reactions: { helpful: 15, insightful: 4, confused: 1, verified: 1 },
    comments: [],
    shares: 6
  },
  {
    id: 'p_other_cs',
    user: sampleUsers.u_marcus,
    authorId: sampleUsers.u_marcus.id,
    authorName: sampleUsers.u_marcus.name,
    content: 'Introduction to Python Algorithms: Big-O notation visual cheatsheet comparing O(1), O(log n), O(n), and O(n^2) time complexities.',
    subject: 'Other',
    grade: 'College',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3 hours ago -> Freshness = 50 - 2.5*3 = 42.5 pts
    reactions: { helpful: 22, insightful: 17, confused: 2, verified: 2 },
    comments: [],
    shares: 11
  }
];

export const initialGroups: StudyGroup[] = [];

export const initialTutors: TutorPage[] = [];

export const initialReels: Reel[] = [];

export const initialMarketplaceItems: MarketplaceItem[] = [];

export const initialGroupChats: GroupChat[] = [];

export const initialFriends: Friend[] = [];

export const initialFriendRequests: FriendRequest[] = [];

export const initialDirectChats: DirectChat[] = [];

export const defaultSettings: AppSettings = {
  darkMode: false,
  incognitoMode: false,
  language: ['en'],
  region: 'VN',
  subjectWeights: {
    Math: 1,
    Physics: 1,
    English: 1,
    Chemistry: 1,
    Other: 1
  },
  muteTags: [],
  spoilerProtection: false,
  ttsEnabled: true,
  soundEnabled: true,
  soundVolume: 0.7,
  showStreakToOthers: true,
  allowDMsFromStrangers: true,
  blockedUsers: []
};
