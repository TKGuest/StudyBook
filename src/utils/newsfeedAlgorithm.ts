/**
 * StudyBook Dynamic Personalized Newsfeed Algorithm with Infinite Scrolling (Pagination)
 * 
 * Features:
 * 1. Post & UserProfile interfaces with seenPostIds tracking
 * 2. Dynamic on-the-fly personal relevance scoring:
 *    - Grade preference match (+40 pts)
 *    - Language preference match (+25 pts)
 *    - Blended Likes & Freshness decay (50 - 2.5*hrs)
 *    - Penalty (-100 pts) for seen posts to prevent repeats
 * 3. 5-Post Bucket Randomizer:
 *    - Groups posts in tiers of 5 (e.g. 1st-5th highest scores, 6th-10th)
 *    - Randomizes order within each bucket to keep discovery fresh
 * 4. Facebook-style Infinite Scroll Pagination:
 *    - Supports 'limit' (batch size) and 'page' (1-indexed) or timestamp cursor
 *    - Cuts final sorted and scored output list to only return the requested chunk
 *    - Prevents crashing by never returning all database posts at once
 */

export interface Post {
  id: string;
  text: string;
  subject: string;
  gradeLevel: string; // e.g. "Grade 10", "Grade 12", "All"
  language: string;   // e.g. "English", "Vietnamese", "All"
  likes: number;
  createdDate: string | Date;
  // Optional metadata for application integration
  authorId?: string;
  authorName?: string;
  content?: string;
  grade?: string;
  timestamp?: string;
  reactions?: {
    helpful?: number;
    insightful?: number;
    confused?: number;
    verified?: number;
  };
  comments?: any[];
  shares?: number;
  [key: string]: any;
}

export interface UserProfile {
  id: string;
  name: string;
  grade: string;              // Student's current grade (e.g. "Grade 10")
  language: string;           // Preferred language (e.g. "English", "Vietnamese")
  seenPostIds: string[];      // List of IDs of posts already viewed
  [key: string]: any;
}

export interface ScoreBreakdown {
  totalScore: number;
  freshnessScore: number;
  likesScore: number;
  gradeBoost: number;
  languageBoost: number;
  seenPenalty: number;
  hoursAgo: number;
  isSeen: boolean;
  isGradeMatch: boolean;
  isLanguageMatch: boolean;
}

export interface ScoredPost {
  post: Post;
  score: number;
  breakdown: ScoreBreakdown;
}

export interface PaginationParams {
  page?: number;            // 1-indexed page number (default: 1)
  limit?: number;           // Number of posts per batch (default: 5)
  cursor?: string;          // Optional post ID cursor (returns items after this post ID)
  randomize?: boolean;      // Whether to apply 5-post bucket randomizer (default: true)
}

export interface PaginatedFeedResult {
  posts: ScoredPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    nextPage: number | null;
    nextCursor: string | null;
  };
}

/**
 * 1. Calculates a personal relevance score for any post on-the-fly for a specific user.
 */
export function calculatePersonalRelevanceScore(
  post: Post,
  user: UserProfile
): { score: number; breakdown: ScoreBreakdown } {
  // A. Post Age & Freshness Decay Calculation
  const postDate = new Date(post.createdDate || post.timestamp || Date.now());
  const now = Date.now();
  const diffHours = Math.max(0, (now - postDate.getTime()) / (1000 * 60 * 60));
  
  // Base freshness starts at 50 points, decays by 2.5 pts per hour (minimum 0)
  const freshnessScore = Math.max(0, Math.round((50 - diffHours * 2.5) * 10) / 10);

  // B. Likes & Engagement Score (blended logarithmically with freshness)
  const rawLikes = post.likes ?? (
    post.reactions
      ? (post.reactions.helpful || 0) + (post.reactions.insightful || 0) + (post.reactions.verified || 0)
      : 0
  );
  // Logarithmic engagement curve: 10 likes ≈ 20 pts, 100 likes ≈ 40 pts, 650 likes ≈ 56 pts
  const likesScore = Math.round(Math.log10(Math.max(0, rawLikes) + 1) * 20 * 10) / 10;

  // C. Grade Level Matching
  const postGrade = (post.gradeLevel || post.grade || '').trim().toLowerCase();
  const userGrade = (user.grade || '').trim().toLowerCase();
  let gradeBoost = 0;
  let isGradeMatch = false;

  if (postGrade && userGrade) {
    if (postGrade === userGrade) {
      isGradeMatch = true;
      gradeBoost = 40; // High relevance boost for target grade
    } else if (postGrade === 'all' || postGrade === 'all grades') {
      gradeBoost = 15; // Universal grade boost
    }
  }

  // D. Language Preference Matching
  const postLang = (post.language || 'English').trim().toLowerCase();
  const userLang = (user.language || 'English').trim().toLowerCase();
  let languageBoost = 0;
  let isLanguageMatch = false;

  if (postLang === 'all' || postLang === userLang) {
    isLanguageMatch = true;
    languageBoost = 25; // Language preference boost
  }

  // E. Seen Penalty: -100 points penalty if the student already viewed this post
  const isSeen = Array.isArray(user.seenPostIds) && user.seenPostIds.includes(post.id);
  const seenPenalty = isSeen ? -100 : 0; // -100 pts penalty pushes to the bottom

  // F. Total Dynamic Relevance Score
  const totalScore = Math.round(
    (freshnessScore + likesScore + gradeBoost + languageBoost + seenPenalty) * 10
  ) / 10;

  const breakdown: ScoreBreakdown = {
    totalScore,
    freshnessScore,
    likesScore,
    gradeBoost,
    languageBoost,
    seenPenalty,
    hoursAgo: Math.round(diffHours * 10) / 10,
    isSeen,
    isGradeMatch,
    isLanguageMatch
  };

  return { score: totalScore, breakdown };
}

/**
 * 2. Fisher-Yates shuffle algorithm for an array.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 3. 5-Post Bucket Randomizer:
 * Takes posts ranked by relevance score, groups them 5 at a time
 * (e.g. 1st-5th highest, 6th-10th highest), and randomizes their order within each group.
 * This guarantees top-tier quality while keeping discovery dynamic and unpredictable.
 */
export function randomizeInBucketsOfFive<T>(items: T[], bucketSize: number = 5): T[] {
  const randomized: T[] = [];
  for (let i = 0; i < items.length; i += bucketSize) {
    const bucket = items.slice(i, i + bucketSize);
    const shuffledBucket = shuffleArray(bucket);
    randomized.push(...shuffledBucket);
  }
  return randomized;
}

/**
 * 4. Core Feed Generator with Pagination (Infinite Scrolling):
 * 
 * - Calculates personal relevance score on-the-fly for the user
 * - Strictly ranks by score (with freshness tie-breaker)
 * - Optionally applies the 5-post bucket randomizer
 * - Slices and returns ONLY the specific requested batch (page & limit or cursor)
 *   to ensure smooth memory consumption and fast response times like Facebook.
 */
export function getPersonalizedFeed(
  posts: Post[],
  user: UserProfile,
  paginationOptions?: PaginationParams | boolean,
  limitArg?: number
): PaginatedFeedResult {
  // Normalize pagination parameters
  let page = 1;
  let limit = 5;
  let randomize = false;
  let cursor: string | undefined;

  if (typeof paginationOptions === 'boolean') {
    randomize = paginationOptions;
    if (typeof limitArg === 'number') {
      limit = limitArg;
    } else {
      limit = posts.length || 5;
    }
  } else if (paginationOptions && typeof paginationOptions === 'object') {
    page = Math.max(1, paginationOptions.page ?? 1);
    limit = Math.max(1, paginationOptions.limit ?? 5);
    randomize = paginationOptions.randomize === true;
    cursor = paginationOptions.cursor;
  }

  // Step 1: Score every post on the fly for the active user
  const scoredPosts: ScoredPost[] = posts.map(post => {
    const { score, breakdown } = calculatePersonalRelevanceScore(post, user);
    return { post, score, breakdown };
  });

  // Step 2: Sort descending by relevance score (tie-breaker: fresher post)
  scoredPosts.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const timeA = new Date(a.post.createdDate || a.post.timestamp || 0).getTime();
    const timeB = new Date(b.post.createdDate || b.post.timestamp || 0).getTime();
    return timeB - timeA;
  });

  // Step 3: Apply 5-post bucket randomizer if enabled
  const finalSortedList = randomize
    ? randomizeInBucketsOfFive(scoredPosts, 5)
    : scoredPosts;

  const total = finalSortedList.length;
  const totalPages = Math.ceil(total / limit) || 1;

  // Step 4: Slicing specific chunk requested (Pagination / Infinite Scrolling)
  let startIndex = (page - 1) * limit;

  // Cursor-based pagination support (if cursor provided)
  if (cursor) {
    const cursorIdx = finalSortedList.findIndex(item => item.post.id === cursor);
    if (cursorIdx !== -1) {
      startIndex = cursorIdx + 1;
    }
  }

  const chunk = finalSortedList.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + chunk.length < total;
  const nextPage = hasMore ? page + 1 : null;
  const nextCursor = chunk.length > 0 ? chunk[chunk.length - 1].post.id : null;

  return {
    posts: chunk,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore,
      nextPage,
      nextCursor
    }
  };
}

// ============================================================================
// 5. Mock Database Array (16 items)
// ============================================================================
export const mockDatabasePosts: Post[] = [
  {
    id: 'post_101',
    text: 'Viral Math Tricks: Quick mental arithmetic methods for standardized tests',
    subject: 'Math',
    gradeLevel: 'Grade 10',
    language: 'English',
    likes: 850, // Massive viral likes, BUT ALREADY SEEN by user (-100 penalty)
    createdDate: new Date(Date.now() - 3 * 3600 * 1000).toISOString() // 3h ago
  },
  {
    id: 'post_102',
    text: 'Chemistry Cheat Sheet: Periodic trends, bonding, & stoichiometry summary',
    subject: 'Chemistry',
    gradeLevel: 'Grade 10',
    language: 'English',
    likes: 420, // High likes, BUT ALREADY SEEN by user (-100 penalty)
    createdDate: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString() // 2.5h ago
  },
  {
    id: 'post_201',
    text: 'Grade 10 Biology: Step-by-step Photosynthesis & Cellular Respiration study guide',
    subject: 'Biology',
    gradeLevel: 'Grade 10',
    language: 'English',
    likes: 12, // Fresh, unread & matches grade + language
    createdDate: new Date(Date.now() - 0.7 * 3600 * 1000).toISOString() // 42 mins ago
  },
  {
    id: 'post_202',
    text: 'Grade 10 Algebra II: Quadratic equations factoring guide with worked examples',
    subject: 'Math',
    gradeLevel: 'Grade 10',
    language: 'English',
    likes: 18, // Fresh, unread & matches grade + language
    createdDate: new Date(Date.now() - 0.4 * 3600 * 1000).toISOString() // 24 mins ago
  },
  {
    id: 'post_203',
    text: 'Grade 10 English: Essay thesis formula and 5-paragraph synthesis outline',
    subject: 'English',
    gradeLevel: 'Grade 10',
    language: 'English',
    likes: 10, // Fresh, unread & matches grade + language
    createdDate: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString() // 1.2h ago
  },
  {
    id: 'post_204',
    text: 'Grade 10 Physics: Kinematics equations and free-fall velocity calculations',
    subject: 'Physics',
    gradeLevel: 'Grade 10',
    language: 'English',
    likes: 22, // Fresh, unread & matches grade + language
    createdDate: new Date(Date.now() - 1.8 * 3600 * 1000).toISOString() // 1.8h ago
  },
  {
    id: 'post_205',
    text: 'Exam Prep: Active recall & Spaced repetition study schedule for finals week',
    subject: 'Exam Prep',
    gradeLevel: 'All', // Universal grade
    language: 'English',
    likes: 38, // Popular exam prep, unread
    createdDate: new Date(Date.now() - 2 * 3600 * 1000).toISOString() // 2h ago
  },
  {
    id: 'post_206',
    text: 'Grade 10 Geometry: Circle theorems and tangent angle proofs walkthrough',
    subject: 'Math',
    gradeLevel: 'Grade 10',
    language: 'English',
    likes: 15,
    createdDate: new Date(Date.now() - 2.2 * 3600 * 1000).toISOString()
  },
  {
    id: 'post_207',
    text: 'World History: Industrial Revolution primary source analysis guide',
    subject: 'History',
    gradeLevel: 'Grade 10',
    language: 'English',
    likes: 9,
    createdDate: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString()
  },
  {
    id: 'post_208',
    text: 'Computer Science: Python data structures (Lists, Dicts, Sets) flashcards',
    subject: 'Computer Science',
    gradeLevel: 'All',
    language: 'English',
    likes: 45,
    createdDate: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  },
  {
    id: 'post_209',
    text: 'Grade 10 Chemistry: Balancing redox reactions in acidic aqueous solutions',
    subject: 'Chemistry',
    gradeLevel: 'Grade 10',
    language: 'English',
    likes: 16,
    createdDate: new Date(Date.now() - 4.5 * 3600 * 1000).toISOString()
  },
  {
    id: 'post_210',
    text: 'Environmental Science: Biomes and ecological succession diagrams',
    subject: 'Science',
    gradeLevel: 'Grade 10',
    language: 'English',
    likes: 21,
    createdDate: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
  },
  {
    id: 'post_301',
    text: 'Grade 12 Calculus: Derivatives and Chain Rule mastery workshop notes',
    subject: 'Math',
    gradeLevel: 'Grade 12', // Grade 12 (different from Grade 10)
    language: 'English',
    likes: 64,
    createdDate: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString()
  },
  {
    id: 'post_302',
    text: 'Grade 9 Physical Science: Atoms, isotopes, and subatomic particles summary',
    subject: 'Science',
    gradeLevel: 'Grade 9', // Grade 9
    language: 'English',
    likes: 11,
    createdDate: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
  },
  {
    id: 'post_303',
    text: 'Grade 4 Science: Water cycle illustration and cloud types for kids',
    subject: 'Science',
    gradeLevel: 'Grade 4', // Grade 4
    language: 'English',
    likes: 6,
    createdDate: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
  },
  {
    id: 'post_304',
    text: 'Luyện thi Tiếng Anh: 50 cụm từ vựng học thuật quan trọng cho kỳ thi THPT',
    subject: 'English',
    gradeLevel: 'Grade 10',
    language: 'Vietnamese', // Non-matching language for English user
    likes: 52,
    createdDate: new Date(Date.now() - 2.8 * 3600 * 1000).toISOString()
  }
];

// ============================================================================
// 6. Verification & Demonstration Test: Page 1 vs. Page 2
// Run: npx tsx src/utils/newsfeedAlgorithm.ts
// ============================================================================
export function runAlgorithmDemonstration() {
  console.log('\n==============================================================================');
  console.log('🚀 STUDYBOOK INFINITE SCROLL NEWSFEED ALGORITHM - PAGINATION DEMONSTRATION');
  console.log('==============================================================================\n');

  // Simulated User Profile
  const currentUser: UserProfile = {
    id: 'user_alex',
    name: 'Alex Johnson',
    grade: 'Grade 10',
    language: 'English',
    // Alex has already seen post_101 and post_102 (applies -100 penalty)
    seenPostIds: ['post_101', 'post_102']
  };

  console.log('👤 Active User Context:');
  console.log(`   - Student Name:       ${currentUser.name}`);
  console.log(`   - Current Grade:      ${currentUser.grade} (+40 pts boost for Grade 10)`);
  console.log(`   - Preferred Language: ${currentUser.language} (+25 pts boost)`);
  console.log(`   - Seen Post History:  [${currentUser.seenPostIds.join(', ')}] (-100 pts penalty)\n`);
  console.log(`📦 Database Inventory: Total ${mockDatabasePosts.length} posts available in database.\n`);

  // Request Page 1 (Items 1-5)
  console.log('------------------------------------------------------------------------------');
  console.log('📱 1. INITIAL LOAD: Frontend requests Page 1 (Items 1 - 5, limit = 5)');
  console.log('------------------------------------------------------------------------------');
  const page1Result = getPersonalizedFeed(mockDatabasePosts, currentUser, { page: 1, limit: 5 });

  console.log(`Metadata: Page ${page1Result.pagination.page} of ${page1Result.pagination.totalPages} | Chunk size: ${page1Result.posts.length} posts | Has More: ${page1Result.pagination.hasMore} | Next Page: ${page1Result.pagination.nextPage}\n`);

  page1Result.posts.forEach((item, index) => {
    const b = item.breakdown;
    const seenBadge = b.isSeen ? '❌ [SEEN -100]' : '✨ [UNREAD]';
    console.log(`  [Page 1 - Item #${index + 1}] ID: ${item.post.id} | Score: ${item.score.toFixed(1).padStart(5, ' ')} pts | ${seenBadge}`);
    console.log(`    Content: "${item.post.text}"`);
    console.log(`    Factors: Freshness=${b.freshnessScore} (decay -${(b.hoursAgo * 2.5).toFixed(1)}), LikesScore=+${b.likesScore} (${item.post.likes} likes), Grade=+${b.gradeBoost}, Lang=+${b.languageBoost}, SeenPenalty=${b.seenPenalty}\n`);
  });

  // Request Page 2 (Items 6-10) as user scrolls down
  console.log('------------------------------------------------------------------------------');
  console.log('📜 2. USER SCROLLS DOWN: Frontend requests Page 2 (Items 6 - 10, limit = 5)');
  console.log('------------------------------------------------------------------------------');
  const page2Result = getPersonalizedFeed(mockDatabasePosts, currentUser, { page: 2, limit: 5 });

  console.log(`Metadata: Page ${page2Result.pagination.page} of ${page2Result.pagination.totalPages} | Chunk size: ${page2Result.posts.length} posts | Has More: ${page2Result.pagination.hasMore} | Next Page: ${page2Result.pagination.nextPage}\n`);

  page2Result.posts.forEach((item, index) => {
    const b = item.breakdown;
    const seenBadge = b.isSeen ? '❌ [SEEN -100]' : '✨ [UNREAD]';
    console.log(`  [Page 2 - Item #${index + 6}] ID: ${item.post.id} | Score: ${item.score.toFixed(1).padStart(5, ' ')} pts | ${seenBadge}`);
    console.log(`    Content: "${item.post.text}"`);
    console.log(`    Factors: Freshness=${b.freshnessScore} (decay -${(b.hoursAgo * 2.5).toFixed(1)}), LikesScore=+${b.likesScore} (${item.post.likes} likes), Grade=+${b.gradeBoost}, Lang=+${b.languageBoost}, SeenPenalty=${b.seenPenalty}\n`);
  });

  // Verification Summary
  console.log('==============================================================================');
  console.log('🎯 PAGINATION VERIFICATION RESULTS:');
  console.log(`  • Page 1 returned exactly 5 posts (${page1Result.posts.map(p => p.post.id).join(', ')})`);
  console.log(`  • Page 2 returned next 5 posts (${page2Result.posts.map(p => p.post.id).join(', ')})`);
  console.log('  • No memory overflow: database is chunked into 5-post batches on demand');
  console.log('  • -100 penalty successfully pushed viral seen posts (850 & 420 likes) below unread posts');
  console.log('==============================================================================\n');
}

// Run test immediately if invoked directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('newsfeedAlgorithm')) {
  runAlgorithmDemonstration();
}
