import React from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, Flame, Users, UserPlus, ShieldCheck, UserCheck } from 'lucide-react';
import { playSound } from '../utils/soundEffects';
import { SILHOUETTE_AVATAR } from '../data/mockData';

export const RightSidebar: React.FC = () => {
  const { groupChats, openChatWindow, friends, friendRequests, openDirectChat, setActiveTab, user, settings } = useApp();

  const pendingReceived = friendRequests.filter(r => r.receiverId === user.id && r.status === 'pending');

  return (
    <aside className="w-72 shrink-0 hidden xl:flex flex-col bg-gray-50 dark:bg-slate-950 p-3 pt-2 border-l border-gray-150 dark:border-slate-850 h-[calc(100vh-57px)] overflow-y-auto scrollbar-thin transition-colors">
      <div className="space-y-5">
        
        {/* User Study Quick Stats & Streak */}
        <div className="flex items-center justify-between px-1 pt-0.5">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Activity & Chat</span>
          <button 
            onClick={() => { playSound('tab'); setActiveTab('settings'); }}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-2xs border transition-colors cursor-pointer ${
              settings.showStreakToOthers !== false
                ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border-orange-200/80 dark:border-orange-900/60'
                : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
            }`}
            title={settings.showStreakToOthers !== false ? 'Streak is visible to others' : 'Streak is hidden from others (Click to manage in Settings)'}
          >
            <Flame className={`h-3.5 w-3.5 ${settings.showStreakToOthers !== false ? 'fill-orange-500 text-orange-500' : 'text-gray-400'}`} />
            {user?.streak || 0}
            {settings.showStreakToOthers === false && (
              <span className="text-[9px] font-semibold text-gray-400 uppercase ml-0.5">(Hidden)</span>
            )}
          </button>
        </div>

        {/* Pending Friend Requests Banner Alert */}
        {pendingReceived.length > 0 && (
          <div 
            onClick={() => { playSound('tab'); setActiveTab('friends'); }}
            className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-between cursor-pointer hover:bg-purple-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                {pendingReceived.length} Friend Request{pendingReceived.length > 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-300 underline">View</span>
          </div>
        )}

        {/* Friends & Direct Messaging Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pl-1 pr-1">
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-purple-500" />
              Friends ({friends.length})
            </span>
            <button
              onClick={() => { playSound('tab'); setActiveTab('friends'); }}
              className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              Manage
            </button>
          </div>

          <div className="space-y-1">
            {friends.length === 0 ? (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-150 dark:border-slate-850 text-center">
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">No friends added yet.</p>
                <button
                  onClick={() => { playSound('tab'); setActiveTab('friends'); }}
                  className="px-2.5 py-1 bg-purple-600 text-white text-[10px] font-semibold rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
                >
                  Find Friends
                </button>
              </div>
            ) : (
              friends.slice(0, 5).map(friend => (
                <button
                  key={friend.id}
                  onClick={() => {
                    playSound('pop');
                    openDirectChat({
                      id: friend.id,
                      name: friend.name,
                      avatar: friend.avatar || SILHOUETTE_AVATAR,
                      email: friend.email,
                      role: friend.role
                    });
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-purple-200 dark:hover:border-purple-900 transition-all cursor-pointer group"
                >
                  <div className="relative shrink-0">
                    <img 
                      src={friend.avatar || SILHOUETTE_AVATAR} 
                      alt={friend.name} 
                      className="h-7 w-7 rounded-full object-cover border border-gray-200 dark:border-slate-800" 
                    />
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-white dark:border-slate-950"></span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                        {friend.name}
                      </p>
                      {friend.role === 'tutor' && (
                        <ShieldCheck className="h-3 w-3 text-blue-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">Online now</p>
                  </div>

                  <MessageSquare className="h-3.5 w-3.5 text-gray-400 group-hover:text-purple-500 transition-colors shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        <hr className="border-gray-200 dark:border-slate-850" />

        {/* Group Conversations List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pl-1 pr-1">
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Group Chats</span>
            <span className="text-[10px] font-semibold text-blue-500">{groupChats?.length || 0}</span>
          </div>
          
          <div className="space-y-1">
            {(!groupChats || groupChats.length === 0) ? (
              <p className="text-xs text-gray-400 dark:text-slate-500 p-2 italic">No active group chats.</p>
            ) : (
              groupChats.map(chat => (
                <button
                  key={chat.groupId}
                  onClick={() => {
                    playSound('tab');
                    openChatWindow(chat.groupId);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-pointer group"
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
