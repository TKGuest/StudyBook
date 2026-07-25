import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, EyeOff, Sliders, Volume2, Save, Download, RefreshCw, User as UserIcon, Globe, LogOut, Check, Upload, X, BadgeCheck, Clock, Award, History, Search, Trash2, Maximize2, FileText, AlertTriangle, School, BookOpen } from 'lucide-react';
import { isFirebaseConfigured, auth, db } from '../lib/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { SILHOUETTE_AVATAR } from '../data/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { User, TutorRequest } from '../types';

export const SettingsView: React.FC = () => {
  const { 
    settings, 
    setSettings, 
    exportResume, 
    user, 
    setUser,
    isFirebaseConnected,
    logout,
    isOfflineBypass,
    setIsOfflineBypass,
    tutorRequests,
    requestTutorVerification,
    approveTutorRequest,
    rejectTutorRequest,
    deleteTutorRequest
  } = useApp();
  
  // Profile editor states
  const [profileName, setProfileName] = useState(user.name);
  const [institution, setInstitution] = useState(user.institution || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar);

  // Tutor Modal States
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [verifyRealName, setVerifyRealName] = useState(user.name);
  const [verifySchool, setVerifySchool] = useState(user.institution || '');
  const [verifyDescription, setVerifyDescription] = useState('');
  const [verifySubjects, setVerifySubjects] = useState<string[]>(['Toán (Math)', 'Vật Lý (Physics)']);

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
        showToast('Kích thước ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.', 'error');
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
      showToast('Vui lòng nhập tên hiển thị!', 'error');
      return;
    }

    const updatedUser: User = {
      ...user,
      name: profileName.trim(),
      institution: institution.trim(),
      avatar: avatarUrl
    };

    setUser(updatedUser);
    localStorage.setItem('sb_user', JSON.stringify(updatedUser));

    if (isFirebaseConfigured && user.id) {
      try {
        await setDoc(doc(db, 'users', user.id), {
          name: profileName.trim(),
          institution: institution.trim(),
          avatar: avatarUrl
        }, { merge: true });
      } catch (e) {
        console.warn('Failed to sync profile save to Firestore:', e);
      }
    }

    showToast('Hồ sơ học tập của bạn đã được cập nhật và lưu thành công!', 'success');
  };

  const handleSubmitTutorVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyRealName.trim()) {
      showToast('Vui lòng nhập Họ và tên thật!', 'error');
      return;
    }
    if (verifySubjects.length === 0) {
      showToast('Vui lòng chọn ít nhất một môn học để dạy!', 'error');
      return;
    }

    await requestTutorVerification({
      realName: verifyRealName.trim(),
      school: verifySchool.trim() || 'Không thuộc trường nào',
      description: verifyDescription.trim(),
      requestedSubjects: verifySubjects
    });

    setShowTutorModal(false);
    showToast('Đã gửi yêu cầu xác minh Gia sư tới Quản trị viên (billkute030709@gmail.com)!', 'success');
  };

  const handleWeightChange = (subject: 'Math' | 'Physics' | 'English' | 'Chemistry' | 'ExamPrep', value: number) => {
    setSettings(prev => ({
      ...prev,
      subjectWeights: {
        ...prev.subjectWeights,
        [subject]: value
      }
    }));
  };

  const handleToggleSetting = (key: 'incognitoMode' | 'spoilerProtection' | 'ttsEnabled') => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleResetImplicitHistory = () => {
    setConfirmModal({
      message: 'Bạn có chắc chắn muốn xóa toàn bộ bộ nhớ đệm ẩn và lịch sử nhấp chuột hành vi không? Việc này sẽ reset các gợi ý thuật toán Bảng Tin học tập về mặc định.',
      onConfirm: () => {
        showToast('Đã xóa bộ nhớ đệm (implicit cache) thành công! Thuật toán đã quay về cấu hình cơ bản.', 'success');
        setConfirmModal(null);
      }
    });
  };

  const isVerifiedTutor = user.role === 'tutor' || user.badges?.includes('Verified Tutor') || isAdmin;
  const pendingRequest = tutorRequests.find(r => r.userId === user.id && r.status === 'pending');

  return (
    <div className="flex-1 p-4 md:p-6 max-w-3xl mx-auto space-y-6 h-[calc(100vh-57px)] overflow-y-auto pb-20 scrollbar-thin">
      
      <div>
        <h2 className="font-display font-extrabold text-lg text-gray-800 dark:text-white flex items-center gap-2">
          <Sliders className="h-5.5 w-5.5 text-blue-600" />
          Tùy Chỉnh Học Tập & Quyền Riêng Tư
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">Tối ưu hóa Bảng Tin, khóa xao nhãng, tinh chỉnh quyền riêng tư dữ liệu cá nhân của bạn.</p>
      </div>

      {/* ACCOUNT & SIGN OUT INFO CARD */}
      {(() => {
        let savedEmail = '';
        try { savedEmail = localStorage.getItem('sb_current_email') || ''; } catch (_) {}
        const currentEmail = auth?.currentUser?.email || savedEmail || (user.id && user.id !== 'guest' ? `${user.id}@studybook.vn` : 'Tài khoản Khách / Chưa đăng nhập');
        return (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/60 shadow-xs">
                <Globe className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">Tài khoản liên kết:</p>
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
                      Gia Sư Xác Minh
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
              Đăng xuất
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
                Bảng Quản Trị Viên (Admin Panel) - Quản Lý Gia Sư
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Duyệt & phân quyền Gia sư cho các tài khoản. Quản lý duy nhất 1 hồ sơ cho mỗi tài khoản.</p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 font-bold rounded-lg text-xs border border-purple-500/30">
                {tutorRequests.filter(r => r.status === 'pending').length} Chờ duyệt
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-bold rounded-lg text-xs border border-emerald-500/30">
                {tutorRequests.filter(r => r.status === 'approved').length} Đã duyệt
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
              Xem & Quản Lý Yêu Cầu Xác Minh Gia Sư ({tutorRequests.length} Hồ sơ)
            </button>
          </div>
        </div>
      )}

      {/* PROFILE CARD EDITOR */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5 border-b border-gray-150 dark:border-slate-700 pb-2">
          <UserIcon className="h-4.5 w-4.5 text-blue-600" />
          Hồ Sơ Cá Nhân Học Tập (My Profile)
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
            <span className="text-[10px] text-gray-400">Xem trước ảnh đại diện</span>
          </div>

          {/* Form details */}
          <div className="md:col-span-2 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Họ và Tên Hiển Thị</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Nguyễn Tuấn Anh"
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Trường / Viện Đào Tạo</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. ĐH Bách Khoa Hà Nội / THPT Chuyên..."
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase font-sans">Ảnh Đại Diện</label>
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
                  Tải ảnh từ máy tính (Upload)
                </label>
              </div>
            </div>

            <div className="pt-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Hoặc dán Link ảnh tùy chỉnh</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Dán link ảnh Unsplash, Imgur..."
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
                Lưu Hồ Sơ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCK 1: INCOGNITO STUDY MODE */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-4 space-y-4 shadow-sm">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
              <EyeOff className="h-4 w-4 text-slate-500" />
              Chế Độ Ẩn Danh Học Tập (Incognito Mode)
            </h3>
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
              Khi bật, ảnh đại diện của bạn sẽ chuyển xám ẩn danh, tên hiển thị của bạn ẩn đi ở mọi phòng học chung, giúp bạn yên tâm đọc tài liệu ôn thi mà không lo bị soi mói.
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

      {/* BLOCK 2: SUBJECT FOCUS WEIGHTS (MULTIPLE CHOICE SUBJECT SELECTION) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-4 space-y-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-blue-600" />
            Lọc Đề Xuất Môn Học (Subject Feed Preferences)
          </h3>
          <p className="text-[11px] text-gray-400 font-medium">
            Chọn các môn học bạn muốn xuất hiện trên Bảng Tin của bạn. Bỏ chọn môn nào sẽ ẩn hoàn toàn bài đăng của môn học đó.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {[
            { key: 'Math' as const, label: 'Toán Học (Math)' },
            { key: 'Physics' as const, label: 'Vật Lý (Physics)' },
            { key: 'English' as const, label: 'Tiếng Anh (English)' },
            { key: 'Chemistry' as const, label: 'Hóa Học (Chemistry)' }
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
                    {isSelected ? 'Ưu tiên học tập ⭐' : 'Bình thường'}
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

      {/* BLOCK 4: SPECIAL SETTINGS TOGGLES */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-4 space-y-4 shadow-sm divide-y divide-gray-100 dark:divide-slate-700">
        
        {/* Spoiler protection toggle */}
        <div className="flex justify-between items-center py-2">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-gray-800 dark:text-white">Bảo Vệ Chống Spoil Lời Giải (Spoiler Protection)</h4>
            <p className="text-[10px] text-gray-400 leading-relaxed pr-8">
              Khi bật, các bình luận hay hình ảnh chứa từ khóa như "đáp án", "lời giải", "đáp số" sẽ bị mờ đi cho đến khi bạn nhấp chuột trực tiếp, bảo vệ bạn khỏi việc mất tập trung tự giải.
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
              Đọc Văn Bản Học Tập (Text-to-Speech)
            </h4>
            <p className="text-[10px] text-gray-400 leading-relaxed pr-8">
              Tự động tích hợp nút Nghe Đọc tài liệu, bài giảng âm thanh và tin tức để học tập rảnh tay bằng tai nghe bất kỳ lúc nào.
            </p>
          </div>
          <button
            onClick={() => handleToggleSetting('ttsEnabled')}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none ${settings.ttsEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'}`}
          >
            <span className={`absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-transform ${settings.ttsEnabled ? 'translate-x-5' : ''}`}></span>
          </button>
        </div>

      </div>

      {/* BLOCK 5: TUTOR VERIFICATION SECTION */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        {isVerifiedTutor ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <BadgeCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  Tài khoản đã được xác minh Gia Sư / Giáo Viên
                  <BadgeCheck className="h-4 w-4 text-blue-500 fill-blue-500/20 inline" />
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Huy hiệu Verified Tutor được hiển thị xanh nổi bật bên cạnh ảnh đại diện và bài đăng của bạn.
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
                  Yêu cầu xác minh Gia sư đang chờ Admin duyệt
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Họ tên: <strong>{pendingRequest.realName}</strong> • Trường: <strong>{pendingRequest.school}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTutorModal(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
            >
              Cập nhật hồ sơ
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  Đăng Ký Xác Minh Gia Sư / Giáo Viên (Tutor Verification)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Nếu bạn là giáo viên, trợ giảng hoặc học viên xuất sắc muốn hướng dẫn cộng đồng, hãy gửi yêu cầu xác minh để nhận huy hiệu Verified Tutor chính thức.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTutorModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <BadgeCheck className="h-4.5 w-4.5" />
              Xác Minh Gia Sư (Tutor Verification)
            </button>
          </div>
        )}
      </div>

      {/* BLOCK 6: DATA STORAGE & UTILITIES */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 p-4 space-y-4 shadow-sm">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Quản lý Dữ liệu & Đọc xuất báo cáo</span>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Clear Cache */}
          <button
            onClick={handleResetImplicitHistory}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors cursor-pointer border-0 focus:outline-none"
          >
            <RefreshCw className="h-4 w-4 text-red-500 shrink-0" />
            Wipe Implicit Cache (Reset thuật toán)
          </button>

          {/* Export Portfolio Resume */}
          <button
            onClick={exportResume}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-2xl text-xs font-bold text-blue-700 dark:text-blue-300 transition-colors cursor-pointer border-0 focus:outline-none"
          >
            <Download className="h-4 w-4 shrink-0" />
            Xuất Học Bạ Điện Tử (PDF/Resume)
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
                  Hồ Sơ Đăng Ký Xác Minh Gia Sư / Giáo Viên
                </h3>
                <button onClick={() => setShowTutorModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitTutorVerification} className="space-y-4 text-left">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">1. Họ và tên thật</label>
                  <input
                    type="text"
                    required
                    value={verifyRealName}
                    onChange={(e) => setVerifyRealName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-gray-900 dark:text-white mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">2. Trường / Cơ quan đang giảng dạy</label>
                  <input
                    type="text"
                    value={verifySchool}
                    onChange={(e) => setVerifySchool(e.target.value)}
                    placeholder="Ví dụ: THPT Chuyên Hà Nội - Amsterdam (hoặc điền 'Không thuộc trường nào')"
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-gray-900 dark:text-white mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">3. Mô tả kinh nghiệm / Bằng cấp chuyên môn</label>
                  <textarea
                    rows={3}
                    value={verifyDescription}
                    onChange={(e) => setVerifyDescription(e.target.value)}
                    placeholder="Mô tả bằng cấp, chứng chỉ sư phạm, điểm thi hoặc kinh nghiệm giảng dạy..."
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-gray-900 dark:text-white mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase block mb-1.5">
                    4. Đăng ký xác minh chuyên môn (Có thể chọn nhiều môn)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'Toán (Math)', label: '📐 Toán (Math)' },
                      { id: 'Vật Lý (Physics)', label: '⚡ Vật Lý (Physics)' },
                      { id: 'Tiếng Anh (English)', label: '🌐 Tiếng Anh (English)' },
                      { id: 'Hóa Học (Chemistry)', label: '🧪 Hóa Học (Chemistry)' }
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
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Gửi Yêu Cầu Xác Minh
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
                  <h3 className="font-display font-extrabold text-sm text-gray-900 dark:text-white">Xác nhận hành động</h3>
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
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-red-600/10 border-0 focus:outline-none"
                >
                  Xác nhận xóa
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
                      Danh Sách Quản Lý & Phân Quyền Gia Sư
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Tổng số: {tutorRequests.length} hồ sơ | Duyệt, từ chối hoặc xem lịch sử cho từng tài khoản.
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
                    placeholder="Tìm theo tên, email, trường học..."
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
                      {status === 'all' && `Tất cả (${tutorRequests.length})`}
                      {status === 'pending' && `Chờ duyệt (${tutorRequests.filter(r => r.status === 'pending').length})`}
                      {status === 'approved' && `Đã duyệt (${tutorRequests.filter(r => r.status === 'approved').length})`}
                      {status === 'rejected' && `Đã từ chối (${tutorRequests.filter(r => r.status === 'rejected').length})`}
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
                        Không tìm thấy hồ sơ đăng ký xác minh nào phù hợp.
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
                        title="Bấm để xem chi tiết phóng to hồ sơ này"
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
                                Gia sư (Đã duyệt)
                              </span>
                            ) : req.status === 'rejected' ? (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-500/30 rounded text-[9px] font-bold">
                                Học sinh (Đã từ chối)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded text-[9px] font-bold">
                                Đang chờ duyệt
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-purple-600 dark:text-purple-300 font-medium mt-0.5">Trường: {req.school || 'Không thuộc trường nào'}</p>
                          {req.description && <p className="text-[10px] text-gray-600 dark:text-gray-300 italic line-clamp-2 mt-0.5">"{req.description}"</p>}
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">Môn đăng ký: {req.requestedSubjects?.join(', ') || 'Toán, Lý'}</p>
                          <span className="text-[9px] text-gray-400">{req.timestamp}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end md:self-center shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailRequest(req)}
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Xem phóng to chi tiết yêu cầu"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                          Chi Tiết
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            approveTutorRequest(req.id);
                            showToast(`Đã duyệt & cấp quyền Gia sư cho ${req.realName || req.userName}`, 'success');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                            req.status === 'approved' 
                              ? 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30' 
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {req.status === 'approved' ? '✓ Cấp Quyền' : 'Duyệt Gia Sư'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            rejectTutorRequest(req.id);
                            showToast(`Đã thu hồi / Từ chối Gia sư đối với ${req.realName || req.userName}`, 'info');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                            req.status === 'rejected'
                              ? 'bg-red-600/20 text-red-700 dark:text-red-300 border border-red-500/40 hover:bg-red-600/30'
                              : 'bg-red-600/80 hover:bg-red-700 text-white'
                          }`}
                        >
                          {req.status === 'rejected' ? '✕ Đã Từ Chối' : 'Thu Hồi / Từ Chối'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedHistoryAccount(req)}
                          className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Xem lịch sử thao tác & nhật ký"
                        >
                          <History className="h-3.5 w-3.5" />
                          Lịch Sử
                        </button>

                        <button
                          type="button"
                          onClick={() => setRequestToDelete(req)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 rounded-lg transition-all cursor-pointer shadow-2xs"
                          title="Xóa vĩnh viễn yêu cầu này"
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
                  Đóng Bảng Quản Lý
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
                      Lịch Sử Đăng Ký & Nhật Ký Phân Quyền
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Tài khoản: {selectedHistoryAccount.userEmail || selectedHistoryAccount.userId}</p>
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
                          Gia Sư Đã Duyệt
                        </span>
                      ) : selectedHistoryAccount.status === 'rejected' ? (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded text-[10px] font-bold">
                          Học Sinh (Đã Từ Chối)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded text-[10px] font-bold">
                          Đang Chờ Duyệt
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300">
                      <strong>Trường:</strong> {selectedHistoryAccount.school || 'Không thuộc trường nào'}
                    </p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400">
                      <strong>Môn đăng ký:</strong> {selectedHistoryAccount.requestedSubjects?.join(', ') || 'Toán, Lý'}
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
                  Nhật ký thao tác & Thay đổi trạng thái
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
                            Thực hiện bởi: {log.performedBy}
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
                        <span className="font-bold text-gray-800 dark:text-gray-200">Gửi yêu cầu xác minh Gia sư</span>
                        <span className="text-[10px] text-gray-400 font-mono">{selectedHistoryAccount.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Yêu cầu xác minh gia sư đầu tiên được ghi nhận.</p>
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
                  Xóa Yêu Cầu
                </button>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      approveTutorRequest(selectedHistoryAccount.id);
                      setSelectedHistoryAccount(prev => prev ? { ...prev, status: 'approved' } : null);
                      showToast(`Đã duyệt & cấp quyền Gia sư cho ${selectedHistoryAccount.realName || selectedHistoryAccount.userName}!`, 'success');
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    Cấp Quyền Gia Sư
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      rejectTutorRequest(selectedHistoryAccount.id);
                      setSelectedHistoryAccount(prev => prev ? { ...prev, status: 'rejected' } : null);
                      showToast(`Đã từ chối / thu hồi quyền Gia sư của ${selectedHistoryAccount.realName || selectedHistoryAccount.userName}`, 'info');
                    }}
                    className="px-3.5 py-2 bg-red-600/80 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Thu Hồi / Từ Chối
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryAccount(null)}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Đóng
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
                          Gia Sư (Đã duyệt)
                        </span>
                      ) : selectedDetailRequest.status === 'rejected' ? (
                        <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-500/30 rounded-full text-xs font-bold">
                          Đã từ chối / Thu hồi
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold">
                          Đang chờ duyệt
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                      Email / ID: {selectedDetailRequest.userEmail || selectedDetailRequest.userId}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Thời gian gửi: {selectedDetailRequest.timestamp}
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
                    Trường / Cơ Sở Đào Tạo
                  </span>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {selectedDetailRequest.school || 'Không khai báo trường'}
                  </p>
                </div>

                {/* Requested Subjects */}
                <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    Các Môn Học Đăng Ký Giảng Dạy
                  </span>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {selectedDetailRequest.requestedSubjects && selectedDetailRequest.requestedSubjects.length > 0 ? (
                      selectedDetailRequest.requestedSubjects.map((sub, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border border-blue-300/60 dark:border-blue-800 rounded-lg text-xs font-bold">
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">Toán (Math), Vật Lý (Physics)</span>
                    )}
                  </div>
                </div>

                {/* Full Detailed Description / Reason */}
                <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200/80 dark:border-purple-800/40 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    Mô Tả Chi Tiết & Giới Thiệu Năng Lực
                  </span>
                  {selectedDetailRequest.description ? (
                    <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-normal whitespace-pre-wrap bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-purple-100 dark:border-purple-900/40 shadow-2xs">
                      {selectedDetailRequest.description}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Ứng viên chưa nhập phần mô tả chi tiết.</p>
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
                  Xóa Yêu Cầu Này
                </button>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      approveTutorRequest(selectedDetailRequest.id);
                      setSelectedDetailRequest(prev => prev ? { ...prev, status: 'approved' } : null);
                      showToast(`Đã duyệt & cấp quyền Gia sư cho ${selectedDetailRequest.realName || selectedDetailRequest.userName}!`, 'success');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    Duyệt Gia Sư
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      rejectTutorRequest(selectedDetailRequest.id);
                      setSelectedDetailRequest(prev => prev ? { ...prev, status: 'rejected' } : null);
                      showToast(`Đã từ chối Gia sư đối với ${selectedDetailRequest.realName || selectedDetailRequest.userName}`, 'info');
                    }}
                    className="px-4 py-2 bg-red-600/80 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Thu Hồi / Từ Chối
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHistoryAccount(selectedDetailRequest);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <History className="h-3.5 w-3.5" />
                    Lịch Sử
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDetailRequest(null)}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Đóng
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
                    Xác Nhận Xóa Yêu Cầu?
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Hành động này không thể hoàn tác
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
                  Trường: {requestToDelete.school || 'Không rõ'}
                </p>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Bạn có chắc chắn muốn xóa hoàn toàn hồ sơ đăng ký xác minh gia sư này khỏi hệ thống? Dữ liệu yêu cầu sẽ bị xóa vĩnh viễn.
              </p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRequestToDelete(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reqId = requestToDelete.id;
                    deleteTutorRequest(reqId);
                    showToast('Đã xóa yêu cầu xác minh thành công', 'info');
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
                  Xóa Vĩnh Viễn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
