import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { playSound } from '../utils/soundEffects';
import { 
  Rss, 
  Users, 
  GraduationCap, 
  Film, 
  ShoppingBag, 
  Gamepad2, 
  Settings as SettingsIcon,
  FolderHeart,
  Flame,
  Plus,
  FolderPlus,
  Check,
  X,
  UserCheck
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, posts, folders, addFolder, activeFolderId, setActiveFolderId } = useApp();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('bg-blue-500');

  // Calculate saved counts
  const savedPostsCount = posts.filter(p => p.isSaved).length;

  const navItems = [
    { id: 'feed', label: 'Academic Feed', icon: Rss, desc: 'Resources, academic discussion' },
    { id: 'groups', label: 'Study Groups', icon: Users, desc: 'Virtual classrooms, shared files' },
    { id: 'friends', label: 'Friends & Chat', icon: UserCheck, desc: 'Friends list, 1-on-1 direct messages' },
    { id: 'tutors', label: 'Tutors & Channels', icon: GraduationCap, desc: 'Teacher profiles, 5-star reviews' },
    { id: 'reels', label: 'Educational Reels', icon: Film, desc: 'Learn super fast in 60s' },
    { id: 'marketplace', label: 'Bazaar Marketplace', icon: ShoppingBag, desc: 'Calculators, textbooks, giveaways' },
    { id: 'games', label: 'Quizz & Flashcards', icon: Gamepad2, desc: 'Solve flashcards, rank weekly' },
    { id: 'settings', label: 'Study Settings', icon: SettingsIcon, desc: 'Timer options, vocabulary filters' }
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col bg-gray-50 dark:bg-slate-950 p-4 border-r border-gray-150 dark:border-slate-850 h-[calc(100vh-57px)] overflow-y-auto justify-between transition-colors">
      <div className="space-y-6">
        {/* Navigation Options */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-3">Explore</span>
          {navItems.map(item => {
            const IconComponent = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (activeTab !== item.id) playSound('tab');
                  setActiveTab(item.id);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                  isSelected 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-900'
                }`}
              >
                <IconComponent className={`h-5 w-5 shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate leading-tight">{item.label}</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5 font-normal">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Facebook-style Watch Later / Saved Folder */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pl-3 pr-1">
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Your Library</span>
            {!isCreatingFolder && (
              <button 
                onClick={() => setIsCreatingFolder(true)} 
                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                title="Create custom folder"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* List of Folders */}
          <div className="space-y-1">
            {/* Watch Later (Default) */}
            {(() => {
              const watchLaterCount = posts.filter(p => p.isSaved && (p.savedFolderId === 'f_watch_later' || !p.savedFolderId)).length;
              const isSelected = activeTab === 'saved' && (activeFolderId === 'f_watch_later' || !activeFolderId);
              return (
                <button
                  onClick={() => {
                    playSound('tab');
                    setActiveTab('saved');
                    setActiveFolderId('f_watch_later');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-200 group cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                    <span className="text-xs font-semibold truncate">Watch Later</span>
                  </div>
                  <span className="text-[10px] bg-red-55/60 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">
                    {watchLaterCount}
                  </span>
                </button>
              );
            })()}

            {/* Other custom folders */}
            {folders.filter(f => f.id !== 'f_watch_later').map(folder => {
              const isSelected = activeTab === 'saved' && activeFolderId === folder.id;
              const count = posts.filter(p => p.isSaved && p.savedFolderId === folder.id).length;
              
              return (
                <button
                  key={folder.id}
                  onClick={() => {
                    setActiveTab('saved');
                    setActiveFolderId(folder.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-200 group cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-2 w-2 rounded-full ${folder.color || 'bg-blue-500'} shrink-0`} />
                    <span className="text-xs font-semibold truncate">{folder.name}</span>
                  </div>
                  <span className="text-[10px] bg-gray-250/60 dark:bg-slate-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-bold">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Inline Folder Creator */}
          {isCreatingFolder && (
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl p-3 space-y-3 mt-2 shadow-sm">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">New Folder</p>
              <input
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-750 bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              
              {/* Color options */}
              <div className="flex gap-1.5 items-center">
                {[
                  { value: 'bg-red-500', label: 'Red' },
                  { value: 'bg-amber-500', label: 'Amber' },
                  { value: 'bg-emerald-500', label: 'Emerald' },
                  { value: 'bg-blue-500', label: 'Blue' },
                  { value: 'bg-indigo-500', label: 'Indigo' },
                  { value: 'bg-pink-500', label: 'Pink' }
                ].map(col => (
                  <button
                    key={col.value}
                    onClick={() => setNewFolderColor(col.value)}
                    className={`h-4 w-4 rounded-full ${col.value} transition-transform ${newFolderColor === col.value ? 'ring-2 ring-blue-600 dark:ring-blue-400 scale-110' : 'hover:scale-105'} cursor-pointer`}
                  />
                ))}
              </div>

              <div className="flex justify-end gap-1.5 text-xs pt-1">
                <button
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg flex items-center justify-center cursor-pointer border-none"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (newFolderName.trim()) {
                      addFolder(newFolderName.trim(), newFolderColor);
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                    }
                  }}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center font-semibold cursor-pointer border-none"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
