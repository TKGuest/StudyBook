import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SILHOUETTE_AVATAR } from '../data/mockData';
import { 
  Search, 
  Flame, 
  Bell, 
  MessageSquare, 
  ShieldAlert, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  EyeOff, 
  Award,
  Home,
  Film,
  ShoppingBag,
  Users,
  Gamepad2,
  GraduationCap
} from 'lucide-react';

interface HeaderProps {
  onSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchQuery }) => {
  const { 
    activeTab,
    user, 
    settings, 
    setSettings, 
    groupChats, 
    setActiveTab, 
    isSpeaking, 
    stopSpeaking,
    tutorRequests,
    approveTutorRequest
  } = useApp();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessenger, setShowMessenger] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [search, setSearch] = useState('');

  const currentEmail = user.email || localStorage.getItem('sb_current_email') || '';
  const isAdmin = user.role === 'admin' || currentEmail.toLowerCase() === 'billkute030709@gmail.com';

  const tutorNotifications = isAdmin ? tutorRequests.filter(r => r.status === 'pending').map(r => ({
    id: r.id,
    text: `🔔 Yêu cầu Gia sư: ${r.userName} (${r.userEmail || 'Học viên'}) muốn trở thành Gia sư!`,
    time: r.timestamp,
    isHighPriority: true,
    isTutorRequest: true,
    requestId: r.id
  })) : [];

  const [hasUnreadMessages, setHasUnreadMessages] = useState<boolean>(() => {
    try {
      const key = user?.id ? `sb_has_unread_msg_${user.id}` : 'sb_has_unread_msg';
      return localStorage.getItem(key) !== 'false';
    } catch (_) {
      return true;
    }
  });

  const [hasUnreadNotifications, setHasUnreadNotifications] = useState<boolean>(() => {
    try {
      const key = user?.id ? `sb_has_unread_notif_${user.id}` : 'sb_has_unread_notif';
      return localStorage.getItem(key) !== 'false';
    } catch (_) {
      return true;
    }
  });

  useEffect(() => {
    if (user?.id) {
      try {
        const msgKey = `sb_has_unread_msg_${user.id}`;
        const notifKey = `sb_has_unread_notif_${user.id}`;
        setHasUnreadMessages(localStorage.getItem(msgKey) !== 'false');
        setHasUnreadNotifications(localStorage.getItem(notifKey) !== 'false');
      } catch (_) {}
    }
  }, [user?.id]);

  const toggleDarkMode = () => {
    setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }));
  };

  const toggleIncognito = () => {
    setSettings(prev => ({ ...prev, incognitoMode: !prev.incognitoMode }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onSearchQuery(val);
  };

  // Streak badge ring styles based on streak status
  const getStreakRingStyle = () => {
    if (settings.incognitoMode) return 'ring-4 ring-slate-400 animate-pulse';
    if (user.streak >= 100) return 'ring-4 ring-yellow-400 ring-offset-2 shadow-lg shadow-yellow-500/20 animate-pulse';
    if (user.streak >= 30) return 'ring-4 ring-indigo-400 ring-offset-2 animate-pulse';
    return 'ring-4 ring-orange-500 ring-offset-1';
  };

  const getStreakTitle = () => {
    if (user.streak >= 100) return 'Diamond Scholar';
    if (user.streak >= 30) return 'Academic Elite';
    return 'Study Warrior';
  };

  // Notifications
  const mockNotifications: { id: number; text: string; time: string; isHighPriority: boolean }[] = [
    { id: 1, text: 'Chào mừng bạn đến với StudyBook! Hãy đăng tải tài liệu hoặc tạo nhóm học tập đầu tiên.', time: 'Vừa xong', isHighPriority: true }
  ];

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-2 border-b border-gray-100 dark:bg-slate-900 dark:border-slate-800 shadow-sm transition-colors duration-200">
      {/* Left logo section */}
      <div className="flex items-center gap-3">
        <div 
          onClick={() => setActiveTab('feed')} 
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-display text-2xl font-bold text-white shadow-md shadow-blue-500/30">
            S
          </div>
          <span className="hidden sm:block font-display text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
            studybook
          </span>
        </div>
        
        {/* Search Bar */}
        <div className="relative flex items-center max-w-xs md:max-w-md ml-2">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search documents, groups, tutors..."
            className="w-40 sm:w-64 rounded-full bg-gray-100 dark:bg-slate-800 py-1.5 pl-9 pr-4 text-sm font-sans text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Center Navigation Icons (Facebook style) */}
      <div className="hidden lg:flex items-center justify-center flex-1 max-w-xl px-4 h-12">
        {[
          { id: 'feed', icon: Home, label: 'Feed' },
          { id: 'reels', icon: Film, label: 'Reels' },
          { id: 'marketplace', icon: ShoppingBag, label: 'Chợ' },
          { id: 'groups', icon: Users, label: 'Nhóm' },
          { id: 'games', icon: Gamepad2, label: 'Đấu trí' },
          { id: 'tutors', icon: GraduationCap, label: 'Gia sư' }
        ].map(item => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center h-full relative cursor-pointer group focus:outline-none transition-colors ${
                isSelected 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title={item.label}
            >
              <div className="flex items-center justify-center p-2 rounded-xl group-hover:bg-gray-150/60 dark:group-hover:bg-slate-800 transition-all duration-180">
                <Icon className={`h-6 w-6 shrink-0 ${isSelected ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
              </div>
              {isSelected && (
                <div className="absolute bottom-0 left-2 right-2 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Incognito mode badge */}
        {settings.incognitoMode && (
          <div className="hidden md:flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-medium">
            <EyeOff className="h-3 w-3" />
            Incognito
          </div>
        )}

        {/* Quick Incognito Toggle */}
        <button
          onClick={toggleIncognito}
          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${settings.incognitoMode ? 'text-slate-600 dark:text-slate-300' : 'text-gray-400'}`}
          title={settings.incognitoMode ? 'Disable study incognito mode' : 'Enable study incognito mode'}
        >
          <EyeOff className={`h-5 w-5 ${settings.incognitoMode ? 'fill-slate-200' : ''}`} />
        </button>

        {/* Dark/Light mode switch */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          title="Toggle Theme"
        >
          {settings.darkMode ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-slate-600" />}
        </button>

        {/* Messenger Panel trigger */}
        <div className="relative">
          <button
            onClick={() => {
              const nextState = !showMessenger;
              setShowMessenger(nextState);
              setShowNotifications(false);
              setShowStreakModal(false);
              if (hasUnreadMessages) {
                setHasUnreadMessages(false);
                try {
                  const msgKey = user?.id ? `sb_has_unread_msg_${user.id}` : 'sb_has_unread_msg';
                  localStorage.setItem(msgKey, 'false');
                } catch (_) {}
              }
            }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors relative"
            title="Study Groups Chat"
          >
            <MessageSquare className="h-5 w-5" />
            {hasUnreadMessages && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500"></span>
            )}
          </button>
          
          {/* Messenger dropdown */}
          {showMessenger && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-850">
                <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">Study Group Chats</span>
                <span className="text-xs text-blue-500 font-medium cursor-pointer" onClick={() => { setActiveTab('groups'); setShowMessenger(false); }}>See All</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-700">
                {groupChats.map(chat => (
                  <div 
                    key={chat.groupId} 
                    onClick={() => {
                      setActiveTab('groups');
                      setShowMessenger(false);
                    }}
                    className="p-3 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer flex gap-3 items-center transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-600 dark:text-blue-300 text-sm">
                      {chat.groupName.substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-150 truncate">{chat.groupName}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {chat.messages.length > 0 ? `${chat.messages[chat.messages.length - 1].sender.name}: ${chat.messages[chat.messages.length - 1].content}` : 'Start study groups chat!'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notification Panel Trigger */}
        <div className="relative">
          <button
            onClick={() => {
              const nextState = !showNotifications;
              setShowNotifications(nextState);
              setShowMessenger(false);
              setShowStreakModal(false);
              if (hasUnreadNotifications) {
                setHasUnreadNotifications(false);
                try {
                  const notifKey = user?.id ? `sb_has_unread_notif_${user.id}` : 'sb_has_unread_notif';
                  localStorage.setItem(notifKey, 'false');
                } catch (_) {}
              }
            }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors relative"
            title="Study Notifications"
          >
            <Bell className="h-5 w-5" />
            {hasUnreadNotifications && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>

          {/* Notifications dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-850 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">Study Notifications</span>
                  <span className="text-xs text-gray-500">Academic & Interactions</span>
                </div>
                {/* Academic Mode Status indicator */}
                <div className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-[11px] text-blue-700 dark:text-blue-300">
                  <ShieldAlert className="h-3 w-3 shrink-0" />
                  <span>Exam Mode active: Non-academic notifications disabled.</span>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-700">
                {tutorNotifications.map(n => (
                  <div key={n.id} className="p-3.5 bg-purple-500/10 dark:bg-purple-950/30 hover:bg-purple-500/15 transition-colors flex flex-col gap-2">
                    <div className="flex gap-2.5 items-start">
                      <div className="h-2 w-2 rounded-full mt-1.5 shrink-0 bg-purple-500"></div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-800 dark:text-gray-100 font-bold leading-relaxed">{n.text}</p>
                        <span className="text-[10px] text-purple-400 block mt-0.5">{n.time}</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          approveTutorRequest(n.requestId);
                          setShowNotifications(false);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-all shadow-xs"
                      >
                        Xác minh ngay (Approve)
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('settings');
                          setShowNotifications(false);
                        }}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-bold transition-all"
                      >
                        Xem Bảng Admin
                      </button>
                    </div>
                  </div>
                ))}
                {mockNotifications.map(n => (
                  <div key={n.id} className={`p-3.5 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors flex gap-2.5 items-start ${n.isHighPriority ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${n.isHighPriority ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-800 dark:text-gray-200 font-medium leading-relaxed">{n.text}</p>
                      <span className="text-[10px] text-gray-400 block mt-1">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Daily Study Streak Badge - Glowing Ring surrounding user's profile picture */}
        <div className="relative">
          <button
            onClick={() => {
              setShowStreakModal(!showStreakModal);
              setShowMessenger(false);
              setShowNotifications(false);
            }}
            className="flex items-center focus:outline-none"
            title="Study Streak"
          >
            <div className="relative p-0.5">
              <img
                src={settings.incognitoMode ? SILHOUETTE_AVATAR : (user.avatar || SILHOUETTE_AVATAR)}
                alt="Profile"
                className={`h-9 w-9 rounded-full object-cover transition-all ${getStreakRingStyle()}`}
              />
              {!settings.incognitoMode && (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white border border-white">
                  <Flame className="h-3 w-3 fill-white" />
                </span>
              )}
            </div>
          </button>

          {/* Streak details modal */}
          {showStreakModal && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 shadow-2xl z-50 overflow-hidden p-4">
              <div className="text-center pb-3 border-b border-gray-100 dark:border-slate-700">
                <Flame className="h-10 w-10 text-orange-500 fill-orange-500 mx-auto animate-bounce" />
                <h3 className="font-display font-bold text-lg text-gray-800 dark:text-white mt-1">
                  Streak {user.streak} Days!
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">{getStreakTitle()}</p>
              </div>

              {/* Login Streak Info Card */}
              <div className="my-3 p-3.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/40 rounded-xl space-y-1.5 text-center">
                <p className="text-xs font-bold text-orange-700 dark:text-orange-300 flex items-center justify-center gap-1">
                  <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
                  Chuỗi Đăng Nhập Hàng Ngày
                </p>
                <p className="text-[11px] text-orange-800/80 dark:text-orange-200/80 leading-relaxed">
                  Đăng nhập vào StudyBook mỗi ngày để duy trì streak! Nếu bỏ lỡ 1 ngày không đăng nhập, chuỗi streak sẽ bị ngắt và quay về 1.
                </p>
              </div>

              {/* Earned badges in app */}
              <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Earned Badges</span>
                <div className="flex flex-wrap gap-1.5">
                  {user.badges.map(b => (
                    <span key={b} className="flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-1 rounded-full">
                      <Award className="h-3 w-3" />
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
