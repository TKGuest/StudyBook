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
  u_marcus: {
    id: 'u_marcus',
    name: 'Marcus Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    coverPhoto: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200',
    bio: '🔬 High School Physics Enthusiast & Competitive Programmer. Passionate about solving mechanics problems and sharing clean formula derivations.',
    role: 'student',
    grade: 'Grade 11',
    streak: 42,
    streakLevel: 'silver',
    badges: ['Physics Club', 'Top Solver', 'Code Olympiad'],
    institution: 'Westwood Academy',
    followersCount: 142,
    followingCount: 38,
    subjects: ['Physics', 'Chemistry', 'Calculus']
  },
  u_elena: {
    id: 'u_elena',
    name: 'Prof. Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    coverPhoto: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
    bio: '📐 Associate Professor in Applied Mathematics. Creating intuitive visual cheatsheets for Multivariable Calculus, Linear Algebra & Differential Equations.',
    role: 'tutor',
    grade: 'College',
    streak: 85,
    streakLevel: 'gold',
    badges: ['Verified Tutor', 'STEM Educator', 'Master Creator'],
    institution: 'Metro State University',
    followersCount: 520,
    followingCount: 45,
    subjects: ['Math', 'Calculus', 'Linear Algebra']
  },
  u_maya: {
    id: 'u_maya',
    name: 'Maya Patel',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    coverPhoto: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=1200',
    bio: '📚 Literature & Exam Prep Mentor. Sharing weekly study summaries, essay structures, and IELTS/SAT high-scoring analysis worksheets.',
    role: 'student',
    grade: 'Grade 12',
    streak: 110,
    streakLevel: 'gold',
    badges: ['IELTS 8.5', 'National Scholar', 'Essay Mentor'],
    institution: 'Cambridge Prep',
    followersCount: 389,
    followingCount: 62,
    subjects: ['English', 'Literature', 'Writing']
  },
  u_liam: {
    id: 'u_liam',
    name: 'Liam Nguyen',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=250',
    coverPhoto: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1200',
    bio: '⚡ Grade 10 Honors Chemistry & Biology peer tutor. Love making 3D molecule diagrams and interactive study flashcards.',
    role: 'creator',
    grade: 'Grade 10',
    streak: 28,
    streakLevel: 'bronze',
    badges: ['Lab Ace', 'Study Buddy'],
    institution: 'Saigon International High',
    followersCount: 95,
    followingCount: 31,
    subjects: ['Chemistry', 'Biology']
  }
};

export const initialCommunityUsers: User[] = [];

export const initialPosts: Post[] = [
  {
    id: 'p_fresh_1',
    groupId: 'g_1788665354922',
    groupName: 'Test',
    groupAvatar: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=400',
    user: sampleUsers.u_maya,
    authorId: sampleUsers.u_maya.id,
    authorName: sampleUsers.u_maya.name,
    content: 'Just finished writing a clean summary sheet for Quadratic Formula & Parabola Graphing with step-by-step vertex shortcuts! Let me know if you want the PDF worksheet.',
    subject: 'Math',
    grade: 'Grade 10',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago (~0.25h) -> Freshness ~49.4 pts
    reactions: { helpful: 8, insightful: 5, confused: 1, verified: 1 },
    comments: [
      {
        id: 'c_1',
        postId: 'p_fresh_1',
        user: sampleUsers.u_marcus,
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
    user: sampleUsers.u_marcus,
    authorId: sampleUsers.u_marcus.id,
    authorName: sampleUsers.u_marcus.name,
    content: 'Quick quiz question for Grade 10 Chem: Why does electronegativity increase across a period from left to right on the periodic table? Drop your reasoning below without looking it up!',
    subject: 'Chemistry',
    grade: 'Grade 10',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago -> Freshness = 50 - 2.5*2 = 45.0 pts
    reactions: { helpful: 14, insightful: 9, confused: 2, verified: 0 },
    comments: [],
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
    user: sampleUsers.u_elena,
    authorId: sampleUsers.u_elena.id,
    authorName: sampleUsers.u_elena.name,
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
    user: sampleUsers.u_maya,
    authorId: sampleUsers.u_maya.id,
    authorName: sampleUsers.u_maya.name,
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

export const initialGroups: StudyGroup[] = [
  {
    id: 'g_1788665354922',
    name: 'Grade 10 Math & Physics Cohort',
    coverImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600',
    description: 'Collaborative problem solving, homework discussions, and revision for Grade 10 Math and Physics.',
    category: 'Math & Science',
    memberCount: 28,
    membersCount: 28,
    countdownLabel: 'Mid-term Exams',
    countdownDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    adminUserIds: ['u_current', 'u_elena'],
    leaderUserIds: ['u_marcus'],
    memberUserIds: ['u_current', 'u_marcus', 'u_elena', 'u_maya'],
    memberRoles: {
      u_current: 'admin',
      u_elena: 'admin',
      u_marcus: 'leader',
      u_maya: 'member'
    },
    members: [
      {
        id: 'u_current',
        name: 'You (Current User)',
        avatar: SILHOUETTE_AVATAR,
        role: 'admin',
        grade: 'Grade 10',
        joinedAt: 'Cohort Founder'
      },
      {
        id: 'u_elena',
        name: 'Prof. Elena Rostova',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
        role: 'admin',
        grade: 'College',
        joinedAt: '1 month ago'
      },
      {
        id: 'u_marcus',
        name: 'Marcus Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
        role: 'leader',
        grade: 'Grade 11',
        joinedAt: '3 weeks ago'
      },
      {
        id: 'u_maya',
        name: 'Maya Patel',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        role: 'member',
        grade: 'Grade 12',
        joinedAt: '2 weeks ago'
      }
    ],
    files: [
      {
        id: 'f_math_1',
        title: 'Quadratic_Equations_Formulas.pdf',
        uploader: 'Prof. Elena Rostova',
        uploaderId: 'u_elena',
        date: 'Yesterday',
        size: '1.8 MB',
        type: 'PDF',
        isPinned: true,
        pinnedBy: 'Prof. Elena Rostova',
        pinnedAt: 'Yesterday'
      },
      {
        id: 'f_math_2',
        title: 'Newtonian_Mechanics_Cheatsheet.pdf',
        uploader: 'Marcus Chen',
        uploaderId: 'u_marcus',
        date: '3 days ago',
        size: '2.4 MB',
        type: 'PDF',
        isPinned: false
      }
    ],
    events: [
      {
        id: 'ev_1',
        title: 'Trigonometry & Circle Theorems Workshop',
        tutor: 'Marcus Chen',
        time: 'Tomorrow, 19:30',
        attendees: 16,
        isGoing: true
      }
    ]
  },
  {
    id: 'g_english_ielts',
    name: 'IELTS & Academic Writing Circle',
    coverImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600',
    description: 'Daily essay feedback, vocabulary building, and speaking practice for high school IELTS candidates.',
    category: 'Languages',
    memberCount: 35,
    membersCount: 35,
    countdownLabel: 'IELTS Examination',
    countdownDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    adminUserIds: ['u_maya'],
    leaderUserIds: ['u_current'],
    memberUserIds: ['u_maya', 'u_current', 'u_marcus'],
    memberRoles: {
      u_maya: 'admin',
      u_current: 'leader',
      u_marcus: 'member'
    },
    members: [
      {
        id: 'u_maya',
        name: 'Maya Patel',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        role: 'admin',
        grade: 'Grade 12',
        joinedAt: 'Circle Founder'
      },
      {
        id: 'u_current',
        name: 'You (Current User)',
        avatar: SILHOUETTE_AVATAR,
        role: 'leader',
        grade: 'Grade 10',
        joinedAt: '1 week ago'
      },
      {
        id: 'u_marcus',
        name: 'Marcus Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
        role: 'member',
        grade: 'Grade 11',
        joinedAt: '3 days ago'
      }
    ],
    files: [
      {
        id: 'f_ielts_1',
        title: 'Task2_Vocabulary_Collocations.pdf',
        uploader: 'Maya Patel',
        uploaderId: 'u_maya',
        date: '2 days ago',
        size: '950 KB',
        type: 'PDF',
        isPinned: true,
        pinnedBy: 'Maya Patel',
        pinnedAt: '2 days ago'
      }
    ],
    events: []
  }
];

export const initialTutors: TutorPage[] = [];

export const initialReels: Reel[] = [
  {
    id: 'reel_math_pythagoras',
    tutorName: 'Marcus Chen',
    tutorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    authorId: 'u_marcus',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    caption: '3D Visual proof of the Pythagorean Theorem! 📐 When squares rearrange into a single hypotenuse square. Pure geometry magic!',
    subject: 'Math',
    grade: 'Grade 10',
    audioTrack: 'Original Audio - Marcus Chen • Math Beats',
    likes: 142,
    comments: 18,
    worksheet: {
      title: 'Pythagorean_Visual_Proof.pdf',
      url: '#',
      size: '1.4 MB'
    }
  },
  {
    id: 'reel_physics_gyro',
    tutorName: 'Prof. Elena Rostova',
    tutorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    authorId: 'u_elena',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    caption: 'Why spinning wheels stay upright: Conservation of Angular Momentum simplified in 45 seconds! ⚡ Try spinning a bicycle wheel yourself.',
    subject: 'Physics',
    grade: 'Grade 11',
    audioTrack: 'Original Audio - Prof. Elena • Physics Lecture',
    likes: 289,
    comments: 34,
    worksheet: {
      title: 'Angular_Momentum_Derivations.pdf',
      url: '#',
      size: '2.1 MB'
    }
  },
  {
    id: 'reel_chem_reaction',
    tutorName: 'Liam Nguyen',
    tutorAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=250',
    authorId: 'u_liam',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    caption: 'The oscillating chemical reaction (Briggs-Rauscher clock)! Watch clear liquid turn amber, dark blue, then clear again. 🧪 RedOx kinetics in action.',
    subject: 'Chemistry',
    grade: 'Grade 10',
    audioTrack: 'Lofi Study Beats - Focus Session',
    likes: 315,
    comments: 27
  },
  {
    id: 'reel_english_essay',
    tutorName: 'Maya Patel',
    tutorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    authorId: 'u_maya',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    caption: '3 words to BAN from your argumentative essay introductions! Replace "Nowadays" and "Since the dawn of time" with this killer contrast technique. 📚',
    subject: 'English',
    grade: 'Grade 12',
    audioTrack: 'Original Audio - Maya Patel • Writing Tips',
    likes: 420,
    comments: 56,
    worksheet: {
      title: 'Academic_Transitions_Cheatsheet.pdf',
      url: '#',
      size: '820 KB'
    }
  }
];

export const initialMarketplaceItems: MarketplaceItem[] = [];

export const initialGroupChats: GroupChat[] = [
  {
    groupId: 'g_1788665354922',
    groupName: 'Grade 10 Math & Physics Cohort',
    messages: [
      {
        id: 'gm_1',
        sender: sampleUsers.u_liam,
        content: 'Hi everyone! Does anyone have the solution steps for Question 4 on the parabola worksheet?',
        timestamp: '09:15'
      },
      {
        id: 'gm_2',
        sender: sampleUsers.u_marcus,
        content: 'I solved it using vertex formula x = -b/(2a). Let me know if you want me to share the breakdown!',
        timestamp: '09:18'
      }
    ]
  }
];

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
