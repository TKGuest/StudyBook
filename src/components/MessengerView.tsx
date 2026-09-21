import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DirectChat, DirectMessage, StudyGroup, GroupChat, Message } from '../types';
import { consolidateDirectChats, formatMessengerTimestamp, getMessageTimestampNum, sortFriendsByLastActivity, compareChatsByRecentActivity, getChatLatestActivityTime } from '../utils/chatUtils';
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
  Users,
  ExternalLink,
  BookOpen,
  LogOut,
  UserCheck,
  UserPlus,
  Check,
  Pin,
  PinOff,
  Bell,
  BellOff,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatEmojiPicker } from './ChatEmojiPicker';

interface MessengerViewProps {
  initialChatId?: string;
}

type ConversationType = 'direct' | 'group';

interface UnifiedChat {
  id: string; // "dm_..." or "group_g_123"
  type: ConversationType;
  targetId: string;
  name: string;
  avatar: string;
  category?: string;
  memberCount?: number;
  lastMessageText: string;
  lastMessageSenderName?: string;
  lastMessageIsMe: boolean;
  timeText: string;
  timestampNum: number;
  isPinned?: boolean;
  unreadCount: number;
  hasUnread: boolean;
  directChat?: DirectChat;
  group?: StudyGroup;
  groupChat?: GroupChat;
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
    isUserBlocked,
    groups,
    groupChats,
    joinedGroupIds,
    posts,
    sendGroupMessage,
    toggleJoinGroup,
    setActiveTab,
    createGroupChat,
    pinnedChatIds,
    togglePinChat,
    isChatPinned,
    chatNotificationPrefs,
    toggleChatNotifications,
    areChatNotificationsEnabled,
    activeChatNotifications,
    dismissChatNotification,
    activeOpenChatId,
    setActiveOpenChatId,
    markChatAsRead,
    showConfirmModal
  } = useApp();

  const [filterTab, setFilterTab] = useState<'all' | 'direct' | 'groups'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pinToast, setPinToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const [notifToast, setNotifToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  const handleTogglePin = (chatId: string, alternateId?: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const res = togglePinChat(chatId, alternateId);
    if (!res.success) {
      setPinToast({ message: res.message || 'Maximum of 10 pinned chats reached', type: 'warning' });
    } else {
      setPinToast({ 
        message: res.isPinned ? 'Pinned conversation to top' : 'Unpinned conversation', 
        type: 'success' 
      });
    }
    setTimeout(() => {
      setPinToast(null);
    }, 3200);
  };

  // Group chat creation states (strictly with friends only)
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Deduplicate direct chats canonicalized by recipient
  const cleanDirectChats = useMemo(() => {
    return consolidateDirectChats(directChats, user.id || 'u_current', user.name || '');
  }, [directChats, user.id, user.name]);

  // 2. Direct chat unified items
  const directChatItems = useMemo<UnifiedChat[]>(() => {
    return cleanDirectChats.map(chat => {
      const isPinned = isChatPinned(chat.id);
      const unreadCount = (chat.messages || []).filter(m => m.senderId !== user.id && m.read === false).length;
      const hasUnread = unreadCount > 0;
      const timestampNum = getChatLatestActivityTime(chat);

      if (chat.isGroupChat) {
        const lastMsg = chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
        const isMe = lastMsg ? lastMsg.senderId === user.id : false;
        const timeText = lastMsg 
          ? formatMessengerTimestamp(lastMsg.timestamp, chat.lastUpdated, lastMsg.createdAt) 
          : (chat.lastUpdated ? formatMessengerTimestamp(chat.lastUpdated) : '');

        return {
          id: chat.id,
          type: 'direct',
          targetId: chat.id,
          name: chat.groupName || 'Group Chat',
          avatar: chat.groupAvatar || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=200',
          category: `Group Chat • ${chat.participants.length} friends`,
          memberCount: chat.participants.length,
          lastMessageText: lastMsg ? (lastMsg.content === '👍' ? '👍 Sent a thumbs up' : lastMsg.content) : 'Group chat created',
          lastMessageSenderName: lastMsg ? (isMe ? 'You' : lastMsg.senderName) : undefined,
          lastMessageIsMe: isMe,
          timeText,
          timestampNum,
          isPinned,
          unreadCount,
          hasUnread,
          directChat: chat
        };
      }

      const other = chat.participants.find(p => p.id !== user.id && p.id !== 'u_current' && p.id !== 'guest') || 
                    chat.participants.find(p => p.id !== user.id) || 
                    chat.participants[0];
      const lastMsg = chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
      const isMe = lastMsg ? lastMsg.senderId === user.id : false;
      const timeText = lastMsg 
        ? formatMessengerTimestamp(lastMsg.timestamp, chat.lastUpdated, lastMsg.createdAt) 
        : (chat.lastUpdated ? formatMessengerTimestamp(chat.lastUpdated) : '');
      const isPinnedDirect = isChatPinned(chat.id, other?.id);

      return {
        id: chat.id,
        type: 'direct',
        targetId: chat.id,
        name: other?.name || 'Study Colleague',
        avatar: other?.avatar || SILHOUETTE_AVATAR,
        lastMessageText: lastMsg ? (lastMsg.content === '👍' ? '👍 Sent a thumbs up' : lastMsg.content) : 'Start conversation',
        lastMessageSenderName: lastMsg ? (isMe ? 'You' : other?.name) : undefined,
        lastMessageIsMe: isMe,
        timeText,
        timestampNum,
        isPinned: isPinnedDirect,
        unreadCount,
        hasUnread,
        directChat: chat
      };
    });
  }, [cleanDirectChats, user.id, isChatPinned, pinnedChatIds]);

  // 3. Groups the user has joined unified items
  const joinedGroupChats = useMemo<UnifiedChat[]>(() => {
    const myGroups = (groups || []).filter(g => 
      joinedGroupIds.includes(g.id) || g.isMember || (Array.isArray(g.memberUserIds) && g.memberUserIds.includes(user.id))
    );

    return myGroups.map(g => {
      const chat = (groupChats || []).find(c => c.groupId === g.id);
      const validMessages = (chat?.messages || []).filter(m => {
        const sId = String(m?.sender?.id || '').toLowerCase();
        const sName = String(m?.sender?.name || '').toLowerCase();
        if (sId === 'system' || sId === 'bot' || sId === 'admin') return false;
        if (sName.includes('ban quản lý') || sName.includes('studybook') || sName.includes('bot') || sName.includes('mai lan') || sName.includes('lucas')) return false;
        return true;
      });

      const unreadCount = validMessages.filter(m => m.sender?.id !== user.id && (m as any).read === false).length;
      const hasUnread = unreadCount > 0;
      const lastMsg = validMessages.length > 0 ? validMessages[validMessages.length - 1] : null;
      const isMe = lastMsg ? (lastMsg.sender?.id === user.id) : false;
      const timeText = lastMsg 
        ? formatMessengerTimestamp(lastMsg.timestamp, chat?.lastUpdated, (lastMsg as any)?.createdAt) 
        : (chat?.lastUpdated ? formatMessengerTimestamp(chat.lastUpdated) : '');
      const timestampNum = Math.max(
        getMessageTimestampNum(lastMsg?.timestamp, chat?.lastUpdated, (lastMsg as any)?.createdAt),
        chat?.lastUpdated ? new Date(chat.lastUpdated).getTime() : 0
      );
      const isPinned = isChatPinned(`group_${g.id}`, g.id);

      return {
        id: `group_${g.id}`,
        type: 'group',
        targetId: g.id,
        name: g.name,
        avatar: g.coverImage || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600',
        category: g.category || 'Study Group',
        memberCount: g.memberCount || g.membersCount || 1,
        lastMessageText: lastMsg ? (lastMsg.content === '👍' ? '👍 Sent a thumbs up' : lastMsg.content) : 'Start group discussion',
        lastMessageSenderName: lastMsg ? (isMe ? 'You' : lastMsg.sender?.name) : undefined,
        lastMessageIsMe: isMe,
        timeText,
        timestampNum,
        isPinned,
        unreadCount,
        hasUnread,
        group: g,
        groupChat: chat ? { ...chat, messages: validMessages } : { groupId: g.id, groupName: g.name, messages: [] }
      };
    });
  }, [groups, joinedGroupIds, groupChats, user.id, isChatPinned, pinnedChatIds]);

  // Helper to sort chats: pinned items on top (up to 10), then most recent activity
  const sortUnifiedChats = (items: UnifiedChat[]): UnifiedChat[] => {
    return [...items].sort((a, b) => compareChatsByRecentActivity(a, b));
  };

  // 4. Combined conversation list
  const allConversations = useMemo(() => {
    const combined = [...directChatItems, ...joinedGroupChats];
    return sortUnifiedChats(combined);
  }, [directChatItems, joinedGroupChats, isChatPinned, pinnedChatIds]);

  // Filtered by tab and search
  const filteredConversations = useMemo(() => {
    let list = allConversations;
    if (filterTab === 'direct') {
      list = sortUnifiedChats(directChatItems);
    } else if (filterTab === 'groups') {
      const friendGroupChats = directChatItems.filter(c => c.directChat?.isGroupChat);
      list = sortUnifiedChats([...joinedGroupChats, ...friendGroupChats]);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(item => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchMsg = item.lastMessageText.toLowerCase().includes(q);
      const matchCat = item.category?.toLowerCase().includes(q);
      return matchName || matchMsg || matchCat;
    });
  }, [allConversations, directChatItems, joinedGroupChats, filterTab, searchQuery, isChatPinned, pinnedChatIds]);

  // Selection state
  const [selectedChatId, setSelectedChatId] = useState<string | null>(() => {
    if (initialChatId) {
      if (allConversations.some(c => c.id === initialChatId || c.targetId === initialChatId)) {
        return initialChatId;
      }
    }
    return allConversations.length > 0 ? allConversations[0].id : null;
  });

  // Keep selection synchronized
  useEffect(() => {
    if (allConversations.length > 0) {
      if (!selectedChatId || !allConversations.some(c => c.id === selectedChatId || c.targetId === selectedChatId)) {
        setSelectedChatId(allConversations[0].id);
      }
    } else {
      setSelectedChatId(null);
    }
  }, [allConversations, selectedChatId]);

  // Reset Condition: Clear counter to 0 the exact moment the user opens that specific chat box
  // Silent Suppression: Set activeOpenChatId so incoming messages while inside the chat don't trigger popups or counts
  useEffect(() => {
    if (selectedChatId) {
      markChatAsRead(selectedChatId);
      setActiveOpenChatId(selectedChatId);
    } else {
      setActiveOpenChatId(null);
    }
    return () => {
      setActiveOpenChatId(null);
    };
  }, [selectedChatId, markChatAsRead, setActiveOpenChatId]);

  const handleToggleNotifications = (chatId: string, alternateId?: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const target = alternateId || chatId;
    const nextState = toggleChatNotifications(target);
    setNotifToast({
      message: nextState ? 'Notifications enabled for this chat' : 'Notifications muted for this chat',
      type: 'success'
    });
    setTimeout(() => {
      setNotifToast(null);
    }, 3000);
  };

  const activeConversation = useMemo(() => {
    return allConversations.find(c => c.id === selectedChatId || c.targetId === selectedChatId) || null;
  }, [allConversations, selectedChatId]);

  const isPinnedActive = Boolean(activeConversation && isChatPinned(activeConversation.id, activeConversation.targetId));
  const isNotifActive = Boolean(
    activeConversation && 
    areChatNotificationsEnabled(activeConversation.id) && 
    areChatNotificationsEnabled(activeConversation.targetId)
  );

  const { pinnedChats, otherChats } = useMemo(() => {
    const pinned: UnifiedChat[] = [];
    const others: UnifiedChat[] = [];
    filteredConversations.forEach(item => {
      if (isChatPinned(item.id, item.targetId)) {
        pinned.push(item);
      } else {
        others.push(item);
      }
    });
    return { pinnedChats: pinned, otherChats: others };
  }, [filteredConversations, isChatPinned, pinnedChatIds]);

  // Details for Direct Chat or Group Chat if active
  const isGroupChat = Boolean(activeConversation?.directChat?.isGroupChat);

  const otherParticipant = useMemo(() => {
    if (!activeConversation || activeConversation.type !== 'direct' || !activeConversation.directChat) return null;
    const chat = activeConversation.directChat;
    if (chat.isGroupChat) return null;
    return chat.participants.find(p => p.id !== user.id && p.id !== 'u_current' && p.id !== 'guest') || 
           chat.participants.find(p => p.id !== user.id) || 
           chat.participants[0];
  }, [activeConversation, user.id]);

  const isBlocked = otherParticipant ? isUserBlocked(otherParticipant.id) : false;

  // Strict participant message isolation for private 1-on-1 direct messages
  const isolatedDirectMessages = useMemo(() => {
    if (!activeConversation?.directChat?.messages) return [];
    const msgs = activeConversation.directChat.messages;
    if (isGroupChat) return msgs;

    const currentUid = (user.id || 'u_current').toLowerCase();
    const peerUid = (otherParticipant?.id || '').toLowerCase();
    const peerName = (otherParticipant?.name || '').toLowerCase();

    return msgs.filter(msg => {
      const sId = String(msg.senderId || '').trim().toLowerCase();
      const rId = String(msg.receiverId || '').trim().toLowerCase();
      const sName = String(msg.senderName || '').trim().toLowerCase();

      const isFromMe = sId === currentUid || sId === 'u_current' || sId === 'guest';
      const isFromPeer = (peerUid && sId === peerUid) || (peerName && sName === peerName);

      if (isFromMe) {
        return !rId || (peerUid && rId === peerUid) || rId === 'group' || rId === 'unknown';
      }
      if (isFromPeer) {
        return !rId || rId === currentUid || rId === 'u_current' || rId === 'guest' || rId === 'group';
      }
      return false;
    });
  }, [activeConversation?.directChat?.messages, isGroupChat, user.id, otherParticipant?.id, otherParticipant?.name]);

  const filteredFriends = useMemo(() => {
    const sorted = sortFriendsByLastActivity(friends, cleanDirectChats, posts, groupChats);
    if (!friendSearch.trim()) return sorted;
    const q = friendSearch.toLowerCase();
    return sorted.filter(f => 
      f.name.toLowerCase().includes(q) || 
      (f.institution && f.institution.toLowerCase().includes(q))
    );
  }, [friends, friendSearch, cleanDirectChats, posts, groupChats]);

  const handleToggleFriendSelection = (friendId: string) => {
    setSelectedFriendIds(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const handleCreateGroupChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setCreateGroupError('Please enter a group chat name.');
      return;
    }
    if (selectedFriendIds.length === 0) {
      setCreateGroupError('Please select at least one friend to add to the group chat.');
      return;
    }

    try {
      setIsCreatingGroup(true);
      setCreateGroupError(null);
      const createdChat = await createGroupChat(newGroupName.trim(), selectedFriendIds);
      if (createdChat) {
        playSound('success');
        setSelectedChatId(createdChat.id);
        setShowNewGroupModal(false);
        setNewGroupName('');
        setSelectedFriendIds([]);
        setFriendSearch('');
      }
    } catch (err: any) {
      setCreateGroupError(err.message || 'Failed to create group chat');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Auto-scroll when messages update
  const messagesCount = activeConversation?.type === 'direct' 
    ? activeConversation.directChat?.messages.length 
    : activeConversation?.groupChat?.messages.length;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesCount, selectedChatId]);

  const handleSend = (textToSend?: string) => {
    if (!activeConversation) return;
    const content = (textToSend !== undefined ? textToSend : messageInput).trim();
    if (!content) return;

    if (activeConversation.type === 'direct' && activeConversation.directChat) {
      sendDirectMessage(activeConversation.directChat.id, content);
    } else if (activeConversation.type === 'group' && activeConversation.group) {
      sendGroupMessage(activeConversation.group.id, content);
    }

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

  const renderChatCard = (item: UnifiedChat, isPinnedItem: boolean) => {
    const isSelected = activeConversation?.id === item.id;

    return (
      <div
        key={item.id}
        onClick={() => {
          playSound('pop');
          setSelectedChatId(item.id);
          // Reset Condition: Clear counter to 0 the exact moment the user opens that specific chat box
          markChatAsRead(item.id);
          setActiveOpenChatId(item.id);
        }}
        className={`group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all relative ${
          isSelected 
            ? 'bg-gray-150 dark:bg-[#252728]' 
            : 'hover:bg-gray-100 dark:hover:bg-[#202122]'
        }`}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <img 
            src={item.avatar} 
            alt={item.name} 
            className={`h-12 w-12 object-cover border border-gray-100 dark:border-[#2f3031] ${
              item.type === 'group' || item.directChat?.isGroupChat ? 'rounded-2xl' : 'rounded-full'
            }`}
          />
          {item.type === 'direct' && !item.directChat?.isGroupChat ? (
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white dark:border-[#18191a]"></span>
          ) : (
            <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#0084ff] text-white border-2 border-white dark:border-[#18191a] flex items-center justify-center">
              <Users className="h-2.5 w-2.5" />
            </span>
          )}
          {isPinnedItem && (
            <span 
              className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs border border-white dark:border-[#18191a]" 
              title="Pinned conversation (always on top)"
            >
              <Pin className="h-2.5 w-2.5 fill-current" />
            </span>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className={`text-xs truncate ${
                item.hasUnread 
                  ? 'font-black text-gray-950 dark:text-white' 
                  : isSelected ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-800 dark:text-gray-200 font-medium'
              }`}>
                {item.name}
              </p>
              {isPinnedItem && (
                <Pin className="h-3 w-3 text-[#0084ff] fill-[#0084ff] shrink-0" />
              )}
              {(item.type === 'group' || item.directChat?.isGroupChat) && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-[#0084ff] dark:bg-blue-950/60 dark:text-blue-300 shrink-0">
                  {item.directChat?.isGroupChat ? 'Group Chat' : 'Group'}
                </span>
              )}
            </div>
            {item.timeText && (
              <span className={`text-[10px] shrink-0 ${
                item.hasUnread ? 'font-bold text-[#0084ff] dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {item.timeText}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-1.5">
            {/* Unread message styled using bold, brighter typography */}
            <p className={`text-[11px] truncate leading-snug flex-1 ${
              item.hasUnread 
                ? 'font-bold text-gray-950 dark:text-white' 
                : 'text-gray-500 dark:text-gray-400 font-normal'
            }`}>
              {item.lastMessageSenderName && !item.lastMessageIsMe ? (
                <span className={item.hasUnread ? 'font-black text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 font-medium'}>
                  {item.lastMessageSenderName}: 
                </span>
              ) : null}
              {item.lastMessageIsMe ? (
                <span className="text-gray-600 dark:text-gray-300 font-medium">You: </span>
              ) : null}
              <span className={item.lastMessageText === 'Start conversation' || item.lastMessageText === 'Start group discussion' ? 'italic text-gray-400 dark:text-gray-500 font-normal' : ''}>
                {item.lastMessageText}
              </span>
            </p>

            {/* Dynamic unread count badge */}
            {item.hasUnread && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#0084ff] text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                {item.unreadCount}
              </span>
            )}

            {/* Quick Pin/Unpin Action Button */}
            <button
              type="button"
              onClick={(e) => handleTogglePin(item.id, item.targetId, e)}
              className={`p-1 rounded-full transition-all shrink-0 cursor-pointer ${
                isPinnedItem
                  ? 'text-[#0084ff] hover:bg-blue-100 dark:hover:bg-blue-900/40 opacity-90 hover:opacity-100'
                  : 'text-gray-400 hover:text-[#0084ff] hover:bg-gray-200 dark:hover:bg-[#3a3b3c] opacity-0 group-hover:opacity-100'
              }`}
              title={isPinnedItem ? 'Unpin chat' : 'Pin to top (up to 10)'}
            >
              <Pin className={`h-3.5 w-3.5 ${isPinnedItem ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-[#18191a] overflow-hidden flex flex-col h-full w-full flex-1 min-h-0 transition-colors relative">
      {/* Pin action toast & notification toast */}
      <AnimatePresence>
        {pinToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 border backdrop-blur-md ${
              pinToast.type === 'warning'
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-[#0084ff] text-white border-blue-600'
            }`}
          >
            <Pin className="h-3.5 w-3.5 fill-current" />
            <span>{pinToast.message}</span>
            <button 
              onClick={() => setPinToast(null)}
              className="ml-1 p-0.5 hover:bg-white/20 rounded-full cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
        {notifToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 border backdrop-blur-md bg-gray-900/90 text-white border-gray-700"
          >
            <Bell className="h-3.5 w-3.5 text-blue-400 fill-current" />
            <span>{notifToast.message}</span>
            <button 
              onClick={() => setNotifToast(null)}
              className="ml-1 p-0.5 hover:bg-white/20 rounded-full cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCreateGroupError(null);
                  setShowNewGroupModal(true);
                }}
                className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#0084ff] transition-all flex items-center gap-1 text-xs font-bold cursor-pointer border border-blue-200/60 dark:border-blue-800/60"
                title="Create a new group chat with your friends"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Group</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 pt-2.5 space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search Messenger & Groups..."
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

            {/* Filter Pills: All / Direct / Groups */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                onClick={() => {
                  playSound('tab');
                  setFilterTab('all');
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'all'
                    ? 'bg-[#0084ff] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-[#242526] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2f3031]'
                }`}
              >
                <span>All</span>
                <span className={`text-[10px] px-1 rounded-full ${filterTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-[#303133] text-gray-600 dark:text-gray-300'}`}>
                  {allConversations.length}
                </span>
              </button>

              <button
                onClick={() => {
                  playSound('tab');
                  setFilterTab('direct');
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'direct'
                    ? 'bg-[#0084ff] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-[#242526] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2f3031]'
                }`}
              >
                <span>Direct</span>
                <span className={`text-[10px] px-1 rounded-full ${filterTab === 'direct' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-[#303133] text-gray-600 dark:text-gray-300'}`}>
                  {directChatItems.length}
                </span>
              </button>

              <button
                onClick={() => {
                  playSound('tab');
                  setFilterTab('groups');
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'groups'
                    ? 'bg-[#0084ff] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-[#242526] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2f3031]'
                }`}
              >
                <Users className="h-3 w-3" />
                <span>Groups</span>
                <span className={`text-[10px] px-1 rounded-full ${filterTab === 'groups' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-[#303133] text-gray-600 dark:text-gray-300'}`}>
                  {joinedGroupChats.length}
                </span>
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-none no-scrollbar">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                {filterTab === 'groups' ? (
                  <div className="space-y-3">
                    <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0084ff] flex items-center justify-center mx-auto">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-white">No joined study groups</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
                        Join groups from the Groups tab to participate in group discussions and revision chats.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('groups')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0084ff] hover:bg-[#0073e6] text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Browse Study Groups
                    </button>
                  </div>
                ) : (
                  <>
                    <MessageSquare className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2.5" />
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No conversations found</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                      {searchQuery ? 'Try searching for a different name or keyword' : 'No messages yet. Connect with classmates to start chatting!'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Pinned Conversations Section */}
                {pinnedChats.length > 0 && (
                  <div className="space-y-1 pb-1">
                    <div className="flex items-center justify-between px-2 pt-1 pb-0.5 text-[11px] font-bold text-[#0084ff] uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Pin className="h-3 w-3 fill-current" />
                        <span>Pinned ({pinnedChats.length}/10)</span>
                      </span>
                      <span className="text-[10px] lowercase font-medium text-gray-400 dark:text-gray-500">always on top</span>
                    </div>
                    {pinnedChats.map(item => renderChatCard(item, true))}
                  </div>
                )}

                {/* Other/All Conversations Section */}
                {otherChats.length > 0 && (
                  <div className="space-y-1">
                    {pinnedChats.length > 0 && (
                      <div className="flex items-center justify-between px-2 pt-2 pb-0.5 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        <span>Conversations</span>
                      </div>
                    )}
                    {otherChats.map(item => renderChatCard(item, false))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Panel */}
        <div className={`flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-[#18191a] relative ${
          !selectedChatId && 'hidden md:flex'
        }`}>
          {activeConversation ? (
            activeConversation.type === 'direct' && activeConversation.directChat && otherParticipant ? (
              /* ================= DIRECT CHAT VIEW ================= */
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

                    {isGroupChat ? (
                      <div className="relative shrink-0">
                        <img 
                          src={activeConversation.avatar} 
                          alt={activeConversation.name} 
                          className="h-10 w-10 rounded-2xl object-cover border border-gray-150 dark:border-[#2f3031]"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#0084ff] text-white border-2 border-white dark:border-[#18191a] flex items-center justify-center">
                          <Users className="h-2.5 w-2.5" />
                        </span>
                      </div>
                    ) : (
                      <div className="relative shrink-0">
                        <img 
                          src={otherParticipant?.avatar || SILHOUETTE_AVATAR} 
                          alt={otherParticipant?.name || activeConversation.name} 
                          className="h-10 w-10 rounded-full object-cover border border-gray-150 dark:border-[#2f3031]"
                        />
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-[#18191a]"></span>
                      </div>
                    )}

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5 leading-tight">
                        {isGroupChat ? activeConversation.name : (otherParticipant?.name || 'Classmate')}
                        {isGroupChat ? (
                          <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[9px] font-bold rounded">
                            Group Chat
                          </span>
                        ) : otherParticipant?.role === 'tutor' ? (
                          <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[9px] font-bold rounded">
                            Tutor
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-[11px] text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                        {isGroupChat ? `${activeConversation.directChat?.participants.length || 2} friends in chat` : 'Active now'}
                      </p>
                    </div>
                  </div>

                  {/* Header Action Buttons (Notifications, Pin, Info) */}
                  <div className="flex items-center gap-1 text-[#0084ff]">
                    {/* Turn on/off Notifications Toggle */}
                    <button
                      onClick={(e) => handleToggleNotifications(activeConversation.id, activeConversation.targetId, e)}
                      className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#252728] transition-colors cursor-pointer ${
                        isNotifActive ? 'text-[#0084ff] bg-blue-50 dark:bg-blue-950/40' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                      title={isNotifActive ? "Turn off notifications for this conversation" : "Turn on notifications for this conversation"}
                    >
                      {isNotifActive ? (
                        <Bell className="h-4.5 w-4.5 fill-current" />
                      ) : (
                        <BellOff className="h-4.5 w-4.5" />
                      )}
                    </button>

                    <button
                      onClick={(e) => handleTogglePin(activeConversation.id, activeConversation.targetId, e)}
                      className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#252728] transition-colors cursor-pointer ${
                        isPinnedActive ? 'text-[#0084ff] bg-blue-50 dark:bg-blue-950/40' : 'text-gray-500 hover:text-[#0084ff]'
                      }`}
                      title={isPinnedActive ? "Unpin conversation from top" : "Pin conversation to top (up to 10)"}
                    >
                      <Pin className={`h-4.5 w-4.5 ${isPinnedActive ? 'fill-current' : ''}`} />
                    </button>

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
                  {/* Profile header card at the top of chat */}
                  <div className="text-center py-6 px-4 mb-2 flex flex-col items-center">
                    <div className="relative mb-3">
                      <img 
                        src={isGroupChat ? activeConversation.avatar : (otherParticipant?.avatar || SILHOUETTE_AVATAR)} 
                        alt={isGroupChat ? activeConversation.name : (otherParticipant?.name || '')} 
                        className={`h-20 w-20 object-cover border-2 border-gray-100 dark:border-[#2f3031] shadow-xs ${
                          isGroupChat ? 'rounded-2xl' : 'rounded-full'
                        }`}
                      />
                      {isGroupChat ? (
                        <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#0084ff] text-white border-2 border-white dark:border-[#18191a] flex items-center justify-center">
                          <Users className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="absolute bottom-0 right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-white dark:border-[#18191a]"></span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      {isGroupChat ? activeConversation.name : (otherParticipant?.name || 'Classmate')}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {isGroupChat 
                        ? `StudyBook Group Chat · ${activeConversation.directChat?.participants.length || 0} friends` 
                        : 'StudyBook Colleague · Joined StudyBook'}
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
                      {isolatedDirectMessages.length === 0 ? (
                        <div className="text-center py-8 text-xs text-gray-400 my-auto">
                          <Sparkles className="h-5 w-5 text-[#0084ff] mx-auto mb-1.5 opacity-80" />
                          Say hello to {isGroupChat ? activeConversation.name : (otherParticipant?.name || 'your classmate')} or send a 👍 to start chatting!
                        </div>
                      ) : (
                        isolatedDirectMessages.map((msg, index) => {
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
                                  src={msg.senderAvatar || (otherParticipant?.avatar) || SILHOUETTE_AVATAR} 
                                  alt={msg.senderName} 
                                  className="h-7 w-7 rounded-full object-cover shrink-0 border border-gray-150 dark:border-[#2f3031] mb-0.5" 
                                />
                              )}

                              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                {isGroupChat && !isMe && (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium px-2 mb-0.5">
                                    {msg.senderName}
                                  </span>
                                )}
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
                        title="Attach file"
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

                    {/* Face & Human Figure Emoji Picker Popup */}
                    {showEmojiPicker && (
                      <ChatEmojiPicker
                        onSelectEmoji={(emoji) => {
                          setMessageInput(prev => prev + emoji);
                          inputRef.current?.focus();
                        }}
                        onClose={() => setShowEmojiPicker(false)}
                      />
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
            ) : activeConversation.type === 'group' && activeConversation.group ? (
              /* ================= GROUP CHAT VIEW ================= */
              <>
                {/* Group Top Header */}
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
                        src={activeConversation.avatar} 
                        alt={activeConversation.name} 
                        className="h-10 w-10 rounded-2xl object-cover border border-gray-150 dark:border-[#2f3031]"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#0084ff] text-white border-2 border-white dark:border-[#18191a] flex items-center justify-center">
                        <Users className="h-2.5 w-2.5" />
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                          {activeConversation.name}
                        </h3>
                        <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[9px] font-bold rounded shrink-0">
                          {activeConversation.category || 'Study Group'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                        <span>{activeConversation.memberCount} members</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Joined Cohort</span>
                      </p>
                    </div>
                  </div>

                  {/* Header Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Turn on/off Notifications for group */}
                    <button
                      onClick={(e) => handleToggleNotifications(activeConversation.id, activeConversation.targetId, e)}
                      className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#252728] transition-colors cursor-pointer ${
                        isNotifActive ? 'text-[#0084ff] bg-blue-50 dark:bg-blue-950/40' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                      title={isNotifActive ? "Turn off notifications for this study group" : "Turn on notifications for this study group"}
                    >
                      {isNotifActive ? (
                        <Bell className="h-4.5 w-4.5 fill-current" />
                      ) : (
                        <BellOff className="h-4.5 w-4.5" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        localStorage.setItem('sb_selected_group_id', activeConversation.group!.id);
                        setActiveTab('groups');
                      }}
                      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252728] transition-colors cursor-pointer border border-gray-200 dark:border-[#333537]"
                      title="Open Group Hub"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Group Hub</span>
                    </button>

                    <button
                      onClick={(e) => handleTogglePin(activeConversation.id, activeConversation.targetId, e)}
                      className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#252728] transition-colors cursor-pointer ${
                        isPinnedActive ? 'text-[#0084ff] bg-blue-50 dark:bg-blue-950/40' : 'text-gray-500 hover:text-[#0084ff]'
                      }`}
                      title={isPinnedActive ? "Unpin group chat from top" : "Pin group chat to top (up to 10)"}
                    >
                      <Pin className={`h-4.5 w-4.5 ${isPinnedActive ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={() => setShowInfoSidebar(prev => !prev)}
                      className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#252728] text-[#0084ff] transition-colors cursor-pointer ${
                        showInfoSidebar ? 'bg-gray-150 dark:bg-[#252728]' : ''
                      }`}
                      title="Group details"
                    >
                      <Info className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                {/* Group Messages Body */}
                <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-2.5 bg-[#ffffff] dark:bg-[#18191a] scrollbar-none no-scrollbar flex flex-col">
                  {/* Group Welcome card at top */}
                  <div className="text-center py-6 px-4 mb-2 flex flex-col items-center">
                    <div className="relative mb-3">
                      <img 
                        src={activeConversation.avatar} 
                        alt={activeConversation.name} 
                        className="h-20 w-20 rounded-2xl object-cover border-2 border-gray-100 dark:border-[#2f3031] shadow-xs"
                      />
                      <span className="absolute bottom-0 right-0 p-1 rounded-full bg-[#0084ff] text-white border-2 border-white dark:border-[#18191a]">
                        <Users className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      {activeConversation.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                      {activeConversation.group.description || 'Welcome to your collaborative study group chat!'}
                    </p>

                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[11px] text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>You are a member of this study group</span>
                    </div>
                  </div>

                  {/* Messages stream */}
                  {!activeConversation.groupChat?.messages || activeConversation.groupChat.messages.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400 my-auto">
                      <Sparkles className="h-5 w-5 text-[#0084ff] mx-auto mb-1.5 opacity-80" />
                      No messages yet in this study cohort. Ask a question or send a 👍 to start collaborating!
                    </div>
                  ) : (
                    activeConversation.groupChat.messages.map((msg, index) => {
                      const isMe = msg.sender?.id === user.id;
                      const isThumbsUp = msg.content === '👍';

                      return (
                        <div 
                          key={msg.id || index} 
                          className={`flex items-end gap-2 group max-w-[78%] ${
                            isMe ? 'self-end flex-row-reverse' : 'self-start'
                          }`}
                        >
                          {!isMe && (
                            <img 
                              src={msg.sender?.avatar || SILHOUETTE_AVATAR} 
                              alt={msg.sender?.name || 'User'} 
                              className="h-7 w-7 rounded-full object-cover shrink-0 border border-gray-150 dark:border-[#2f3031] mb-0.5" 
                            />
                          )}

                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {/* Sender Name above message bubble for other group members */}
                            {!isMe && (
                              <div className="flex items-center gap-1 px-1 mb-0.5">
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                  {msg.sender?.name || 'Cohort Member'}
                                </span>
                                {msg.sender?.role === 'tutor' && (
                                  <span className="px-1 py-0 text-[8px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 rounded">
                                    Tutor
                                  </span>
                                )}
                              </div>
                            )}

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
                </div>

                {/* Bottom Messenger Input Bar for Group */}
                <div className="p-2.5 px-3 border-t border-gray-150 dark:border-[#2f3031] bg-white dark:bg-[#18191a] flex items-center gap-1.5 shrink-0 relative">
                  {/* Left icons */}
                  <div className="flex items-center gap-0.5 text-[#0084ff]">
                    <button 
                      type="button"
                      className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#252728] transition-colors cursor-pointer"
                      title="Attach note or resource"
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

                  {/* Face & Human Figure Emoji Picker Popup */}
                  {showEmojiPicker && (
                    <ChatEmojiPicker
                      onSelectEmoji={(emoji) => {
                        setMessageInput(prev => prev + emoji);
                        inputRef.current?.focus();
                      }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  )}

                  {/* Input form */}
                  <form 
                    onSubmit={e => { e.preventDefault(); handleSend(); }}
                    className="flex-1 flex items-center"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      placeholder={`Message ${activeConversation.name}...`}
                      className="w-full bg-[#f0f2f5] dark:bg-[#3a3b3c] text-gray-900 dark:text-white text-sm rounded-full px-4 py-2 border-none outline-none focus:ring-1 focus:ring-[#0084ff] placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </form>

                  {/* Send / Thumbs Up button */}
                  {messageInput.trim() ? (
                    <button
                      type="button"
                      onClick={() => handleSend()}
                      className="p-2 text-[#0084ff] hover:text-[#0073e6] hover:bg-gray-100 dark:hover:bg-[#252728] rounded-full transition-colors cursor-pointer shrink-0"
                      title="Send message to group"
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
              </>
            ) : null
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-16 w-16 rounded-full bg-[#0084ff]/10 dark:bg-[#0084ff]/20 text-[#0084ff] flex items-center justify-center mb-3">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">Select a conversation to start messaging</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mt-1">
                Connect with classmates, join study group discussions, and share academic notes seamlessly on Messenger.
              </p>
            </div>
          )}

          {/* Right Info Drawer */}
          <AnimatePresence>
            {showInfoSidebar && activeConversation && (
              <motion.div
                initial={{ x: 280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 280, opacity: 0 }}
                className="absolute top-0 right-0 bottom-0 w-72 bg-white dark:bg-[#242526] border-l border-gray-200 dark:border-[#2f3031] shadow-xl z-20 flex flex-col p-4 overflow-y-auto"
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-[#3a3b3c]">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {activeConversation.type === 'group' ? 'Group Details' : 'Conversation Details'}
                  </h4>
                  <button 
                    onClick={() => setShowInfoSidebar(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Pin conversation toggle card */}
                <div className="mt-3 p-2.5 rounded-xl bg-gray-50 dark:bg-[#2a2b2c] border border-gray-150 dark:border-[#3a3b3c] flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isPinnedActive ? 'bg-[#0084ff] text-white' : 'bg-gray-200 dark:bg-[#3a3b3c] text-gray-500'}`}>
                      <Pin className={`h-3.5 w-3.5 ${isPinnedActive ? 'fill-current' : ''}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {isPinnedActive ? 'Pinned to top' : 'Pin conversation'}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {pinnedChatIds.length}/10 pinned
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleTogglePin(activeConversation.id, activeConversation.targetId, e)}
                    className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                      isPinnedActive 
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-[#0084ff] hover:bg-blue-200' 
                        : 'bg-gray-200 dark:bg-[#3a3b3c] text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#4a4b4c]'
                    }`}
                  >
                    {isPinnedActive ? 'Unpin' : 'Pin'}
                  </button>
                </div>

                {/* Turn on Notifications Card */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-[#2a2b2c] border border-gray-150 dark:border-[#3a3b3c] flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isNotifActive ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-[#3a3b3c] text-gray-500'}`}>
                      {isNotifActive ? <Bell className="h-3.5 w-3.5 fill-current" /> : <BellOff className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                        Notifications
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {isNotifActive ? 'Crisp sound & popups on' : 'Muted'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleToggleNotifications(activeConversation.id, activeConversation.targetId, e)}
                    className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                      isNotifActive 
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-[#0084ff] hover:bg-blue-200' 
                        : 'bg-gray-200 dark:bg-[#3a3b3c] text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#4a4b4c]'
                    }`}
                  >
                    {isNotifActive ? 'Turn Off' : 'Turn On'}
                  </button>
                </div>

                {isGroupChat ? (
                  <>
                    <div className="flex flex-col items-center py-6 border-b border-gray-150 dark:border-[#3a3b3c]">
                      <img 
                        src={activeConversation.avatar} 
                        alt={activeConversation.name} 
                        className="h-16 w-16 rounded-2xl object-cover border border-gray-200 dark:border-[#3a3b3c] mb-2"
                      />
                      <p className="text-sm font-bold text-gray-900 dark:text-white text-center">{activeConversation.name}</p>
                      <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        Group Chat
                      </span>
                      <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{activeConversation.directChat?.participants.length || 0} friends</span>
                      </p>
                    </div>

                    <div className="py-4 space-y-3">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Group Chat Members</p>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {activeConversation.directChat?.participants.map(p => (
                          <div key={p.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#303132] transition-colors">
                            <img 
                              src={p.avatar || SILHOUETTE_AVATAR} 
                              alt={p.name} 
                              className="h-7 w-7 rounded-full object-cover border border-gray-200 dark:border-[#3a3b3c]" 
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                {p.name} {p.id === user.id ? '(You)' : ''}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate">
                                {p.id === user.id ? 'Creator' : 'Friend'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : activeConversation.type === 'direct' && otherParticipant ? (
                  <>
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
                          } else {
                            showConfirmModal({
                              title: `Block ${otherParticipant.name}?`,
                              message: `${otherParticipant.name} will no longer be able to message you or view your posts.`,
                              confirmText: 'Block User',
                              variant: 'danger',
                              icon: 'userX',
                              onConfirm: () => blockUser(otherParticipant.id, otherParticipant.name, otherParticipant.avatar)
                            });
                          }
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <UserX className="h-4 w-4" />
                        <span>{isBlocked ? 'Unblock this user' : 'Block this user'}</span>
                      </button>
                    </div>
                  </>
                ) : activeConversation.type === 'group' && activeConversation.group ? (
                  <>
                    <div className="flex flex-col items-center py-6 border-b border-gray-150 dark:border-[#3a3b3c]">
                      <img 
                        src={activeConversation.avatar} 
                        alt={activeConversation.name} 
                        className="h-16 w-16 rounded-2xl object-cover border border-gray-200 dark:border-[#3a3b3c] mb-2"
                      />
                      <p className="text-sm font-bold text-gray-900 dark:text-white text-center">{activeConversation.name}</p>
                      <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {activeConversation.category || 'Study Group'}
                      </span>
                      <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{activeConversation.memberCount} active learners</span>
                      </p>
                    </div>

                    <div className="py-4 space-y-3">
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Description</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                          {activeConversation.group.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="pt-2 space-y-2 border-t border-gray-150 dark:border-[#3a3b3c]">
                        <button
                          onClick={() => {
                            localStorage.setItem('sb_selected_group_id', activeConversation.group!.id);
                            setActiveTab('groups');
                          }}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#303133] text-gray-700 dark:text-gray-200 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <BookOpen className="h-4 w-4 text-[#0084ff]" />
                          <span>Open Study Group Hub</span>
                        </button>

                        <button
                          onClick={() => {
                            showConfirmModal({
                              title: `Leave "${activeConversation.name}"?`,
                              message: 'You will be removed from this chat and study cohort discussions.',
                              confirmText: 'Leave Group',
                              variant: 'danger',
                              icon: 'alert',
                              onConfirm: () => {
                                toggleJoinGroup(activeConversation.group!.id);
                                setShowInfoSidebar(false);
                              }
                            });
                          }}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Leave Group</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Create Group Chat Modal (Friends Only) */}
          {showNewGroupModal && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
              onClick={() => setShowNewGroupModal(false)}
            >
              <div 
                className="bg-white dark:bg-[#242526] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#3a3b3c] w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-4 border-b border-gray-150 dark:border-[#3a3b3c] flex items-center justify-between bg-gray-50/60 dark:bg-[#1e1f20]/60">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#0084ff] flex items-center justify-center">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Create Group Chat</h3>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Add friends to start chatting together</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewGroupModal(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleCreateGroupChat} className="p-4 space-y-4">
                  {createGroupError && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-900/60 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                      <span>{createGroupError}</span>
                    </div>
                  )}

                  {/* Group Name input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Group Chat Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      placeholder="e.g. Biology Study Group, Math Project..."
                      className="w-full px-3 py-2 text-xs bg-gray-100 dark:bg-[#3a3b3c] text-gray-900 dark:text-white rounded-xl border border-gray-300 dark:border-transparent focus:border-[#0084ff] outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Selected friends chips */}
                  {selectedFriendIds.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        <span>Selected ({selectedFriendIds.length})</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFriendIds([])}
                          className="text-[#0084ff] hover:underline"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-gray-50 dark:bg-[#18191a] rounded-xl border border-gray-150 dark:border-[#333]">
                        {selectedFriendIds.map(fid => {
                          const f = friends.find(item => item.id === fid);
                          if (!f) return null;
                          return (
                            <span 
                              key={fid} 
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[11px] font-semibold rounded-full border border-blue-200 dark:border-blue-900"
                            >
                              <img src={f.avatar || SILHOUETTE_AVATAR} alt={f.name} className="h-3.5 w-3.5 rounded-full object-cover" />
                              <span className="max-w-[90px] truncate">{f.name}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleFriendSelection(fid)}
                                className="hover:text-red-500 ml-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Friend Search and Checklist */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <UserPlus className="h-3.5 w-3.5 text-[#0084ff]" />
                        <span>Add Friends (Friends only)</span>
                      </label>
                      <span className="text-[10px] text-gray-400">{friends.length} available</span>
                    </div>

                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={friendSearch}
                        onChange={e => setFriendSearch(e.target.value)}
                        placeholder="Search your friends..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 dark:bg-[#3a3b3c] text-gray-900 dark:text-white rounded-lg border border-transparent focus:border-[#0084ff] outline-none"
                      />
                    </div>

                    {/* Friends list */}
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-[#333] border border-gray-200 dark:border-[#3a3b3c] rounded-xl">
                      {friends.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">
                          <p className="font-semibold text-gray-600 dark:text-gray-300">No friends added yet</p>
                          <p className="text-[11px] mt-1">You must be friends with someone to add them to a group chat.</p>
                        </div>
                      ) : filteredFriends.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">
                          No friends match "{friendSearch}"
                        </div>
                      ) : (
                        filteredFriends.map(f => {
                          const isSelected = selectedFriendIds.includes(f.id);
                          return (
                            <div
                              key={f.id}
                              onClick={() => handleToggleFriendSelection(f.id)}
                              className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-blue-50/70 dark:bg-blue-950/40' 
                                  : 'hover:bg-gray-50 dark:hover:bg-[#2d2e2f]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img 
                                  src={f.avatar || SILHOUETTE_AVATAR} 
                                  alt={f.name} 
                                  className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-[#3a3b3c]"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                    {f.name}
                                  </p>
                                  <p className="text-[10px] text-gray-400 truncate">
                                    {f.institution || f.grade || 'Friend'}
                                  </p>
                                </div>
                              </div>
                              <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-[#0084ff] border-[#0084ff] text-white' 
                                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#333]'
                              }`}>
                                {isSelected && <Check className="h-3.5 w-3.5" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-150 dark:border-[#3a3b3c]">
                    <button
                      type="button"
                      onClick={() => setShowNewGroupModal(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingGroup || !newGroupName.trim() || selectedFriendIds.length === 0}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-[#0084ff] hover:bg-[#0073e6] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                    >
                      {isCreatingGroup ? (
                        <span>Creating...</span>
                      ) : (
                        <>
                          <Users className="h-3.5 w-3.5" />
                          <span>Create Group ({selectedFriendIds.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

