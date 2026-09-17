import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, EyeOff, Sliders, Volume2, VolumeX, Save, Download, RefreshCw, User as UserIcon, Globe, LogOut, Check, Upload, X, BadgeCheck, Clock, Award, History, Search, Trash2, Maximize2, FileText, AlertTriangle, School, BookOpen, Music, Sparkles, MessageSquare, UserX, ShieldCheck, Zap, Activity, ChevronDown } from 'lucide-react';
import { isFirebaseConfigured, auth, db } from '../lib/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { SILHOUETTE_AVATAR } from '../data/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { User, TutorRequest, GRADE_LEVELS, GradeLevel, GlobalAlgorithmConfig, DEFAULT_GLOBAL_ALGORITHM_CONFIG } from '../types';
import { playSound, SoundType } from '../utils/soundEffects';
import { calculateFreshnessValue, simulateFreshnessDecayTest, ALGORITHM_CONFIG } from '../utils/feedAlgorithm';

export const SettingsView: React.FC = () => {
  const { 
    settings, 
    setSettings, 
    exportResume, 
    user, 
    setUser,
    setUserGrade,
    isFirebaseConnected,
    logout,
    isOfflineBypass,
    setIsOfflineBypass,
    tutorRequests,
    requestTutorVerification,
    approveTutorRequest,
    rejectTutorRequest,
    deleteTutorRequest,
    blockedUsers,
    blockUser,
    unblockUser,
    globalAlgorithmConfig,
    updateGlobalAlgorithmConfig
  } = useApp();
  
  // Profile editor states
  const [profileName, setProfileName] = useState(user.name);
  const [institution, setInstitution] = useState(user.institution || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar);
  const [selectedGrade, setSelectedGrade] = useState<string>(user.grade || 'Grade 10');
  const [blockInputName, setBlockInputName] = useState('');

  // Algorithm Simulator states
  const [testHoursAgo, setTestHoursAgo] = useState<number>(2.0);

  // Tutor Modal States
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [verifyRealName, setVerifyRealName] = useState(user.name);
  const [verifySchool, setVerifySchool] = useState(user.institution || '');
  const [verifyDescription, setVerifyDescription] = useState('');
  const [verifySubjects, setVerifySubjects] = useState<string[]>(['Mathematics', 'Physics']);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [selectedHistoryAccount, setSelectedHistoryAccount] = useState<TutorRequest | null>(null);
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<TutorRequest | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<TutorRequest | null>(null);
  const [showAdminRequestsModal, setShowAdminRequestsModal] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const currentEmail = user.email || localStorage.getItem('sb_current_email') || auth.currentUser?.email || '';
  const isAdmin = user.role === 'admin' || currentEmail.toLowerCase() === 'billkute030709@gmail.com';
  const isOwnerAdmin = currentEmail.toLowerCase() === 'billkute030709@gmail.com';

  const [algoConfigForm, setAlgoConfigForm] = useState<GlobalAlgorithmConfig>(globalAlgorithmConfig || DEFAULT_GLOBAL_ALGORITHM_CONFIG);
  const [isSavingAlgo, setIsSavingAlgo] = useState(false);

  React.useEffect(() => {
    if (globalAlgorithmConfig) {
      setAlgoConfigForm(globalAlgorithmConfig);
    }
  }, [globalAlgorithmConfig]);

  const handleSaveGlobalAlgorithm = async () => {
    if (!isOwnerAdmin) {
      showToast('Only billkute030709@gmail.com can customize the global algorithm!', 'error');
      return;
    }
    setIsSavingAlgo(true);
    try {
      const res = await updateGlobalAlgorithmConfig(algoConfigForm);
      if (res.success) {
        showToast(res.message || 'Global algorithm config updated and active globally!', 'success');
      } else {
        showToast(res.message || 'Failed to update algorithm config', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error updating config', 'error');
    } finally {
      setIsSavingAlgo(false);
    }
  };

  const handleResetGlobalAlgorithm = async () => {
    if (!isOwnerAdmin) return;
    setIsSavingAlgo(true);
    try {
      await updateGlobalAlgorithmConfig(DEFAULT_GLOBAL_ALGORITHM_CONFIG);
      setAlgoConfigForm(DEFAULT_GLOBAL_ALGORITHM_CONFIG);
      showToast('Global algorithm reset to system defaults!', 'info');
    } catch (e: any) {
      showToast(e.message || 'Error resetting config', 'error');
    } finally {
      setIsSavingAlgo(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) {
        showToast('Image size is too large! Please choose an image under 2MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      showToast('Please enter a display name!', 'error');
      return;
    }

    const updatedUser: User = {
      ...user,
      name: profileName.trim(),
      institution: institution.trim(),
      avatar: avatarUrl,
      grade: selectedGrade || user.grade || 'Grade 10'
    };

    setUser(updatedUser);
    localStorage.setItem('sb_user', JSON.stringify(updatedUser));

    if (isFirebaseConfigured && user.id) {
      try {
        await setDoc(doc(db, 'users', user.id), {
          name: profileName.trim(),
          institution: institution.trim(),
          avatar: avatarUrl,
          grade: selectedGrade || user.grade || 'Grade 10'
        }, { merge: true });
      } catch (e) {
        console.warn('Failed to sync profile save to Firestore:', e);
      }
    }

    showToast('Your academic profile and grade have been updated successfully!', 'success');
  };

  const handleSelectGrade = async (grade: string) => {
    setSelectedGrade(grade);
    await setUserGrade(grade);
    playSound('pop');
    showToast(`Academic grade set to ${grade}! Newsfeed algorithm adjusted.`, 'success');
  };

  const handleSubmitTutorVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyRealName.trim()) {
      showToast('Please enter your legal full name!', 'error');
      return;
    }
    if (verifySubjects.length === 0) {
      showToast('Please select at least one subject to teach!', 'error');
      return;
    }

    await requestTutorVerification({
      realName: verifyRealName.trim(),
      school: verifySchool.trim() || 'Independent Educator',
      description: verifyDescription.trim(),
      requestedSubjects: verifySubjects
    });

    setShowTutorModal(false);
    showToast('Submitted Tutor verification request to Admin!', 'success');
  };

  const handleWeightChange = (subject: 'Math' | 'Physics' | 'English' | 'Chemistry' | 'Other' | 'ExamPrep', value: number) => {
    setSettings(prev => ({
      ...prev,
      subjectWeights: {
        ...prev.subjectWeights,
        [subject]: value
      }
    }));
  };

  const handleToggleSetting = (key: 'incognitoMode' | 'spoilerProtection' | 'ttsEnabled' | 'showStreakToOthers' | 'allowDMsFromStrangers' | 'hideProfilePosts') => {
    playSound('toggle');
    setSettings(prev => {
      const next = {
        ...prev,
        [key]: !prev[key]
      };
      localStorage.setItem('sb_settings', JSON.stringify(next));
      return next;
    });

    if (key === 'allowDMsFromStrangers') {
      const newVal = settings.allowDMsFromStrangers === false ? true : false;
      setUser(prev => {
        const nextUser = { ...prev, allowDMsFromStrangers: newVal };
        localStorage.setItem('sb_user', JSON.stringify(nextUser));
        return nextUser;
      });
      if (isFirebaseConfigured && user.id) {
        setDoc(doc(db, 'users', user.id), { allowDMsFromStrangers: newVal }, { merge: true }).catch(console.warn);
      }
      showToast(newVal ? 'Direct messages from strangers enabled.' : 'Stranger direct messages disabled. Only approved friends can message you.', 'info');
    }

    if (key === 'hideProfilePosts') {
      const newVal = !settings.hideProfilePosts;
      setUser(prev => {
        const nextUser = { ...prev, hideProfilePosts: newVal };
        localStorage.setItem('sb_user', JSON.stringify(nextUser));
        return nextUser;
      });
      if (isFirebaseConfigured && user.id) {
        setDoc(doc(db, 'users', user.id), { hideProfilePosts: newVal }, { merge: true }).catch(console.warn);
      }
      showToast(newVal ? 'Profile posts hidden from non-friends. Friends can still view them, and they still appear on the algorithmic feed.' : 'Profile posts are now visible to everyone.', 'info');
    }
  };

  const handleQuickBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockInputName.trim()) return;
    const target = blockInputName.trim();
    const targetId = `blocked_${Date.now()}`;
    await blockUser(targetId, target, SILHOUETTE_AVATAR);
    setBlockInputName('');
    showToast(`Blocked user "${target}". They can no longer direct message you or view your posts.`, 'info');
  };

  const handleResetImplicitHistory = () => {
    setConfirmModal({
      message: 'Are you sure you want to clear all implicit behavior cache and click logs? This will reset feed algorithm preferences to default.',
      onConfirm: () => {
        showToast('Implicit cache cleared successfully! Algorithm reset to baseline.', 'success');
        setConfirmModal(null);
      }
    });
  };

  const isVerifiedTutor = user.role === 'tutor' || user.badges?.includes('Verified Tutor') || isAdmin;
  const pendingRequest = tutorRequests.find(r => r.userId === user.id && r.status === 'pending');

  return (
    <div className="flex-1 p-4 md:p-6 max-w-3xl mx-auto space-y-6 h-[calc(100vh-57px)] overflow-y-auto pb-20 scrollbar-none no-scrollbar">
      
      <div>
        <h2 className="font-display font-extrabold text-lg text-gray-800 dark:text-white flex items-center gap-2">
          <Sliders className="h-5.5 w-5.5 text-blue-600" />
          Academic Settings & Privacy
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">Optimize your feed, minimize distractions, and customize personal data privacy.</p>
      </div>

      {/* ACCOUNT & SIGN OUT INFO CARD */}
      {(() => {
        let savedEmail = '';
        try { savedEmail = localStorage.getItem('sb_current_email') || ''; } catch (_) {}
        const currentEmail = auth?.currentUser?.email || savedEmail || (user.id && user.id !== 'guest' ? `${user.id}@studybook.edu` : 'Guest Account / Not Signed In');
        return (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/60 shadow-xs">
                <Globe className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">Linked Account:</p>
                <div className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <span className="font-mono text-blue-600 dark:text-blue-400">{currentEmail}</span>
                  {isAdmin && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-extrabold border border-purple-500/30 uppercase tracking-wider">
                      ADMIN SYSTEM
                    </span>
                  )}
                  {isVerifiedTutor && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30 flex items-center gap-1">
                      <BadgeCheck className="h-3 w-3 text-blue-400" />
                      Verified Tutor
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-200 dark:border-red-800/50 transition-all cursor-pointer shadow-xs active:translate-y-0.5 whitespace-nowrap"
            >
              <LogOut className="h-4 w-4 text-red-500" />
              Sign Out
            </button>
          </div>
        );
      })()}

      {/* ADMIN TUTOR VERIFICATION PANEL */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-purple-900/30 via-slate-800 to-indigo-900/30 border border-purple-500/30 rounded-2xl p-5 space-y-3.5 shadow-md text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-500/20 pb-3 gap-2">
            <div>
              <h3 className="font-display font-extrabold text-sm text-purple-300 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-purple-400" />
                Admin Dashboard - Tutor Management
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Approve and grant Tutor privileges for user accounts.</p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 font-bold rounded-lg text-xs border border-purple-500/30">
                {tutorRequests.filter(r => r.status === 'pending').length} Pending
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-bold rounded-lg text-xs border border-emerald-500/30">
                {tutorRequests.filter(r => r.status === 'approved').length} Approved
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowAdminRequestsModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              <ShieldAlert className="h-4 w-4" />
              Manage Tutor Verification Requests ({tutorRequests.length} Total)
            </button>
          </div>
        </div>
      )}

      {/* PROFILE CARD EDITOR */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5 border-b border-gray-150 dark:border-slate-700 pb-2">
          <UserIcon className="h-4.5 w-4.5 text-blue-600" />
          Academic Profile
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Left Avatar Showcase */}
          <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="relative">
              <img 
                src={avatarUrl} 
                alt="Preview Avatar" 
                className="h-20 w-20 rounded-full object-cover border-2 border-blue-500 shadow-md bg-white dark:bg-slate-800"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = SILHOUETTE_AVATAR;
                }}
              />
              {isVerifiedTutor && (
                <div className="absolute bottom-0 right-0 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm" title="Verified Tutor">
                  <BadgeCheck className="h-5 w-5 text-blue-500 fill-blue-500/20" />
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-400">Avatar Preview</span>
          </div>

          {/* Form details */}
          <div className="md:col-span-2 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Display Full Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">School / Institution</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Stanford University / Science High School"
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Academic Grade Level</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => handleSelectGrade(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                >
                  {GRADE_LEVELS.map(g => (
                    <option key={g} value={g} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase font-sans">Avatar Photo</label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="file"
                  id="avatar-file-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="avatar-file-upload"
                  className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all border border-gray-200 dark:border-slate-700"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Image from Device
                </label>
              </div>
            </div>

            <div className="pt-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Or Paste Custom Image URL</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Paste image URL (Unsplash, Imgur...)"
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveProfile}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                <Save className="h-4 w-4" />
                Save Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCK 1.1: ACADEMIC GRADE SECTION (SMALL DROPDOWN SELECTION) */}
      <div id="academic-grade-section" className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
              <School className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
              Academic Grade Level (Grade 1 to College)
            </h3>
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed max-w-xl">
              Set your current school grade. The Newsfeed algorithm boosts study materials matching your grade (+40 pts boost) directly to the top of your feed.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <div className="relative">
              <select
                id="academic-grade-select-dropdown"
                value={selectedGrade || user.grade || 'Grade 10'}
                onChange={(e) => handleSelectGrade(e.target.value)}
                className="appearance-none bg-gray-50 dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-300 text-xs font-bold rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
              >
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
                <option value="College">College / University</option>
                <option value="Graduate">Graduate / Researcher</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-500 pointer-events-none" />
            </div>

            <span className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 font-bold rounded-xl text-xs border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 stroke-[2.5]" />
              Active
            </span>
          </div>
        </div>
      </div>

      {/* BLOCK 1: INCOGNITO STUDY MODE */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-4 space-y-4 shadow-sm">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
              <EyeOff className="h-4 w-4 text-slate-500" />
              Academic Incognito Mode
            </h3>
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
              When enabled, your avatar switches to an incognito silhouette and your name is masked across study groups and forums.
            </p>
          </div>
          <button
            onClick={() => handleToggleSetting('incognitoMode')}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none ${settings.incognitoMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'}`}
          >
            <span className={`absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-transform ${settings.incognitoMode ? 'translate-x-5' : ''}`}></span>
          </button>
        </div>
      </div>

      {/* BLOCK 1.5: DIRECT MESSAGING PRIVACY */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-4 space-y-3 shadow-sm">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              Direct Messages from Strangers
            </h3>
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
              Turn on to receive 1-on-1 direct messages from any student or tutor. When turned off, only users on your approved Friends list can direct message you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleSetting('allowDMsFromStrangers')}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none cursor-pointer ${settings.allowDMsFromStrangers !== false ? 'bg-purple-600' : 'bg-gray-200 dark:bg-slate-700'}`}
          >
            <span className={`absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-transform ${settings.allowDMsFromStrangers !== false ? 'translate-x-5' : ''}`}></span>
          </button>
        </div>
        <div className="pt-2 border-t border-gray-100 dark:border-slate-700/80 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
          <span className={`inline-block h-2 w-2 rounded-full ${settings.allowDMsFromStrangers !== false ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          <span>{settings.allowDMsFromStrangers !== false ? 'Direct messages from all members are currently accepted.' : 'Stranger direct messages are disabled. Only approved friends can message you.'}</span>
        </div>
      </div>

      {/* BLOCK 1.55: HIDE USER PROFILE POSTS FROM NON-FRIENDS */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
              <EyeOff className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Hide Profile Posts from Non-Friends
            </h3>
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
              When enabled, only approved friends can see the posts on your profile page. Non-friends visiting your profile will see that your posts are private. Your posts will still appear normally in the global algorithm feed so students can benefit from your questions and answers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleSetting('hideProfilePosts')}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none cursor-pointer ${settings.hideProfilePosts ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'}`}
          >
            <span className={`absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-transform ${settings.hideProfilePosts ? 'translate-x-5' : ''}`}></span>
          </button>
        </div>
        <div className="pt-2 border-t border-gray-100 dark:border-slate-700/80 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
          <span className={`inline-block h-2 w-2 rounded-full ${settings.hideProfilePosts ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
          <span>{settings.hideProfilePosts ? 'Profile timeline is private to non-friends. (Posts still discoverable in algorithm feed).' : 'Profile timeline posts are visible to everyone who visits your profile.'}</span>
        </div>
      </div>

      {/* BLOCK 1.6: BLOCKED USERS MANAGEMENT */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-150 dark:border-slate-700 pb-3">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
              <ShieldAlert className="h-4.5 w-4.5 text-red-500" />
              Blocked Accounts & Content Protection
            </h3>
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
              Blocked accounts cannot send you direct messages, cannot view any of your posts in the academic feed, and are removed from your friends list.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 font-bold rounded-lg text-xs border border-red-200 dark:border-red-900/60 shrink-0 self-start sm:self-auto">
            {blockedUsers.length} Blocked
          </span>
        </div>

        {/* Quick Block Input */}
        <form onSubmit={handleQuickBlockSubmit} className="flex gap-2">
          <input
            type="text"
            value={blockInputName}
            onChange={e => setBlockInputName(e.target.value)}
            placeholder="Type user name or account ID to block..."
            className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            type="submit"
            disabled={!blockInputName.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <UserX className="h-3.5 w-3.5" />
            Block User
          </button>
        </form>

        {/* List of blocked accounts */}
        {blockedUsers.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/40 dark:bg-slate-900/30">
            <ShieldCheck className="h-7 w-7 text-gray-300 dark:text-slate-600 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">No blocked accounts</p>
            <p className="text-[10px] text-gray-400 mt-0.5">You have not blocked any users. You can block anyone directly from their posts or chat.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-none no-scrollbar">
            {blockedUsers.map(blocked => (
              <div
                key={blocked.id}
                className="p-3 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 hover:border-red-200 dark:hover:border-red-900/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={blocked.avatar || SILHOUETTE_AVATAR}
                    alt={blocked.name}
                    className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate">{blocked.name}</h4>
                    <p className="text-[10px] text-gray-400">
                      Blocked on {blocked.blockedAt || 'Recent'} • Cannot message or view posts
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    unblockUser(blocked.id);
                    showToast(`Unblocked ${blocked.name}.`, 'info');
                  }}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BLOCK 2: SUBJECT FOCUS WEIGHTS (MULTIPLE CHOICE SUBJECT SELECTION) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-4 space-y-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-blue-600" />
            Subject Feed Preferences
          </h3>
          <p className="text-[11px] text-gray-400 font-medium">
            Select subjects to emphasize on your Academic Feed. Unchecking a subject reduces its priority.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {[
            { key: 'Math' as const, label: 'Mathematics' },
            { key: 'Physics' as const, label: 'Physics' },
            { key: 'English' as const, label: 'English' },
            { key: 'Chemistry' as const, label: 'Chemistry' },
            { key: 'Other' as const, label: 'Other Subjects' }
          ].map(sub => {
            const isSelected = ((settings.subjectWeights as any)?.[sub.key] ?? 50) >= 80;
            return (
              <button
                key={sub.key}
                type="button"
                onClick={() => {
                  const currentValue = isSelected ? 50 : 100;
                  handleWeightChange(sub.key, currentValue);
                }}
                className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-400 dark:border-blue-800 ring-1 ring-blue-400/30' 
                    : 'bg-gray-50/40 dark:bg-slate-900/40 border-gray-250 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-900'
                }`}
              >
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-gray-750 dark:text-gray-150">{sub.label}</h4>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {isSelected ? 'High Priority ⭐' : 'Standard'}
                  </span>
                </div>
                <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all ${
                  isSelected 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'border-gray-300 dark:border-slate-600 text-transparent'
                }`}>
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* BLOCK 3: FEED ALGORITHM & FRESHNESS VALUE VERIFICATION - Gated exclusively for billkute030709@gmail.com */}
      {isOwnerAdmin && (
        <div id="algorithm-verification-section" className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 p-5 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-150 dark:border-slate-700 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wide rounded-md border border-amber-300 dark:border-amber-800">
                  Global System Setting
                </span>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-md">
                  Customizable only by billkute030709@gmail.com
                </span>
              </div>
              <h3 className="font-display font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500 fill-amber-500/20" />
                Algorithm Freshness Value & Ranking Verification
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Control the global ranking algorithm weights and freshness decay rates. Changes made here apply across the entire platform.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleResetGlobalAlgorithm}
                disabled={isSavingAlgo}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-650 rounded-xl transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSavingAlgo ? 'animate-spin' : ''}`} />
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={handleSaveGlobalAlgorithm}
                disabled={isSavingAlgo}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {isSavingAlgo ? 'Saving...' : 'Save Global Config'}
              </button>
            </div>
          </div>

          {/* Configuration Inputs Panel */}
          <div className="bg-amber-50/40 dark:bg-amber-950/15 p-4 rounded-xl border border-amber-200/60 dark:border-amber-900/30 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Global Parameters Customization
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700 space-y-1">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Base Freshness (Pts)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="200"
                  value={algoConfigForm.freshnessMaxScore}
                  onChange={(e) => setAlgoConfigForm(prev => ({ ...prev, freshnessMaxScore: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2.5 py-1.5 font-mono text-xs rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 block">Initial points for new post</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700 space-y-1">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Decay Rate (Pts/Hour)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={algoConfigForm.freshnessDecayRatePerHour}
                  onChange={(e) => setAlgoConfigForm(prev => ({ ...prev, freshnessDecayRatePerHour: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2.5 py-1.5 font-mono text-xs rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 block">Deducted every hour of age</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700 space-y-1">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Grade Match Boost (Pts)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="200"
                  value={algoConfigForm.gradeMatchingScore}
                  onChange={(e) => setAlgoConfigForm(prev => ({ ...prev, gradeMatchingScore: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2.5 py-1.5 font-mono text-xs rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 block">Boost when post matches grade</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700 space-y-1">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Followed Creator Boost (Pts)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="200"
                  value={algoConfigForm.followCreatorBoost}
                  onChange={(e) => setAlgoConfigForm(prev => ({ ...prev, followCreatorBoost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2.5 py-1.5 font-mono text-xs rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 block">Posts from creators you follow</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700 space-y-1">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Joined Group Boost (Pts)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="200"
                  value={algoConfigForm.groupMemberPostBoost}
                  onChange={(e) => setAlgoConfigForm(prev => ({ ...prev, groupMemberPostBoost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2.5 py-1.5 font-mono text-xs rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 block">Posts from study groups joined</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700 space-y-1">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Verified Solution (Pts)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={algoConfigForm.verifiedSolutionScore}
                  onChange={(e) => setAlgoConfigForm(prev => ({ ...prev, verifiedSolutionScore: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2.5 py-1.5 font-mono text-xs rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 block">Badge for teacher solutions</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700 space-y-1">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Per Helpful Reaction (Pts)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={algoConfigForm.reactionScore}
                  onChange={(e) => setAlgoConfigForm(prev => ({ ...prev, reactionScore: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2.5 py-1.5 font-mono text-xs rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 block">Points per like / heart</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700 space-y-1">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Per Helpful Comment (Pts)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={algoConfigForm.commentScore}
                  onChange={(e) => setAlgoConfigForm(prev => ({ ...prev, commentScore: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2.5 py-1.5 font-mono text-xs rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 block">Points per student answer</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={algoConfigForm.randomizeBuckets}
                  onChange={(e) => setAlgoConfigForm(prev => ({ ...prev, randomizeBuckets: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Enable dynamic 5-post bucket shuffle (prevents predictable feeds)
                </span>
              </label>
              {algoConfigForm.updatedAt && (
                <span className="text-[10px] text-gray-400">
                  Last updated: {new Date(algoConfigForm.updatedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Algorithm Score Formula Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/70 dark:border-amber-900/40 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-300">
                <span>🕒 Freshness Value</span>
                <span>{algoConfigForm.freshnessMaxScore} → 0 pts</span>
              </div>
              <p className="text-[10px] text-amber-900/70 dark:text-amber-300/70 leading-normal">
                Recent posts start with <strong>{algoConfigForm.freshnessMaxScore} points</strong> and decay at <strong>-{algoConfigForm.freshnessDecayRatePerHour} pts per hour</strong>. Floor at 0 pts after {(algoConfigForm.freshnessMaxScore / (algoConfigForm.freshnessDecayRatePerHour || 1)).toFixed(1)} hours.
              </p>
            </div>

            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/70 dark:border-indigo-900/40 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                <span>🎓 Grade Matching</span>
                <span>+{algoConfigForm.gradeMatchingScore.toFixed(1)} pts</span>
              </div>
              <p className="text-[10px] text-indigo-900/70 dark:text-indigo-300/70 leading-normal">
                Posts matching your active grade (<strong>{selectedGrade || user.grade || 'Grade 10'}</strong>) are boosted directly to the top.
              </p>
            </div>

            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/70 dark:border-blue-900/40 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300">
                <span>👍 Popularity & Community</span>
                <span>Custom Weights</span>
              </div>
              <p className="text-[10px] text-blue-900/70 dark:text-blue-300/70 leading-normal">
                Solutions (+{algoConfigForm.verifiedSolutionScore}), followed creators (+{algoConfigForm.followCreatorBoost}), group boost (+{algoConfigForm.groupMemberPostBoost}), reactions (+{algoConfigForm.reactionScore}).
              </p>
            </div>
          </div>

          {/* Live Interactive Freshness Tester */}
          <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  Interactive Freshness Decay Simulator
                </h4>
                <p className="text-[10px] text-gray-400">
                  Move the slider to simulate post age and check the resulting Freshness Value based on your active global parameters.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                  Post Age: {testHoursAgo} {testHoursAgo === 1 ? 'hour' : 'hours'} ago
                </span>
              </div>
            </div>

            {/* Slider input */}
            <input
              type="range"
              min="0"
              max="24"
              step="0.5"
              value={testHoursAgo}
              onChange={(e) => setTestHoursAgo(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />

            {/* Real-time Calculation Result */}
            {(() => {
              const maxPts = algoConfigForm.freshnessMaxScore;
              const rate = algoConfigForm.freshnessDecayRatePerHour;
              const decay = Math.min(maxPts, testHoursAgo * rate);
              const freshness = Math.max(0, maxPts - testHoursAgo * rate);
              const percent = maxPts > 0 ? (freshness / maxPts) * 100 : 0;
              return (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                      <span>Base: {maxPts.toFixed(1)} pts</span>
                      <span className="text-red-500 font-mono">- {decay.toFixed(1)} pts decay ({testHoursAgo}h × {rate})</span>
                    </span>
                    <span className="font-mono font-extrabold text-sm text-amber-600 dark:text-amber-400">
                      Freshness: {freshness.toFixed(1)} / {maxPts.toFixed(1)} pts
                    </span>
                  </div>

                  {/* Progress bar visual */}
                  <div className="w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-150 ${
                        percent > 60 ? 'bg-emerald-500' : percent > 25 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="text-[10px] text-gray-400 flex justify-between font-mono">
                    <span>0h ({maxPts.toFixed(0)} pts, Newest)</span>
                    <span>{(maxPts / (2 * (rate || 1))).toFixed(1)}h ({(maxPts / 2).toFixed(1)} pts, Half)</span>
                    <span>{(maxPts / (rate || 1)).toFixed(1)}h+ (0 pts, Decay Floor)</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Verification Matrix Table */}
          <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
            <div className="bg-gray-100 dark:bg-slate-750 px-3 py-2 font-bold text-gray-700 dark:text-gray-200 flex justify-between">
              <span>Freshness Value Decay Verification Benchmark Table</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                Formula: Math.max(0, {algoConfigForm.freshnessMaxScore} - (hrs × {algoConfigForm.freshnessDecayRatePerHour}))
              </span>
            </div>
            <div className="divide-y divide-gray-150 dark:divide-slate-700 font-mono text-[11px]">
              {[0, 2, 4, 8, 12, 16, 20, 24].map(hours => {
                const maxPts = algoConfigForm.freshnessMaxScore;
                const rate = algoConfigForm.freshnessDecayRatePerHour;
                const decay = Math.min(maxPts, hours * rate);
                const points = Math.max(0, maxPts - hours * rate);
                const isZero = points === 0;
                return (
                  <div key={hours} className="px-3 py-1.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-750/50">
                    <span className="w-24 text-gray-600 dark:text-gray-300 font-semibold">{hours} hrs ago</span>
                    <span className="w-28 text-red-500">-{decay.toFixed(1)} pts</span>
                    <span className="w-24 font-bold text-gray-900 dark:text-white">{points.toFixed(1)} pts</span>
                    <span className="text-[10px] text-gray-400 text-right flex-1">
                      {hours === 0 ? 'Peak Freshness (Recent post)' : isZero ? 'Decay floor reached (0 pts)' : `Decayed (-${decay.toFixed(1)} pts)`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BLOCK 4: SPECIAL SETTINGS TOGGLES */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-4 space-y-4 shadow-sm divide-y divide-gray-100 dark:divide-slate-700">
        
        {/* Spoiler protection toggle */}
        <div className="flex justify-between items-center py-2">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-gray-800 dark:text-white">Solution Spoiler Protection</h4>
            <p className="text-[10px] text-gray-400 leading-relaxed pr-8">
              When enabled, comments or images containing solution keywords are blurred until clicked to prevent accidental answers during self-study.
            </p>
          </div>
          <button
            onClick={() => handleToggleSetting('spoilerProtection')}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none ${settings.spoilerProtection ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'}`}
          >
            <span className={`absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-transform ${settings.spoilerProtection ? 'translate-x-5' : ''}`}></span>
          </button>
        </div>

        {/* Text-to-speech toggle */}
        <div className="flex justify-between items-center py-2 pt-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
              <Volume2 className="h-4 w-4 text-blue-500" />
              Text-to-Speech Document Reader
            </h4>
            <p className="text-[10px] text-gray-400 leading-relaxed pr-8">
              Integrates audio narration options on study documents and course materials for hands-free learning.
            </p>
          </div>
          <button
            onClick={() => handleToggleSetting('ttsEnabled')}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none ${settings.ttsEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'}`}
          >
            <span className={`absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-transform ${settings.ttsEnabled ? 'translate-x-5' : ''}`}></span>
          </button>
        </div>

        {/* Sound Volume Setting */}
        <div className="pt-4 border-t border-gray-100 dark:border-slate-700/80 space-y-3">
          <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-200">
              <span className="flex items-center gap-1.5">
                {(settings.soundVolume ?? 0.7) > 0 ? (
                  <Music className="h-3.5 w-3.5 text-purple-500" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-gray-400" />
                )}
                Sound Effect Volume
              </span>
              <span className="font-mono text-purple-600 dark:text-purple-300">
                {(settings.soundVolume ?? 0.7) === 0 ? 'Muted' : `${Math.round((settings.soundVolume ?? 0.7) * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.soundVolume ?? 0.7}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                setSettings(prev => ({ ...prev, soundVolume: vol, soundEnabled: vol > 0 }));
                if (vol > 0) {
                  playSound('pop', vol);
                }
              }}
              className="w-full h-1.5 bg-purple-200 dark:bg-purple-900 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>
        </div>

      </div>

      {/* BLOCK 5: TUTOR VERIFICATION SECTION */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        {isVerifiedTutor ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <BadgeCheck className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  Verified Tutor / Educator Account
                  <BadgeCheck className="h-4 w-4 text-blue-500 fill-blue-500/20 inline" />
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Your Verified Tutor badge is prominently displayed next to your avatar and posts.
                </p>
              </div>
            </div>
          </div>
        ) : pendingRequest ? (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Tutor verification request pending Admin approval
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Name: <strong>{pendingRequest.realName}</strong> • School: <strong>{pendingRequest.school}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTutorModal(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
            >
              Update Application
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  Apply for Tutor Verification
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  If you are a teacher, assistant, or outstanding student wanting to mentor the community, submit a verification request to receive an official Verified Tutor badge.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTutorModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <BadgeCheck className="h-4.5 w-4.5" />
              Apply for Tutor Verification
            </button>
          </div>
        )}
      </div>

      {/* BLOCK 6: DATA STORAGE & UTILITIES */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-4 space-y-4 shadow-sm">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Data Management & Reports</span>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Clear Cache */}
          <button
            onClick={handleResetImplicitHistory}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors cursor-pointer border-0 focus:outline-none"
          >
            <RefreshCw className="h-4 w-4 text-red-500 shrink-0" />
            Clear Implicit Cache (Reset Algorithm)
          </button>

          {/* Export Portfolio Resume */}
          <button
            onClick={exportResume}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-2xl text-xs font-bold text-blue-700 dark:text-blue-300 transition-colors cursor-pointer border-0 focus:outline-none"
          >
            <Download className="h-4 w-4 shrink-0" />
            Export Academic Portfolio (PDF/Resume)
          </button>
        </div>
      </div>

      {/* TUTOR VERIFICATION MODAL */}
      <AnimatePresence>
        {showTutorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 pb-3">
                <h3 className="font-display font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  Tutor / Educator Verification Application
                </h3>
                <button onClick={() => setShowTutorModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitTutorVerification} className="space-y-4 text-left">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">1. Legal Full Name</label>
                  <input
                    type="text"
                    required
                    value={verifyRealName}
                    onChange={(e) => setVerifyRealName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-gray-900 dark:text-white mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">2. School / Educational Institution</label>
                  <input
                    type="text"
                    value={verifySchool}
                    onChange={(e) => setVerifySchool(e.target.value)}
                    placeholder="e.g. Science High School (or 'Independent Educator')"
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-gray-900 dark:text-white mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">3. Qualifications & Experience</label>
                  <textarea
                    rows={3}
                    value={verifyDescription}
                    onChange={(e) => setVerifyDescription(e.target.value)}
                    placeholder="Describe degrees, teaching certificates, exam scores or tutoring experience..."
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-gray-900 dark:text-white mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase block mb-1.5">
                    4. Subject Specializations (Multiple allowed)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'Mathematics', label: '📐 Mathematics' },
                      { id: 'Physics', label: '⚡ Physics' },
                      { id: 'English', label: '🌐 English' },
                      { id: 'Chemistry', label: '🧪 Chemistry' }
                    ].map(sub => {
                      const checked = verifySubjects.includes(sub.id);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            if (checked) {
                              if (verifySubjects.length === 1) return;
                              setVerifySubjects(prev => prev.filter(s => s !== sub.id));
                            } else {
                              setVerifySubjects(prev => [...prev, sub.id]);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                            checked 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                              : 'bg-gray-50 dark:bg-slate-950 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{sub.label}</span>
                          <div className={`h-4 w-4 rounded flex items-center justify-center border ${checked ? 'border-white bg-white text-blue-600' : 'border-gray-400 text-transparent'}`}>
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-150 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowTutorModal(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Submit Verification Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium max-w-sm transition-all ${
              toast.type === 'success' 
                ? 'bg-slate-900 border-emerald-500/30 text-white dark:bg-emerald-950 dark:border-emerald-800' 
                : toast.type === 'error'
                ? 'bg-slate-900 border-red-500/30 text-white dark:bg-red-950 dark:border-red-800'
                : 'bg-slate-900 border-blue-500/30 text-white dark:bg-blue-950 dark:border-blue-800'
            }`}
          >
            {toast.type === 'success' && <Check className="text-emerald-400 h-4 w-4 shrink-0" />}
            {toast.type === 'error' && <X className="text-red-400 h-4 w-4 shrink-0" />}
            <p className="flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm font-bold pl-2 bg-transparent border-0 focus:outline-none">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg shrink-0 mt-0.5">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display font-extrabold text-sm text-gray-900 dark:text-white">Confirm Action</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                    {confirmModal.message}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-red-600/10 border-0 focus:outline-none"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN REQUESTS LIST MODAL */}
      <AnimatePresence>
        {showAdminRequestsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-left max-h-[88vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300 rounded-xl">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-sm text-gray-900 dark:text-white">
                      Tutor Verification Requests & Management
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Total: {tutorRequests.length} records | Approve, decline or review history logs.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdminRequestsModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    placeholder="Search by name, email, school..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setAdminStatusFilter(status)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        adminStatusFilter === status
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {status === 'all' && `All (${tutorRequests.length})`}
                      {status === 'pending' && `Pending (${tutorRequests.filter(r => r.status === 'pending').length})`}
                      {status === 'approved' && `Approved (${tutorRequests.filter(r => r.status === 'approved').length})`}
                      {status === 'rejected' && `Declined (${tutorRequests.filter(r => r.status === 'rejected').length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Requests List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {(() => {
                  const filtered = tutorRequests.filter(req => {
                    const query = adminSearchQuery.toLowerCase().trim();
                    const matchesQuery = !query || 
                      req.realName?.toLowerCase().includes(query) ||
                      req.userName?.toLowerCase().includes(query) ||
                      req.userEmail?.toLowerCase().includes(query) ||
                      req.school?.toLowerCase().includes(query);
                    
                    if (!matchesQuery) return false;
                    if (adminStatusFilter === 'all') return true;
                    return req.status === adminStatusFilter;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-xs italic">
                        No matching verification requests found.
                      </div>
                    );
                  }

                  return filtered.map(req => (
                    <div 
                      key={req.id} 
                      className="p-4 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/80 hover:border-purple-500/50 hover:bg-purple-50/20 dark:hover:bg-slate-800/95 transition-all rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 group shadow-xs"
                    >
                      <div 
                        onClick={() => setSelectedDetailRequest(req)}
                        className="flex items-start gap-3 flex-1 cursor-pointer"
                        title="Click to view full request details"
                      >
                        <img src={req.userAvatar || SILHOUETTE_AVATAR} className="h-10 w-10 rounded-full border border-purple-500/40 object-cover shrink-0 mt-0.5 group-hover:scale-105 transition-transform" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                              {req.realName || req.userName}
                              <Maximize2 className="h-3 w-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h4>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">({req.userEmail || req.userId})</span>
                            {req.status === 'approved' ? (
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-bold">
                                Tutor (Approved)
                              </span>
                            ) : req.status === 'rejected' ? (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-500/30 rounded text-[9px] font-bold">
                                Student (Declined)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded text-[9px] font-bold">
                                Pending Approval
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-purple-600 dark:text-purple-300 font-medium mt-0.5">School: {req.school || 'Independent Educator'}</p>
                          {req.description && <p className="text-[10px] text-gray-600 dark:text-gray-300 italic line-clamp-2 mt-0.5">"{req.description}"</p>}
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">Subjects: {req.requestedSubjects?.join(', ') || 'Math, Physics'}</p>
                          <span className="text-[9px] text-gray-400">{req.timestamp}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end md:self-center shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailRequest(req)}
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="View enlarged details"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                          Details
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            approveTutorRequest(req.id);
                            showToast(`Approved & granted Tutor role for ${req.realName || req.userName}`, 'success');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                            req.status === 'approved' 
                              ? 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30' 
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {req.status === 'approved' ? '✓ Approved' : 'Approve Tutor'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            rejectTutorRequest(req.id);
                            showToast(`Declined / Revoked Tutor role for ${req.realName || req.userName}`, 'info');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                            req.status === 'rejected'
                              ? 'bg-red-600/20 text-red-700 dark:text-red-300 border border-red-500/40 hover:bg-red-600/30'
                              : 'bg-red-600/80 hover:bg-red-700 text-white'
                          }`}
                        >
                          {req.status === 'rejected' ? '✕ Declined' : 'Decline / Revoke'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedHistoryAccount(req)}
                          className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="View action history & logs"
                        >
                          <History className="h-3.5 w-3.5" />
                          History
                        </button>

                        <button
                          type="button"
                          onClick={() => setRequestToDelete(req)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 rounded-lg transition-all cursor-pointer shadow-2xs"
                          title="Permanently delete this request"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAdminRequestsModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close Management Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACCOUNT HISTORY MODAL FOR ADMIN */}
      <AnimatePresence>
        {selectedHistoryAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-left max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300 rounded-xl">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-sm text-gray-900 dark:text-white">
                      Application History & Permission Logs
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Account: {selectedHistoryAccount.userEmail || selectedHistoryAccount.userId}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedHistoryAccount(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Account Details Card */}
              <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center gap-3">
                  <img src={selectedHistoryAccount.userAvatar || SILHOUETTE_AVATAR} className="h-12 w-12 rounded-full border-2 border-purple-500/40 object-cover shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {selectedHistoryAccount.realName || selectedHistoryAccount.userName}
                      {selectedHistoryAccount.status === 'approved' ? (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold">
                          Approved Tutor
                        </span>
                      ) : selectedHistoryAccount.status === 'rejected' ? (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded text-[10px] font-bold">
                          Student (Declined)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded text-[10px] font-bold">
                          Pending Approval
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300">
                      <strong>School:</strong> {selectedHistoryAccount.school || 'Unspecified'}
                    </p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400">
                      <strong>Requested Subjects:</strong> {selectedHistoryAccount.requestedSubjects?.join(', ') || 'Math, Physics'}
                    </p>
                  </div>
                </div>
                {selectedHistoryAccount.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-gray-150 dark:border-slate-800 italic">
                    "{selectedHistoryAccount.description}"
                  </p>
                )}
              </div>

              {/* History Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-purple-500" />
                  Action History & Status Changes
                </h4>

                <div className="relative pl-4 border-l-2 border-purple-200 dark:border-purple-900/50 space-y-4 my-2">
                  {selectedHistoryAccount.historyLogs && selectedHistoryAccount.historyLogs.length > 0 ? (
                    selectedHistoryAccount.historyLogs.map((log, idx) => (
                      <div key={idx} className="relative space-y-1">
                        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-purple-600 ring-4 ring-white dark:ring-slate-900" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-800 dark:text-gray-200">{log.action}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{log.timestamp}</span>
                        </div>
                        {log.performedBy && (
                          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                            Executed by: {log.performedBy}
                          </p>
                        )}
                        {log.details && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                            {log.details}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="relative space-y-1">
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-purple-600 ring-4 ring-white dark:ring-slate-900" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800 dark:text-gray-200">Submitted Tutor Verification Request</span>
                        <span className="text-[10px] text-gray-400 font-mono">{selectedHistoryAccount.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Initial tutor verification request recorded.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons inside history modal */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestToDelete(selectedHistoryAccount)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Request
                </button>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      approveTutorRequest(selectedHistoryAccount.id);
                      setSelectedHistoryAccount(prev => prev ? { ...prev, status: 'approved' } : null);
                      showToast(`Approved & granted Tutor role for ${selectedHistoryAccount.realName || selectedHistoryAccount.userName}!`, 'success');
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    Grant Tutor Role
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      rejectTutorRequest(selectedHistoryAccount.id);
                      setSelectedHistoryAccount(prev => prev ? { ...prev, status: 'rejected' } : null);
                      showToast(`Declined / Revoked Tutor role for ${selectedHistoryAccount.realName || selectedHistoryAccount.userName}`, 'info');
                    }}
                    className="px-3.5 py-2 bg-red-600/80 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Revoke / Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryAccount(null)}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ENLARGED REQUEST DETAIL MODAL */}
      <AnimatePresence>
        {selectedDetailRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-left max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-gray-150 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3.5">
                  <img 
                    src={selectedDetailRequest.userAvatar || SILHOUETTE_AVATAR} 
                    className="h-14 w-14 rounded-2xl border-2 border-purple-500/50 object-cover shrink-0 shadow-md" 
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-black text-base text-gray-900 dark:text-white">
                        {selectedDetailRequest.realName || selectedDetailRequest.userName}
                      </h3>
                      {selectedDetailRequest.status === 'approved' ? (
                        <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold">
                          Approved Tutor
                        </span>
                      ) : selectedDetailRequest.status === 'rejected' ? (
                        <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-500/30 rounded-full text-xs font-bold">
                          Declined / Revoked
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold">
                          Pending Approval
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                      Email / ID: {selectedDetailRequest.userEmail || selectedDetailRequest.userId}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Submitted on: {selectedDetailRequest.timestamp}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDetailRequest(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Main Detailed Content */}
              <div className="space-y-4">
                {/* School & Educational Institution */}
                <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <School className="h-4 w-4" />
                    School / Educational Institution
                  </span>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {selectedDetailRequest.school || 'Unspecified'}
                  </p>
                </div>

                {/* Requested Subjects */}
                <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    Requested Teaching Subjects
                  </span>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {selectedDetailRequest.requestedSubjects && selectedDetailRequest.requestedSubjects.length > 0 ? (
                      selectedDetailRequest.requestedSubjects.map((sub, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border border-blue-300/60 dark:border-blue-800 rounded-lg text-xs font-bold">
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">Mathematics, Physics</span>
                    )}
                  </div>
                </div>

                {/* Full Detailed Description / Reason */}
                <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200/80 dark:border-purple-800/40 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    Detailed Qualifications & Bio
                  </span>
                  {selectedDetailRequest.description ? (
                    <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-normal whitespace-pre-wrap bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-purple-100 dark:border-purple-900/40 shadow-2xs">
                      {selectedDetailRequest.description}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No detailed description provided by applicant.</p>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 border-t border-gray-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRequestToDelete(selectedDetailRequest)}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Request
                </button>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      approveTutorRequest(selectedDetailRequest.id);
                      setSelectedDetailRequest(prev => prev ? { ...prev, status: 'approved' } : null);
                      showToast(`Approved & granted Tutor role for ${selectedDetailRequest.realName || selectedDetailRequest.userName}!`, 'success');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    Approve Tutor
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      rejectTutorRequest(selectedDetailRequest.id);
                      setSelectedDetailRequest(prev => prev ? { ...prev, status: 'rejected' } : null);
                      showToast(`Declined / Revoked Tutor role for ${selectedDetailRequest.realName || selectedDetailRequest.userName}`, 'info');
                    }}
                    className="px-4 py-2 bg-red-600/80 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Decline / Revoke
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHistoryAccount(selectedDetailRequest);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <History className="h-3.5 w-3.5" />
                    History
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDetailRequest(null)}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE REQUEST CONFIRMATION MODAL */}
      <AnimatePresence>
        {requestToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-red-500/30 dark:border-red-900/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 rounded-2xl shrink-0 border border-red-200 dark:border-red-800/60">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white">
                    Confirm Deleting Request?
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Target User Summary Box */}
              <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-150 dark:border-red-900/30 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <img src={requestToDelete.userAvatar || SILHOUETTE_AVATAR} className="h-9 w-9 rounded-full object-cover border border-red-300 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      {requestToDelete.realName || requestToDelete.userName}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {requestToDelete.userEmail || requestToDelete.userId}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-red-700 dark:text-red-300 font-medium">
                  School: {requestToDelete.school || 'Unspecified'}
                </p>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Are you sure you want to permanently remove this tutor verification request from the database?
              </p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRequestToDelete(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reqId = requestToDelete.id;
                    deleteTutorRequest(reqId);
                    showToast('Tutor verification request deleted', 'info');
                    setRequestToDelete(null);
                    if (selectedDetailRequest?.id === reqId) {
                      setSelectedDetailRequest(null);
                    }
                    if (selectedHistoryAccount?.id === reqId) {
                      setSelectedHistoryAccount(null);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
