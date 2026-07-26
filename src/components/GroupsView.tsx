import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { StudyGroup } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { playSound } from '../utils/soundEffects';
import { 
  Users, 
  Calendar, 
  FileText, 
  MessageCircle, 
  ChevronRight, 
  Flame, 
  Clock, 
  Download, 
  Send, 
  FileCode, 
  Plus, 
  EyeOff, 
  UserCheck,
  X 
} from 'lucide-react';

export const GroupsView: React.FC = () => {
  const { 
    groups, 
    setGroups, 
    groupChats, 
    sendGroupMessage, 
    createStudyGroup,
    user 
  } = useApp();

  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '');
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'files' | 'events' | 'chat'>('feed');
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeGroup = groups.find(g => g.id === selectedGroupId) || groups[0];
  const activeChat = groupChats.find(c => c.groupId === selectedGroupId);

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    playSound('send');
    try {
      const createdId = await createStudyGroup(
        newGroupName.trim(),
        newGroupDescription.trim() || 'A new study group co-created by learners.',
        newGroupCategory || 'General'
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
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Category / Subject
              </label>
              <select
                value={newGroupCategory}
                onChange={e => setNewGroupCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="General">General / Study Lounge</option>
                <option value="Math & Science">Math & Science</option>
                <option value="Literature & Humanities">Literature & Humanities</option>
                <option value="Computer Science">Computer Science & Tech</option>
                <option value="Exam Prep">Exam Prep (SAT / AP / Graduation)</option>
              </select>
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

  // Auto scroll chat to bottom
  useEffect(() => {
    if (activeSubTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSubTab, activeChat?.messages]);

  // Exam Countdown Ticker logic
  const [countdownText, setCountdownText] = useState('');
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
  }, [activeGroup]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    playSound('send');
    sendGroupMessage(activeGroup.id, chatInput);
    setChatInput('');
  };

  const handleCreateGroupPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupPostText.trim()) return;

    playSound('send');
    // Simulate adding a file or post directly in group files
    if (anonToggle) {
      alert('Anonymous question posted to group timeline successfully!');
    } else {
      alert('Discussion posted to group timeline successfully!');
    }
    setGroupPostText('');
  };

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileTitle.trim()) return;

    playSound('send');
    const newFile = {
      id: `f_${Date.now()}`,
      title: newFileTitle.endsWith('.pdf') || newFileTitle.endsWith('.docx') ? newFileTitle : `${newFileTitle}.${newFileType.toLowerCase()}`,
      uploader: user.name,
      date: new Date().toISOString().split('T')[0],
      size: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
      type: newFileType
    };

    setGroups(prev => prev.map(g => {
      if (g.id !== activeGroup.id) return g;
      return {
        ...g,
        files: [newFile, ...g.files]
      };
    }));

    setNewFileTitle('');
    setShowAddFileModal(false);
    alert(`Document "${newFile.title}" uploaded to group successfully!`);
  };

  const handleGoingToggle = (eventId: string) => {
    playSound('pop');
    setGroups(prev => prev.map(g => {
      if (g.id !== activeGroup.id) return g;
      return {
        ...g,
        events: g.events.map(ev => {
          if (ev.id !== eventId) return ev;
          const isGoing = !ev.isGoing;
          if (isGoing) {
            alert(`Scheduled successfully! Event "${ev.title}" has been added to your study calendar.`);
          }
          return {
            ...ev,
            isGoing,
            attendees: isGoing ? ev.attendees + 1 : ev.attendees - 1
          };
        })
      };
    }));
  };

  const handleCreateGroupPrompt = () => {
    playSound('pop');
    setShowCreateGroupModal(true);
  };

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
          TẠO NHÓM MỚI / CREATE GROUP
        </button>
      </div>

      {/* Right side active group details workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Banner with cover photo */}
        <div className="relative h-44 shrink-0 bg-gray-200">
          <img src={activeGroup.coverImage} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
            <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full w-max uppercase tracking-wider mb-1.5">{activeGroup.category}</span>
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
        <div className="bg-white dark:bg-slate-800 border-b border-gray-150 dark:border-slate-750 px-4 flex gap-4 shrink-0">
          {[
            { id: 'feed', label: 'Discussion Board', icon: MessageCircle },
            { id: 'files', label: 'Study Resources', icon: FileText },
            { id: 'events', label: 'Cram Sessions', icon: Calendar },
            { id: 'chat', label: 'Group Chat', icon: MessageCircle }
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

              {/* Mock group discussions */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm space-y-3">
                  <div className="flex gap-2 items-center text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 w-max px-2.5 py-0.5 rounded-full font-bold">
                    PINNED POST
                  </div>
                  <div className="flex gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                      G
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-white">Cohort Admin</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Just now • General Guidelines</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed font-sans font-normal">
                    Welcome everyone to our cohort! Please explore the shared study resources, keep discussions academically focused, and react Helpful or Insightful to support fellow peers answering your questions.
                  </p>
                </div>
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
              {activeGroup.files.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 text-center text-gray-400 space-y-1">
                  <FileCode className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-semibold">No study resources have been uploaded yet.</p>
                  <p className="text-[10px]">Be the first to contribute a revision document or mock exam!</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-slate-700">
                  {activeGroup.files.map(file => (
                    <div key={file.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-slate-750 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-extrabold text-[10px] shrink-0">
                          {file.type}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{file.title}</p>
                          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                            <span>By {file.uploader}</span>
                            <span>•</span>
                            <span>{file.date}</span>
                            <span>•</span>
                            <span className="font-mono">{file.size}</span>
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => alert(`Downloading document "${file.title}"...`)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-full transition-colors shrink-0"
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
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

            {/* TAB: VIRTUAL CRAM SESSIONS (EVENTS) */}
            {activeSubTab === 'events' && (
              <motion.div
                key="events-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18 }}
                className="max-w-2xl mx-auto space-y-4"
              >
              <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white">Upcoming Virtual Cram Sessions & Study Livestreams</h3>
              {activeGroup.events.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 text-center text-gray-400">
                  No live cram sessions scheduled yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {activeGroup.events.map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm transition-all">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 px-2.5 py-0.5 rounded-full uppercase">Cram Session</span>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-white">{ev.title}</h4>
                        <p className="text-[10px] text-gray-400 flex items-center gap-2">
                          <span>Guided by: {ev.tutor}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 font-bold text-indigo-500">
                            <Clock className="h-3 w-3" />
                            {ev.time}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-400 font-semibold">{ev.attendees} registered</span>
                        <button
                          onClick={() => handleGoingToggle(ev.id)}
                          className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            ev.isGoing 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          }`}
                        >
                          {ev.isGoing ? <UserCheck className="h-3.5 w-3.5" /> : null}
                          {ev.isGoing ? 'Registered' : 'Register Now'}
                        </button>
                      </div>
                    </div>
                  ))}
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
                  <span className="text-xs font-bold text-gray-800 dark:text-white truncate">Rapid Study Lounge ({activeGroup.name})</span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">Live Feed</span>
              </div>

              {/* Chat Log Message Scroll */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20 dark:bg-slate-900/10">
                {activeChat.messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400 text-center p-4">
                    No messages yet. Try pasting a complex equation or homework question to get started!
                  </div>
                ) : (
                  activeChat.messages.map(m => {
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
                  })
                )}
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
          </AnimatePresence>

        </div>
      </div>
      {renderCreateGroupModal()}
    </div>
  );
};
