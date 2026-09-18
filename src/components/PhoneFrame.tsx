import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal, Home, Smartphone, LayoutGrid } from 'lucide-react';
import { WidgetView } from './WidgetView';
import { CoupleData, CoupleMemberData } from '../types';

interface PhoneFrameProps {
  phoneLabel: string;
  currentUserId: string;
  currentUser: { uid: string; displayName: string; avatarBg: string };
  partner: CoupleMemberData | null;
  couple: CoupleData | null;
  children: React.ReactNode;
  onOpenSendVibe: () => void;
  initialMode?: 'app' | 'widget';
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  phoneLabel,
  currentUserId,
  currentUser,
  partner,
  couple,
  children,
  onOpenSendVibe,
  initialMode = 'app',
}) => {
  const [viewMode, setViewMode] = useState<'app' | 'widget'>(initialMode);
  const [currentTime, setCurrentTime] = useState('9:41');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours % 12 || 12}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* Device Label & Mode Switcher Bar */}
      <div className="mb-2 flex items-center justify-between w-full max-w-[340px] px-1">
        <div className="flex items-center space-x-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: currentUser.avatarBg }}
          />
          <span className="text-xs font-bold text-stone-700 dark:text-stone-200">
            {phoneLabel}: <span className="text-rose-500">{currentUser.displayName}</span>
          </span>
        </div>

        {/* Toggle between App View & Widget on Home Screen */}
        <div className="inline-flex items-center bg-stone-200 dark:bg-stone-800 rounded-lg p-0.5 text-[11px] font-medium shadow-2xs">
          <button
            id={`toggle-app-${currentUser.uid}`}
            onClick={() => setViewMode('app')}
            className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
              viewMode === 'app'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 font-semibold shadow-2xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>App</span>
          </button>
          <button
            id={`toggle-widget-${currentUser.uid}`}
            onClick={() => setViewMode('widget')}
            className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
              viewMode === 'widget'
                ? 'bg-rose-500 text-white font-semibold shadow-2xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span>Home Widget</span>
          </button>
        </div>
      </div>

      {/* Android Device Shell */}
      <div
        id={`device-frame-${currentUser.uid}`}
        className="w-[340px] h-[670px] bg-stone-900 rounded-[44px] p-3 shadow-2xl ring-1 ring-stone-800/80 ring-offset-4 ring-offset-stone-100 dark:ring-offset-stone-950 flex flex-col relative overflow-hidden transition-all"
      >
        {/* Phone Glass Inner Container */}
        <div className="w-full h-full bg-stone-50 dark:bg-stone-950 rounded-[34px] flex flex-col relative overflow-hidden">
          {/* Status Bar */}
          <div className="h-9 px-6 pt-2 flex items-center justify-between text-stone-800 dark:text-stone-200 z-30 select-none">
            <span className="text-xs font-semibold tracking-tight">{currentTime}</span>

            {/* Camera Punch Hole */}
            <div className="w-3.5 h-3.5 rounded-full bg-black ring-2 ring-stone-800/60" />

            <div className="flex items-center space-x-1.5 text-xs">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4" />
            </div>
          </div>

          {/* Screen Content */}
          {viewMode === 'app' ? (
            /* In-App View */
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {children}
            </div>
          ) : (
            /* Android Home Screen with Widget */
            <div className="flex-1 flex flex-col justify-between p-4 bg-gradient-to-b from-rose-200/40 via-amber-100/30 to-sky-200/30 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 select-none overflow-hidden relative">
              {/* Home Screen Top Date & Weather Widget */}
              <div className="pt-2 px-1 text-stone-700 dark:text-stone-300">
                <div className="text-sm font-semibold">
                  {new Date().toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-xs opacity-75">72°F • Sunny</div>
              </div>

              {/* The Core Experience: Android Home Screen Widget */}
              <div className="my-auto py-2">
                <WidgetView
                  currentUserId={currentUserId}
                  currentUser={currentUser}
                  partner={partner}
                  couple={couple}
                  onOpenSendVibe={() => {
                    setViewMode('app');
                    onOpenSendVibe();
                  }}
                />
              </div>

              {/* Home Screen Dock Icons */}
              <div className="pt-2">
                <div className="bg-white/40 dark:bg-stone-800/40 backdrop-blur-md rounded-2xl p-2.5 flex items-center justify-around border border-white/40 dark:border-stone-700/40 shadow-xs">
                  {/* Couples App Icon */}
                  <button
                    onClick={() => setViewMode('app')}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-500/30 group-hover:scale-105 transition">
                      <span className="text-lg">❤️</span>
                    </div>
                    <span className="text-[10px] font-medium text-stone-700 dark:text-stone-300 mt-1">
                      Vibe App
                    </span>
                  </button>

                  {/* Other Android App Dummies */}
                  <div className="flex flex-col items-center opacity-70">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white text-base shadow-sm">
                      📞
                    </div>
                    <span className="text-[10px] text-stone-600 dark:text-stone-400 mt-1">Phone</span>
                  </div>
                  <div className="flex flex-col items-center opacity-70">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center text-white text-base shadow-sm">
                      💬
                    </div>
                    <span className="text-[10px] text-stone-600 dark:text-stone-400 mt-1">Chat</span>
                  </div>
                  <div className="flex flex-col items-center opacity-70">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white text-base shadow-sm">
                      📷
                    </div>
                    <span className="text-[10px] text-stone-600 dark:text-stone-400 mt-1">Camera</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Android Navigation Gesture Handle Pill */}
          <div className="h-5 flex items-center justify-center bg-transparent z-30 select-none">
            <div
              className="w-28 h-1 rounded-full bg-stone-400 dark:bg-stone-600 hover:bg-stone-600 dark:hover:bg-stone-400 cursor-pointer transition"
              title="Tap to switch between App and Home screen"
              onClick={() => setViewMode(viewMode === 'app' ? 'widget' : 'app')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
