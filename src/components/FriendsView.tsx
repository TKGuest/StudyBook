import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  MessageSquare, 
  UserPlus, 
  Clock, 
  Search, 
  Check, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  Mail, 
  Send, 
  UserCheck
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';
import { SILHOUETTE_AVATAR } from '../data/mockData';
import { MessengerView } from './MessengerView';

export const FriendsView: React.FC = () => {
  const { 
    friends, 
    friendRequests, 
    sendFriendRequest, 
    acceptFriendRequest, 
    declineFriendRequest, 
    getFriendshipStatus,
    openDirectChat,
    openUserProfile,
    tutors,
    posts,
    user 
  } = useApp();

  // Vertical navigation: only keeping Messenger by combining Requests and Find Friends into it
  const [activeNav, setActiveNav] = useState<'chats' | 'requests' | 'find'>('chats');
  const [addFriendInput, setAddFriendInput] = useState('');
  const [findSearchQuery, setFindSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filter pending received and sent requests
  const pendingReceived = useMemo(() => {
    return friendRequests.filter(r => r.receiverId === user.id && r.status === 'pending');
  }, [friendRequests, user.id]);

  const pendingSent = useMemo(() => {
    return friendRequests.filter(r => r.senderId === user.id && r.status === 'pending');
  }, [friendRequests, user.id]);

  // Discover potential friends from tutors and post authors, strictly filtering out bot/fake accounts
  const potentialPeople = useMemo(() => {
    const list: Array<{ id: string; name: string; avatar: string; role?: string; institution?: string; email?: string }> = [];

    const isBanned = (name?: string, id?: string) => {
      const n = (name || '').toLowerCase();
      const i = (id || '').toLowerCase();
      return (
        n.includes('phung') ||
        n.includes('sarah') ||
        n.includes('jenkins') ||
        n.includes('david kim') ||
        n.includes('bot') ||
        n.includes('ban quản lý') ||
        n.includes('ban quan ly') ||
        n.includes('studybook') ||
        n.includes('mai lan') ||
        n.includes('lucas') ||
        n.includes('system') ||
        i.includes('phunggiabinh') ||
        i.includes('sarah') ||
        i.includes('std_sarah') ||
        i.includes('u_sarah') ||
        i.includes('u_david') ||
        i.includes('bot') ||
        i.includes('ban_quan_ly')
      );
    };

    // Add verified tutors
    tutors.forEach(t => {
      if (t.id !== user.id && !isBanned(t.name, t.id)) {
        list.push({
          id: t.id,
          name: t.name,
          avatar: t.avatar,
          role: 'tutor',
          institution: t.subjects && t.subjects[0] ? `${t.subjects[0]} Educator` : 'Verified Tutor',
          email: `${t.name.toLowerCase().replace(/\s+/g, '')}@studybook.edu`
        });
      }
    });

    // Add active post authors
    posts.forEach(p => {
      if (p.user && p.user.id !== user.id && !p.isAnonymous && !list.some(item => item.id === p.user.id)) {
        if (!isBanned(p.user.name, p.user.id)) {
          list.push({
            id: p.user.id,
            name: p.user.name,
            avatar: p.user.avatar,
            role: p.user.role || 'student',
            institution: p.user.role === 'tutor' ? 'Tutor' : 'Student',
            email: `${p.user.name.toLowerCase().replace(/\s+/g, '')}@studybook.edu`
          });
        }
      }
    });

    return list;
  }, [tutors, posts, user.id]);

  const filteredPeopleToConnect = useMemo(() => {
    if (!findSearchQuery.trim()) return potentialPeople;
    const q = findSearchQuery.toLowerCase();
    return potentialPeople.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.institution && p.institution.toLowerCase().includes(q))
    );
  }, [potentialPeople, findSearchQuery]);

  const handleSendRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFriendInput.trim()) return;

    const query = addFriendInput.trim().toLowerCase();
    
    // Find matching person or construct request
    const matchedPerson = potentialPeople.find(p => p.name.toLowerCase() === query || (p.email && p.email.toLowerCase() === query));

    const target = matchedPerson ? matchedPerson : {
      id: `u_${Math.random().toString(36).substring(2, 8)}`,
      name: addFriendInput.trim(),
      avatar: SILHOUETTE_AVATAR,
      email: addFriendInput.includes('@') ? addFriendInput.trim() : `${addFriendInput.toLowerCase().replace(/\s+/g, '')}@studybook.edu`
    };

    await sendFriendRequest(target);
    setAddFriendInput('');
    setFeedbackMessage(`Friend request sent to ${target.name}!`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  return (
    <div className="w-full h-full flex-1 bg-white dark:bg-[#18191a] flex overflow-hidden min-h-0">
      {/* VERTICAL NAVIGATION BAR */}
      <div className="w-16 md:w-56 shrink-0 h-full bg-gray-50/90 dark:bg-[#202122] border-r border-gray-200 dark:border-[#2f3031] flex flex-col justify-between p-2 md:p-3 min-h-0">
        {/* Top: Section Header & Nav Buttons */}
        <div className="space-y-4">
          <div className="px-2 pt-2 hidden md:block">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#0084ff]" />
              Messenger
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Chats & Friends
            </p>
          </div>

          <nav className="space-y-1">
            {/* 1. Messenger (Chats & Friends) */}
            <button
              onClick={() => {
                playSound('tab');
                setActiveNav('chats');
              }}
              title="Chats (Messenger)"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeNav === 'chats'
                  ? 'bg-white dark:bg-[#2b2d2e] text-[#0084ff] shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#28292a] hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <MessageSquare className="h-5 w-5" />
              </div>
              <span className="hidden md:inline truncate">Chats</span>
            </button>

            {/* 2. Requests (Combined into Messenger) */}
            <button
              onClick={() => {
                playSound('tab');
                setActiveNav('requests');
              }}
              title="Friend Requests"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeNav === 'requests'
                  ? 'bg-white dark:bg-[#2b2d2e] text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#28292a] hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                  {pendingReceived.length > 0 && (
                    <span className="md:hidden absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border border-white dark:border-[#202122]"></span>
                  )}
                </div>
                <span className="hidden md:inline truncate">Friend Requests</span>
              </div>
              {pendingReceived.length > 0 && (
                <span className="hidden md:flex h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold items-center justify-center">
                  {pendingReceived.length}
                </span>
              )}
            </button>

            {/* 3. Find Friends (Combined into Messenger) */}
            <button
              onClick={() => {
                playSound('tab');
                setActiveNav('find');
              }}
              title="Find Friends"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeNav === 'find'
                  ? 'bg-white dark:bg-[#2b2d2e] text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#28292a] hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <UserPlus className="h-5 w-5" />
              </div>
              <span className="hidden md:inline truncate">Find Friends</span>
            </button>
          </nav>
        </div>

        {/* Bottom User Badge */}
        <div className="pt-2 border-t border-gray-200 dark:border-[#2f3031] flex items-center gap-2.5 px-1">
          <img 
            src={user.avatar || SILHOUETTE_AVATAR} 
            alt={user.name || 'User'} 
            className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-[#2f3031] shrink-0" 
          />
          <div className="hidden md:block min-w-0">
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{user.name || 'Student'}</p>
            <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
              Online
            </p>
          </div>
        </div>
      </div>

      {/* MAIN VIEW CONTENT AREA */}
      <div className="flex-1 min-w-0 h-full w-full overflow-hidden flex flex-col bg-white dark:bg-[#18191a] min-h-0">
        {feedbackMessage && (
          <div className="mx-4 mt-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            {feedbackMessage}
          </div>
        )}

        {/* 1. Primary Messenger View (All friends is already in it) */}
        {activeNav === 'chats' && (
          <div className="flex-1 w-full h-full min-h-0 overflow-hidden flex flex-col">
            <MessengerView />
          </div>
        )}

        {/* 2. Requests View (Combined into Messenger) */}
        {activeNav === 'requests' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-[#2f3031]">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
                  Friend Requests
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Manage incoming and outgoing friend requests
                </p>
              </div>
            </div>

            {/* Received Requests */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                Received Requests ({pendingReceived.length})
              </h4>

              {pendingReceived.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 dark:bg-[#202122] rounded-2xl border border-gray-150 dark:border-[#2f3031] text-xs text-gray-500 dark:text-gray-400">
                  You have no incoming friend requests right now.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingReceived.map(req => (
                    <div 
                      key={req.id}
                      className="bg-white dark:bg-[#202122] border border-gray-200 dark:border-[#2f3031] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs hover:border-purple-300 dark:hover:border-purple-800 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={req.senderAvatar || SILHOUETTE_AVATAR} 
                          alt={req.senderName} 
                          className="h-11 w-11 rounded-full object-cover border border-gray-150 dark:border-[#2f3031] shrink-0" 
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{req.senderName}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{req.senderEmail || 'Wants to connect with you on StudyBook'}</p>
                          <span className="text-[10px] text-gray-400">{req.timestamp}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={async () => {
                            await acceptFriendRequest(req.id);
                            playSound('pop');
                            setFeedbackMessage(`Accepted friend request from ${req.senderName}!`);
                            setTimeout(() => setFeedbackMessage(null), 3000);
                          }}
                          className="px-3.5 py-1.5 bg-[#0084ff] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </button>
                        <button
                          onClick={() => declineFriendRequest(req.id)}
                          className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#2b2d2e] dark:hover:bg-[#353738] text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Requests */}
            <div className="space-y-3 pt-4 border-t border-gray-150 dark:border-[#2f3031]">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Send className="h-3.5 w-3.5" />
                Sent Requests ({pendingSent.length})
              </h4>

              {pendingSent.length === 0 ? (
                <div className="p-6 text-center bg-gray-50 dark:bg-[#202122] rounded-2xl border border-gray-150 dark:border-[#2f3031] text-xs text-gray-500 dark:text-gray-400">
                  You have no pending outgoing friend requests.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingSent.map(req => (
                    <div 
                      key={req.id}
                      className="bg-white dark:bg-[#202122] border border-gray-200 dark:border-[#2f3031] rounded-2xl p-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                          {req.receiverId.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Request sent to: {req.receiverId}</p>
                          <span className="text-[10px] text-gray-400">Pending response</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-semibold rounded-lg">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Find Friends View (Combined into Messenger) */}
        {activeNav === 'find' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-[#2f3031]">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
                  Find & Add Friends
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Connect with study partners and tutors to collaborate and learn together
                </p>
              </div>
            </div>

            {/* Quick Add Form: Removed the example part as requested */}
            <div className="bg-gray-50 dark:bg-[#202122] border border-gray-200 dark:border-[#2f3031] rounded-2xl p-5 shadow-2xs">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Add Friends by Name or Email</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Enter an email address or username to send an instant friend request.
              </p>

              <form onSubmit={handleSendRequestSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={addFriendInput}
                    onChange={e => setAddFriendInput(e.target.value)}
                    placeholder="Enter friend's name or email..."
                    className="w-full bg-white dark:bg-[#18191a] text-sm text-gray-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 border border-gray-200 dark:border-[#2f3031] focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!addFriendInput.trim()}
                  className="px-5 py-2.5 bg-[#0084ff] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                  Send Request
                </button>
              </form>
            </div>

            {/* Suggested People / Educators to Connect */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  Suggested Study Partners & Friends
                </h4>
                <div className="relative w-48 hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input 
                    type="text"
                    value={findSearchQuery}
                    onChange={e => setFindSearchQuery(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full bg-gray-50 dark:bg-[#202122] text-xs text-gray-900 dark:text-white rounded-lg pl-8 pr-3 py-1.5 border border-gray-200 dark:border-[#2f3031] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredPeopleToConnect.map(person => {
                  const status = getFriendshipStatus(person.id);

                  return (
                    <div 
                      key={person.id}
                      className="bg-white dark:bg-[#202122] border border-gray-200 dark:border-[#2f3031] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs hover:border-purple-200 dark:hover:border-purple-900 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={person.avatar || SILHOUETTE_AVATAR} 
                          alt={person.name} 
                          onClick={() => openUserProfile(person.id)}
                          className="h-10 w-10 rounded-full object-cover border border-gray-150 dark:border-[#2f3031] shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all" 
                          title={`View ${person.name}'s profile`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h5 
                              onClick={() => openUserProfile(person.id)}
                              className="text-xs font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:underline"
                            >
                              {person.name}
                            </h5>
                            {person.role === 'tutor' && (
                              <span title="Verified Tutor">
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            {person.institution || 'StudyBook Member'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {status === 'friends' ? (
                          <button
                            onClick={() => {
                              openDirectChat(person);
                              setActiveNav('chats');
                            }}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-[#0084ff] text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Message
                          </button>
                        ) : status === 'pending_sent' ? (
                          <span className="px-3 py-1.5 bg-gray-100 dark:bg-[#2b2d2e] text-gray-500 dark:text-gray-400 text-xs font-medium rounded-xl flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Sent
                          </span>
                        ) : (
                          <button
                            onClick={async () => {
                              await sendFriendRequest(person);
                              setFeedbackMessage(`Friend request sent to ${person.name}!`);
                              setTimeout(() => setFeedbackMessage(null), 3000);
                            }}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Add Friend
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
