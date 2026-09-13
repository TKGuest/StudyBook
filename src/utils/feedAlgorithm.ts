import { Post, AlgorithmScoreBreakdown, GRADE_LEVELS, User, CreatorScore } from '../types';
import { randomizeInBucketsOfFive, shuffleArray } from './newsfeedAlgorithm';

export { randomizeInBucketsOfFive, shuffleArray };

/**
 * Feed Algorithm Configuration:
 * - Freshness: Recent posts start with 50 points, decaying (-2.5 pts/hr)
 * - Grade & Language Match boosts
 * - Creator Points & Decay:
 *   * If user follows a creator, posts by that creator get a +35 point boost.
 *   * Interactions (likes +8, comments +12, saves +15) increase creator's point score.
 *   * Inactivity Decay: If the user goes a full day (24 hours) without interacting,
 *     the creator's point score decreases by 10 points per full 24-hour cycle.
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
  MAX_SUBJECT_BOOST: 15,
  // Creator Points & Inactivity Decay Configuration
  CREATOR_FOLLOW_BOOST: 35, // Boost when user follows this creator
  INTERACTION_LIKE_POINTS: 8, // Points per like / reaction
  INTERACTION_COMMENT_POINTS: 12, // Points per comment
  INTERACTION_SAVE_POINTS: 15, // Points per save / bookmark
  INACTIVITY_DECAY_HOURS: 24, // 24-hour period of inactivity threshold
  INACTIVITY_DECAY_PER_DAY: 10 // Points deducted per full 24h of inactivity
} as const;

/**
 * Calculates Creator Points for a post's creator, including:
 * 1. Follower point boost
 * 2. Interaction score (accumulated from likes, comments, saves)
 * 3. Inactivity decay: -10 points per 24 hours of inactivity without interaction
 */
export function calculateCreatorPointsAndDecay(
  creatorId?: string,
  followingIds: string[] = [],
  creatorScores: Record<string, CreatorScore> = {},
  currentTimestamp: number = Date.now()
): {
  creatorScore: number;
  isFollowingCreator: boolean;
  creatorFollowBoost: number;
  creatorInteractionScore: number;
  creatorDecayAmount: number;
  creatorInactivityHours: number;
} {
  if (!creatorId) {
    return {
      creatorScore: 0,
      isFollowingCreator: false,
      creatorFollowBoost: 0,
      creatorInteractionScore: 0,
      creatorDecayAmount: 0,
      creatorInactivityHours: 0
    };
  }

  // 1. Follower point boost
  const isFollowingCreator = followingIds.includes(creatorId);
  const creatorFollowBoost = isFollowingCreator ? ALGORITHM_CONFIG.CREATOR_FOLLOW_BOOST : 0;

  // 2. Interaction point accumulation
  const scoreRecord = creatorScores[creatorId];
  const rawInteractionScore = scoreRecord?.score || 0;

  // 3. 24-hour Inactivity Decay calculation
  let creatorDecayAmount = 0;
  let creatorInactivityHours = 0;

  if (scoreRecord?.lastInteractionTimestamp) {
    const lastInteractionTime = new Date(scoreRecord.lastInteractionTimestamp).getTime();
    if (!isNaN(lastInteractionTime) && lastInteractionTime > 0) {
      const diffMs = Math.max(0, currentTimestamp - lastInteractionTime);
      creatorInactivityHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

      // If user goes a full day (24 hours) without interacting with this creator's posts,
      // creator's point score decreases
      if (creatorInactivityHours >= ALGORITHM_CONFIG.INACTIVITY_DECAY_HOURS) {
        const fullDaysWithoutInteraction = Math.floor(creatorInactivityHours / 24);
        creatorDecayAmount = fullDaysWithoutInteraction * ALGORITHM_CONFIG.INACTIVITY_DECAY_PER_DAY;
      }
    }
  }

  // Decayed interaction score (floor at 0)
  const decayedInteractionScore = Math.max(0, rawInteractionScore - creatorDecayAmount);

  // Total creator points
  const creatorScore = Math.round((creatorFollowBoost + decayedInteractionScore) * 10) / 10;

  return {
    creatorScore,
    isFollowingCreator,
    creatorFollowBoost,
    creatorInteractionScore: decayedInteractionScore,
    creatorDecayAmount,
    creatorInactivityHours
  };
}

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
  subjectWeights?: Record<string, number>,
  followingIds?: string[],
  creatorScores?: Record<string, CreatorScore>,
  joinedGroupIds?: string[],
  groupInteractions?: Record<string, any>
): AlgorithmScoreBreakdown {
  const user = typeof userOrGrade === 'string'
    ? { grade: userOrGrade }
    : (userOrGrade || {});

  const userGrade = user.grade;
  const userLang = user.language || 'English';
  const seenPostIds = user.seenPostIds || [];

  // Retrieve followingIds and creatorScores either from arguments or user object
  const activeFollowingIds = followingIds || (user as any).followingIds || (user as any).followingUserIds || [];
  const activeCreatorScores = creatorScores || (user as any).creatorScores || {};
  const activeJoinedGroupIds = joinedGroupIds || (user as any).joinedGroupIds || [];
  const activeGroupInteractions = groupInteractions || (user as any).groupInteractions || {};

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

  // Creator Points & Inactivity Decay
  const creatorId = post.isAnonymous ? undefined : (post.authorId || post.user?.id);
  const creatorDetails = calculateCreatorPointsAndDecay(
    creatorId,
    activeFollowingIds,
    activeCreatorScores
  );

  // Group Interaction Boost:
  // If you are in a group, based on how much you interact with the group,
  // posts from them will receive an elevated score on the normal page too!
  let groupBoost = 0;
  let isGroupPost = false;
  let groupInteractionScore = 0;

  if (post.groupId) {
    isGroupPost = true;
    const isMemberOfGroup = activeJoinedGroupIds.includes(post.groupId) || post.authorId === (user as any).id;
    if (isMemberOfGroup) {
      const interactionRecord = activeGroupInteractions[post.groupId];
      const interactionPoints = typeof interactionRecord === 'number'
        ? interactionRecord
        : (interactionRecord?.score ?? 15);
      groupInteractionScore = interactionPoints;
      // High relevance boost: Base +20 pts for group cohort membership,
      // plus interaction scaling up to +40 pts (Max +60 group boost points)
      groupBoost = Math.min(60, 20 + Math.round(groupInteractionScore * 0.8));
    }
  }

  // Seen penalty (-100 points) to push already-viewed posts to the bottom
  const isSeen = seenPostIds.includes(post.id);
  const seenPenalty = isSeen ? ALGORITHM_CONFIG.SEEN_PENALTY : 0;

  const totalScore = Math.round(
    (freshnessScore + 
     gradeMatchBoost + 
     languageBoost + 
     popularityScore + 
     subjectScore + 
     creatorDetails.creatorScore + 
     groupBoost + 
     seenPenalty) * 10
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
    isSeen,
    // Creator Points & Decay diagnostics
    creatorScore: creatorDetails.creatorScore,
    isFollowingCreator: creatorDetails.isFollowingCreator,
    creatorFollowBoost: creatorDetails.creatorFollowBoost,
    creatorInteractionScore: creatorDetails.creatorInteractionScore,
    creatorDecayAmount: creatorDetails.creatorDecayAmount,
    creatorInactivityHours: creatorDetails.creatorInactivityHours,
    // Group Post diagnostics
    groupBoost,
    isGroupPost,
    groupInteractionScore
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
  randomizeBuckets: boolean = false,
  followingIds?: string[],
  creatorScores?: Record<string, CreatorScore>,
  joinedGroupIds?: string[],
  groupInteractions?: Record<string, any>
): { post: Post; scoreBreakdown: AlgorithmScoreBreakdown }[] {
  const scoredPosts = posts.map(post => ({
    post,
    scoreBreakdown: calculatePostScore(
      post, 
      userOrGrade, 
      subjectWeights, 
      followingIds, 
      creatorScores,
      joinedGroupIds,
      groupInteractions
    )
  }));

  switch (sortOption) {
    case 'recent':
      return scoredPosts.sort((a, b) => {
        const timeA = new Date(a.post.createdDate || a.post.timestamp).getTime() || 0;
        const timeB = new Date(b.post.createdDate || b.post.timestamp).getTime() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return String(a.post.id).localeCompare(String(b.post.id));
      });

    case 'popular':
      return scoredPosts.sort((a, b) => {
        if (b.scoreBreakdown.popularityScore !== a.scoreBreakdown.popularityScore) {
          return b.scoreBreakdown.popularityScore - a.scoreBreakdown.popularityScore;
        }
        const timeA = new Date(a.post.createdDate || a.post.timestamp).getTime() || 0;
        const timeB = new Date(b.post.createdDate || b.post.timestamp).getTime() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return String(a.post.id).localeCompare(String(b.post.id));
      });

    case 'algorithm':
    default: {
      // 1. Sort strictly and deterministically by score descending, then freshness, then timestamp, then id
      const sorted = scoredPosts.sort((a, b) => {
        if (b.scoreBreakdown.totalScore !== a.scoreBreakdown.totalScore) {
          return b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore;
        }
        if (b.scoreBreakdown.freshnessScore !== a.scoreBreakdown.freshnessScore) {
          return b.scoreBreakdown.freshnessScore - a.scoreBreakdown.freshnessScore;
        }
        const timeA = new Date(a.post.createdDate || a.post.timestamp).getTime() || 0;
        const timeB = new Date(b.post.createdDate || b.post.timestamp).getTime() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return String(a.post.id).localeCompare(String(b.post.id));
      });

      // 2. Only randomize if explicitly requested (defaults to false for stable viewing)
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
