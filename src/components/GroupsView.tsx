import React, { useState, useEffect, useRef } from 'react';
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
  canUserAssignLeader 
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
  Star,
  Crown,
  UserMinus,
  CheckCircle2,
  Sparkles,
  Shield
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
    user,
    simulatedGroupRole,
    setSimulatedGroupRole,
    togglePinGroupFile,
    deleteGroupFile,
    updateGroupMemberRole,
    removeGroupMember
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
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'files' | 'chat' | 'members'>('feed');
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeGroup = groups.find(g => g.id === selectedGroupId) || groups[0];
  const activeChat = groupChats.find(c => c.groupId === selectedGroupId);

  // Role-based permissions for current cohort
  const effectiveRole: GroupRole = getUserGroupRole(activeGroup, user, simulatedGroupRole);
  const permissions = getRolePermissions(effectiveRole);
  const canRemoveSpam = canUserRemoveSpam(activeGroup, user, simulatedGroupRole);
  const canPinFiles = canUserPinFiles(activeGroup, user, simulatedGroupRole);
  const canManageMembers = canUserManageMembers(activeGroup, user, simulatedGroupRole);
  const canAssignLeader = canUserAssignLeader(activeGroup, user, simulatedGroupRole);

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
      <div className="flex-1 p-6 max-w-4xl mx-auto h-[calc(100vh-57px)] flex flex-col items-center justify-center text-center">
        <div className="p-5 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-500 mb-4 shadow-sm border border-blue-100 dark:border-slate-700">
          <Users className="h-10 w-10" />
        </div>
        <h2 className="font-display font-bold text-lg text-gray-800 dark:text-white">No Study Groups Joined Yet</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-md mb-6 leading-relaxed">
          Create your first study group to share resources, chat in real-time, and track exam countdowns!
        </p>
        <button
          type="button"
          onClick={() => {
            playSound('pop');
            setShowCreateGroupModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          Create Study Group
        </button>

        {renderCreateGroupModal()}
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
                
                {/* Cohort Role Indicator */}
                {effectiveRole === 'admin' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-purple-600/90 text-white px-2.5 py-0.5 rounded-full shadow-xs border border-purple-300/40">
                    <ShieldCheck className="h-3 w-3" /> Admin
                  </span>
                )}
                {effectiveRole === 'leader' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-500/90 text-white px-2.5 py-0.5 rounded-full shadow-xs border border-amber-200/50">
                    <Star className="h-3 w-3" /> Group Leader
                  </span>
                )}
                {effectiveRole === 'member' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-700/80 text-white px-2.5 py-0.5 rounded-full shadow-xs border border-white/20">
                    <Users className="h-3 w-3" /> Member
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Real-time Role Tester / Switcher */}
                <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
                  <span className="text-[9px] uppercase tracking-wider text-gray-300 font-bold hidden sm:inline">Simulate Role:</span>
                  {(['admin', 'leader', 'member'] as GroupRole[]).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound('pop');
                        setSimulatedGroupRole(simulatedGroupRole === r ? null : r);
                      }}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                        effectiveRole === r
                          ? 'bg-blue-600 text-white shadow-xs scale-105'
                          : 'text-gray-300 hover:text-white bg-white/10 hover:bg-white/20'
                      }`}
                      title={`Simulate ${r === 'admin' ? 'Admin' : r === 'leader' ? 'Group Leader' : 'Standard Member'} powers`}
                    >
                      {r === 'admin' ? 'Admin' : r === 'leader' ? 'Leader' : 'Member'}
                    </button>
                  ))}
                  {simulatedGroupRole && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSimulatedGroupRole(null);
                      }} 
                      className="text-[9px] text-amber-300 hover:text-white underline cursor-pointer ml-1"
                      title="Reset role simulation"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <button
                  onClick={() => toggleJoinGroup(activeGroup.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    joinedGroupIds.includes(activeGroup.id)
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-white hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  {joinedGroupIds.includes(activeGroup.id) ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      Joined ({groupInteractions[activeGroup.id]?.score || 15} activity pts)
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Join Group
                    </>
                  )}
                </button>
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
            { id: 'members', label: 'Members & Roles', icon: Users }
          ].map(tab => {
            const isSel = activeSubTab === tab.id;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`py-3.5 px-1 flex items-center gap-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  isSel 
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
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
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm space-y-3">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">Post a question to cohort timeline</span>
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
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-1 px-4 rounded-full text-xs"
                    >
                      Post to Cohort
                    </button>
                  </div>
                </form>
              </div>

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
                              <h4 className="text-xs font-bold text-gray-800 dark:text-white">
                                {p.isAnonymous ? 'Anonymous Student' : (p.user?.name || p.authorName || 'Cohort Peer')}
                              </h4>
                              <p className="text-[10px] text-gray-400">
                                {p.timestamp?.includes('T') ? new Date(p.timestamp).toLocaleDateString() : (p.timestamp || 'Just now')} • {p.subject}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300">
                              Cohort Post
                            </span>

                            {/* Spam Removal button for Group Leaders & Admins */}
                            {showModerationDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(isAuthor ? 'Delete your post?' : 'Remove this spam post as Group Leader/Admin?')) {
                                    deletePost(p.id);
                                  }
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                title={isAuthor ? 'Delete your post' : 'Remove spam (Admin/Leader permission)'}
                              >
                                <Trash2 className="h-3 w-3" />
                                {canRemoveSpam && !isAuthor ? 'Remove Spam' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed font-sans font-normal">
                          {p.content}
                        </p>
                        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-slate-750 text-[11px] text-gray-400">
                          <span>{p.comments?.length || 0} comments</span>
                          <span>•</span>
                          <span>{(p.reactions?.helpful || 0) + (p.reactions?.insightful || 0)} reactions</span>
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
                              title={file.isPinned ? 'Unpin file' : 'Pin file to top (Leader/Admin)'}
                            >
                              <Pin className={`h-3.5 w-3.5 ${file.isPinned ? 'fill-current' : ''}`} />
                            </button>
                          )}

                          {/* Delete File Action (Admin, Leader, or Uploader) */}
                          {canDeleteThisFile && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(isUploader ? 'Delete your uploaded file?' : 'Remove this file as Group Leader/Admin?')) {
                                  deleteGroupFile(activeGroup.id, file.id);
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors cursor-pointer"
                              title={isUploader ? 'Delete your file' : 'Remove file (Admin/Leader)'}
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
                          {!isSelf && <span className="text-[9px] font-bold text-gray-400 block mb-0.5 pl-1">{m.sender.name}</span>}
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl flex items-center justify-center transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
              </motion.div>
            )}

            {/* TAB: COHORT MEMBERS & ROLE GOVERNANCE */}
            {activeSubTab === 'members' && (
              <motion.div
                key="members-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18 }}
                className="max-w-3xl mx-auto space-y-6"
              >
                {/* Role Permissions Matrix Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-700 pb-3">
                    <div>
                      <h3 className="font-display font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-purple-600" />
                        StudyBook Role-Based Governance
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Permission hierarchy: Admins and Leaders hold special management powers.
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300">
                      Your role: {effectiveRole.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Admin Card */}
                    <div className={`p-3.5 rounded-xl border transition-all ${effectiveRole === 'admin' ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' : 'bg-gray-50/60 dark:bg-slate-750/50 border-gray-150 dark:border-slate-700'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-extrabold text-gray-900 dark:text-white">Admin</span>
                        {effectiveRole === 'admin' && <span className="text-[9px] font-bold text-purple-600 ml-auto">You</span>}
                      </div>
                      <ul className="text-[10px] space-y-1.5 text-gray-600 dark:text-gray-300">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Full cohort ownership</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Promote / demote Leaders</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Handle member access & removals</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Remove spam discussions</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Pin / unpin study files</span>
                        </li>
                      </ul>
                    </div>

                    {/* Group Leader Card */}
                    <div className={`p-3.5 rounded-xl border transition-all ${effectiveRole === 'leader' ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-gray-50/60 dark:bg-slate-750/50 border-gray-150 dark:border-slate-700'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                          <Star className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-extrabold text-gray-900 dark:text-white">Group Leader</span>
                        {effectiveRole === 'leader' && <span className="text-[9px] font-bold text-amber-600 ml-auto">You</span>}
                      </div>
                      <ul className="text-[10px] space-y-1.5 text-gray-600 dark:text-gray-300">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Pin study files to top</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Remove spam discussions</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Handle member access</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-gray-400">
                          <X className="h-3 w-3 text-gray-400 shrink-0" />
                          <span className="line-through">Cannot change Admin roles</span>
                        </li>
                      </ul>
                    </div>

                    {/* Standard Member Card */}
                    <div className={`p-3.5 rounded-xl border transition-all ${effectiveRole === 'member' ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' : 'bg-gray-50/60 dark:bg-slate-750/50 border-gray-150 dark:border-slate-700'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          <Users className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-extrabold text-gray-900 dark:text-white">Standard Member</span>
                        {effectiveRole === 'member' && <span className="text-[9px] font-bold text-blue-600 ml-auto">You</span>}
                      </div>
                      <ul className="text-[10px] space-y-1.5 text-gray-600 dark:text-gray-300">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Participate in group chats</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Post study questions</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Upload revision files</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-gray-400">
                          <X className="h-3 w-3 text-gray-400 shrink-0" />
                          <span className="line-through">No management actions</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Cohort Roster List */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-gray-150 dark:border-slate-700 flex justify-between items-center bg-gray-50/60 dark:bg-slate-750/60">
                    <div>
                      <h4 className="font-display font-extrabold text-xs text-gray-900 dark:text-white">
                        Cohort Member Roster ({(activeGroup.members || []).length || activeGroup.memberCount || 1} members)
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Manage member roles, leader promotions, and cohort access.
                      </p>
                    </div>
                    {!canManageMembers && (
                      <span className="text-[10px] text-gray-400 italic">
                        Viewing as Standard Member
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {(activeGroup.members || []).map(member => {
                      const memberRole = member.role || activeGroup.memberRoles?.[member.id] || 'member';
                      const isCurrentUser = member.id === user.id;

                      return (
                        <div key={member.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-slate-750 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <img 
                              src={member.avatar} 
                              alt={member.name} 
                              className="h-9 w-9 rounded-full object-cover shrink-0 border border-gray-200 dark:border-slate-700" 
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                  {member.name} {isCurrentUser && '(You)'}
                                </span>

                                {/* Role Badge */}
                                {memberRole === 'admin' && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 px-2 py-0.5 rounded-full">
                                    <ShieldCheck className="h-2.5 w-2.5" /> Admin
                                  </span>
                                )}
                                {memberRole === 'leader' && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                    <Star className="h-2.5 w-2.5" /> Group Leader
                                  </span>
                                )}
                                {memberRole === 'member' && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                                    Member
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {member.grade || 'Student'} • Joined {member.joinedAt || 'Recently'}
                              </p>
                            </div>
                          </div>

                          {/* Management Controls */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Admin-only: Promote to Leader / Demote to Member */}
                            {canAssignLeader && !isCurrentUser && memberRole !== 'admin' && (
                              <>
                                {memberRole === 'member' ? (
                                  <button
                                    type="button"
                                    onClick={() => updateGroupMemberRole(activeGroup.id, member.id, 'leader')}
                                    className="text-[10px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                    title="Promote to Group Leader"
                                  >
                                    <Star className="h-3 w-3" />
                                    Promote to Leader
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => updateGroupMemberRole(activeGroup.id, member.id, 'member')}
                                    className="text-[10px] font-bold bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                    title="Demote to Member"
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
                                  if (window.confirm(`Remove ${member.name} from ${activeGroup.name}?`)) {
                                    removeGroupMember(activeGroup.id, member.id);
                                  }
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
          </AnimatePresence>

        </div>
      </div>
      {renderCreateGroupModal()}
    </div>
  );
};
