import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  Smartphone,
  Users,
  Code,
  Settings,
  RefreshCw,
  Sparkles,
  Link
} from 'lucide-react';
import { PhoneFrame } from './components/PhoneFrame';
import { HomeScreen } from './components/HomeScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { PairingScreen } from './components/PairingScreen';
import { VibeSelectorModal } from './components/VibeSelectorModal';
import { SettingsModal } from './components/SettingsModal';
import { AndroidCodeModal } from './components/AndroidCodeModal';
import { CoupleData, CoupleMemberData } from './types';
import { firebaseRealtime } from './services/firebaseRealtime';

// Default sample couple
const USER_A = {
  uid: 'user_alex_a',
  displayName: 'Alex',
  avatarBg: '#F43F5E',
};

const USER_B = {
  uid: 'user_jordan_b',
  displayName: 'Jordan',
  avatarBg: '#8B5CF6',
};

export default function App() {
  // Test view: 'dual' (split-screen A & B) vs 'single'
  const [viewMode, setViewMode] = useState<'dual' | 'single'>('dual');
  const [singleActiveUser, setSingleActiveUser] = useState<'A' | 'B'>('A');

  // Navigation tab for each phone: 'home' | 'history' | 'pairing'
  const [navTabA, setNavTabA] = useState<'home' | 'history' | 'pairing'>('home');
  const [navTabB, setNavTabB] = useState<'home' | 'history' | 'pairing'>('home');

  // Shared couple data
  const [couple, setCouple] = useState<CoupleData | null>(null);

  // Modals state
  const [vibeModalUser, setVibeModalUser] = useState<'A' | 'B' | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAndroidCodeOpen, setIsAndroidCodeOpen] = useState(false);

  // User profile state
  const [userA, setUserA] = useState(USER_A);
  const [userB, setUserB] = useState(USER_B);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch initial session / couple data
  const loadInitialData = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userA.uid, displayName: userA.displayName, avatarBg: userA.avatarBg }),
      });
      const data = await res.json();
      if (data.couple) {
        setCouple(data.couple);
      }
    } catch (err) {
      console.error('Error loading couple data:', err);
    }
  }, [userA]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Connect to Firebase Realtime Database listener
  useEffect(() => {
    if (!couple?.id) return;

    const unsubscribe = firebaseRealtime.observeCouple(couple.id, (data) => {
      if (data.couple) {
        setCouple(data.couple);
      } else if (data.currentVibes) {
        setCouple((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            currentVibes: data.currentVibes,
            vibeHistory: data.vibeHistory,
          };
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [couple?.id]);

  // Partner data helpers
  const getPartnerFor = (uid: string): CoupleMemberData | null => {
    if (!couple) return null;
    const partnerId = Object.keys(couple.members).find((id) => id !== uid);
    if (!partnerId) return null;
    return couple.membersData[partnerId] || { uid: partnerId, displayName: 'Partner', avatarBg: '#A8A29E' };
  };

  // Send vibes handler with Firebase Realtime Database
  const handleSendVibes = async (senderUid: string, vibes: string[]) => {
    if (!couple?.id) return;

    const data = await firebaseRealtime.sendUserVibes(couple.id, senderUid, vibes);
    setCouple((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentVibes: data.currentVibes,
        vibeHistory: data.vibeHistory,
      };
    });

    const partner = getPartnerFor(senderUid);
    const partnerName = partner ? partner.displayName : 'Partner';
    setToastMessage(`✨ Sent to ${partnerName}`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Generate pairing code
  const handleGenerateCode = async (uid: string) => {
    return firebaseRealtime.generatePairingCode(uid);
  };

  // Connect code
  const handleConnectCode = async (uid: string, code: string) => {
    const updated = await firebaseRealtime.connectPairingCode(uid, code);
    setCouple(updated);
    setToastMessage("You're connected ❤️");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Unpair
  const handleUnpair = async () => {
    if (!couple?.id) return;
    await firebaseRealtime.unpair(couple.id, userA.uid);
    setCouple(null);
    setToastMessage('Disconnected from partner');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Reset Demo
  const handleResetDemo = async () => {
    const demo = await firebaseRealtime.resetDemo();
    setCouple(demo);
    setToastMessage('Reset sample couple');
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Profile update
  const handleUpdateProfile = async (name: string, color: string) => {
    const updated = { ...userA, displayName: name, avatarBg: color };
    setUserA(updated);
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans">
      {/* Subtle Toast Banner */}
      {toastMessage && (
        <div
          id="realtime-toast"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 py-2 px-4 rounded-full bg-stone-900/90 dark:bg-white/90 text-white dark:text-stone-900 text-xs font-semibold shadow-xl backdrop-blur-md flex items-center space-x-2 animate-in fade-in slide-in-from-top-4"
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Application Header: Minimal, Calm, Non-technical */}
      <header className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800 sticky top-0 z-40 px-5 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-xs">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                Couples Vibe Widget
              </h1>
              <p className="text-[11px] text-stone-400 hidden sm:block">
                Shared mood on your home screen
              </p>
            </div>
          </div>

          {/* Controls: Partner Test vs Single & Code */}
          <div className="flex items-center space-x-2">
            <div className="bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl flex items-center text-xs font-medium">
              <button
                id="btn-dual-test-mode"
                onClick={() => setViewMode('dual')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'dual'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                }`}
                title="View Alex and Jordan side-by-side to test live synchronization"
              >
                <Users className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Partner View (A & B)</span>
                <span className="sm:hidden">Dual</span>
              </button>
              <button
                id="btn-single-mode"
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'single'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Single</span>
              </button>
            </div>

            <button
              id="reset-demo-btn"
              onClick={handleResetDemo}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              title="Reset sample couple"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              id="btn-android-code-modal"
              onClick={() => setIsAndroidCodeOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition text-xs font-medium flex items-center space-x-1.5 cursor-pointer"
              title="Inspect Android Jetpack Glance & Firebase Realtime Database code"
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Android & Glance</span>
            </button>

            <button
              id="btn-settings-modal"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Sandbox Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col items-center justify-center">
        {/* Sub-selector for single phone testing */}
        {viewMode === 'single' && (
          <div className="mb-4 flex items-center space-x-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-1.5 rounded-2xl shadow-2xs">
            <span className="text-xs font-medium text-stone-400 px-2">Phone:</span>
            <button
              id="switch-single-alex"
              onClick={() => setSingleActiveUser('A')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                singleActiveUser === 'A'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              Alex
            </button>
            <button
              id="switch-single-jordan"
              onClick={() => setSingleActiveUser('B')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                singleActiveUser === 'B'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              Jordan
            </button>
          </div>
        )}

        {/* Dual or Single Phones Grid */}
        <div
          className={`w-full flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-10 ${
            viewMode === 'single' ? 'max-w-md' : 'max-w-4xl'
          }`}
        >
          {/* PHONE 1: ALEX (USER A) */}
          {(viewMode === 'dual' || (viewMode === 'single' && singleActiveUser === 'A')) && (
            <PhoneFrame
              phoneLabel={userA.displayName}
              currentUserId={userA.uid}
              currentUser={userA}
              partner={getPartnerFor(userA.uid)}
              couple={couple}
              onOpenSendVibe={() => setVibeModalUser('A')}
            >
              <div className="h-full flex flex-col bg-stone-50 dark:bg-stone-950">
                {/* Active Screen */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {navTabA === 'home' && (
                    <HomeScreen
                      currentUserId={userA.uid}
                      currentUser={userA}
                      partner={getPartnerFor(userA.uid)}
                      couple={couple}
                      onOpenVibeSelector={() => setVibeModalUser('A')}
                      onNavigateToPairing={() => setNavTabA('pairing')}
                    />
                  )}
                  {navTabA === 'history' && (
                    <HistoryScreen
                      currentUserId={userA.uid}
                      currentUser={userA}
                      partner={getPartnerFor(userA.uid)}
                      couple={couple}
                      onOpenVibeSelector={() => setVibeModalUser('A')}
                    />
                  )}
                  {navTabA === 'pairing' && (
                    <PairingScreen
                      currentUserId={userA.uid}
                      currentUser={userA}
                      partner={getPartnerFor(userA.uid)}
                      couple={couple}
                      onGenerateCode={() => handleGenerateCode(userA.uid)}
                      onConnectCode={(code) => handleConnectCode(userA.uid, code)}
                      onUnpair={handleUnpair}
                    />
                  )}
                </div>

                {/* Quiet Mobile Bottom Navigation */}
                <div className="h-12 border-t border-stone-100 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-6 flex items-center justify-around z-20">
                  <button
                    onClick={() => setNavTabA('home')}
                    className={`flex flex-col items-center space-y-0.5 transition cursor-pointer ${
                      navTabA === 'home'
                        ? 'text-rose-500 font-semibold'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${navTabA === 'home' ? 'fill-rose-500' : ''}`} />
                    <span className="text-[10px]">Vibes</span>
                  </button>
                  <button
                    onClick={() => setNavTabA('history')}
                    className={`flex flex-col items-center space-y-0.5 transition cursor-pointer ${
                      navTabA === 'history'
                        ? 'text-rose-500 font-semibold'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px]">Moments</span>
                  </button>
                  <button
                    onClick={() => setNavTabA('pairing')}
                    className={`flex flex-col items-center space-y-0.5 transition cursor-pointer ${
                      navTabA === 'pairing'
                        ? 'text-rose-500 font-semibold'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <Link className="w-4 h-4" />
                    <span className="text-[10px]">Pairing</span>
                  </button>
                </div>
              </div>
            </PhoneFrame>
          )}

          {/* PHONE 2: JORDAN (USER B) */}
          {(viewMode === 'dual' || (viewMode === 'single' && singleActiveUser === 'B')) && (
            <PhoneFrame
              phoneLabel={userB.displayName}
              currentUserId={userB.uid}
              currentUser={userB}
              partner={getPartnerFor(userB.uid)}
              couple={couple}
              onOpenSendVibe={() => setVibeModalUser('B')}
            >
              <div className="h-full flex flex-col bg-stone-50 dark:bg-stone-950">
                {/* Active Screen */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {navTabB === 'home' && (
                    <HomeScreen
                      currentUserId={userB.uid}
                      currentUser={userB}
                      partner={getPartnerFor(userB.uid)}
                      couple={couple}
                      onOpenVibeSelector={() => setVibeModalUser('B')}
                      onNavigateToPairing={() => setNavTabB('pairing')}
                    />
                  )}
                  {navTabB === 'history' && (
                    <HistoryScreen
                      currentUserId={userB.uid}
                      currentUser={userB}
                      partner={getPartnerFor(userB.uid)}
                      couple={couple}
                      onOpenVibeSelector={() => setVibeModalUser('B')}
                    />
                  )}
                  {navTabB === 'pairing' && (
                    <PairingScreen
                      currentUserId={userB.uid}
                      currentUser={userB}
                      partner={getPartnerFor(userB.uid)}
                      couple={couple}
                      onGenerateCode={() => handleGenerateCode(userB.uid)}
                      onConnectCode={(code) => handleConnectCode(userB.uid, code)}
                      onUnpair={handleUnpair}
                    />
                  )}
                </div>

                {/* Quiet Mobile Bottom Navigation */}
                <div className="h-12 border-t border-stone-100 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-6 flex items-center justify-around z-20">
                  <button
                    onClick={() => setNavTabB('home')}
                    className={`flex flex-col items-center space-y-0.5 transition cursor-pointer ${
                      navTabB === 'home'
                        ? 'text-rose-500 font-semibold'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${navTabB === 'home' ? 'fill-rose-500' : ''}`} />
                    <span className="text-[10px]">Vibes</span>
                  </button>
                  <button
                    onClick={() => setNavTabB('history')}
                    className={`flex flex-col items-center space-y-0.5 transition cursor-pointer ${
                      navTabB === 'history'
                        ? 'text-rose-500 font-semibold'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px]">Moments</span>
                  </button>
                  <button
                    onClick={() => setNavTabB('pairing')}
                    className={`flex flex-col items-center space-y-0.5 transition cursor-pointer ${
                      navTabB === 'pairing'
                        ? 'text-rose-500 font-semibold'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <Link className="w-4 h-4" />
                    <span className="text-[10px]">Pairing</span>
                  </button>
                </div>
              </div>
            </PhoneFrame>
          )}
        </div>
      </main>

      {/* Vibe Selector Modal */}
      <VibeSelectorModal
        isOpen={vibeModalUser !== null}
        onClose={() => setVibeModalUser(null)}
        partnerName={
          vibeModalUser === 'A'
            ? getPartnerFor(userA.uid)?.displayName
            : vibeModalUser === 'B'
            ? getPartnerFor(userB.uid)?.displayName
            : undefined
        }
        currentSelectedVibes={
          vibeModalUser === 'A'
            ? couple?.currentVibes?.[userA.uid]?.vibes || []
            : vibeModalUser === 'B'
            ? couple?.currentVibes?.[userB.uid]?.vibes || []
            : []
        }
        onSendVibes={async (vibes) => {
          if (vibeModalUser === 'A') {
            await handleSendVibes(userA.uid, vibes);
          } else if (vibeModalUser === 'B') {
            await handleSendVibes(userB.uid, vibes);
          }
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={userA}
        partner={getPartnerFor(userA.uid)}
        couple={couple}
        onUpdateProfile={handleUpdateProfile}
        onUnpair={handleUnpair}
        onResetDemo={handleResetDemo}
      />

      {/* Android Kotlin & Glance Code Modal */}
      <AndroidCodeModal
        isOpen={isAndroidCodeOpen}
        onClose={() => setIsAndroidCodeOpen(false)}
      />
    </div>
  );
}
