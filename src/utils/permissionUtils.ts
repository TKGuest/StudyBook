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
    canAssignLeader: false, // Only Admins can promote/demote Leaders
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
 * Check if user can assign / promote a member to Group Leader
 */
export function canUserAssignLeader(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  return getRolePermissions(role).canAssignLeader;
}

/**
 * General check if user has any management powers (Admin or Leader)
 */
export function canUserManageGroup(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  return role === 'admin' || role === 'leader';
}

/**
 * Helper to display simple text label layout: "Your role: [Admin / Group Leader / Member]"
 */
export function formatRoleSimpleLabel(role: GroupRole): string {
  switch (role) {
    case 'admin':
      return 'Your role: Admin';
    case 'leader':
      return 'Your role: Group Leader';
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
        description: 'Full administrative control, leader assignment, and moderation.',
      };
    case 'leader':
      return {
        label: 'Group Leader',
        badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900',
        dotClass: 'bg-amber-500',
        description: 'Study group manager with spam removal, member access, and file pinning powers.',
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

/**
 * Check if user can create a post in this study group according to group settings
 */
export function canUserPostInGroup(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  if (role === 'admin' || role === 'leader') return true;
  const policy = group?.settings?.whoCanPost || 'all';
  return policy === 'all';
}

/**
 * Check if user can participate in the study group chat according to group settings
 */
export function canUserChatInGroup(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  if (role === 'admin' || role === 'leader') return true;
  const policy = group?.settings?.whoCanChat || 'all';
  return policy === 'all';
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
  // Admin and Group Leader posts are always published immediately
  if (role === 'admin' || role === 'leader') return false;
  return Boolean(group?.settings?.requirePostApproval);
}

/**
 * Admin Exit Guardrail:
 * An Admin cannot leave the group unless they explicitly pass Admin ownership over to one of the active Group Leaders first.
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

  // Find all active Group Leaders in this group (excluding the current user)
  const currentUserId = user?.id || '';
  const leaders: { id: string; name: string; avatar: string }[] = [];

  if (group?.members && group.members.length > 0) {
    group.members.forEach(m => {
      const mRole = m.role || group.memberRoles?.[m.id];
      if (mRole === 'leader' && m.id !== currentUserId) {
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
          name: foundMember?.name || `Leader (${leaderId.slice(0, 6)})`,
          avatar: foundMember?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
        });
      }
    });
  }

  return {
    canLeave: false,
    reason: 'An Admin cannot leave the group unless they explicitly pass Admin ownership over to one of the active Group Leaders first.',
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
 * Check if user can modify group settings (Admin and Group Leader only)
 */
export function canUserModifySettings(
  group: StudyGroup | null | undefined,
  user: User | null | undefined,
  simulatedRole?: GroupRole | null
): boolean {
  const role = getUserGroupRole(group, user, simulatedRole);
  return role === 'admin' || role === 'leader';
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
  return role === 'admin' || role === 'leader';
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
  return role === 'admin' || role === 'leader';
}

