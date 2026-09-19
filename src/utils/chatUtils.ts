import { DirectChat, DirectMessage } from '../types';

/**
 * Checks if a chat is a placeholder, bot, or fake account to be deleted.
 * Purges:
 * - Phùng Gia Bình placeholder
 * - Sarah Jenkins fake account
 * - Bot 4 / test bot accounts
 */
export const isIgnoredOrBotChat = (chat: any, currentUserId?: string, currentUserName?: string): boolean => {
  if (!chat) return true;
  // Group chats created by users should never be filtered out as bot chat
  if (chat.isGroupChat) return false;
  const idLower = String(chat.id || '').toLowerCase();
  
  // Check banned IDs
  if (
    idLower.includes('phunggiabinh') || 
    idLower.includes('phung_gia_binh') || 
    idLower.includes('phung_binh') || 
    idLower.includes('tut_phunggiabinh') ||
    idLower.includes('sarah') ||
    idLower.includes('std_sarah') ||
    idLower.includes('u_sarah') ||
    idLower.includes('bot4') ||
    idLower.includes('bot_4') ||
    idLower.includes('u_david') ||
    idLower.includes('bot') ||
    idLower.includes('ban_quan_ly') ||
    idLower.includes('studybot') ||
    idLower.includes('system') ||
    idLower.includes('admin')
  ) {
    return true;
  }

  const participants = Array.isArray(chat.participants) ? chat.participants : [];
  if (participants.length === 0) return true;

  // Check if any participant is a banned/bot account
  const hasBannedParticipant = participants.some((p: any) => {
    const nameLower = String(p?.name || '').trim().toLowerCase();
    const pidLower = String(p?.id || '').trim().toLowerCase();
    const emailLower = String(p?.email || '').trim().toLowerCase();

    return (
      pidLower.includes('phunggiabinh') ||
      pidLower.includes('phung_binh') ||
      pidLower === 'tut_phunggiabinh' ||
      pidLower.includes('bot') ||
      nameLower.includes('bot') ||
      nameLower.includes('phùng gia binh') ||
      nameLower.includes('phung gia binh') ||
      nameLower.includes('phùng gia bình') ||
      nameLower.includes('gia binh') ||
      nameLower.includes('gia bình') ||
      // Sarah Jenkins fake account
      pidLower.includes('sarah') ||
      pidLower === 'std_sarah' ||
      pidLower === 'u_sarah' ||
      nameLower.includes('sarah') ||
      nameLower.includes('jenkins') ||
      emailLower.includes('sarah') ||
      // Bot & management test accounts
      pidLower === 'bot_4' ||
      pidLower === 'bot4' ||
      pidLower === 'u_david' ||
      nameLower === 'bot 4' ||
      nameLower === 'bot4' ||
      nameLower === 'david kim' ||
      nameLower.includes('ban quản lý') ||
      nameLower.includes('ban quan ly') ||
      nameLower.includes('studybook') ||
      nameLower.includes('mai lan') ||
      nameLower.includes('lucas') ||
      nameLower.includes('system')
    );
  });

  if (hasBannedParticipant) return true;

  // Check if all participants are just the current user (chat with self bug)
  const curIdLower = String(currentUserId || '').toLowerCase();
  const curNameLower = String(currentUserName || '').trim().toLowerCase();
  
  if (curIdLower || curNameLower) {
    const allSelf = participants.every((p: any) => {
      const pid = String(p?.id || '').toLowerCase();
      const pname = String(p?.name || '').trim().toLowerCase();
      return (curIdLower && pid === curIdLower) || (curNameLower && pname === curNameLower) || pid === 'u_current' || pid === 'guest';
    });
    if (allSelf) return true;
  }

  return false;
};

// Backwards compatibility alias
export const isPlaceholderBinhChat = (chat: any) => isIgnoredOrBotChat(chat);

/**
 * Checks if a tutor is a placeholder, bot, or fake account to be purged.
 */
export const isFakeOrBotTutor = (tutor: any): boolean => {
  if (!tutor) return true;
  const nameLower = String(tutor.name || '').trim().toLowerCase();
  const idLower = String(tutor.id || '').trim().toLowerCase();
  const bioLower = String(tutor.bio || '').trim().toLowerCase();

  return (
    nameLower.includes('phùng gia bỉnh') ||
    nameLower.includes('phùng gia bình') ||
    nameLower.includes('phung gia binh') ||
    nameLower.includes('gia bỉnh') ||
    nameLower.includes('gia bình') ||
    nameLower.includes('bot 4') ||
    nameLower.includes('bot4') ||
    nameLower.includes('physics guru') ||
    nameLower.includes('sarah') ||
    nameLower.includes('jenkins') ||
    nameLower.includes('david kim') ||
    nameLower.includes('ban quản lý') ||
    nameLower.includes('ban quan ly') ||
    nameLower.includes('studybook') ||
    nameLower.includes('mai lan') ||
    nameLower.includes('lucas') ||
    nameLower.includes('system') ||
    idLower.includes('phunggiabinh') ||
    idLower.includes('phung_gia_binh') ||
    idLower.includes('phung_binh') ||
    idLower.includes('tut_phunggiabinh') ||
    idLower.includes('bot4') ||
    idLower.includes('bot_4') ||
    idLower.includes('bot') ||
    idLower.includes('sarah') ||
    idLower.includes('david') ||
    idLower.includes('ban_quan_ly') ||
    nameLower.startsWith('bot ') ||
    nameLower === 'bot' ||
    nameLower.includes('bot') ||
    bioLower.includes('bot 4') ||
    bioLower.includes('physics guru')
  );
};

/**
 * Consolidates direct chats by canonical person identity.
 * Merges duplicate conversations with the exact same person, merges messages,
 * strips placeholder / bot / fake accounts, and sorts by newest activity.
 */
export const consolidateDirectChats = (
  rawChats: DirectChat[],
  currentUserId?: string,
  currentUserName?: string,
  onStaleDocFound?: (staleChatId: string) => void
): DirectChat[] => {
  if (!Array.isArray(rawChats)) return [];

  // 1. Remove all placeholder / bot / Sarah chats
  const filtered = rawChats.filter(c => !isIgnoredOrBotChat(c, currentUserId, currentUserName));

  const curIdLower = String(currentUserId || '').trim().toLowerCase();
  const curNameLower = String(currentUserName || '').trim().toLowerCase();

  // 2. Canonical list of merged chats
  interface CanonicalEntry {
    ids: Set<string>;
    emails: Set<string>;
    names: Set<string>;
    chat: DirectChat;
    otherParticipant: any;
  }

  const entries: CanonicalEntry[] = [];

  for (const chat of filtered) {
    if (!chat || !Array.isArray(chat.participants) || chat.participants.length === 0) continue;

    // Handle user-created group chats (not 1-on-1 DMs)
    if (chat.isGroupChat || (chat as any).groupName) {
      const existingGroupIndex = entries.findIndex(e => e.chat.id === chat.id);
      if (existingGroupIndex === -1) {
        entries.push({
          ids: new Set([chat.id]),
          emails: new Set(),
          names: new Set([chat.groupName || 'Group Chat']),
          chat: {
            ...chat,
            type: 'group_chat',
            participantIds: Array.isArray(chat.participants) ? chat.participants.map(p => p.id) : [],
            messages: Array.isArray(chat.messages) ? [...chat.messages] : []
          },
          otherParticipant: {
            id: chat.id,
            name: chat.groupName || 'Group Chat',
            avatar: chat.groupAvatar || ''
          }
        });
      } else {
        const target = entries[existingGroupIndex];
        const existingMsgSignatures = new Set(
          target.chat.messages.map(m => `${m.id}_${m.content}_${m.timestamp}`)
        );
        const incomingMsgs = Array.isArray(chat.messages) ? chat.messages : [];
        for (const msg of incomingMsgs) {
          const sig = `${msg.id}_${msg.content}_${msg.timestamp}`;
          if (!existingMsgSignatures.has(sig)) {
            target.chat.messages.push(msg);
            existingMsgSignatures.add(sig);
          }
        }
        const existingTime = new Date(target.chat.lastUpdated || 0).getTime();
        const thisTime = new Date(chat.lastUpdated || 0).getTime();
        if (thisTime > existingTime) {
          target.chat.lastUpdated = chat.lastUpdated;
        }
      }
      continue;
    }

    // STRICT PARTICIPANT ISOLATION:
    // For 1-on-1 individual direct messages, current user MUST be an explicit participant!
    const isCurrentUserParticipant = chat.participants.some(p => {
      const pId = String(p?.id || '').trim().toLowerCase();
      const pName = String(p?.name || '').trim().toLowerCase();
      return (
        (curIdLower && pId === curIdLower) || 
        (curNameLower && pName === curNameLower) || 
        pId === 'u_current' || 
        pId === 'guest'
      );
    });

    if (!isCurrentUserParticipant && currentUserId && curIdLower !== 'guest' && curIdLower !== 'u_current') {
      // The current user is NOT in this 1-on-1 private chat!
      // Strictly prevent private messages between two other users from leaking globally.
      continue;
    }

    // Find the OTHER person in this conversation
    let other = chat.participants.find(p => {
      const pId = String(p?.id || '').trim().toLowerCase();
      const pName = String(p?.name || '').trim().toLowerCase();
      const isCurrent = (curIdLower && pId === curIdLower) || 
                        (curNameLower && pName === curNameLower) || 
                        pId === 'u_current' || 
                        pId === 'guest';
      return !isCurrent;
    });

    if (!other) {
      // If only one participant exists and it's not the current user
      other = chat.participants[0];
    }

    if (!other) continue;

    const pId = String(other.id || '').trim().toLowerCase();
    const pName = String(other.name || '').trim().toLowerCase();
    const pEmail = String(other.email || '').trim().toLowerCase();

    // Helper: Verify if a direct message strictly belongs between current user and the peer
    const isStrictParticipantMessage = (m: DirectMessage): boolean => {
      if (!m) return false;
      const sId = String(m.senderId || '').trim().toLowerCase();
      const rId = String(m.receiverId || '').trim().toLowerCase();
      const curId = curIdLower || 'u_current';
      const otherId = pId;

      const isFromCurrent = sId === curId || sId === 'u_current' || sId === 'guest';
      const isFromOther = sId === otherId;

      if (isFromCurrent) {
        // Must be addressed to otherId or untargeted legacy
        return !rId || rId === otherId || rId === 'group';
      }
      if (isFromOther) {
        // Must be addressed to current user or untargeted legacy
        return !rId || rId === curId || rId === 'u_current' || rId === 'guest' || rId === 'group';
      }

      // Any message from a third party (e.g. "P" in a chat with Le Quy Duongz) is discarded
      return false;
    };

    // Check if this person is already in canonical entries
    const existingIndex = entries.findIndex(e => {
      // Match by ID
      if (pId && e.ids.has(pId)) return true;
      // Match by Email
      if (pEmail && e.emails.has(pEmail)) return true;
      // Match by exact Name (if at least 2 chars)
      if (pName && pName.length >= 2 && e.names.has(pName)) return true;
      return false;
    });

    const validInitialMessages = (Array.isArray(chat.messages) ? chat.messages : []).filter(isStrictParticipantMessage);

    if (existingIndex === -1) {
      // New conversation
      const ids = new Set<string>();
      const emails = new Set<string>();
      const names = new Set<string>();

      if (pId) ids.add(pId);
      if (pEmail) emails.add(pEmail);
      if (pName) names.add(pName);

      entries.push({
        ids,
        emails,
        names,
        chat: {
          ...chat,
          type: 'individual_dm',
          participantIds: [currentUserId || 'u_current', other.id].filter(Boolean),
          messages: validInitialMessages
        },
        otherParticipant: other
      });
    } else {
      // DUPLICATE CONVERSATION DETECTED FOR SAME PERSON!
      const target = entries[existingIndex];

      // Add alias identifiers
      if (pId) target.ids.add(pId);
      if (pEmail) target.emails.add(pEmail);
      if (pName) target.names.add(pName);

      // Enhance avatar or email if target was missing it
      if (other.avatar && !target.otherParticipant.avatar?.startsWith('http')) {
        target.otherParticipant.avatar = other.avatar;
      }
      if (other.email && !target.otherParticipant.email) {
        target.otherParticipant.email = other.email;
      }
      if (other.name && other.name.length > (target.otherParticipant.name?.length || 0)) {
        target.otherParticipant.name = other.name;
      }

      // Merge messages from both chats uniquely, strictly filtering to the two participants
      const existingMsgSignatures = new Set(
        target.chat.messages.map(m => `${m.id}_${m.content}_${m.timestamp}`)
      );

      for (const msg of validInitialMessages) {
        const sig = `${msg.id}_${msg.content}_${msg.timestamp}`;
        if (!existingMsgSignatures.has(sig)) {
          target.chat.messages.push(msg);
          existingMsgSignatures.add(sig);
        }
      }

      // Preserve newer timestamp
      const existingTime = new Date(target.chat.lastUpdated || 0).getTime();
      const thisTime = new Date(chat.lastUpdated || 0).getTime();
      if (thisTime > existingTime) {
        target.chat.lastUpdated = chat.lastUpdated;
      }

      // Sort messages chronologically
      target.chat.messages.sort((a, b) => {
        const tA = new Date(a.timestamp || 0).getTime();
        const tB = new Date(b.timestamp || 0).getTime();
        return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
      });

      // Cleanup duplicate document ID in Firestore if different
      if (chat.id !== target.chat.id && onStaleDocFound) {
        onStaleDocFound(chat.id);
      }
    }
  }

  // Messenger ordering: most recent incoming/outgoing conversation straight to top
  return entries.map(e => e.chat).sort((a, b) => {
    const timeA = getChatLatestActivityTime(a);
    const timeB = getChatLatestActivityTime(b);
    return timeB - timeA;
  });
};

/**
 * Extract latest incoming or outgoing timestamp in milliseconds for high-performance sorting
 */
export const getChatLatestActivityTime = (chat: DirectChat): number => {
  let highest = 0;
  if (chat.lastUpdated) {
    const lu = new Date(chat.lastUpdated).getTime();
    if (!isNaN(lu) && lu > highest) highest = lu;
  }
  if (Array.isArray(chat.messages) && chat.messages.length > 0) {
    const last = chat.messages[chat.messages.length - 1];
    const mt = getMessageTimestampNum(last.timestamp, chat.lastUpdated, last.createdAt);
    if (mt > highest) highest = mt;
  }
  return highest;
};

/**
 * High-performance list sorting comparison method:
 * Pinned conversations first (if applicable), then dynamically pushes the thread with the
 * most recent incoming/outgoing activity directly to the top of the column.
 */
export const compareChatsByRecentActivity = <T extends { timestampNum: number; isPinned?: boolean }>(
  a: T,
  b: T
): number => {
  const pinA = a.isPinned ? 1 : 0;
  const pinB = b.isPinned ? 1 : 0;
  if (pinA !== pinB) {
    return pinB - pinA;
  }
  return b.timestampNum - a.timestampNum;
};

/**
 * Convert any chat timestamp (ISO string, "Just now", "15:58", etc.) to timestamp in milliseconds
 */
export const getMessageTimestampNum = (timestampStr?: string, fallbackIso?: string, createdAt?: string): number => {
  let highest = 0;

  if (createdAt) {
    const ca = new Date(createdAt).getTime();
    if (!isNaN(ca) && ca > 0) highest = Math.max(highest, ca);
  }

  if (fallbackIso) {
    const fb = new Date(fallbackIso).getTime();
    if (!isNaN(fb) && fb > 0) highest = Math.max(highest, fb);
  }

  const str = (timestampStr || '').trim();
  if (str === 'Just now' || str === 'Vừa xong') {
    return Math.max(highest, Date.now());
  }

  if (str) {
    const t = new Date(str).getTime();
    if (!isNaN(t) && t > 0) {
      highest = Math.max(highest, t);
    } else {
      const timeMatch = str.match(/^(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        const d = new Date();
        d.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
        highest = Math.max(highest, d.getTime());
      }
    }
  }

  return highest;
};

/**
 * Format relative Messenger timestamp e.g. "16:32", "Yesterday", "Sep 15"
 * Consistently displays formatted clock time for today's messages matching group chat behavior.
 */
export const formatMessengerTimestamp = (timestampStr?: string, fallbackIso?: string, createdAt?: string): string => {
  const str = (timestampStr || '').trim();

  // If timestamp is already a valid HH:mm clock time (e.g. "16:32") and no explicit iso override
  if (/^\d{1,2}:\d{2}/.test(str) && !fallbackIso && !createdAt) {
    return str;
  }

  // Check candidate date strings in order of precision: createdAt -> fallbackIso -> timestampStr
  const candidate = createdAt || fallbackIso || (str !== 'Just now' && str !== 'Vừa xong' ? str : undefined);
  if (candidate) {
    const d = new Date(candidate);
    if (!isNaN(d.getTime()) && d.getTime() > 0) {
      const now = new Date();
      const isToday = now.toDateString() === d.toDateString();
      if (isToday) {
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      }

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (yesterday.toDateString() === d.toDateString()) {
        return 'Yesterday';
      }

      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  // If str is a formatted clock time
  if (/^\d{1,2}:\d{2}/.test(str)) {
    return str;
  }

  if (str === 'Just now' || str === 'Vừa xong') {
    return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  return str;
};

/**
 * Robust computation of a friend's last activity timestamp in milliseconds.
 * Factors in:
 * 1. Last direct chat message timestamp / chat.lastUpdated
 * 2. Explicit friend.lastActivityTime ISO string
 * 3. Online status (active within last 30s)
 * 4. friend.addedAt parsed or relative ('Just now' -> near real-time, 'Recently' -> recent)
 * 5. Posts authored by the friend in the academic feed
 * 6. Group chat messages contributed by the friend
 */
export const getFriendLastActivityTimestamp = (
  friend: any,
  directChats?: DirectChat[],
  posts?: any[],
  groupChats?: any[]
): number => {
  if (!friend) return 0;
  let latestTime = 0;

  // 1. Direct chats
  if (directChats && Array.isArray(directChats)) {
    const chat = directChats.find(c =>
      c.participants?.some(p =>
        (p.id && (p.id === friend.id || p.id === `u_${friend.id}`)) ||
        (friend.email && p.email && p.email.toLowerCase() === friend.email.toLowerCase()) ||
        (p.name && friend.name && p.name.trim().toLowerCase() === friend.name.trim().toLowerCase())
      )
    );

    if (chat) {
      if (chat.lastUpdated) {
        const t = new Date(chat.lastUpdated).getTime();
        if (!isNaN(t) && t > latestTime) latestTime = t;
      }
      if (Array.isArray(chat.messages) && chat.messages.length > 0) {
        const lastMsg = chat.messages[chat.messages.length - 1];
        const msgTime = getMessageTimestampNum(lastMsg?.timestamp, chat.lastUpdated, (lastMsg as any)?.createdAt);
        if (msgTime > latestTime) latestTime = msgTime;
      }
    }
  }

  // 2. Explicit friend.lastActivityTime
  if (friend.lastActivityTime) {
    const t = new Date(friend.lastActivityTime).getTime();
    if (!isNaN(t) && t > latestTime) latestTime = t;
  }

  // 3. Online status
  if (friend.isOnline) {
    latestTime = Math.max(latestTime, Date.now() - 30000);
  }

  // 4. Friend's addedAt timestamp
  if (friend.addedAt) {
    if (friend.addedAt === 'Just now' || friend.addedAt === 'Vừa xong') {
      latestTime = Math.max(latestTime, Date.now() - 60000);
    } else if (friend.addedAt === 'Recently' || friend.addedAt === 'Gần đây') {
      latestTime = Math.max(latestTime, Date.now() - 3600000);
    } else {
      const t = new Date(friend.addedAt).getTime();
      if (!isNaN(t) && t > latestTime) latestTime = t;
    }
  }

  // 5. Check posts authored by friend
  if (posts && Array.isArray(posts)) {
    for (const p of posts) {
      if (p.authorId === friend.id || p.user?.id === friend.id) {
        const pt = p.timestamp ? new Date(p.timestamp).getTime() : 0;
        if (!isNaN(pt) && pt > latestTime) latestTime = pt;
      }
    }
  }

  // 6. Check group chat activity by friend
  if (groupChats && Array.isArray(groupChats)) {
    for (const gc of groupChats) {
      if (Array.isArray(gc.messages)) {
        for (let i = gc.messages.length - 1; i >= 0; i--) {
          const m = gc.messages[i];
          if (m?.sender?.id === friend.id) {
            const mt = getMessageTimestampNum(m?.timestamp, gc.lastUpdated, m?.createdAt);
            if (mt > latestTime) {
              latestTime = mt;
              break;
            }
          }
        }
      }
    }
  }

  return latestTime;
};

/**
 * Sorts friends strictly based on last activity time (descending), respecting optional pinned chats.
 */
export const sortFriendsByLastActivity = (
  friendsList: any[],
  directChats?: DirectChat[],
  posts?: any[],
  groupChats?: any[],
  isChatPinnedFn?: (id: string) => boolean
): any[] => {
  if (!Array.isArray(friendsList)) return [];

  return [...friendsList].sort((a, b) => {
    if (isChatPinnedFn) {
      const aPinned = isChatPinnedFn(a.id) ? 1 : 0;
      const bPinned = isChatPinnedFn(b.id) ? 1 : 0;
      if (bPinned !== aPinned) {
        return bPinned - aPinned;
      }
    }
    const timeA = getFriendLastActivityTimestamp(a, directChats, posts, groupChats);
    const timeB = getFriendLastActivityTimestamp(b, directChats, posts, groupChats);
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return (a.name || '').localeCompare(b.name || '');
  });
};

/**
 * Checks if a marketplace listing is a fake or sample placeholder to be removed.
 */
export const isFakeMarketplaceItem = (item: any): boolean => {
  if (!item || !item.id) return true;
  const idLower = String(item.id || '').toLowerCase();
  
  // Check known placeholder IDs
  const fakeIds = [
    'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8',
    'm_1', 'm_2', 'm_3', 'm_4', 'm_5',
    'm_calc', 'm_book', 'm_ipad', 'm_notes', 'm_textbook', 'm_calculus',
    'mock_1', 'mock_2', 'mock_item', 'sample_1', 'sample_2', 'placeholder_1'
  ];
  if (fakeIds.includes(idLower)) return true;
  if (
    idLower.startsWith('mock_') || 
    idLower.startsWith('fake_') || 
    idLower.startsWith('placeholder_') || 
    idLower.startsWith('sample_')
  ) {
    return true;
  }

  const sellerNameLower = String(item.seller?.name || '').toLowerCase();
  const sellerIdLower = String(item.seller?.id || '').toLowerCase();

  // Banned bot/fake seller names
  if (
    sellerNameLower.includes('phung gia binh') ||
    sellerNameLower.includes('phùng gia bình') ||
    sellerNameLower.includes('sarah jenkins') ||
    sellerNameLower.includes('bot') ||
    sellerIdLower.includes('sarah') ||
    sellerIdLower.includes('phunggiabinh') ||
    sellerIdLower.includes('bot')
  ) {
    return true;
  }

  return false;
};

