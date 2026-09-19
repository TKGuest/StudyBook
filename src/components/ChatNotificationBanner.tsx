import React from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Bell } from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export const ChatNotificationBanner: React.FC = () => {
  const { 
    activeChatNotifications, 
    dismissChatNotification, 
    openDirectChat,
    setActiveTab,
    markChatAsRead
  } = useApp();

  const notifications = Object.values(activeChatNotifications || {});

  if (notifications.length === 0) {
    return null;
  }

  const handleOpenChat = (chatId: string, sender: { id: string; name: string; avatar: string }) => {
    playSound('pop');
    // Reset Condition: Clear this counter to 0 the exact moment the user opens that specific chat box
    markChatAsRead(chatId);
    openDirectChat({
      id: sender.id,
      name: sender.name,
      avatar: sender.avatar,
      role: 'student'
    });
  };

  return (
    <aside aria-label="Real-time Chat Notifications" className="fixed top-16 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => {
          const isMultiple = notif.count > 1;
          const notificationTitle = isMultiple
            ? `${notif.senderName} has sent you ${notif.count} messages`
            : `${notif.senderName} has sent you a message`;

          return (
            <motion.div
              key={notif.chatId}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.92, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              onClick={() => handleOpenChat(notif.chatId, {
                id: notif.senderId,
                name: notif.senderName,
                avatar: notif.senderAvatar
              })}
              className="pointer-events-auto bg-white/95 dark:bg-slate-850/95 backdrop-blur-md rounded-2xl p-3.5 shadow-xl border border-blue-100 dark:border-blue-900/60 cursor-pointer hover:shadow-2xl hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-start gap-3 group relative overflow-hidden"
            >
              {/* Dynamic glowing accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600" />

              {/* Avatar with dynamic count indicator */}
              <div className="relative shrink-0">
                <img
                  src={notif.senderAvatar}
                  alt={notif.senderName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                />
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-black shadow-md ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {notif.count}
                </span>
              </div>

              {/* Content area */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {notif.senderName}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-400 shrink-0">
                    • {notif.timestamp || 'Just now'}
                  </span>
                </div>

                {/* Dynamically updating counter announcement text */}
                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5 leading-tight">
                  {notificationTitle}
                </p>

                {/* Latest message snippet */}
                <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-1 leading-snug">
                  {notif.latestMessage}
                </p>

                {/* Quick action prompt */}
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium transition-colors">
                  <MessageSquare className="w-3 h-3" />
                  <span>Click to open conversation</span>
                </div>
              </div>

              {/* Dismiss button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playSound('closeModal');
                  dismissChatNotification(notif.chatId);
                }}
                className="absolute top-2.5 right-2.5 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                title="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </aside>
  );
};
