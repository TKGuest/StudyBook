import { Post, AlgorithmScoreBreakdown, GRADE_LEVELS, User } from '../types';
import { randomizeInBucketsOfFive, shuffleArray } from './newsfeedAlgorithm';

export { randomizeInBucketsOfFive, shuffleArray };

/**
 * Freshness Value Algorithm Configuration:
 * - Recent posts start with 50 points.
 * - Slowly decays over time (-2.5 points per hour) to keep the feed fresh.
 * - Decay floor is 0 points.
 */
export const ALGORITHM_CONFIG = {
  BASE_FRESHNESS: 50,
  DECAY_PER_HOUR: 2.5,
  GRADE_MATCH_BOOST: 40,
  ALL_GRADES_BOOST: 15,
  LANGUAGE_MATCH_BOOST: 25,
  SEEN_PENALTY: -100,
  HELPFUL_REACTION_WEIGHT: 3,
  INSIGHTFUL_REACTION_WEIGHT: 3,
  VERIFIED_REACTION_WEIGHT: 5,
  COMMENT_WEIGHT: 2,
  MAX_SUBJECT_BOOST: 15
} as const;

/**
 * Calculates the exact post age in hours and decayed Freshness Value.
 */
export function calculateFreshnessValue(
  timestamp: string | number | Date,
  basePoints: number = ALGORITHM_CONFIG.BASE_FRESHNESS,
  decayPerHour: number = ALGORITHM_CONFIG.DECAY_PER_HOUR
): {
  freshnessScore: number;
  hoursAgo: number;
  decayAmount: number;
  postDate: Date;
} {
  let postDate = new Date(timestamp);
  if (isNaN(postDate.getTime())) {
    postDate = new Date();
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - postDate.getTime());
  const hoursAgo = diffMs / (1000 * 60 * 60);

  // Exact formula: 50 points - (hoursAgo * 2.5)
  const rawDecay = hoursAgo * decayPerHour;
  const rawFreshness = basePoints - rawDecay;
  const freshnessScore = Math.max(0, Math.round(rawFreshness * 10) / 10);
  const decayAmount = Math.min(basePoints, Math.round(rawDecay * 10) / 10);

  return {
    freshnessScore,
    hoursAgo: Math.round(hoursAgo * 10) / 10,
    decayAmount,
    postDate
  };
}

/**
 * Calculates complete algorithmic score breakdown for a post dynamically.
 */
export function calculatePostScore(
  post: Post,
  userOrGrade?: Partial<User> | string,
  subjectWeights?: Record<string, number>
): AlgorithmScoreBreakdown {
  const user = typeof userOrGrade === 'string'
    ? { grade: userOrGrade }
    : (userOrGrade || {});

  const userGrade = user.grade;
  const userLang = user.language || 'English';
  const seenPostIds = user.seenPostIds || [];

  const postDate = post.createdDate || post.timestamp;
  const { freshnessScore, hoursAgo, decayAmount } = calculateFreshnessValue(postDate);

  // Check Grade match
  const postGrade = post.gradeLevel || post.grade || post.user?.grade;
  const normalizedUserGrade = userGrade?.trim().toLowerCase();
  const normalizedPostGrade = postGrade?.trim().toLowerCase();

  let isGradeMatch = false;
  let gradeMatchBoost = 0;

  if (normalizedUserGrade && normalizedPostGrade) {
    if (normalizedPostGrade === normalizedUserGrade) {
      isGradeMatch = true;
      gradeMatchBoost = ALGORITHM_CONFIG.GRADE_MATCH_BOOST;
    } else if (normalizedPostGrade === 'all' || normalizedPostGrade === 'all grades') {
      gradeMatchBoost = ALGORITHM_CONFIG.ALL_GRADES_BOOST;
    }
  }

  // Language match boost
  const postLang = (post.language || 'English').trim().toLowerCase();
  let languageBoost = 0;
  if (postLang === 'all' || postLang === userLang.trim().toLowerCase()) {
    languageBoost = ALGORITHM_CONFIG.LANGUAGE_MATCH_BOOST;
  }

  // Popularity Score from academic reactions and discussions
  const helpful = post.reactions?.helpful || 0;
  const insightful = post.reactions?.insightful || 0;
  const verified = post.reactions?.verified || 0;
  const commentsCount = post.comments?.length || 0;

  const rawPopularity = 
    (helpful * ALGORITHM_CONFIG.HELPFUL_REACTION_WEIGHT) +
    (insightful * ALGORITHM_CONFIG.INSIGHTFUL_REACTION_WEIGHT) +
    (verified * ALGORITHM_CONFIG.VERIFIED_REACTION_WEIGHT) +
    (commentsCount * ALGORITHM_CONFIG.COMMENT_WEIGHT) +
    ((post.likes || 0) * 2);

  // Logarithmic popularity scaling blended with freshness
  const popularityScore = Math.round(Math.log10(Math.max(0, rawPopularity) + 1) * 20 * 10) / 10;

  // Subject preference weight
  let subjectScore = 0;
  if (subjectWeights && post.subject) {
    const rawWeight = (subjectWeights as any)[post.subject] ?? subjectWeights['Other'] ?? 50;
    subjectScore = Math.round((Math.min(100, Math.max(0, rawWeight)) / 100) * ALGORITHM_CONFIG.MAX_SUBJECT_BOOST * 10) / 10;
  }

  // Seen penalty (-200 points) to push already-viewed posts to the bottom
  const isSeen = seenPostIds.includes(post.id);
  const seenPenalty = isSeen ? ALGORITHM_CONFIG.SEEN_PENALTY : 0;

  const totalScore = Math.round(
    (freshnessScore + gradeMatchBoost + languageBoost + popularityScore + subjectScore + seenPenalty) * 10
  ) / 10;

  return {
    totalScore,
    freshnessScore,
    hoursAgo,
    decayAmount,
    decayRatePerHour: ALGORITHM_CONFIG.DECAY_PER_HOUR,
    baseFreshness: ALGORITHM_CONFIG.BASE_FRESHNESS,
    gradeMatchBoost,
    popularityScore,
    subjectScore,
    isGradeMatch,
    postGrade: postGrade || 'All Grades',
    userGrade,
    languageBoost,
    seenPenalty,
    isSeen
  };
}

export type FeedSortOption = 'algorithm' | 'recent' | 'popular';

/**
 * Sorts posts based on chosen feed mode.
 * In 'algorithm' mode, ranks by dynamic relevance and randomizes in buckets of 5
 * (e.g. 1st-5th highest, 6th-10th highest) so the feed stays fresh and non-predictable.
 */
export function sortFeedPosts(
  posts: Post[],
  userOrGrade?: Partial<User> | string,
  subjectWeights?: Record<string, number>,
  sortOption: FeedSortOption = 'algorithm',
  randomizeBuckets: boolean = true
): { post: Post; scoreBreakdown: AlgorithmScoreBreakdown }[] {
  const scoredPosts = posts.map(post => ({
    post,
    scoreBreakdown: calculatePostScore(post, userOrGrade, subjectWeights)
  }));

  switch (sortOption) {
    case 'recent':
      return scoredPosts.sort((a, b) => {
        const timeA = new Date(a.post.createdDate || a.post.timestamp).getTime() || 0;
        const timeB = new Date(b.post.createdDate || b.post.timestamp).getTime() || 0;
        return timeB - timeA;
      });

    case 'popular':
      return scoredPosts.sort((a, b) => {
        return b.scoreBreakdown.popularityScore - a.scoreBreakdown.popularityScore;
      });

    case 'algorithm':
    default: {
      // 1. Sort strictly by score descending
      const sorted = scoredPosts.sort((a, b) => {
        if (b.scoreBreakdown.totalScore !== a.scoreBreakdown.totalScore) {
          return b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore;
        }
        return b.scoreBreakdown.freshnessScore - a.scoreBreakdown.freshnessScore;
      });

      // 2. Randomize in buckets of 5 (highest score with 2nd, 3rd, 4th, 5th, etc.)
      if (randomizeBuckets) {
        return randomizeInBucketsOfFive(sorted, 5);
      }

      return sorted;
    }
  }
}

/**
 * Test simulation helper to verify freshness decay calculations.
 */
export function simulateFreshnessDecayTest(hoursList: number[] = [0, 1, 2, 4, 8, 12, 16, 20, 24]): {
  hoursAgo: number;
  freshnessValue: number;
  decayAmount: number;
  decayRate: string;
}[] {
  return hoursList.map(hours => {
    const decayAmount = hours * ALGORITHM_CONFIG.DECAY_PER_HOUR;
    const freshnessValue = Math.max(0, ALGORITHM_CONFIG.BASE_FRESHNESS - decayAmount);
    return {
      hoursAgo: hours,
      freshnessValue: Math.round(freshnessValue * 10) / 10,
      decayAmount: Math.round(decayAmount * 10) / 10,
      decayRate: `-${ALGORITHM_CONFIG.DECAY_PER_HOUR} pts/hr`
    };
  });
}
