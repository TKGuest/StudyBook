import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, Minimize2, Maximize2, X, Send, Sparkles, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FloatingChats: React.FC = () => {
  const { openChatIds, closeChatWindow, groupChats, sendGroupMessage, user } = useApp();
  const [minimizedIds, setMinimizedIds] = useState<string[]>([]);
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
  
  // Keep track of scroll refs for each chat
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-scroll to bottom of chat windows when a new message is added or window opened
  useEffect(() => {
    openChatIds.forEach(id => {
      const el = scrollRefs.current[id];
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [openChatIds, groupChats]);

  if (openChatIds.length === 0) return null;

  const toggleMinimize = (id: string) => {
    setMinimizedIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleSendMessage = (groupId: string, e: React.FormEvent) => {
    e.preventDefault();
    const txt = chatInputs[groupId] || '';
    if (!txt.trim()) return;

    sendGroupMessage(groupId, txt.trim());
    setChatInputs(prev => ({ ...prev, [groupId]: '' }));

    // Scroll to bottom after message sent
    setTimeout(() => {
      const el = scrollRefs.current[groupId];
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  };

  return (
    <div className="fixed bottom-0 right-6 z-50 flex items-end gap-3.5 pointer-events-none select-none max-w-full">
      <AnimatePresence>
        {openChatIds.map((groupId, index) => {
          const chat = groupChats.find(c => c.groupId === groupId);
          if (!chat) return null;

          const isMinimized = minimizedIds.includes(groupId);
          const inputVal = chatInputs[groupId] || '';

          return (
            <motion.div
              key={groupId}
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
                onClick={() => toggleMinimize(groupId)}
                className="h-11 px-3 bg-blue-600 hover:bg-blue-700 dark:bg-slate-900 dark:hover:bg-slate-950 flex items-center justify-between text-white cursor-pointer select-none shrink-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white border border-white/20">
                      {chat.groupName.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-400 border border-blue-600 dark:border-slate-900 animate-pulse"></span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight truncate">{chat.groupName}</p>
                    <p className="text-[9px] text-blue-150 dark:text-gray-400 truncate leading-none">Active students</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pointer-events-auto" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => toggleMinimize(groupId)}
                    className="p-1 rounded-md hover:bg-white/15 dark:hover:bg-slate-800 transition-colors text-white/80 hover:text-white"
                    title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
                  >
                    {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                  </button>
                  <button 
                    onClick={() => closeChatWindow(groupId)}
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
                    ref={el => { scrollRefs.current[groupId] = el; }}
                    className="flex-1 p-3 overflow-y-auto space-y-3 bg-gray-50/50 dark:bg-slate-850/80 scrollbar-thin flex flex-col"
                  >
                    {/* Welcome message */}
                    <div className="text-center py-2 px-1 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-800/40 text-[10px] text-gray-400">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500 mx-auto mb-1" />
                      Welcome to the <span className="font-semibold text-gray-500 dark:text-gray-300">{chat.groupName}</span> discussion! Anyone here can contribute to resolving equations & homework problems.
                    </div>

                    {/* Messages list */}
                    {chat.messages.map(msg => {
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
                    })}
                  </div>

                  {/* Chat Message Input Footer */}
                  <form 
                    onSubmit={e => handleSendMessage(groupId, e)}
                    className="p-2 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-1.5 items-center shrink-0"
                  >
                    <input
                      type="text"
                      value={inputVal}
                      onChange={e => {
                        const val = e.target.value;
                        setChatInputs(prev => ({ ...prev, [groupId]: val }));
                      }}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-100 dark:bg-slate-900/60 text-xs text-gray-900 dark:text-white rounded-full px-3 py-2 border-none focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
                    />
                    <button 
                      type="submit"
                      disabled={!inputVal.trim()}
                      className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
