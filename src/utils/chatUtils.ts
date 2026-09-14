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
          messages: Array.isArray(chat.messages) ? [...chat.messages] : []
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

      // Merge messages from both chats uniquely
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

  // Messenger ordering: most recent conversation at top
  return entries.map(e => e.chat).sort((a, b) => {
    const lastMsgA = a.messages && a.messages.length > 0 ? a.messages[a.messages.length - 1].timestamp : a.lastUpdated;
    const lastMsgB = b.messages && b.messages.length > 0 ? b.messages[b.messages.length - 1].timestamp : b.lastUpdated;
    const timeA = new Date(lastMsgA || 0).getTime();
    const timeB = new Date(lastMsgB || 0).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });
};

/**
 * Format relative Messenger timestamp e.g. "Just now", "7m", "1h", "23h", "1d"
 */
export const formatMessengerTimestamp = (timestampStr?: string): string => {
  if (!timestampStr) return '';
  if (timestampStr === 'Just now') return 'Just now';
  
  const date = new Date(timestampStr);
  if (isNaN(date.getTime())) return timestampStr;

  const now = Date.now();
  const diffMinutes = Math.floor((now - date.getTime()) / (60 * 1000));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
