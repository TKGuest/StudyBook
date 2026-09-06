import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, Minimize2, Maximize2, X, Send, Sparkles, User as UserIcon, UserX, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FloatingChats: React.FC = () => {
  const { 
    openChatIds, 
    closeChatWindow, 
    groupChats, 
    directChats, 
    sendGroupMessage, 
    sendDirectMessage, 
    closeDirectChat, 
    user,
    blockUser,
    unblockUser,
    isUserBlocked
  } = useApp();
  const [minimizedIds, setMinimizedIds] = useState<string[]>([]);
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
  
  // Keep track of scroll refs for each chat
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Deduplicate openChatIds
  const uniqueChatIds = Array.from(new Set(openChatIds));

  // Auto-scroll to bottom of chat windows when a new message is added or window opened
  useEffect(() => {
    uniqueChatIds.forEach(id => {
      const el = scrollRefs.current[id];
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [uniqueChatIds, groupChats, directChats]);

  if (uniqueChatIds.length === 0) return null;

  const toggleMinimize = (id: string) => {
    setMinimizedIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleSendMessage = (chatId: string, isDirect: boolean, e: React.FormEvent) => {
    e.preventDefault();
    const txt = chatInputs[chatId] || '';
    if (!txt.trim()) return;

    if (isDirect) {
      sendDirectMessage(chatId, txt.trim());
    } else {
      sendGroupMessage(chatId, txt.trim());
    }
    setChatInputs(prev => ({ ...prev, [chatId]: '' }));

    // Scroll to bottom after message sent
    setTimeout(() => {
      const el = scrollRefs.current[chatId];
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  };

  const handleClose = (chatId: string, isDirect: boolean) => {
    if (isDirect) {
      closeDirectChat(chatId);
    } else {
      closeChatWindow(chatId);
    }
  };

  return (
    <div className="fixed bottom-0 right-6 z-50 flex items-end gap-3.5 pointer-events-none select-none max-w-full">
      <AnimatePresence>
        {uniqueChatIds.map((chatId, index) => {
          const isDirect = chatId.startsWith('dm_');
          const groupChat = !isDirect ? groupChats.find(c => c.groupId === chatId) : null;
          const directChat = isDirect ? directChats.find(c => c.id === chatId) : null;

          if (!groupChat && !directChat) return null;

          const isMinimized = minimizedIds.includes(chatId);
          const inputVal = chatInputs[chatId] || '';

          // Target details for DM
          const otherParticipant = isDirect && directChat ? (
            directChat.participants.find(p => p.id !== user.id) || directChat.participants[0]
          ) : null;

          const isBlocked = otherParticipant ? isUserBlocked(otherParticipant.id) : false;

          const chatTitle = isDirect 
            ? (otherParticipant?.name || 'Direct Message') 
            : (groupChat?.groupName || 'Study Group');

          const chatSubtitle = isDirect 
            ? (isBlocked ? 'Blocked Contact' : (otherParticipant?.role === 'tutor' ? 'Educator / Tutor' : 'Direct 1-on-1')) 
            : 'Active group chat';

          const avatarSrc = isDirect ? otherParticipant?.avatar : null;

          return (
            <motion.div
              key={chatId}
              initial={{ opacity: 0, y: 350, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 350, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`w-72 sm:w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-t-xl shadow-2xl flex flex-col pointer-events-auto select-text overflow-hidden ${
                isMinimized ? 'h-11' : 'h-[360px] sm:h-[400px]'
              }`}
              style={{ zIndex: 100 + index }}
            >
              {/* Chat Window Header */}
              <div 
                onClick={() => toggleMinimize(chatId)}
                className={`h-11 px-3 flex items-center justify-between text-white cursor-pointer select-none shrink-0 ${
                  isDirect 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-900 dark:to-slate-900' 
                    : 'bg-blue-600 hover:bg-blue-700 dark:bg-slate-900 dark:hover:bg-slate-950'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    {isDirect && avatarSrc ? (
                      <img src={avatarSrc} alt={chatTitle} className="h-7 w-7 rounded-full object-cover border border-white/30" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white border border-white/20">
                        {chatTitle.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-400 border border-blue-600 dark:border-slate-900 animate-pulse"></span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight truncate">{chatTitle}</p>
                    <p className="text-[9px] text-blue-100 dark:text-gray-300 truncate leading-none">{chatSubtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pointer-events-auto" onClick={e => e.stopPropagation()}>
                  {isDirect && otherParticipant && (
                    <button
                      onClick={() => {
                        if (isBlocked) {
                          unblockUser(otherParticipant.id);
                        } else if (confirm(`Block ${otherParticipant.name}? They will no longer be able to message you or view your posts.`)) {
                          blockUser(otherParticipant.id, otherParticipant.name, otherParticipant.avatar);
                        }
                      }}
                      className="p-1 rounded-md hover:bg-white/15 dark:hover:bg-slate-800 transition-colors text-white/80 hover:text-white cursor-pointer"
                      title={isBlocked ? 'Unblock User' : 'Block User'}
                    >
                      <UserX className="h-3 w-3" />
                    </button>
                  )}
                  <button 
                    onClick={() => toggleMinimize(chatId)}
                    className="p-1 rounded-md hover:bg-white/15 dark:hover:bg-slate-800 transition-colors text-white/80 hover:text-white"
                    title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
                  >
                    {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                  </button>
                  <button 
                    onClick={() => handleClose(chatId, isDirect)}
                    className="p-1 rounded-md hover:bg-white/15 dark:hover:bg-slate-800 transition-colors text-white/80 hover:text-white"
                    title="Close Chat"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Area */}
              {!isMinimized && (
                <>
                  <div 
                    ref={el => { scrollRefs.current[chatId] = el; }}
                    className="flex-1 p-3 overflow-y-auto space-y-3 bg-gray-50/50 dark:bg-slate-850/80 scrollbar-thin flex flex-col"
                  >
                    {isBlocked ? (
                      <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-center space-y-2 m-auto">
                        <ShieldAlert className="h-6 w-6 text-red-500 mx-auto" />
                        <p className="text-xs font-bold text-red-700 dark:text-red-300">You blocked {chatTitle}</p>
                        <p className="text-[10px] text-red-600 dark:text-red-400 leading-relaxed">
                          Blocked accounts cannot send you direct messages or view your academic posts.
                        </p>
                        <button
                          type="button"
                          onClick={() => unblockUser(otherParticipant!.id)}
                          className="px-3.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-all"
                        >
                          Unblock User
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Welcome message */}
                        <div className="text-center py-2 px-2 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-800/40 text-[10px] text-gray-400">
                          <Sparkles className="h-3.5 w-3.5 text-blue-500 dark:text-purple-400 mx-auto mb-1" />
                          {isDirect ? (
                            <>Direct messaging session with <span className="font-semibold text-gray-700 dark:text-gray-300">{chatTitle}</span>. Messages are synced in real time across accounts.</>
                          ) : (
                            <>Welcome to the <span className="font-semibold text-gray-700 dark:text-gray-300">{chatTitle}</span> group chat! Collaborate on homework & exam study notes.</>
                          )}
                        </div>

                    {/* Messages list */}
                    {isDirect && directChat ? (
                      directChat.messages.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 my-auto py-4">No messages yet. Send a greeting to start chatting!</p>
                      ) : (
                        directChat.messages.map(msg => {
                          const isMe = msg.senderId === user.id;
                          return (
                            <div 
                              key={msg.id} 
                              className={`flex items-start gap-2 max-w-[85%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}
                            >
                              {!isMe && (
                                <img 
                                  src={msg.senderAvatar || avatarSrc || ''} 
                                  alt={msg.senderName} 
                                  className="h-6.5 w-6.5 rounded-full object-cover shrink-0 border border-gray-100 dark:border-slate-700" 
                                />
                              )}
                              <div className="flex flex-col">
                                {!isMe && (
                                  <span className="text-[9px] text-gray-400 font-bold ml-1 mb-0.5">
                                    {msg.senderName.split(' ')[0]}
                                  </span>
                                )}
                                <div 
                                  className={`rounded-2xl px-3 py-1.5 text-xs shadow-sm leading-relaxed break-words ${
                                    isMe 
                                      ? 'bg-purple-600 text-white rounded-tr-sm' 
                                      : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-150 border border-gray-100 dark:border-slate-700 rounded-tl-sm'
                                  }`}
                                >
                                  {msg.content}
                                </div>
                                <span className={`text-[8px] text-gray-400 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                  {msg.timestamp}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )
                    ) : groupChat ? (
                      groupChat.messages.map(msg => {
                        const isMe = msg.sender.id === user.id;
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex items-start gap-2 max-w-[85%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}
                          >
                            {!isMe && (
                              <img 
                                src={msg.sender.avatar} 
                                alt={msg.sender.name} 
                                className="h-6.5 w-6.5 rounded-full object-cover shrink-0 border border-gray-100 dark:border-slate-700" 
                              />
                            )}
                            <div className="flex flex-col">
                              {!isMe && (
                                <span className="text-[9px] text-gray-400 font-bold ml-1 mb-0.5">
                                  {msg.sender.name.split(' ')[0]}
                                </span>
                              )}
                              <div 
                                className={`rounded-2xl px-3 py-1.5 text-xs shadow-sm leading-relaxed break-words ${
                                  isMe 
                                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                                    : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-150 border border-gray-100 dark:border-slate-700 rounded-tl-sm'
                                }`}
                              >
                                {msg.content}
                              </div>
                              <span className={`text-[8px] text-gray-400 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                {msg.timestamp}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : null}
                      </>
                    )}
                  </div>

                  {/* Chat Message Input Footer */}
                  {isBlocked ? (
                    <div className="p-2.5 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-center text-[11px] text-gray-400 font-medium">
                      Messaging is disabled for blocked accounts.
                    </div>
                  ) : (
                    <form 
                      onSubmit={e => handleSendMessage(chatId, isDirect, e)}
                      className="p-2 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-1.5 items-center shrink-0"
                    >
                      <input
                        type="text"
                        value={inputVal}
                        onChange={e => {
                          const val = e.target.value;
                          setChatInputs(prev => ({ ...prev, [chatId]: val }));
                        }}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-100 dark:bg-slate-900/60 text-xs text-gray-900 dark:text-white rounded-full px-3 py-2 border-none focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
                      />
                      <button 
                        type="submit"
                        disabled={!inputVal.trim()}
                        className={`h-8 w-8 rounded-full text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 cursor-pointer ${
                          isDirect ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  )}
                </>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
