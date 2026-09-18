import React from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { CoupleData, CoupleMemberData } from '../types';
import { getVibeById } from '../data/vibes';

interface HistoryScreenProps {
  currentUserId: string;
  currentUser: { uid: string; displayName: string; avatarBg: string };
  partner: CoupleMemberData | null;
  couple: CoupleData | null;
  onOpenVibeSelector: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  currentUserId,
  partner,
  couple,
  onOpenVibeSelector,
}) => {
  const history = couple?.vibeHistory || [];

  // Group moments by "Today", "Yesterday", "Earlier"
  const groupEvents = () => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const groups: { label: string; events: typeof history }[] = [
      { label: 'Today', events: [] },
      { label: 'Yesterday', events: [] },
      { label: 'Earlier', events: [] },
    ];

    history.forEach((event) => {
      const eventDate = new Date(event.timestamp).toDateString();
      if (eventDate === today) {
        groups[0].events.push(event);
      } else if (eventDate === yesterday) {
        groups[1].events.push(event);
      } else {
        groups[2].events.push(event);
      }
    });

    return groups.filter((g) => g.events.length > 0);
  };

  const formatClockTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const grouped = groupEvents();

  return (
    <div id="moments-screen" className="flex-1 flex flex-col p-4 overflow-y-auto select-none">
      {/* Intimate header */}
      <div className="pb-3 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Moments
          </h2>
          <p className="text-[11px] text-stone-400">
            A quiet timeline of vibes you've shared
          </p>
        </div>
        <button
          onClick={onOpenVibeSelector}
          className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center space-x-1 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Send vibe</span>
        </button>
      </div>

      {/* Shared memory timeline */}
      <div className="flex-1 py-3">
        {grouped.length > 0 ? (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1">
                  {group.label}
                </div>
                <div className="space-y-1.5">
                  {group.events.map((event) => {
                    const isMe = event.senderId === currentUserId;
                    const vibeObjs = event.vibes
                      .map((id) => getVibeById(id))
                      .filter(Boolean);

                    return (
                      <div
                        key={event.id}
                        className="py-2.5 px-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800/80 shadow-2xs flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="text-xl shrink-0">
                            {vibeObjs.map((v) => v!.emoji).join(' ')}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                              <span
                                className={
                                  isMe
                                    ? 'text-rose-500 font-semibold'
                                    : 'font-semibold text-stone-800 dark:text-stone-200'
                                }
                              >
                                {isMe ? 'You' : event.senderName}
                              </span>
                              <span className="text-stone-500 dark:text-stone-400 ml-1.5 font-normal">
                                {vibeObjs.map((v) => v!.name).join(' · ')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-stone-400 shrink-0 ml-3">
                          {formatClockTime(event.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-400 flex items-center justify-center mb-2">
              <Heart className="w-5 h-5 fill-rose-400" />
            </div>
            <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
              No shared moments yet
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5 max-w-[200px]">
              When you or {partner ? partner.displayName : 'your partner'} send a vibe, it will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
