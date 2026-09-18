import React from 'react';
import { Sparkles, Heart } from 'lucide-react';
import { CoupleData, CoupleMemberData } from '../types';
import { getVibeById } from '../data/vibes';

interface WidgetViewProps {
  currentUserId: string;
  currentUser: { uid: string; displayName: string; avatarBg: string };
  partner: CoupleMemberData | null;
  couple: CoupleData | null;
  onOpenSendVibe: () => void;
}

export const WidgetView: React.FC<WidgetViewProps> = ({
  currentUserId,
  currentUser,
  partner,
  couple,
  onOpenSendVibe,
}) => {
  const isPaired = Boolean(partner && couple);

  const myVibeState = couple?.currentVibes?.[currentUserId];
  const partnerVibeState = partner ? couple?.currentVibes?.[partner.uid] : null;

  const myVibes = (myVibeState?.vibes || []).map((id) => getVibeById(id)).filter(Boolean);
  const partnerVibes = (partnerVibeState?.vibes || []).map((id) => getVibeById(id)).filter(Boolean);

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 45) return 'just now';
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const renderWidgetEmojis = (vibes: typeof myVibes, emptyEmoji: string) => {
    if (vibes.length === 0) {
      return <span className="text-xl opacity-30">{emptyEmoji}</span>;
    }
    if (vibes.length <= 2) {
      return (
        <span className="text-2xl drop-shadow-xs">
          {vibes.map((v) => v!.emoji).join(' ')}
        </span>
      );
    }
    // 3 or more: show first 2 + badge
    return (
      <div className="flex items-center space-x-1">
        <span className="text-xl drop-shadow-xs">
          {vibes.slice(0, 2).map((v) => v!.emoji).join(' ')}
        </span>
        <span className="text-[9px] font-bold px-1 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
          +{vibes.length - 2}
        </span>
      </div>
    );
  };

  const renderWidgetNames = (vibes: typeof myVibes, emptyText: string) => {
    if (vibes.length === 0) return emptyText;
    if (vibes.length <= 2) {
      return vibes.map((v) => v!.name).join(', ');
    }
    return `${vibes[0]!.name}, ${vibes[1]!.name} +${vibes.length - 2}`;
  };

  return (
    <div
      id="android-glance-widget"
      className="w-full rounded-3xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200/80 dark:border-stone-800 shadow-md p-4 select-none flex flex-col justify-between"
    >
      {/* Widget Header: Simple "❤️ OUR VIBES" */}
      <div className="pb-3 border-b border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span className="text-[11px] font-bold tracking-wider uppercase text-stone-700 dark:text-stone-300">
            OUR VIBES
          </span>
        </div>
        {/* Subtle dot */}
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isPaired ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-700'
          }`}
        />
      </div>

      {/* 2-Column Split: ME vs PARTNER */}
      <div className="grid grid-cols-2 divide-x divide-stone-100 dark:divide-stone-800 py-3">
        {/* Column 1: ME */}
        <div className="flex flex-col items-center text-center px-1 space-y-1.5">
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold tracking-widest uppercase text-rose-500">
              ME
            </span>
            <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate max-w-[90px]">
              {currentUser.displayName}
            </p>
          </div>

          {/* Emojis */}
          <div className="h-10 flex items-center justify-center">
            {renderWidgetEmojis(myVibes, '💭')}
          </div>

          {/* Vibe names */}
          <p className="text-[11px] font-medium text-stone-600 dark:text-stone-300 truncate max-w-[90px] h-4">
            {renderWidgetNames(myVibes, 'No vibe')}
          </p>

          {/* Relative timestamp */}
          <span className="text-[9px] text-stone-400 h-3">
            {formatRelativeTime(myVibeState?.updatedAt)}
          </span>
        </div>

        {/* Column 2: PARTNER */}
        <div className="flex flex-col items-center text-center px-1 space-y-1.5">
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold tracking-widest uppercase text-stone-400">
              PARTNER
            </span>
            <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate max-w-[90px]">
              {partner ? partner.displayName : 'Partner'}
            </p>
          </div>

          {/* Emojis */}
          <div className="h-10 flex items-center justify-center">
            {!isPaired ? (
              <span className="text-xl opacity-30">🔗</span>
            ) : (
              renderWidgetEmojis(partnerVibes, '😴')
            )}
          </div>

          {/* Vibe names */}
          <p className="text-[11px] font-medium text-stone-600 dark:text-stone-300 truncate max-w-[90px] h-4">
            {!isPaired
              ? 'Unpaired'
              : renderWidgetNames(partnerVibes, 'Waiting...')}
          </p>

          {/* Relative timestamp */}
          <span className="text-[9px] text-stone-400 h-3">
            {formatRelativeTime(partnerVibeState?.updatedAt)}
          </span>
        </div>
      </div>

      {/* Widget Footer Action Button: "✨ SEND VIBE" */}
      <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80">
        <button
          id="widget-send-vibe-btn"
          onClick={onOpenSendVibe}
          className="w-full py-2 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-bold text-[11px] tracking-wide flex items-center justify-center space-x-1.5 shadow-sm transition cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          <span>SEND VIBE</span>
        </button>
      </div>
    </div>
  );
};
