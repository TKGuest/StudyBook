import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DirectChat, DirectMessage } from '../types';
import { consolidateDirectChats, formatMessengerTimestamp } from '../utils/chatUtils';
import { playSound } from '../utils/soundEffects';
import { SILHOUETTE_AVATAR } from '../data/mockData';
import { 
  Search, 
  Info, 
  Image as ImageIcon, 
  Smile, 
  ThumbsUp, 
  Send, 
  Plus, 
  X, 
  UserX, 
  ShieldAlert, 
  MessageSquare, 
  ArrowLeft,
  Lock,
  Sparkles,
  CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MessengerViewProps {
  initialChatId?: string;
}

export const MessengerView: React.FC<MessengerViewProps> = ({ initialChatId }) => {
  const { 
    directChats, 
    sendDirectMessage, 
    user, 
    friends, 
    openDirectChat,
    blockUser,
    unblockUser,
    isUserBlocked 
  } = useApp();

  // Deduplicate direct chats canonicalized by recipient
  const cleanChats = useMemo(() => {
    return consolidateDirectChats(directChats, user.id || 'u_current', user.name || '');
  }, [directChats, user.id, user.name]);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(() => {
    if (initialChatId && cleanChats.some(c => c.id === initialChatId)) {
      return initialChatId;
    }
    return cleanChats.length > 0 ? cleanChats[0].id : null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync selected chat if current selection becomes invalid
  useEffect(() => {
    if (cleanChats.length > 0) {
      if (!selectedChatId || !cleanChats.some(c => c.id === selectedChatId)) {
        setSelectedChatId(cleanChats[0].id);
      }
    } else {
      setSelectedChatId(null);
    }
  }, [cleanChats, selectedChatId]);

  const activeChat = useMemo(() => {
    return cleanChats.find(c => c.id === selectedChatId) || null;
  }, [cleanChats, selectedChatId]);

  // Target details for active DM
  const otherParticipant = useMemo(() => {
    if (!activeChat) return null;
    return activeChat.participants.find(p => p.id !== user.id && p.id !== 'u_current' && p.id !== 'guest') || 
           activeChat.participants.find(p => p.id !== user.id) || 
           activeChat.participants[0];
  }, [activeChat, user.id]);

  const isBlocked = otherParticipant ? isUserBlocked(otherParticipant.id) : false;

  // Filter conversations by search
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return cleanChats;
    const q = searchQuery.toLowerCase();
    return cleanChats.filter(chat => {
      const other = chat.participants.find(p => p.id !== user.id) || chat.participants[0];
      const matchName = other?.name?.toLowerCase().includes(q);
      const matchMsg = chat.messages.some(m => m.content.toLowerCase().includes(q));
      return matchName || matchMsg;
    });
  }, [cleanChats, searchQuery, user.id]);

  // Auto-scroll on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChat?.messages.length, selectedChatId]);

  const handleSend = (textToSend?: string) => {
    if (!activeChat) return;
    const content = (textToSend !== undefined ? textToSend : messageInput).trim();
    if (!content) return;

    sendDirectMessage(activeChat.id, content);
    setMessageInput('');
    setShowEmojiPicker(false);

    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleSendThumbsUp = () => {
    handleSend('👍');
    playSound('pop');
  };

  const quickEmojis = ['👍', '❤️', '😂', '🔥', '👏', '🎉', '📚', '💡', '✅', '🙏'];

  return (
    <div className="bg-white dark:bg-[#18191a] overflow-hidden flex flex-col h-full w-full flex-1 min-h-0 transition-colors">
      <div className="flex-1 flex overflow-hidden h-full w-full min-h-0">
        
        {/* LEFT COLUMN: Messenger Conversations List ("Chats") */}
        <div className={`w-full md:w-[340px] lg:w-[360px] h-full border-r border-gray-200 dark:border-[#2f3031] flex flex-col bg-white dark:bg-[#18191a] shrink-0 min-h-0 ${
          selectedChatId && 'hidden md:flex'
        }`}>
          {/* Header */}
          <div className="p-3.5 pb-2 border-b border-gray-150 dark:border-[#2f3031] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                Chats
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#0084ff]/10 text-[#0084ff] dark:bg-[#0084ff]/20">
                Messenger
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block animate-pulse" title="Active"></span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Online</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 pt-2.5">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search Messenger..."
                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-[#242526] hover:bg-gray-150 dark:hover:bg-[#303031] focus:bg-white dark:focus:bg-[#242526] text-gray-900 dark:text-white text-xs rounded-full border border-transparent focus:border-[#0084ff] outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-none no-scrollbar">
            {filteredChats.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2.5" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No conversations found</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  {searchQuery ? 'Try searching for a different name or keyword' : 'No messages yet. Connect with classmates to start chatting!'}
                </p>
              </div>
            ) : (
              filteredChats.map(chat => {
                const other = chat.participants.find(p => p.id !== user.id && p.id !== 'u_current' && p.id !== 'guest') || 
                              chat.participants.find(p => p.id !== user.id) || 
                              chat.participants[0];
                const isSelected = chat.id === selectedChatId;
                const lastMsg = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
                const isMe = lastMsg ? lastMsg.senderId === user.id : false;
                const timeText = lastMsg ? formatMessengerTimestamp(lastMsg.timestamp) : '';

                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      playSound('pop');
                      setSelectedChatId(chat.id);
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-gray-150 dark:bg-[#252728]' 
                        : 'hover:bg-gray-100 dark:hover:bg-[#202122]'
                    }`}
                  >
                    {/* Avatar with active green dot badge */}
                    <div className="relative shrink-0">
                      <img 
                        src={other?.avatar || SILHOUETTE_AVATAR} 
                        alt={other?.name || 'User'} 
                        className="h-12 w-12 rounded-full object-cover border border-gray-100 dark:border-[#2f3031]"
                      />
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white dark:border-[#18191a]"></span>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'
                        }`}>
                          {other?.name || 'Study Colleague'}
                        </p>
                        {timeText && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                            {timeText}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate leading-snug">
                          {lastMsg ? (
                            <>
                              {isMe && <span className="text-gray-600 dark:text-gray-300 font-medium">You: </span>}
                              {lastMsg.content === '👍' ? '👍 Sent a thumbs up' : lastMsg.content}
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic">Start conversation</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Panel */}
        <div className={`flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-[#18191a] relative ${
          !selectedChatId && 'hidden md:flex'
        }`}>
          {activeChat && otherParticipant ? (
            <>
              {/* Chat Top Header */}
              <div className="h-14 px-4 border-b border-gray-150 dark:border-[#2f3031] flex items-center justify-between shrink-0 bg-white/95 dark:bg-[#18191a]/95 backdrop-blur-xs z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back button on mobile */}
                  <button 
                    onClick={() => setSelectedChatId(null)}
                    className="md:hidden p-1.5 -ml-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252728] rounded-full cursor-pointer"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <div className="relative shrink-0">
                    <img 
                      src={otherParticipant.avatar || SILHOUETTE_AVATAR} 
                      alt={otherParticipant.name} 
                      className="h-10 w-10 rounded-full object-cover border border-gray-150 dark:border-[#2f3031]"
                    />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-[#18191a]"></span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5 leading-tight">
                      {otherParticipant.name}
                      {otherParticipant.role === 'tutor' && (
                        <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[9px] font-bold rounded">
                          Tutor
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                      Active now
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons (Info) */}
                <div className="flex items-center gap-1 text-[#0084ff]">
                  <button
                    onClick={() => setShowInfoSidebar(prev => !prev)}
                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#252728] transition-colors cursor-pointer ${
                      showInfoSidebar ? 'bg-gray-150 dark:bg-[#252728]' : ''
                    }`}
                    title="Conversation details"
                  >
                    <Info className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-2 bg-[#ffffff] dark:bg-[#18191a] scrollbar-none no-scrollbar flex flex-col">
                {/* Profile header card at the top of chat (Classic Messenger) */}
                <div className="text-center py-6 px-4 mb-2 flex flex-col items-center">
                  <div className="relative mb-3">
                    <img 
                      src={otherParticipant.avatar || SILHOUETTE_AVATAR} 
                      alt={otherParticipant.name} 
                      className="h-20 w-20 rounded-full object-cover border-2 border-gray-100 dark:border-[#2f3031] shadow-sm"
                    />
                    <span className="absolute bottom-0 right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-white dark:border-[#18191a]"></span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">
                    {otherParticipant.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    StudyBook Colleague · Joined StudyBook
                  </p>

                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#242526] text-[11px] text-gray-500 dark:text-gray-400 border border-gray-200/50 dark:border-[#2f3031]">
                    <Lock className="h-3 w-3 text-gray-400" />
                    <span>Messages are end-to-end secured and synced</span>
                  </div>
                </div>

                {isBlocked ? (
                  <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-center space-y-2 m-auto max-w-sm">
                    <ShieldAlert className="h-6 w-6 text-red-500 mx-auto" />
                    <p className="text-xs font-bold text-red-700 dark:text-red-300">You blocked {otherParticipant.name}</p>
                    <p className="text-[11px] text-red-600 dark:text-red-400 leading-relaxed">
                      Blocked accounts cannot send messages or view your posts.
                    </p>
                    <button
                      type="button"
                      onClick={() => unblockUser(otherParticipant.id)}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-all"
                    >
                      Unblock
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Messages stream */}
                    {activeChat.messages.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400 my-auto">
                        <Sparkles className="h-5 w-5 text-[#0084ff] mx-auto mb-1.5 opacity-80" />
                        Say hello to {otherParticipant.name} or send a 👍 to start chatting!
                      </div>
                    ) : (
                      activeChat.messages.map((msg, index) => {
                        const isMe = msg.senderId === user.id;
                        const isThumbsUp = msg.content === '👍';

                        return (
                          <div 
                            key={msg.id || index} 
                            className={`flex items-end gap-2 group max-w-[75%] ${
                              isMe ? 'self-end flex-row-reverse' : 'self-start'
                            }`}
                          >
                            {!isMe && (
                              <img 
                                src={msg.senderAvatar || otherParticipant.avatar || SILHOUETTE_AVATAR} 
                                alt={msg.senderName} 
                                className="h-7 w-7 rounded-full object-cover shrink-0 border border-gray-150 dark:border-[#2f3031] mb-0.5" 
                              />
                            )}

                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              {isThumbsUp ? (
                                <div className="p-1 hover:scale-110 transition-transform cursor-default" title={msg.timestamp}>
                                  <ThumbsUp className="h-9 w-9 text-[#0084ff] fill-[#0084ff]" />
                                </div>
                              ) : (
                                <div 
                                  className={`rounded-[18px] px-3.5 py-2 text-[13px] leading-relaxed break-words shadow-2xs ${
                                    isMe 
                                      ? 'bg-[#0084ff] text-white' 
                                      : 'bg-[#e4e6eb] dark:bg-[#3a3b3c] text-gray-900 dark:text-gray-100'
                                  }`}
                                >
                                  {msg.content}
                                </div>
                              )}

                              {/* Timestamp on hover */}
                              <span className="text-[9px] text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 px-1">
                                {msg.timestamp}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Bottom Messenger Input Bar */}
              {isBlocked ? (
                <div className="p-3 border-t border-gray-150 dark:border-[#2f3031] bg-gray-50 dark:bg-[#242526] text-center text-xs text-gray-400 font-medium">
                  Messaging is disabled for blocked accounts.
                </div>
              ) : (
                <div className="p-2.5 px-3 border-t border-gray-150 dark:border-[#2f3031] bg-white dark:bg-[#18191a] flex items-center gap-1.5 shrink-0 relative">
                  
                  {/* Left icons: Add, Image, Sticker */}
                  <div className="flex items-center gap-0.5 text-[#0084ff]">
                    <button 
                      type="button"
                      className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#252728] transition-colors cursor-pointer"
                      title="More options"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <button 
                      type="button"
                      className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#252728] transition-colors cursor-pointer"
                      title="Attach image"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowEmojiPicker(prev => !prev)}
                      className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#252728] transition-colors cursor-pointer ${
                        showEmojiPicker ? 'bg-gray-150 dark:bg-[#252728]' : ''
                      }`}
                      title="Choose emoji"
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Emoji Quick Bar Popup */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-14 left-10 p-2 bg-white dark:bg-[#242526] border border-gray-200 dark:border-[#3a3b3c] rounded-2xl shadow-xl flex items-center gap-1.5 z-20">
                      {quickEmojis.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setMessageInput(prev => prev + emoji);
                            inputRef.current?.focus();
                          }}
                          className="h-8 w-8 text-base hover:scale-125 transition-transform flex items-center justify-center cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-[#3a3b3c]"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Pill Input with "Aa" placeholder */}
                  <form 
                    onSubmit={e => { e.preventDefault(); handleSend(); }}
                    className="flex-1 flex items-center"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      placeholder="Aa"
                      className="w-full bg-[#f0f2f5] dark:bg-[#3a3b3c] text-gray-900 dark:text-white text-sm rounded-full px-4 py-2 border-none outline-none focus:ring-1 focus:ring-[#0084ff] placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </form>

                  {/* Right Button: Blue Thumbs Up if input empty, Send button if typed */}
                  {messageInput.trim() ? (
                    <button
                      type="button"
                      onClick={() => handleSend()}
                      className="p-2 text-[#0084ff] hover:text-[#0073e6] hover:bg-gray-100 dark:hover:bg-[#252728] rounded-full transition-colors cursor-pointer shrink-0"
                      title="Send message"
                    >
                      <Send className="h-5 w-5 fill-[#0084ff]" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendThumbsUp}
                      className="p-2 text-[#0084ff] hover:text-[#0073e6] hover:bg-gray-100 dark:hover:bg-[#252728] rounded-full transition-transform hover:scale-115 cursor-pointer shrink-0"
                      title="Send thumbs up"
                    >
                      <ThumbsUp className="h-5 w-5 fill-[#0084ff]" />
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-16 w-16 rounded-full bg-[#0084ff]/10 dark:bg-[#0084ff]/20 text-[#0084ff] flex items-center justify-center mb-3">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">Select a conversation to start messaging</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mt-1">
                Connect with friends, discuss study topics, and share notes directly on Messenger.
              </p>
            </div>
          )}

          {/* Right Info Drawer (when info button clicked) */}
          <AnimatePresence>
            {showInfoSidebar && otherParticipant && (
              <motion.div
                initial={{ x: 280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 280, opacity: 0 }}
                className="absolute top-0 right-0 bottom-0 w-72 bg-white dark:bg-[#242526] border-l border-gray-200 dark:border-[#2f3031] shadow-xl z-20 flex flex-col p-4 overflow-y-auto"
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-[#3a3b3c]">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Conversation Details</h4>
                  <button 
                    onClick={() => setShowInfoSidebar(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-col items-center py-6 border-b border-gray-150 dark:border-[#3a3b3c]">
                  <img 
                    src={otherParticipant.avatar || SILHOUETTE_AVATAR} 
                    alt={otherParticipant.name} 
                    className="h-16 w-16 rounded-full object-cover border border-gray-200 dark:border-[#3a3b3c] mb-2"
                  />
                  <p className="text-sm font-bold text-gray-900 dark:text-white text-center">{otherParticipant.name}</p>
                  <p className="text-xs text-green-500 font-medium mt-0.5">Active now</p>
                </div>

                <div className="py-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Options</p>
                  
                  <button
                    onClick={() => {
                      if (isBlocked) {
                        unblockUser(otherParticipant.id);
                      } else if (confirm(`Block ${otherParticipant.name}? They will no longer be able to message you.`)) {
                        blockUser(otherParticipant.id, otherParticipant.name, otherParticipant.avatar);
                      }
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <UserX className="h-4 w-4" />
                    <span>{isBlocked ? 'Unblock this user' : 'Block this user'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
