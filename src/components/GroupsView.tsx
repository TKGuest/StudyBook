import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StudyGroup, GroupRole, GroupMember, GroupFile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { playSound } from '../utils/soundEffects';
import { 
  getUserGroupRole, 
  getRolePermissions, 
  canUserRemoveSpam, 
  canUserManageMembers, 
  canUserPinFiles, 
  canUserAssignLeader,
  canUserAssignModerator,
  canUserModifySettings,
  canUserDeleteGroup,
  checkUserCanPostInGroup,
  checkUserCanChatInGroup,
  canUserApprovePosts,
  canUserReviewJoinRequests,
  doesUserPostRequireApproval,
  formatRoleSimpleLabel
} from '../utils/permissionUtils';
import { 
  Users, 
  FileText, 
  MessageCircle, 
  ChevronRight, 
  Clock, 
  Download, 
  Send, 
  FileCode, 
  Plus, 
  EyeOff, 
  UserCheck,
  X,
  Pin,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Crown,
  UserMinus,
  CheckCircle2,
  Sparkles,
  Shield,
  Settings,
  Lock,
  Unlock,
  AlertCircle,
  Check,
  Globe,
  Edit3,
  Image,
  Upload
} from 'lucide-react';

export const GroupsView: React.FC = () => {
  const { 
    groups, 
    setGroups, 
    posts,
    addPost,
    deletePost,
    groupChats, 
    sendGroupMessage, 
    createStudyGroup,
    joinedGroupIds,
    groupInteractions,
    recordGroupInteraction,
    toggleJoinGroup,
    requestJoinGroup,
    user,
    togglePinGroupFile,
    deleteGroupFile,
    updateGroupMemberRole,
    removeGroupMember,
    updateGroupSettings,
    updateGroupDetails,
    deleteStudyGroup,
    transferAdminOwnership,
    approveJoinRequest,
    rejectJoinRequest,
    approvePendingPost,
    rejectPendingPost,
    openSinglePost,
    showConfirmModal
  } = useApp();

  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    return localStorage.getItem('sb_selected_group_id') || groups[0]?.id || '';
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('sb_selected_group_id');
      if (saved) setSelectedGroupId(saved);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('sb_group_selected', handleStorage as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sb_group_selected', handleStorage as EventListener);
    };
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      localStorage.setItem('sb_selected_group_id', selectedGroupId);
    }
  }, [selectedGroupId]);
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'files' | 'chat' | 'members' | 'settings'>('feed');
  const [chatInput, setChatInput] = useState('');
  const [anonToggle, setAnonToggle] = useState(false);
  const [groupPostText, setGroupPostText] = useState('');
  
  // Custom states for creating study group
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('General');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  // Custom states for creating new files
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileType, setNewFileType] = useState('PDF');
  const [countdownText, setCountdownText] = useState('');

  // Edit Group State (Admin only)
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupBanner, setEditGroupBanner] = useState('');
  const [isSavingGroupDetails, setIsSavingGroupDetails] = useState(false);
  const [editGroupStatus, setEditGroupStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BANNER_PRESETS = [
    { label: 'Calculus & Math', url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=1200' },
    { label: 'Physics & Science', url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&q=80&w=1200' },
    { label: 'Study Group', url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1200' },
    { label: 'Library & Books', url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1200' },
    { label: 'Study Desk', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1200' },
    { label: 'Modern Campus', url: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&q=80&w=1200' }
  ];

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeGroup = groups.find(g => g.id === selectedGroupId) || groups[0];
  const activeChat = groupChats.find(c => c.groupId === selectedGroupId);

  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // Role-based permissions for current cohort
  const effectiveRole: GroupRole = getUserGroupRole(activeGroup, user);
  const permissions = getRolePermissions(effectiveRole);
  const canRemoveSpam = canUserRemoveSpam(activeGroup, user);
  const canPinFiles = canUserPinFiles(activeGroup, user);
  const canManageMembers = canUserManageMembers(activeGroup, user);
  const canAssignModerator = canUserAssignModerator(activeGroup, user);
  const canAssignLeader = canAssignModerator;
  const canDeleteGroup = canUserDeleteGroup(activeGroup, user);

  const handleConfirmDeleteGroup = async () => {
    if (!activeGroup || isDeletingGroup) return;
    setIsDeletingGroup(true);
    try {
      const res = await deleteStudyGroup(activeGroup.id);
      if (res.success) {
        const remaining = groups.filter(g => g.id !== activeGroup.id);
        const nextId = remaining[0]?.id || '';
        setSelectedGroupId(nextId);
        if (nextId) {
          localStorage.setItem('sb_selected_group_id', nextId);
        } else {
          localStorage.removeItem('sb_selected_group_id');
        }
        setShowDeleteGroupModal(false);
        setShowEditGroupModal(false);
      } else {
        alert(res.message || 'Failed to delete group');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting the group.');
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const handleOpenEditGroupModal = () => {
    if (!activeGroup) return;
    setEditGroupName(activeGroup.name || '');
    setEditGroupDescription(activeGroup.description || '');
    setEditGroupBanner(activeGroup.coverImage || '');
    setEditGroupStatus(null);
    setShowEditGroupModal(true);
  };

  const handleSaveGroupDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeGroup) return;
    if (!editGroupName.trim()) {
      setEditGroupStatus({ type: 'error', text: 'Group name cannot be empty.' });
      return;
    }
    setIsSavingGroupDetails(true);
    setEditGroupStatus(null);
    try {
      const res = await updateGroupDetails(activeGroup.id, {
        name: editGroupName.trim(),
        description: editGroupDescription.trim(),
        coverImage: editGroupBanner.trim() || activeGroup.coverImage
      });
      if (res.success) {
        setEditGroupStatus({ type: 'success', text: 'Group details updated successfully!' });
        setTimeout(() => {
          setShowEditGroupModal(false);
          setEditGroupStatus(null);
        }, 600);
      } else {
        setEditGroupStatus({ type: 'error', text: res.message || 'Failed to update group details.' });
      }
    } catch (err: any) {
      setEditGroupStatus({ type: 'error', text: err?.message || 'Error updating group details.' });
    } finally {
      setIsSavingGroupDetails(false);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setEditGroupStatus({ type: 'error', text: 'File size should be under 4MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditGroupBanner(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Computed displayed members guaranteeing current user and cohort peers appear
  const displayedMembers = useMemo(() => {
    if (!activeGroup) return [];
    let list = [...(activeGroup.members || [])];
    const currentUserId = user?.id || 'u_current';
    const currentUserName = user?.name || (user?.email ? user.email.split('@')[0] : 'Bill Kute');
    const currentUserAvatar = user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';
    const isGlobalAdmin = Boolean(user && (user.role === 'admin' || user.email?.toLowerCase() === 'billkute030709@gmail.com'));

    const isMember = Boolean(activeGroup.isMember || activeGroup.memberUserIds?.includes(currentUserId));

    // Find if user is in list
    const userIndex = list.findIndex(m => 
      m.id === currentUserId || 
      m.id === 'u_current' || 
      m.name === currentUserName ||
      (m.role === 'admin' && isGlobalAdmin)
    );

    if (userIndex >= 0) {
      if (isMember) {
        list[userIndex] = {
          ...list[userIndex],
          id: currentUserId,
          name: currentUserName,
          avatar: currentUserAvatar,
          role: effectiveRole === 'admin' ? 'admin' : (list[userIndex].role || effectiveRole || 'member')
        };
      } else {
        list = list.filter((_, idx) => idx !== userIndex);
      }
    } else if (isMember) {
      list.unshift({
        id: currentUserId,
        name: currentUserName,
        avatar: currentUserAvatar,
        role: effectiveRole === 'admin' ? 'admin' : (effectiveRole === 'moderator' || effectiveRole === 'leader' ? 'moderator' : 'member'),
        grade: user?.grade || 'Grade 10',
        joinedAt: 'Recently'
      });
    }

    // Filter out any fake bot cohort members from displayed roster
    const BOT_MEMBER_IDS = new Set(['u_elena', 'u_marcus', 'u_maya', 'u_liam']);
    list = list.filter(m => !BOT_MEMBER_IDS.has(m.id));

    // STRICT RULE: Exactly at most ONE admin in the list!
    let hasAdminInList = false;
    list = list.map(m => {
      let role = m.role;
      if (role === 'admin') {
        if (!hasAdminInList) {
          hasAdminInList = true;
        } else {
          role = 'moderator';
        }
      }
      let joinedAt = m.joinedAt;
      if (joinedAt && joinedAt.toLowerCase().includes('founder')) {
        joinedAt = 'Recently';
      }
      return { ...m, role, joinedAt };
    });

    return list;
  }, [activeGroup?.members, activeGroup?.creatorId, user, effectiveRole]);

  const canModifySettings = canUserModifySettings(activeGroup, user);
  const canReviewJoinReqs = canUserReviewJoinRequests(activeGroup, user);
  const canApprovePostList = canUserApprovePosts(activeGroup, user);
  const postPermission = checkUserCanPostInGroup(activeGroup, user);
  const chatPermission = checkUserCanChatInGroup(activeGroup, user);

  const isMember = Boolean(
    activeGroup && (
      joinedGroupIds.includes(activeGroup.id) ||
      activeGroup.isMember ||
      (Array.isArray(activeGroup.memberUserIds) && activeGroup.memberUserIds.includes(user.id))
    )
  );
  const isPendingJoin = Boolean(activeGroup && (activeGroup.pendingJoinRequests || []).some(r => r.userId === user.id));

  const pendingRequests = activeGroup?.pendingJoinRequests || [];
  const pendingGroupPosts = (posts || []).filter(p => p.groupId === activeGroup?.id && p.status === 'pending');
  const pendingCount = pendingRequests.length + pendingGroupPosts.length;

  // Auto scroll chat to bottom
  useEffect(() => {
    if (activeSubTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSubTab, activeChat?.messages]);

  // Exam Countdown Ticker logic
  useEffect(() => {
    if (!activeGroup?.countdownDate) {
      setCountdownText('');
      return;
    }

    const interval = setInterval(() => {
      const target = new Date(activeGroup.countdownDate!).getTime();
      if (isNaN(target)) {
        setCountdownText('');
        clearInterval(interval);
        return;
      }
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setCountdownText('Exam is currently ongoing or has finished!');
        clearInterval(interval);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdownText(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeGroup?.countdownDate]);

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    playSound('send');
    try {
      const createdId = await createStudyGroup(
        newGroupName.trim(),
        newGroupDescription.trim() || 'A new study group co-created by learners.',
        newGroupCategory.trim() || 'General'
      );
      setSelectedGroupId(createdId);
      setActiveSubTab('feed');
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupCategory('General');
    } catch (err) {
      console.warn('Failed to create study group:', err);
    }
  };

  const renderCreateGroupModal = () => {
    if (!showCreateGroupModal) return null;

    const suggestedCategories = [
      'General / Study Lounge',
      'Math & Science',
      'Literature & Humanities',
      'Computer Science & Tech',
      'Exam Prep (SAT / AP / Graduation)',
      'Physics & Engineering',
      'Biology & Chemistry'
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-150 dark:border-slate-700 text-left animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-slate-700">
            <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Create New Study Group
            </h3>
            <button
              type="button"
              onClick={() => {
                playSound('pop');
                setShowCreateGroupModal(false);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="e.g. AP Calculus BC Exam Prep 2026"
                className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Category / Subject
                </label>
                <span className="text-[10px] text-gray-400">Typable custom category</span>
              </div>
              <input
                type="text"
                list="group-categories-datalist"
                value={newGroupCategory}
                onChange={e => setNewGroupCategory(e.target.value)}
                placeholder="Type any subject, e.g. AP Calculus, Quantum Physics..."
                className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <datalist id="group-categories-datalist">
                {suggestedCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>

              {/* Quick-select pill suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {suggestedCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewGroupCategory(cat)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors border cursor-pointer ${
                      newGroupCategory === cat
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:border-blue-400'
                    }`}
                  >
                    {cat.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={newGroupDescription}
                onChange={e => setNewGroupDescription(e.target.value)}
                placeholder="Describe the main goals, schedule, or rules for this group..."
                className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                Create Group
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderEditGroupModal = () => {
    if (!showEditGroupModal || !activeGroup) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-150 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-slate-700 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Edit3 className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white">
                  Edit Group Details
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Update your cohort's name, description, and cover banner.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound('pop');
                setShowEditGroupModal(false);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {editGroupStatus && (
            <div className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              editGroupStatus.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}>
              {editGroupStatus.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{editGroupStatus.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveGroupDetails} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                required
                value={editGroupName}
                onChange={e => setEditGroupName(e.target.value)}
                placeholder="Cohort name"
                className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={editGroupDescription}
                onChange={e => setEditGroupDescription(e.target.value)}
                placeholder="What is this cohort about? Study goals, exam dates, syllabus..."
                className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Cover Banner Image
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="h-3 w-3" />
                  Upload Image
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleBannerUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* Live Preview */}
              <div className="relative h-28 w-full rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                {editGroupBanner ? (
                  <img 
                    src={editGroupBanner} 
                    alt="Banner preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = activeGroup.coverImage;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    No banner selected
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                  <span className="text-[10px] font-bold text-white bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    Live Banner Preview
                  </span>
                </div>
              </div>

              {/* Custom Image URL input */}
              <input
                type="text"
                value={editGroupBanner}
                onChange={e => setEditGroupBanner(e.target.value)}
                placeholder="Or paste an image URL (https://...)"
                className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3.5 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 mb-3"
              />

              {/* Banner Presets */}
              <div>
                <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Or pick a preset theme banner:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {BANNER_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setEditGroupBanner(preset.url)}
                      className={`relative h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer group ${
                        editGroupBanner === preset.url 
                          ? 'border-blue-600 ring-2 ring-blue-500/40 shadow-xs scale-[1.02]' 
                          : 'border-transparent hover:border-gray-300 dark:hover:border-slate-600 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-end p-1 transition-colors">
                        <span className="text-[9px] font-bold text-white leading-tight truncate">
                          {preset.label}
                        </span>
                      </div>
                      {editGroupBanner === preset.url && (
                        <div className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-gray-150 dark:border-slate-700">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditGroupModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingGroupDetails}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingGroupDetails ? (
                    <>
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderDeleteGroupModal = () => {
    if (!showDeleteGroupModal || !activeGroup) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                Delete Study Group
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                Admin Destructive Action
              </p>
            </div>
          </div>

          <div className="bg-rose-50/60 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200/60 dark:border-rose-900/40 text-xs text-gray-700 dark:text-gray-300 leading-relaxed space-y-2">
            <p>
              Are you sure you want to permanently delete <strong className="font-extrabold text-gray-900 dark:text-white">"{activeGroup.name}"</strong>?
            </p>
            <ul className="space-y-1 text-[11px] text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li>All timeline discussions and replies will be permanently removed</li>
              <li>All shared study resources will be deleted</li>
              <li>All group chat messages will be cleared</li>
              <li>All member associations will be terminated</li>
            </ul>
            <p className="font-bold text-rose-700 dark:text-rose-400 text-[11px] pt-1">
              This action cannot be undone. Only the single Group Admin has authority to delete this group.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteGroupModal(false)}
              disabled={isDeletingGroup}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteGroup}
              disabled={isDeletingGroup}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white shadow-md shadow-rose-600/25 transition cursor-pointer flex items-center gap-1.5"
            >
              {isDeletingGroup ? (
                <>
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete group</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeGroup) return;

    playSound('send');
    sendGroupMessage(activeGroup.id, chatInput);
    setChatInput('');
  };

  const handleCreateGroupPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupPostText.trim() || !activeGroup) return;

    playSound('send');
    addPost(
      groupPostText.trim(),
      activeGroup.category || 'General',
      undefined,
      undefined,
      anonToggle,
      undefined,
      user.grade || 'Grade 10',
      {
        groupId: activeGroup.id,
        groupName: activeGroup.name,
        groupAvatar: activeGroup.coverImage
      }
    );
    setGroupPostText('');
  };

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileTitle.trim() || !activeGroup) return;

    playSound('send');
    recordGroupInteraction(activeGroup.id, 'file');
    const newFile: GroupFile = {
      id: `f_${Date.now()}`,
      title: newFileTitle.endsWith('.pdf') || newFileTitle.endsWith('.docx') ? newFileTitle : `${newFileTitle}.${newFileType.toLowerCase()}`,
      uploader: user.name || 'You',
      uploaderId: user.id || 'u_current',
      date: 'Today',
      size: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
      type: newFileType,
      isPinned: false
    };

    setGroups(prev => prev.map(g => {
      if (g.id !== activeGroup.id) return g;
      return {
        ...g,
        files: [newFile, ...(g.files || [])]
      };
    }));

    setNewFileTitle('');
    setShowAddFileModal(false);
    alert(`Document "${newFile.title}" uploaded to group successfully!`);
  };

  const handleCreateGroupPrompt = () => {
    playSound('pop');
    setShowCreateGroupModal(true);
  };

  if (!activeGroup || groups.length === 0) {
    return (
      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-57px)] bg-slate-50 dark:bg-slate-900 transition-colors">
        {/* Left side list of cohorts */}
        <div className="w-full md:w-80 shrink-0 border-r border-gray-150 dark:border-slate-800 bg-white dark:bg-slate-800 p-4 space-y-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-extrabold text-base text-gray-800 dark:text-white flex items-center gap-1.5">
                <Users className="h-5 w-5 text-blue-600" />
                Classes & Groups
              </h3>
              <button 
                onClick={handleCreateGroupPrompt}
                className="p-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 transition-colors cursor-pointer border-none"
                title="Create new Study Group"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="py-8 px-4 text-center border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50">
              <Users className="h-8 w-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">No groups in database</p>
              <p className="text-[11px] text-gray-400 mt-1">Create your first group below</p>
            </div>
          </div>

          <button
            onClick={handleCreateGroupPrompt}
            className="w-full mt-4 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all border-none cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="h-4.5 w-4.5" />
            CREATE NEW GROUP
          </button>
        </div>

        {/* Right side empty state */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
          <div className="p-5 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-4 border border-blue-100 dark:border-blue-900/60 shadow-sm">
            <Users className="h-10 w-10" />
          </div>
          <h2 className="font-display font-extrabold text-xl text-gray-900 dark:text-white">No Study Groups in Database</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-6 leading-relaxed">
            There are currently no study groups in the database. Create a new cohort to share study resources, chat in real-time, and collaborate with peers!
          </p>
          <button
            type="button"
            onClick={handleCreateGroupPrompt}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Create Study Group</span>
          </button>
        </div>

        {renderCreateGroupModal()}
        {renderEditGroupModal()}
        {renderDeleteGroupModal()}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-57px)] bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Left side list of cohorts */}
      <div className="w-full md:w-80 shrink-0 border-r border-gray-150 dark:border-slate-800 bg-white dark:bg-slate-800 p-4 space-y-4 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-extrabold text-base text-gray-800 dark:text-white flex items-center gap-1.5">
              <Users className="h-5 w-5 text-blue-600" />
              Classes & Groups
            </h3>
            <button 
              onClick={handleCreateGroupPrompt}
              className="p-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 transition-colors cursor-pointer border-none"
              title="Create new Study Group"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            {groups.map(g => {
              const isSelected = g.id === activeGroup.id;
              return (
                <motion.div
                  key={g.id}
                  onClick={() => {
                    setSelectedGroupId(g.id);
                    setActiveSubTab('feed');
                  }}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-3 rounded-2xl cursor-pointer flex gap-3 items-center transition-all ${
                    isSelected 
                      ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 shadow-sm' 
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <img src={g.coverImage} alt={g.name} className="h-11 w-11 rounded-xl object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{g.name}</p>
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Users className="h-3 w-3 shrink-0" />
                      {g.memberCount.toLocaleString()} members
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Prominent Create Group button inside Left Panel */}
        <button
          onClick={handleCreateGroupPrompt}
          className="w-full mt-4 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all border-none cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <Plus className="h-4.5 w-4.5" />
          CREATE NEW GROUP
        </button>
      </div>

      {/* Right side active group details workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Banner with cover photo */}
        <div className="relative h-44 shrink-0 bg-gray-200">
          <img src={activeGroup.coverImage} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full w-max uppercase tracking-wider">{activeGroup.category}</span>
              </div>

              <div className="flex items-center gap-2">
                {canModifySettings && (
                  <button
                    type="button"
                    onClick={handleOpenEditGroupModal}
                    className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors cursor-pointer border border-white/10"
                    title="Edit Group Info"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}

                {isMember ? (
                  <button
                    type="button"
                    onClick={() => toggleJoinGroup(activeGroup.id)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Joined</span>
                  </button>
                ) : isPendingJoin ? (
                  <button
                    type="button"
                    disabled
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-amber-500/90 text-white shadow-sm cursor-not-allowed"
                  >
                    <Clock className="h-3.5 w-3.5 animate-pulse" />
                    <span>Request Pending</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await requestJoinGroup(activeGroup.id);
                      if (res.message) alert(res.message);
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm bg-white hover:bg-gray-100 text-gray-900"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{activeGroup.settings?.joinPolicy === 'approval' ? 'Request to Join' : 'Join Group'}</span>
                  </button>
                )}
              </div>
            </div>
            <h2 className="font-display font-extrabold text-xl text-white tracking-tight">{activeGroup.name}</h2>
            <p className="text-xs text-gray-200 font-medium truncate mt-1">{activeGroup.description}</p>
          </div>
        </div>

        {/* Dynamic Exam Countdown Ticker */}
        {activeGroup.countdownDate && (
          <div className="bg-amber-500/10 dark:bg-amber-950/20 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-amber-750 dark:text-amber-400 shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
              <span>EXAM COUNTDOWN: {activeGroup.countdownLabel}</span>
            </div>
            <div className="font-mono bg-amber-500 text-white dark:bg-amber-950/60 dark:text-amber-300 px-3 py-1 rounded-full shadow-sm text-[11px]">
              {countdownText || 'Syncing...'}
            </div>
          </div>
        )}

        {/* Sub Navigation inside Group */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-150 dark:border-slate-750 px-4 flex gap-4 shrink-0 overflow-x-auto">
          {[
            { id: 'feed', label: 'Discussion Board', icon: MessageCircle },
            { id: 'files', label: 'Study Resources', icon: FileText },
            { id: 'chat', label: 'Group Chat', icon: MessageCircle },
            { id: 'members', label: 'Members', icon: Users },
            { id: 'settings', label: 'Settings & Privacy', icon: Settings, badge: pendingCount > 0 ? pendingCount : undefined }
          ].map(tab => {
            const isSel = activeSubTab === tab.id;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`py-3.5 px-1 flex items-center gap-2 text-xs font-bold border-b-2 transition-all cursor-pointer relative ${
                  isSel 
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Inner workspace body based on active sub tab */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20">
          <AnimatePresence mode="wait">
            {/* TAB: WALL FEED */}
            {activeSubTab === 'feed' && (
              <motion.div
                key="feed-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18 }}
                className="max-w-2xl mx-auto space-y-6"
              >
              {/* Group quick post creator */}
              {!postPermission.allowed ? (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 rounded-2xl p-4 text-center text-xs text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 shadow-xs">
                  <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{postPermission.reason || 'Only Group Moderators and Admins are permitted to post in this cohort.'}</span>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">Post a question to cohort timeline</span>
                    {postPermission.requiresApproval && (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/50">
                        <Clock className="h-3 w-3" /> Requires moderator approval
                      </span>
                    )}
                  </div>
                  <form onSubmit={handleCreateGroupPost} className="space-y-3">
                    <textarea
                      value={groupPostText}
                      onChange={e => setGroupPostText(e.target.value)}
                      placeholder="What would you like to ask in this cohort? Feel free to toggle anonymous posting if you prefer..."
                      className="w-full text-xs placeholder-gray-400 text-gray-800 dark:text-white bg-transparent border-none focus:outline-none resize-none h-16"
                    />
                    <div className="flex justify-between items-center pt-2 border-t border-gray-50 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setAnonToggle(!anonToggle)}
                        className={`flex items-center gap-1 text-[11px] font-semibold transition-colors ${anonToggle ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        Ask anonymously (shrouded profile)
                      </button>
                      <button
                        type="submit"
                        disabled={!groupPostText.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-1 px-4 rounded-full text-xs cursor-pointer"
                      >
                        {postPermission.requiresApproval ? 'Submit for Approval' : 'Post to Cohort'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Group discussions */}
              <div className="space-y-4">
                {posts.filter(p => p.groupId === activeGroup.id).length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-8 text-center text-gray-400 space-y-1">
                    <MessageCircle className="h-8 w-8 mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">No discussion questions yet</p>
                    <p className="text-[10px]">Start the conversation above to collaborate with peers in {activeGroup.name}.</p>
                  </div>
                ) : (
                  posts.filter(p => p.groupId === activeGroup.id).map(p => {
                    const isAuthor = (p.authorId || p.user?.id) === user.id;
                    const showModerationDelete = canRemoveSpam || isAuthor;

                    return (
                      <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img 
                              src={p.isAnonymous ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' : (p.user?.avatar || user.avatar)} 
                              alt="Avatar" 
                              className="h-8 w-8 rounded-full object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-bold text-gray-800 dark:text-white">
                                  {p.isAnonymous ? 'Anonymous Student' : (p.user?.name || p.authorName || 'Cohort Peer')}
                                </h4>
                                {(() => {
                                  if (p.isAnonymous) return null;
                                  const postAuthorId = p.authorId || p.user?.id;
                                  const authorRole: GroupRole = postAuthorId
                                    ? (activeGroup.adminUserIds?.includes(postAuthorId) || (activeGroup.creatorId && activeGroup.creatorId === postAuthorId)
                                        ? 'admin'
                                        : (activeGroup.leaderUserIds?.includes(postAuthorId) || activeGroup.memberRoles?.[postAuthorId] === 'moderator' || activeGroup.memberRoles?.[postAuthorId] === 'leader')
                                          ? 'moderator'
                                          : 'member')
                                    : 'member';

                                  if (authorRole === 'admin') {
                                    return (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                        <ShieldCheck className="h-2.5 w-2.5" /> [Admin]
                                      </span>
                                    );
                                  }
                                  if (authorRole === 'moderator') {
                                    return (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        <Shield className="h-2.5 w-2.5" /> [Moderator]
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.2 rounded-md bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300 border border-gray-200 dark:border-slate-650">
                                      [Member]
                                    </span>
                                  );
                                })()}
                              </div>
                              <p 
                                onClick={() => openSinglePost(p.postId || p.id)}
                                className="text-[10px] text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                                title="Click to view post closely"
                              >
                                {p.timestamp?.includes('T') ? new Date(p.timestamp).toLocaleDateString() : (p.timestamp || 'Just now')} • {p.subject}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span 
                              onClick={() => openSinglePost(p.postId || p.id)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                              title="Click to view post closely"
                            >
                              Cohort Post
                            </span>

                            {/* Spam Removal button for Group Moderators & Admins */}
                            {showModerationDelete && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showConfirmModal({
                                    title: isAuthor ? 'Delete Your Post?' : 'Remove Spam Post?',
                                    message: isAuthor 
                                      ? 'Are you sure you want to delete your post from this cohort? This action cannot be undone.'
                                      : 'As Group Moderator/Admin, are you sure you want to remove this post from the cohort feed?',
                                    confirmText: isAuthor ? 'Delete Post' : 'Remove Spam',
                                    variant: 'danger',
                                    icon: 'trash',
                                    onConfirm: () => deletePost(p.id)
                                  });
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                title={isAuthor ? 'Delete your post' : 'Remove spam (Admin/Moderator permission)'}
                              >
                                <Trash2 className="h-3 w-3" />
                                {canRemoveSpam && !isAuthor ? 'Remove Spam' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Post content - Clickable to view closely */}
                        <div 
                          onClick={() => openSinglePost(p.postId || p.id)}
                          className="cursor-pointer group"
                          title="Click to view post closely"
                        >
                          <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed font-sans font-normal group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {p.content}
                          </p>
                        </div>

                        {/* Attachment if present */}
                        {p.attachment && (
                          <div 
                            onClick={() => openSinglePost(p.postId || p.id)}
                            className="cursor-pointer rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700"
                            title="Click to view attachment closely"
                          >
                            {p.attachment.type === 'image' ? (
                              <img 
                                src={p.attachment.url} 
                                alt={p.attachment.title}
                                className="w-full max-h-[300px] object-cover hover:opacity-95 transition-opacity" 
                              />
                            ) : (
                              <div className="p-3 bg-gray-50 dark:bg-slate-750 flex items-center justify-between text-xs">
                                <span className="font-semibold text-gray-800 dark:text-white truncate">
                                  {p.attachment.title}
                                </span>
                                <span className="text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                                  View Attached File
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-750 text-[11px] text-gray-400">
                          <button
                            type="button"
                            onClick={() => openSinglePost(p.postId || p.id)}
                            className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                          >
                            <span>{p.comments?.length || 0} comments</span>
                            <span className="mx-1">•</span>
                            <span>{(p.reactions?.helpful || 0) + (p.reactions?.insightful || 0)} reactions</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openSinglePost(p.postId || p.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            title="Open close-up view and write a comment"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>View & Comment</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              </motion.div>
            )}

            {/* TAB: CROWDSOURCED FILES DIRECTORY */}
            {activeSubTab === 'files' && (
              <motion.div
                key="files-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18 }}
                className="max-w-3xl mx-auto space-y-4"
              >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white">Shared Crowd-sourced Library (Drive)</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">All resource files uploaded by verified educators and students in this cohort.</p>
                </div>
                <button
                  onClick={() => setShowAddFileModal(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Contribute File
                </button>
              </div>

              {/* Render dynamic directory listing */}
              {(!activeGroup.files || activeGroup.files.length === 0) ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 text-center text-gray-400 space-y-1">
                  <FileCode className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-semibold">No study resources have been uploaded yet.</p>
                  <p className="text-[10px]">Be the first to contribute a revision document or mock exam!</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-slate-700">
                  {[...(activeGroup.files || [])].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).map(file => {
                    const isUploader = file.uploaderId === user.id || file.uploader === user.name;
                    const canDeleteThisFile = canRemoveSpam || isUploader;

                    return (
                      <div key={file.id} className={`p-3.5 flex items-center justify-between gap-4 transition-colors ${file.isPinned ? 'bg-amber-50/40 dark:bg-amber-950/20' : 'hover:bg-gray-50/50 dark:hover:bg-slate-750'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center font-extrabold text-[10px] shrink-0 ${file.isPinned ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-red-100 text-red-600'}`}>
                            {file.type}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{file.title}</p>
                              {file.isPinned && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md shrink-0">
                                  <Pin className="h-2.5 w-2.5 fill-amber-700 dark:fill-amber-300" />
                                  Pinned
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                              <span>By {file.uploader}</span>
                              <span>•</span>
                              <span>{file.date}</span>
                              <span>•</span>
                              <span className="font-mono">{file.size}</span>
                              {file.pinnedBy && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-600 dark:text-amber-400">Pinned by {file.pinnedBy}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Pin / Unpin Action for Leaders and Admins */}
                          {canPinFiles && (
                            <button
                              type="button"
                              onClick={() => togglePinGroupFile(activeGroup.id, file.id)}
                              className={`p-2 rounded-full transition-colors cursor-pointer ${
                                file.isPinned 
                                  ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200' 
                                  : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700'
                              }`}
                              title={file.isPinned ? 'Unpin file' : 'Pin file to top (Moderator/Admin)'}
                            >
                              <Pin className={`h-3.5 w-3.5 ${file.isPinned ? 'fill-current' : ''}`} />
                            </button>
                          )}

                          {/* Delete File Action (Admin, Moderator, or Uploader) */}
                          {canDeleteThisFile && (
                            <button
                              type="button"
                              onClick={() => {
                                showConfirmModal({
                                  title: isUploader ? 'Delete Uploaded File?' : 'Remove Cohort File?',
                                  message: isUploader
                                    ? `Delete "${file.title}" from this cohort library? This cannot be undone.`
                                    : `As Group Moderator/Admin, remove "${file.title}" from the cohort files?`,
                                  confirmText: 'Delete File',
                                  variant: 'danger',
                                  icon: 'trash',
                                  onConfirm: () => deleteGroupFile(activeGroup.id, file.id)
                                });
                              }}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors cursor-pointer"
                              title={isUploader ? 'Delete your file' : 'Remove file (Admin/Moderator)'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Download File */}
                          <button 
                            onClick={() => alert(`Downloading document "${file.title}"...`)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
                            title="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload File Modal Prompt */}
              {showAddFileModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                  <form onSubmit={handleAddFile} className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md space-y-4">
                    <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white">Upload Revision Notes / Resources</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase">Study File Title</label>
                        <input
                          type="text"
                          required
                          value={newFileTitle}
                          onChange={e => setNewFileTitle(e.target.value)}
                          placeholder="e.g. De_Thi_Thu_Toan_Chuyen_Hai_Phong.pdf"
                          className="w-full bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-gray-400 uppercase">Format</label>
                          <select
                            value={newFileType}
                            onChange={e => setNewFileType(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-white mt-1"
                          >
                            <option value="PDF" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">PDF Document</option>
                            <option value="DOCX" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Word (.docx)</option>
                            <option value="ZIP" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">ZIP File</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-750">
                      <button
                        type="button"
                        onClick={() => setShowAddFileModal(false)}
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-4 py-1.5 rounded-lg text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold"
                      >
                        Finish
                      </button>
                    </div>
                  </form>
                </div>
              )}
              </motion.div>
            )}

            {/* TAB: PERMANENT MESSENGER FOR RAPID STUDY CONVERSATIONS */}
            {activeSubTab === 'chat' && activeChat && (
              <motion.div
                key="chat-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18 }}
                className="max-w-2xl mx-auto h-[450px] bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded-2xl flex flex-col overflow-hidden shadow-sm"
              >
              {/* Chat Title bar */}
              <div className="bg-gray-50 dark:bg-slate-750 px-4 py-3 border-b border-gray-150 dark:border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold text-gray-800 dark:text-white truncate">Study Chat ({activeGroup.name})</span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">Real-time</span>
              </div>

              {/* Chat Log Message Scroll */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20 dark:bg-slate-900/10">
                {(() => {
                  const sanitizedMessages = (activeChat.messages || []).filter(m => {
                    const sId = String(m?.sender?.id || '').toLowerCase();
                    const sName = String(m?.sender?.name || '').toLowerCase();
                    if (sId === 'system' || sId === 'bot' || sId === 'admin') return false;
                    if (sName.includes('ban quản lý') || sName.includes('studybook') || sName.includes('bot') || sName.includes('mai lan') || sName.includes('lucas')) return false;
                    return true;
                  });

                  if (sanitizedMessages.length === 0) {
                    return (
                      <div className="h-full flex items-center justify-center text-xs text-gray-400 text-center p-4">
                        No messages yet. Ask a question or share a problem with your cohort to start chatting!
                      </div>
                    );
                  }

                  return sanitizedMessages.map(m => {
                    const isSelf = m.sender.id === user.id;
                    return (
                      <div key={m.id} className={`flex gap-2.5 items-start max-w-[85%] ${isSelf ? 'ml-auto flex-row-reverse' : ''}`}>
                        <img src={m.sender.avatar} alt="Avatar" className="h-7 w-7 rounded-full object-cover mt-0.5 shrink-0" />
                        <div>
                          {!isSelf && (
                            <div className="flex items-center gap-1.5 mb-0.5 pl-1 flex-wrap">
                              <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300">{m.sender.name}</span>
                              {(() => {
                                const senderId = m.sender?.id;
                                const senderRole: GroupRole = senderId
                                  ? (activeGroup.adminUserIds?.includes(senderId) || (activeGroup.creatorId && activeGroup.creatorId === senderId)
                                      ? 'admin'
                                      : (activeGroup.leaderUserIds?.includes(senderId) || activeGroup.memberRoles?.[senderId] === 'moderator' || activeGroup.memberRoles?.[senderId] === 'leader')
                                        ? 'moderator'
                                        : 'member')
                                  : 'member';

                                if (senderRole === 'admin') {
                                  return <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">[Admin]</span>;
                                }
                                if (senderRole === 'moderator') {
                                  return <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">[Moderator]</span>;
                                }
                                return <span className="text-[8px] font-medium px-1.5 py-0.2 rounded bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400 border border-gray-200 dark:border-slate-650">[Member]</span>;
                              })()}
                            </div>
                          )}
                          <div className={`p-2.5 rounded-2xl text-xs leading-relaxed ${
                            isSelf 
                              ? 'bg-blue-600 text-white rounded-tr-none shadow-sm' 
                              : 'bg-white dark:bg-slate-750 text-gray-800 dark:text-white border border-gray-150 dark:border-slate-650 rounded-tl-none'
                          }`}>
                            {m.content}
                          </div>
                          <span className={`text-[8px] text-gray-400 block mt-0.5 ${isSelf ? 'text-right pr-1' : 'pl-1'}`}>{m.timestamp}</span>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Send Input Box */}
              {!chatPermission.allowed ? (
                <div className="p-4 bg-gray-50 dark:bg-slate-750 border-t border-gray-150 dark:border-slate-650 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>{chatPermission.reason || 'Chat participation is restricted to Admins and Group Moderators by group policy.'}</span>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-800 border-t border-gray-150 dark:border-slate-700 flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask a question, paste a homework problem, or type formulas..."
                    className="flex-1 bg-gray-50 dark:bg-slate-750 border border-gray-150 dark:border-slate-650 rounded-xl px-3.5 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
              </motion.div>
            )}

            {/* TAB: COHORT MEMBERS */}
            {activeSubTab === 'members' && (
              <motion.div
                key="members-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18 }}
                className="max-w-3xl mx-auto space-y-6"
              >
                {/* Cohort Roster List */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-gray-150 dark:border-slate-700 flex justify-between items-center bg-gray-50/60 dark:bg-slate-750/60">
                    <div>
                      <h4 className="font-display font-extrabold text-xs text-gray-900 dark:text-white">
                        Cohort Member Roster ({displayedMembers.length} members)
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {canManageMembers ? 'Manage member roles, moderator promotions, and cohort access.' : 'Active peers and leaders studying in this group.'}
                      </p>
                    </div>
                    {!canManageMembers && (
                      <span className="text-[10px] text-gray-400 italic">
                        Viewing as Member
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {displayedMembers.map(member => {
                      const memberRole = member.role || activeGroup.memberRoles?.[member.id] || 'member';
                      const isCurrentUser = member.id === user.id || member.id === 'u_current' || member.name === (user.name || 'Bill Kute');
                      const displayName = isCurrentUser ? (user.name || (user.email ? user.email.split('@')[0] : 'Bill Kute')) : member.name;
                      const displayAvatar = isCurrentUser ? (user.avatar || member.avatar) : member.avatar;

                      return (
                        <div key={member.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-slate-750 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <img 
                              src={displayAvatar} 
                              alt={displayName} 
                              className="h-9 w-9 rounded-full object-cover shrink-0 border border-gray-200 dark:border-slate-700" 
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                                  {displayName}
                                  {isCurrentUser && (
                                    <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                                      (You)
                                    </span>
                                  )}
                                </span>

                                {/* Role Badge */}
                                {memberRole === 'admin' && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                                    <ShieldCheck className="h-2.5 w-2.5" /> [Admin]
                                  </span>
                                )}
                                {(memberRole === 'leader' || memberRole === 'moderator') && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                                    <Shield className="h-2.5 w-2.5" /> [Moderator]
                                  </span>
                                )}
                                {memberRole === 'member' && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-650">
                                    [Member]
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {member.grade || 'Student'}
                                {member.joinedAt && !member.joinedAt.toLowerCase().includes('founder') ? ` • Joined ${member.joinedAt}` : ' • Joined recently'}
                              </p>
                            </div>
                          </div>

                          {/* Management Controls */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Admin-only: Transfer Admin ownership (Strictly enforces 1 admin rule) */}
                            {canDeleteGroup && !isCurrentUser && memberRole !== 'admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  showConfirmModal({
                                    title: 'Transfer Admin Ownership?',
                                    message: `Transfer primary Admin ownership of "${activeGroup.name}" to ${member.name}? You will step down to Moderator. Groups can only have 1 primary Admin.`,
                                    confirmText: 'Transfer Admin',
                                    variant: 'warning',
                                    icon: 'shield',
                                    onConfirm: () => updateGroupMemberRole(activeGroup.id, member.id, 'admin')
                                  });
                                }}
                                className="text-[10px] font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-rose-200 dark:border-rose-800"
                                title="Make Admin (Demotes current admin to maintain single admin rule)"
                              >
                                <Crown className="h-3 w-3" />
                                Make Admin
                              </button>
                            )}

                            {/* Admin-only: Assign Moderator role / Demote to Member */}
                            {canAssignModerator && !isCurrentUser && memberRole !== 'admin' && (
                              <>
                                {memberRole === 'member' ? (
                                  <button
                                    type="button"
                                    onClick={() => updateGroupMemberRole(activeGroup.id, member.id, 'moderator')}
                                    className="text-[10px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-amber-200 dark:border-amber-800"
                                    title="Assign Moderator role (Admin only)"
                                  >
                                    <Shield className="h-3 w-3" />
                                    Assign Moderator
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => updateGroupMemberRole(activeGroup.id, member.id, 'member')}
                                    className="text-[10px] font-bold bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-gray-200 dark:border-slate-650"
                                    title="Remove Moderator role"
                                  >
                                    Demote to Member
                                  </button>
                                )}
                              </>
                            )}

                            {/* Admins and Leaders can remove members (cannot remove admins or self) */}
                            {canManageMembers && !isCurrentUser && memberRole !== 'admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  showConfirmModal({
                                    title: `Remove ${member.name}?`,
                                    message: `Are you sure you want to remove ${member.name} from "${activeGroup.name}"? They will lose access to cohort discussions and files.`,
                                    confirmText: 'Remove Member',
                                    variant: 'danger',
                                    icon: 'userX',
                                    onConfirm: () => removeGroupMember(activeGroup.id, member.id)
                                  });
                                }}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Remove from cohort"
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: GROUP CONFIGURATION & PRIVACY GUARD */}
            {activeSubTab === 'settings' && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18 }}
                className="max-w-3xl mx-auto space-y-6"
              >
                {/* Header Banner */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-5 shadow-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-extrabold text-sm text-gray-900 dark:text-white">
                          Group Configuration & Privacy Guard
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Control publishing authority, chat accessibility, joining requirements, and post approval.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-200/50">
                      {canModifySettings ? 'Leadership Mode: Edit Access' : 'Read-Only Policy View'}
                    </span>
                  </div>
                  {!canModifySettings && (
                    <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/50 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>Only Group Admins and Moderators can modify group configuration. The active policies are shown below.</span>
                    </div>
                  )}
                </div>

                {/* Cohort Role & Admin Group Details Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-blue-900/60 p-5 shadow-xs bg-gradient-to-r from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:via-slate-800 dark:to-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-14 w-20 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shrink-0 bg-gray-100 dark:bg-slate-750">
                        <img 
                          src={activeGroup.coverImage} 
                          alt={activeGroup.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                            {activeGroup.name}
                          </h4>
                          
                          {/* Role Badge alongside Group Info */}
                          {effectiveRole === 'admin' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-rose-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                              <ShieldCheck className="h-3 w-3" /> Your role: Admin
                            </span>
                          )}
                          {(effectiveRole === 'leader' || effectiveRole === 'moderator') && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-500 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                              <Shield className="h-3 w-3" /> Your role: Moderator
                            </span>
                          )}
                          {effectiveRole === 'member' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-700 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                              <Users className="h-3 w-3" /> Your role: Member
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                          {activeGroup.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    {/* Actions alongside Your Role */}
                    <div className="flex items-center gap-2 shrink-0">
                      {effectiveRole === 'admin' && (
                        <button
                          type="button"
                          onClick={handleOpenEditGroupModal}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit Group</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4 Granular Settings Matrix */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-750 p-5 shadow-xs space-y-5">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Settings className="h-3.5 w-3.5" />
                    Granular Settings Matrix
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Setting 1: Who can post? */}
                    <div className="p-4 rounded-xl border border-gray-150 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-750/50 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-gray-900 dark:text-white block">Who can post?</span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                            Controls who is authorized to start discussion questions on this group's feed.
                          </span>
                        </div>
                        <FileText className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                      </div>

                      {canModifySettings ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => updateGroupSettings(activeGroup.id, { whoCanPost: 'all' })}
                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                              (activeGroup.settings?.whoCanPost || 'all') === 'all'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                            }`}
                          >
                            Everyone
                          </button>
                          <button
                            type="button"
                            onClick={() => updateGroupSettings(activeGroup.id, { whoCanPost: 'admin_and_leader' })}
                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                              activeGroup.settings?.whoCanPost === 'admin_and_leader'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                            }`}
                          >
                            Admin & Moderator
                          </button>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-xs font-bold text-gray-800 dark:text-gray-200">
                            {(activeGroup.settings?.whoCanPost || 'all') === 'all' ? 'Everyone can post' : 'Admins & Moderators only'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Setting 2: Who can participate in group chat? */}
                    <div className="p-4 rounded-xl border border-gray-150 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-750/50 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-gray-900 dark:text-white block">Who can chat?</span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                            Decides whether all members or only leadership can send real-time chat messages.
                          </span>
                        </div>
                        <MessageCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      </div>

                      {canModifySettings ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => updateGroupSettings(activeGroup.id, { whoCanChat: 'all' })}
                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                              (activeGroup.settings?.whoCanChat || 'all') === 'all'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                            }`}
                          >
                            Everyone
                          </button>
                          <button
                            type="button"
                            onClick={() => updateGroupSettings(activeGroup.id, { whoCanChat: 'admin_and_leader' })}
                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                              activeGroup.settings?.whoCanChat === 'admin_and_leader'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                            }`}
                          >
                            Admin & Moderator
                          </button>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-xs font-bold text-gray-800 dark:text-gray-200">
                            {(activeGroup.settings?.whoCanChat || 'all') === 'all' ? 'Everyone can chat' : 'Admins & Moderators only'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Setting 3: Can people join freely? */}
                    <div className="p-4 rounded-xl border border-gray-150 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-750/50 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-gray-900 dark:text-white block">Join Policy</span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                            Whether students join immediately or must be approved by leadership.
                          </span>
                        </div>
                        <Users className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      </div>

                      {canModifySettings ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => updateGroupSettings(activeGroup.id, { joinPolicy: 'free' })}
                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                              (activeGroup.settings?.joinPolicy || 'free') === 'free'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                            }`}
                          >
                            Instant Entry
                          </button>
                          <button
                            type="button"
                            onClick={() => updateGroupSettings(activeGroup.id, { joinPolicy: 'approval' })}
                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                              activeGroup.settings?.joinPolicy === 'approval'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                            }`}
                          >
                            Require Approval
                          </button>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-xs font-bold text-gray-800 dark:text-gray-200">
                            {(activeGroup.settings?.joinPolicy || 'free') === 'free' ? 'Instant entry' : 'Requires approval'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Setting 4: Post Approval Rule */}
                    <div className="p-4 rounded-xl border border-gray-150 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-750/50 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-gray-900 dark:text-white block">Post Approval Rule</span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                            If standard members post, require Admin or Leader approval before becoming public.
                          </span>
                        </div>
                        <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      </div>

                      {canModifySettings ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => updateGroupSettings(activeGroup.id, { requirePostApproval: false })}
                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                              !activeGroup.settings?.requirePostApproval
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                            }`}
                          >
                            Publish Instantly
                          </button>
                          <button
                            type="button"
                            onClick={() => updateGroupSettings(activeGroup.id, { requirePostApproval: true })}
                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                              Boolean(activeGroup.settings?.requirePostApproval)
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                            }`}
                          >
                            Require Approval
                          </button>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-xs font-bold text-gray-800 dark:text-gray-200">
                            {activeGroup.settings?.requirePostApproval ? 'Member posts require approval' : 'Instant publication'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Moderation Queue 1: Pending Join Requests */}
                {canReviewJoinReqs && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-750 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-emerald-600" />
                        Pending Join Requests ({pendingRequests.length})
                      </h4>
                      {pendingRequests.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                          {pendingRequests.length} pending
                        </span>
                      )}
                    </div>

                    {pendingRequests.length === 0 ? (
                      <div className="p-6 text-center bg-gray-50 dark:bg-slate-750/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-xs text-gray-400">
                        No pending join requests at this time.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {pendingRequests.map(req => {
                          const reqName = req.userName || req.name || 'Student';
                          const reqAvatar = req.userAvatar || req.avatar;
                          const reqGrade = req.userGrade || req.grade || 'Student';

                          return (
                            <div
                              key={req.id}
                              className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-750 flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {reqAvatar ? (
                                  <img
                                    src={reqAvatar}
                                    alt={reqName}
                                    className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-slate-650 shrink-0"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                                    {reqName.substring(0, 2)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                    {reqName}
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    {reqGrade} • Requested {req.requestedAt || 'recently'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => approveJoinRequest(activeGroup.id, req.id)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => rejectJoinRequest(activeGroup.id, req.id)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Moderation Queue 2: Pending Posts Queue */}
                {canApprovePostList && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-750 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                        Pending Posts Moderation Queue ({pendingGroupPosts.length})
                      </h4>
                      {pendingGroupPosts.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                          {pendingGroupPosts.length} awaiting review
                        </span>
                      )}
                    </div>

                    {pendingGroupPosts.length === 0 ? (
                      <div className="p-6 text-center bg-gray-50 dark:bg-slate-750/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-xs text-gray-400">
                        No member posts awaiting approval.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingGroupPosts.map(post => (
                          <div
                            key={post.id}
                            className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-600 to-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  {(post.authorName || 'U').substring(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                    {post.authorName || 'Student'}
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    {post.subject || 'General'} • {post.timestamp || 'recently'}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                                Pending Approval
                              </span>
                            </div>

                            <p className="text-xs text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-150 dark:border-slate-700">
                              {post.content}
                            </p>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => approvePendingPost(post.id)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Approve & Publish</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => rejectPendingPost(post.id)}
                                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl transition cursor-pointer border border-rose-200/60 dark:border-rose-800/40"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Delete Group Button (Admin Only) */}
                {canDeleteGroup && (
                  <div className="pt-5 border-t border-gray-150 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-white">Delete Group</h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Permanently delete this group and all its study materials.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteGroupModal(true)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto"
                      title="Delete group"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete group</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
      {renderCreateGroupModal()}
      {renderEditGroupModal()}
      {renderDeleteGroupModal()}
    </div>
  );
};
