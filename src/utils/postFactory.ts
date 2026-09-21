import { Post, GroupPost, User } from '../types';
import { UploadedAssetMetadata } from '../lib/uploadcare';

/**
 * Unique Post Identifier Generator
 * Generates an automated, unique, collision-resistant string identifier
 * the exact moment a post (public timeline or group post) is created.
 * Uses cryptographically secure randomUUID when available, with a resilient
 * timestamp-hash-random fallback.
 */
export function generateUniquePostId(prefix: 'post' | 'gpost' = 'post'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${randomPart}${randomSuffix}`;
}

export interface CreatePostParams {
  content: string;
  subject: string;
  user: User;
  authorId?: string;
  authorName?: string;
  grade?: string;
  isAnonymous?: boolean;
  attachedAsset?: UploadedAssetMetadata | null;
  attachmentType?: 'pdf' | 'doc' | 'link' | 'youtube' | 'image' | 'video' | 'file';
  attachmentTitle?: string;
  attachmentUrl?: string;
  attachmentSize?: string;
  attachmentCdnUrl?: string;
  attachmentUuid?: string;
  blockedUserIds?: string[];
  status?: 'approved' | 'pending' | 'rejected' | 'published';
}

export interface CreateGroupPostParams extends CreatePostParams {
  groupId: string;
  groupName: string;
  groupAvatar?: string;
  requiresApproval?: boolean;
}

/**
 * Pure Factory: Creates a standard public timeline Post data model
 * with an explicitly bound, unique random string identifier.
 */
export function createTimelinePost(params: CreatePostParams): Post {
  const uniqueId = generateUniquePostId('post');
  const now = new Date().toISOString();
  const currentGrade = params.grade || params.user?.grade || 'Grade 10';
  const authorName = params.isAnonymous ? 'Anonymous Scholar' : (params.user?.name || params.authorName || 'Student');

  let attachment: Post['attachment'] = undefined;
  if (params.attachedAsset) {
    attachment = {
      type: params.attachedAsset.type,
      title: params.attachedAsset.filename,
      url: params.attachedAsset.url || params.attachedAsset.cdnUrl,
      cdnUrl: params.attachedAsset.cdnUrl || params.attachedAsset.url,
      uuid: params.attachedAsset.uuid,
      size: params.attachedAsset.formattedSize,
      mimetype: params.attachedAsset.mimetype
    };
  } else if (params.attachmentUrl || params.attachmentTitle) {
    attachment = {
      type: params.attachmentType || 'file',
      title: params.attachmentTitle || 'Attached Material',
      url: params.attachmentUrl || '#',
      cdnUrl: params.attachmentCdnUrl,
      uuid: params.attachmentUuid,
      size: params.attachmentSize
    };
  }

  return {
    id: uniqueId,
    postId: uniqueId,
    user: params.user,
    authorId: params.authorId || params.user?.id || 'u_current',
    authorName,
    content: params.content,
    text: params.content,
    subject: params.subject || 'General',
    grade: currentGrade,
    gradeLevel: currentGrade,
    timestamp: now,
    createdDate: now,
    status: params.status || 'published',
    isAnonymous: !!params.isAnonymous,
    attachment,
    reactions: { helpful: 0, insightful: 0, confused: 0, verified: 0 },
    baseReactions: { helpful: 0, insightful: 0, confused: 0, verified: 0 },
    userReactionsMap: {},
    comments: [],
    shares: 0,
    isSaved: false,
    blockedUserIds: params.blockedUserIds || params.user?.blockedUserIds || [],
    authorBlockedUserIds: params.blockedUserIds || params.user?.blockedUserIds || []
  };
}

/**
 * Pure Factory: Creates a GroupPost data model with an explicitly bound unique identifier.
 */
export function createGroupPost(params: CreateGroupPostParams): GroupPost {
  const uniqueId = generateUniquePostId('gpost');
  const basePost = createTimelinePost({
    ...params,
    status: params.requiresApproval ? 'pending' : 'published'
  });

  return {
    ...basePost,
    id: uniqueId,
    postId: uniqueId,
    groupId: params.groupId,
    groupName: params.groupName,
    groupAvatar: params.groupAvatar,
    isGroupPost: true,
    status: params.requiresApproval ? 'pending' : 'published'
  };
}

/**
 * Data Binding:
 * Securely stores the returned Uploadcare file URL and asset metadata
 * inside the uniquely identified Post object before dispatching to the feed.
 */
export function bindUploadcareAssetToPost(post: Post, asset: UploadedAssetMetadata): Post {
  return {
    ...post,
    attachment: {
      type: asset.type,
      title: asset.filename,
      url: asset.url || asset.cdnUrl,
      cdnUrl: asset.cdnUrl || asset.url,
      uuid: asset.uuid,
      size: asset.formattedSize,
      mimetype: asset.mimetype
    }
  };
}

/**
 * Router Connection Helper:
 * Generates the direct URL path or full share link for the uniquely identified post.
 * e.g., `/post/${post.postId}` or `https://studybook.com/post/${post.postId}`
 */
export function getPostDirectUrl(postOrId: Post | GroupPost | string): string {
  const postId = typeof postOrId === 'string' ? postOrId : (postOrId.postId || postOrId.id);
  return `/post/${postId}`;
}
