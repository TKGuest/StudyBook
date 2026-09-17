import { User, StudyGroup, GroupRole, GroupMember, GroupSettings } from '../types';

export type { GroupRole };

export interface RolePermissions {
  canRemoveSpam: boolean;
  canManageMembers: boolean;
  canPinFiles: boolean;
  canAssignLeader: boolean;
  canEditGroupInfo: boolean;
  canPostAndComment: boolean;
  canUploadFiles: boolean;
  canDownloadFiles: boolean;
}

export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  whoCanPost: 'all',
  whoCanChat: 'all',
  joinPolicy: 'free',
  requirePostApproval: false,
};

export interface GroupMemberItem {
  id: string;
  name: string;
  avatar: string;
  role: GroupRole;
  email?: string;
  grade?: string;
  institution?: string;
  joinedAt?: string;
}

/**
 * Standard Permission Matrix defining capabilities for each role
 */
export const ROLE_PERMISSIONS: Record<GroupRole, RolePermissions> = {
  admin: {
    canRemoveSpam: true,
    canManageMembers: true,
    canPinFiles: true,
    canAssignLeader: true,
    canEditGroupInfo: true,
    canPostAndComment: true,
    canUploadFiles: true,
    canDownloadFiles: true,
  },
  leader: {
    canRemoveSpam: true,
    canManageMembers: true,
    canPinFiles: true,
    canAssignLeader: false, // Only Admins can promote/demote Moderators
    canEditGroupInfo: true,
    canPostAndComment: true,
    canUploadFiles: true,
    canDownloadFiles: true,
  },
  moderator: {
    canRemoveSpam: true,
    canManageMembers: true,
    canPinFiles: true,
    canAssignLeader: false, // Only Admins can promote/demote Moderators
    canEditGroupInfo: true,
    canPostAndComment: true,
    canUploadFiles: true,
    canDownloadFiles: true,
  },
  member: {
    canRemoveSpam: false,
    canManageMembers: false,
    canPinFiles: false,
    canAssignLeader: false,
    canEditGroupInfo: false,
    canPostAndComment: true,
    canUploadFiles: true,
    canDownloadFiles: true,
  },
};

/**
 * Resolves a user's role within a specific Study Group
 */
export function getUserGroupRole(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): GroupRole {
  if (simulatedRole) return simulatedRole;
  if (!user) return 'member';

  // Global platform admin has full admin rights
  if (user.role === 'admin' || user.email?.toLowerCase() === 'billkute030709@gmail.com') {
    return 'admin';
  }

  if (!group) return 'member';

  // Explicit admin list check
  if (group.adminUserIds && group.adminUserIds.includes(user.id)) {
    return 'admin';
  }

  // Explicit leader list check
  if (group.leaderUserIds && group.leaderUserIds.includes(user.id)) {
    return 'leader';
  }

  // memberRoles mapping check
  if (group.memberRoles && group.memberRoles[user.id]) {
    return group.memberRoles[user.id];
  }

  return 'member';
}

/**
 * Returns permissions for a given group role
 */
export function getRolePermissions(role: GroupRole): RolePermissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.member;
}

/**
 * Check if user can remove spam (posts, comments, or files) in this group
 */
export function canUserRemoveSpam(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  return getRolePermissions(role).canRemoveSpam;
}

/**
 * Check if user can manage member access (remove spam accounts, kick members)
 */
export function canUserManageMembers(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  return getRolePermissions(role).canManageMembers;
}

/**
 * Check if user can pin study files at the top of the group library
 */
export function canUserPinFiles(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  return getRolePermissions(role).canPinFiles;
}

/**
 * Check if user can assign / promote a member to Moderator
 * ONLY the Admin of the group (or group creator) can assign/remove Moderators
 */
export function canUserAssignModerator(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  if (!group || !user) return false;
  // Platform admin can assign
  if (user.role === 'admin' || user.email?.toLowerCase() === 'billkute030709@gmail.com') return true;
  // Creator of the group can assign
  if (group.creatorId && group.creatorId === user.id) return true;
  // Admin of the group can assign
  const role = getUserGroupRole(group, user, simulatedRole);
  return role === 'admin';
}

export const canUserAssignLeader = canUserAssignModerator;

/**
 * General check if user has any management powers (Admin or Moderator)
 */
export function canUserManageGroup(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  return role === 'admin' || role === 'leader' || role === 'moderator';
}

/**
 * Helper to display simple text label layout: "Your role: [Admin / Moderator / Member]"
 */
export function formatRoleSimpleLabel(role: GroupRole): string {
  switch (role) {
    case 'admin':
      return 'Your role: Admin';
    case 'leader':
    case 'moderator':
      return 'Your role: Moderator';
    case 'member':
    default:
      return 'Your role: Member';
  }
}

/**
 * Helper to display role badges with consistent styling and icons
 */
export function getRoleBadgeDetails(role: GroupRole) {
  switch (role) {
    case 'admin':
      return {
        label: 'Admin',
        badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-900',
        dotClass: 'bg-rose-500',
        description: 'Full administrative control, moderator assignment, and settings management.',
      };
    case 'leader':
    case 'moderator':
      return {
        label: 'Moderator',
        badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900',
        dotClass: 'bg-amber-500',
        description: 'Cohort moderator with spam removal, member access, and file pinning powers.',
      };
    case 'member':
    default:
      return {
        label: 'Member',
        badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        dotClass: 'bg-slate-400',
        description: 'Standard cohort participant with normal study, chat, and download access.',
      };
  }
}

export interface GroupActionPermissionResult {
  allowed: boolean;
  role: GroupRole;
  requiresApproval?: boolean;
  reason?: string;
}

/**
 * Check if user can create a post in this study group according to group settings
 */
export function canUserPostInGroup(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  return checkUserCanPostInGroup(group, user, simulatedRole).allowed;
}

/**
 * Comprehensive permission verification for posting in a study group.
 * Validates user's role against whoCanPost policy and evaluates post approval rule.
 */
export function checkUserCanPostInGroup(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): GroupActionPermissionResult {
  if (!group) {
    return { allowed: false, role: 'member', reason: 'Study group not found.' };
  }
  if (!user) {
    return { allowed: false, role: 'member', reason: 'You must be signed in to post in this study group.' };
  }

  const role = getUserGroupRole(group, user, simulatedRole);

  // Admin & Moderator have unrestricted posting privileges and never require approval
  if (role === 'admin' || role === 'leader' || role === 'moderator') {
    return { allowed: true, role, requiresApproval: false };
  }

  // Check who can post setting
  const whoCanPost = group.settings?.whoCanPost || 'all';
  if (whoCanPost === 'admin_and_leader') {
    return {
      allowed: false,
      role: 'member',
      reason: 'Posting in this study group is restricted to Admins and Moderators only.'
    };
  }

  // Check if member post requires approval before publication
  const requiresApproval = Boolean(group.settings?.requirePostApproval);
  return {
    allowed: true,
    role: 'member',
    requiresApproval,
    reason: requiresApproval
      ? 'Your post will be submitted for Admin or Moderator approval before becoming visible to others.'
      : undefined
  };
}

/**
 * Check if user can participate in the study group chat according to group settings
 */
export function canUserChatInGroup(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  return checkUserCanChatInGroup(group, user, simulatedRole).allowed;
}

/**
 * Comprehensive permission verification for participating in group chat.
 * Evaluates user's role against whoCanChat policy toggle.
 */
export function checkUserCanChatInGroup(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): GroupActionPermissionResult {
  if (!group) {
    return { allowed: false, role: 'member', reason: 'Study group not found.' };
  }
  if (!user) {
    return { allowed: false, role: 'member', reason: 'You must be signed in to participate in group chat.' };
  }

  const role = getUserGroupRole(group, user, simulatedRole);

  // Admin & Moderator bypass chat restrictions
  if (role === 'admin' || role === 'leader' || role === 'moderator') {
    return { allowed: true, role };
  }

  // Check who can chat setting
  const whoCanChat = group.settings?.whoCanChat || 'all';
  if (whoCanChat === 'admin_and_leader') {
    return {
      allowed: false,
      role: 'member',
      reason: 'Group chat participation is restricted to Admins and Moderators only by group policy.'
    };
  }

  return { allowed: true, role: 'member' };
}

/**
 * Check if people can join this group freely without approval
 */
export function canUserJoinFreely(group: StudyGroup | null | undefined): boolean {
  return (group?.settings?.joinPolicy || 'free') === 'free';
}

/**
 * Check if a post from this user needs approval before becoming public
 */
export function doesUserPostRequireApproval(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  // Admin and Moderator posts are always published immediately
  if (role === 'admin' || role === 'leader' || role === 'moderator') return false;
  return Boolean(group?.settings?.requirePostApproval);
}

/**
 * Admin Exit Guardrail:
 * An Admin cannot leave the group unless they explicitly pass Admin ownership over to one of the active Moderators first.
 */
export function validateAdminLeaveGuardrail(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): {
  canLeave: boolean;
  reason?: string;
  activeLeaders: { id: string; name: string; avatar: string }[];
} {
  const role = getUserGroupRole(group, user, simulatedRole);
  if (role !== 'admin') {
    return { canLeave: true, activeLeaders: [] };
  }

  // Find all active Moderators in this group (excluding the current user)
  const currentUserId = user?.id || '';
  const leaders: { id: string; name: string; avatar: string }[] = [];

  if (group?.members && group.members.length > 0) {
    group.members.forEach(m => {
      const mRole = m.role || group.memberRoles?.[m.id];
      if ((mRole === 'leader' || mRole === 'moderator') && m.id !== currentUserId) {
        leaders.push({ id: m.id, name: m.name, avatar: m.avatar });
      }
    });
  }

  // Also check leaderUserIds if not already in leaders list
  if (group?.leaderUserIds) {
    group.leaderUserIds.forEach(leaderId => {
      if (leaderId !== currentUserId && !leaders.some(l => l.id === leaderId)) {
        const foundMember = group.members?.find(m => m.id === leaderId);
        leaders.push({
          id: leaderId,
          name: foundMember?.name || `Moderator (${leaderId.slice(0, 6)})`,
          avatar: foundMember?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
        });
      }
    });
  }

  return {
    canLeave: false,
    reason: 'An Admin cannot leave the group unless they explicitly pass Admin ownership over to one of the active Moderators first.',
    activeLeaders: leaders
  };
}

/**
 * Check if the user has exclusive destructive power to delete the entire group
 */
export function canUserDeleteGroup(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  return role === 'admin';
}

/**
 * Check if user can modify group settings (Admin and Moderator only)
 */
export function canUserModifySettings(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  return role === 'admin' || role === 'leader' || role === 'moderator';
}

/**
 * Check if user can review and approve pending join requests
 */
export function canUserReviewJoinRequests(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  return role === 'admin' || role === 'leader' || role === 'moderator';
}

/**
 * Check if user can approve or reject pending member posts
 */
export function canUserApprovePosts(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  return role === 'admin' || role === 'leader' || role === 'moderator';
}

