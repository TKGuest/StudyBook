import React from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, Flame, BookOpen, Clock, Award } from 'lucide-react';

export const RightSidebar: React.FC = () => {
  const { groupChats, openChatWindow, user } = useApp();

  return (
    <aside className="w-72 shrink-0 hidden xl:flex flex-col bg-gray-50 dark:bg-slate-950 p-3 pt-2 border-l border-gray-150 dark:border-slate-850 h-[calc(100vh-57px)] overflow-y-auto scrollbar-thin transition-colors">
      <div className="space-y-4">
        
        {/* User Study Quick Stats */}
        <div className="flex items-center justify-end px-0.5 pt-0.5">
          <span className="flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border border-orange-200/80 dark:border-orange-900/60 px-2.5 py-0.5 rounded-full shadow-2xs">
            <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
            {user?.streak || 0}
          </span>
        </div>

        <hr className="border-gray-200 dark:border-slate-850" />

        {/* Group Conversations List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pl-1 pr-1">
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Trò chuyện nhóm</span>
            <span className="text-[10px] font-semibold text-blue-500">{groupChats?.length || 0}</span>
          </div>
          
          <div className="space-y-1">
            {(!groupChats || groupChats.length === 0) ? (
              <p className="text-xs text-gray-400 dark:text-slate-500 p-2 italic">Chưa có cuộc trò chuyện nhóm nào.</p>
            ) : (
              groupChats.map(chat => (
                <button
                  key={chat.groupId}
                  onClick={() => openChatWindow(chat.groupId)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-slate-900 transition-all cursor-pointer group"
                >
                  <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 border border-blue-100/50 dark:border-blue-900/30">
                    {chat.groupName?.substring(0, 2)?.toUpperCase() || 'SB'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {chat.groupName}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

      </div>
    </aside>
  );
};
