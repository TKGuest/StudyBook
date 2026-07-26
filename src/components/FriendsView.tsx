import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Check, 
  X, 
  Search, 
  UserCheck, 
  Clock, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  GraduationCap,
  Mail,
  Send
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';
import { SILHOUETTE_AVATAR } from '../data/mockData';

export const FriendsView: React.FC = () => {
  const { 
    friends, 
    friendRequests, 
    directChats, 
    sendFriendRequest, 
    acceptFriendRequest, 
    declineFriendRequest, 
    removeFriend, 
    getFriendshipStatus,
    openDirectChat,
    tutors,
    posts,
    user 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'friends' | 'requests' | 'add' | 'chats'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [addFriendInput, setAddFriendInput] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filter pending received and sent requests
  const pendingReceived = friendRequests.filter(r => r.receiverId === user.id && r.status === 'pending');
  const pendingSent = friendRequests.filter(r => r.senderId === user.id && r.status === 'pending');

  // Discover potential friends from tutors and post authors
  const potentialPeople = React.useMemo(() => {
    const list: Array<{ id: string; name: string; avatar: string; role?: string; institution?: string; email?: string }> = [];

    // Add tutors
    tutors.forEach(t => {
      if (t.id !== user.id) {
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

    // Add post authors
    posts.forEach(p => {
      if (p.user && p.user.id !== user.id && !p.isAnonymous && !list.some(item => item.id === p.user.id)) {
        list.push({
          id: p.user.id,
          name: p.user.name,
          avatar: p.user.avatar,
          role: p.user.role || 'student',
          institution: p.user.role === 'tutor' ? 'Tutor' : 'Student',
          email: `${p.user.name.toLowerCase().replace(/\s+/g, '')}@studybook.edu`
        });
      }
    });

    return list;
  }, [tutors, posts, user.id]);

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.email && f.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (f.institution && f.institution.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPeopleToConnect = potentialPeople.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
    setFeedbackMessage(`Sent friend request to ${target.name}!`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Friends & Direct Messaging</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Connect with classmates, tutors, and educators across accounts with real-time 1-on-1 chat.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => { playSound('tab'); setActiveSubTab('friends'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'friends'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            All Friends ({friends.length})
          </button>

          <button
            onClick={() => { playSound('tab'); setActiveSubTab('requests'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap relative ${
              activeSubTab === 'requests'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Requests
            {pendingReceived.length > 0 && (
              <span className="h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingReceived.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { playSound('tab'); setActiveSubTab('chats'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'chats'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Direct Messages ({directChats.length})
          </button>

          <button
            onClick={() => { playSound('tab'); setActiveSubTab('add'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'add'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Find Friends
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          {feedbackMessage}
        </div>
      )}

      {/* Sub-Tab 1: All Friends */}
      {activeSubTab === 'friends' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search friends by name or school..."
              className="w-full bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {filteredFriends.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 p-6">
              <Users className="h-10 w-10 text-gray-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">No friends found</h3>
              <p className="text-xs text-gray-400 mt-1 mb-4">Start connecting with classmates or tutors on StudyBook!</p>
              <button
                onClick={() => setActiveSubTab('add')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Find Friends to Add
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map(friend => (
                <div 
                  key={friend.id}
                  className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-purple-300 dark:hover:border-purple-800 transition-all shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <img 
                        src={friend.avatar || SILHOUETTE_AVATAR} 
                        alt={friend.name} 
                        className="h-11 w-11 rounded-full object-cover border border-gray-100 dark:border-slate-800" 
                      />
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-900"></span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{friend.name}</h4>
                        {friend.role === 'tutor' && (
                          <span title="Verified Educator">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {friend.institution || (friend.role === 'tutor' ? 'Lead Educator' : 'Student')}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Added {friend.addedAt || 'recently'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800/80">
                    <button
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
                      className="flex-1 py-1.5 px-3 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Message
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Remove ${friend.name} from your friends list?`)) {
                          removeFriend(friend.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Remove Friend"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Friend Requests */}
      {activeSubTab === 'requests' && (
        <div className="space-y-6">
          {/* Received Requests */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Incoming Friend Requests ({pendingReceived.length})
            </h3>

            {pendingReceived.length === 0 ? (
              <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 text-xs text-gray-400">
                No pending incoming friend requests at the moment.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingReceived.map(req => (
                  <div 
                    key={req.id}
                    className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={req.senderAvatar || SILHOUETTE_AVATAR} 
                        alt={req.senderName} 
                        className="h-10 w-10 rounded-full object-cover border border-gray-100 dark:border-slate-800 shrink-0" 
                      />
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{req.senderName}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{req.senderEmail || 'Wants to connect with you on StudyBook'}</p>
                        <span className="text-[10px] text-gray-400">{req.timestamp}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => acceptFriendRequest(req.id)}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Accept
                      </button>
                      <button
                        onClick={() => declineFriendRequest(req.id)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
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
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Send className="h-3.5 w-3.5" />
              Sent Friend Requests ({pendingSent.length})
            </h3>

            {pendingSent.length === 0 ? (
              <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 text-xs text-gray-400">
                You haven't sent any pending friend requests.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingSent.map(req => (
                  <div 
                    key={req.id}
                    className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                        {req.receiverId.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Request Sent to ID: {req.receiverId}</p>
                        <span className="text-[10px] text-gray-400">Status: Pending response</span>
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

      {/* Sub-Tab 3: Add Friends */}
      {activeSubTab === 'add' && (
        <div className="space-y-6">
          {/* Quick Add Form */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Add Friend by Name or Email</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Enter an email address or username to send an instant friend request across accounts.
            </p>

            <form onSubmit={handleSendRequestSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={addFriendInput}
                  onChange={e => setAddFriendInput(e.target.value)}
                  placeholder="e.g. alex.rivera@edu.org or Phùng Gia Bỉnh"
                  className="w-full bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={!addFriendInput.trim()}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                Send Request
              </button>
            </form>
          </div>

          {/* People You May Know / Suggested Educators & Students */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              Suggested Tutors & Study Colleagues
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredPeopleToConnect.map(person => {
                const status = getFriendshipStatus(person.id);

                return (
                  <div 
                    key={person.id}
                    className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs hover:border-purple-200 dark:hover:border-purple-900 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={person.avatar || SILHOUETTE_AVATAR} 
                        alt={person.name} 
                        className="h-10 w-10 rounded-full object-cover border border-gray-100 dark:border-slate-800 shrink-0" 
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{person.name}</h4>
                          {person.role === 'tutor' && (
                            <span title="Verified Educator">
                              <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {person.institution || 'StudyBook Contributor'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {status === 'friends' ? (
                        <button
                          onClick={() => openDirectChat(person)}
                          className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-600 dark:text-purple-300 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Chat
                        </button>
                      ) : status === 'pending_sent' ? (
                        <span className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-xl flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => sendFriendRequest(person)}
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

      {/* Sub-Tab 4: Direct Messages Inbox */}
      {activeSubTab === 'chats' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Your Direct Messages</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Click any conversation to open the floating chat messenger.
            </p>
          </div>

          {directChats.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 p-6">
              <MessageSquare className="h-10 w-10 text-gray-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">No direct messages yet</h3>
              <p className="text-xs text-gray-400 mt-1 mb-4">Start a 1-on-1 chat with your friends or tutors!</p>
              <button
                onClick={() => setActiveSubTab('friends')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                View Friends List
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {directChats.map(chat => {
                const other = chat.participants.find(p => p.id !== user.id) || chat.participants[0];
                const lastMsg = chat.messages[chat.messages.length - 1];

                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      playSound('pop');
                      openDirectChat({
                        id: other?.id || chat.id,
                        name: other?.name || 'User',
                        avatar: other?.avatar || SILHOUETTE_AVATAR,
                        email: other?.email,
                        role: other?.role
                      });
                    }}
                    className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all shadow-2xs group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <img 
                          src={other?.avatar || SILHOUETTE_AVATAR} 
                          alt={other?.name} 
                          className="h-11 w-11 rounded-full object-cover border border-gray-100 dark:border-slate-800" 
                        />
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-900"></span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                            {other?.name || 'Study Colleague'}
                          </h4>
                          {other?.role === 'tutor' && (
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[9px] font-bold rounded-full">
                              Tutor
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {lastMsg ? lastMsg.content : 'No messages yet'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gray-400 block mb-1">
                        {lastMsg ? lastMsg.timestamp : ''}
                      </span>
                      <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 text-xs font-semibold rounded-lg inline-flex items-center gap-1">
                        Open Chat
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
