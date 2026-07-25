/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FeedView } from './components/FeedView';
import { GroupsView } from './components/GroupsView';
import { TutorsView } from './components/TutorsView';
import { ReelsView } from './components/ReelsView';
import { MarketplaceView } from './components/MarketplaceView';
import { GamesView } from './components/GamesView';
import { SettingsView } from './components/SettingsView';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { RightSidebar } from './components/RightSidebar';
import { FloatingChats } from './components/FloatingChats';
import { isFirebaseConfigured } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rss, 
  Users, 
  GraduationCap, 
  Film, 
  ShoppingBag, 
  Gamepad2, 
  Settings as SettingsIcon 
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    settings, 
    user,
    isFirebaseConnected, 
    isFirebaseLoading,
    isOfflineBypass,
    isLocalLoggedIn
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  if (isFirebaseConfigured && isFirebaseLoading) {
    return (
      <div id="firebase-loading-gate" className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-semibold animate-pulse pl-1">Đang đồng bộ hóa học tập...</span>
        </div>
      </div>
    );
  }

  const isAuthRequired = isFirebaseConfigured 
    ? (!isFirebaseConnected && !isOfflineBypass)
    : (!isLocalLoggedIn && !isOfflineBypass);

  if (isAuthRequired) {
    return <AuthScreen />;
  }

  if (!user?.hasCompletedOnboarding) {
    return <OnboardingScreen />;
  }

  // Main Tab Router
  const renderActiveView = () => {
    switch (activeTab) {
      case 'feed':
        return <FeedView searchQuery={searchQuery} />;
      case 'saved':
        return <FeedView searchQuery={searchQuery} savedOnly={true} />;
      case 'groups':
        return <GroupsView />;
      case 'tutors':
        return <TutorsView />;
      case 'reels':
        return <ReelsView />;
      case 'marketplace':
        return <MarketplaceView />;
      case 'games':
        return <GamesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <FeedView searchQuery={searchQuery} />;
    }
  };

  const mobileNavItems = [
    { id: 'feed', icon: Rss, label: 'Feed' },
    { id: 'groups', icon: Users, label: 'Nhóm' },
    { id: 'tutors', icon: GraduationCap, label: 'Gia sư' },
    { id: 'reels', icon: Film, label: 'Reels' },
    { id: 'marketplace', icon: ShoppingBag, label: 'Chợ' },
    { id: 'games', icon: Gamepad2, label: 'Đấu trí' },
    { id: 'settings', icon: SettingsIcon, label: 'Cài đặt' }
  ];

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${settings?.darkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Top Header Panel */}
      <Header onSearchQuery={setSearchQuery} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Side Navigation Panel for Desktop */}
        <Sidebar />

        {/* Main Feed/Interaction Area */}
        <main className="flex-1 overflow-hidden relative bg-[#F0F2F5] dark:bg-slate-900">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="h-full w-full"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Right Sidebar Contacts / Ads for Desktop */}
        {activeTab === 'feed' && <RightSidebar />}
      </div>

      {/* Floating Messenger Chats popup stack */}
      <FloatingChats />

      {/* Mobile Sticky Tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex justify-around py-1.5 lg:hidden shadow-lg transition-colors">
        {mobileNavItems.map(item => {
          const Icon = item.icon;
          const isSel = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 focus:outline-none cursor-pointer ${isSel ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="text-[9px] font-bold leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
