import React from 'react';
import { Sparkles, Heart } from 'lucide-react';
import { CoupleData, CoupleMemberData } from '../types';
import { getVibeById } from '../data/vibes';

interface HomeScreenProps {
  currentUserId: string;
  currentUser: { uid: string; displayName: string; avatarBg: string };
  partner: CoupleMemberData | null;
  couple: CoupleData | null;
  onOpenVibeSelector: () => void;
  onNavigateToPairing: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUserId,
  currentUser,
  partner,
  couple,
  onOpenVibeSelector,
  onNavigateToPairing,
}) => {
  const isPaired = Boolean(partner && couple);
  const myVibeState = couple?.currentVibes?.[currentUserId];
  const partnerVibeState = partner ? couple?.currentVibes?.[partner.uid] : null;

  const myVibes = (myVibeState?.vibes || []).map((id) => getVibeById(id)).filter(Boolean);
  const partnerVibes = (partnerVibeState?.vibes || []).map((id) => getVibeById(id)).filter(Boolean);

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return { text: '', isOld: false };
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 45) return { text: 'just now', isOld: false };
    if (diff < 3600) return { text: `${Math.max(1, Math.floor(diff / 60))}m ago`, isOld: false };
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return { text: `${hours}h ago`, isOld: hours >= 12 };
    }
    if (diff < 172800) return { text: 'Yesterday', isOld: true };
    return { text: 'Earlier', isOld: true };
  };

  const myTime = formatRelativeTime(myVibeState?.updatedAt);
  const partnerTime = formatRelativeTime(partnerVibeState?.updatedAt);

  // Helper to render emojis gracefully without layout breakage
  const renderVibeEmojis = (vibes: typeof myVibes, emptyEmoji: string) => {
    if (vibes.length === 0) {
      return <span className="text-3xl opacity-25">{emptyEmoji}</span>;
    }
    if (vibes.length <= 3) {
      return (
        <div className="flex items-center justify-center space-x-1">
          {vibes.map((v) => (
            <span key={v!.id} className="text-3xl sm:text-4xl drop-shadow-xs">
              {v!.emoji}
            </span>
          ))}
        </div>
      );
    }
    // 4 or more vibes: show first 3 + badge
    return (
      <div className="flex items-center justify-center space-x-1">
        {vibes.slice(0, 3).map((v) => (
          <span key={v!.id} className="text-2xl sm:text-3xl drop-shadow-xs">
            {v!.emoji}
          </span>
        ))}
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
          +{vibes.length - 3}
        </span>
      </div>
    );
  };

  return (
    <div
      id="in-app-home-screen"
      className="flex-1 flex flex-col justify-between p-5 select-none overflow-hidden"
    >
      {/* Calm Header */}
      <div className="flex items-center justify-between pt-1 pb-2">
        <div className="flex items-center space-x-2">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
          <h1 className="text-sm font-semibold tracking-tight text-stone-800 dark:text-stone-200">
            {isPaired && partner
              ? `${currentUser.displayName} & ${partner.displayName}`
              : 'Our Vibes'}
          </h1>
        </div>

        {/* Discreet unobtrusive connection indicator */}
        <div className="flex items-center space-x-1.5 text-[11px] text-stone-400">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPaired ? 'bg-emerald-500' : 'bg-amber-400'
            }`}
          />
          <span className="text-[11px]">
            {isPaired ? 'Connected' : 'Not paired'}
          </span>
        </div>
      </div>

      {/* Hero Dual Vibes Area: ME & PARTNER as two halves of one shared space */}
      <div className="my-auto py-4">
        <div className="grid grid-cols-2 divide-x divide-stone-200/60 dark:divide-stone-800">
          {/* Left Half: ME */}
          <div className="flex flex-col items-center text-center px-2 space-y-3">
            {/* Person label */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-rose-500">
                ME
              </span>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate max-w-[120px]">
                {currentUser.displayName}
              </p>
            </div>

            {/* Hero Emojis */}
            <div className="h-14 flex items-center justify-center">
              {renderVibeEmojis(myVibes, '💭')}
            </div>

            {/* Vibe Names */}
            <div className="h-10 flex flex-col items-center justify-center px-1">
              {myVibes.length > 0 ? (
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 leading-snug line-clamp-2">
                  {myVibes.map((v) => v!.name).join(' · ')}
                </p>
              ) : (
                <p className="text-xs text-stone-400 font-normal italic">
                  No vibe yet
                </p>
              )}
            </div>

            {/* Single Timestamp with subtle staleness indicator */}
            <div className="h-4 flex items-center justify-center">
              <span
                className={`text-[11px] ${
                  myTime.isOld ? 'text-stone-400/60 italic' : 'text-stone-400'
                }`}
              >
                {myTime.text}
              </span>
            </div>
          </div>

          {/* Right Half: PARTNER */}
          <div className="flex flex-col items-center text-center px-2 space-y-3">
            {/* Person label */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-stone-400 dark:text-stone-500">
                PARTNER
              </span>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate max-w-[120px]">
                {partner ? partner.displayName : 'Partner'}
              </p>
            </div>

            {/* Hero Emojis */}
            <div className="h-14 flex items-center justify-center">
              {!isPaired ? (
                <span className="text-3xl opacity-25">🔗</span>
              ) : (
                renderVibeEmojis(partnerVibes, '😴')
              )}
            </div>

            {/* Vibe Names */}
            <div className="h-10 flex flex-col items-center justify-center px-1">
              {!isPaired ? (
                <button
                  onClick={onNavigateToPairing}
                  className="text-xs font-medium text-rose-500 hover:text-rose-600 underline cursor-pointer"
                >
                  Pair partner
                </button>
              ) : partnerVibes.length > 0 ? (
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 leading-snug line-clamp-2">
                  {partnerVibes.map((v) => v!.name).join(' · ')}
                </p>
              ) : (
                <p className="text-xs text-stone-400 font-normal italic">
                  Waiting for vibe
                </p>
              )}
            </div>

            {/* Single Timestamp with subtle staleness indicator */}
            <div className="h-4 flex items-center justify-center">
              <span
                className={`text-[11px] ${
                  partnerTime.isOld ? 'text-stone-400/60 italic' : 'text-stone-400'
                }`}
              >
                {partnerTime.text}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Single Clear Primary Action */}
      <div className="pt-2 pb-1">
        <button
          id="home-send-vibe-cta"
          onClick={onOpenVibeSelector}
          className="w-full py-3.5 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg shadow-rose-500/20 transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{myVibes.length > 0 ? 'UPDATE VIBE' : 'SEND VIBE'}</span>
        </button>
      </div>
    </div>
  );
};
