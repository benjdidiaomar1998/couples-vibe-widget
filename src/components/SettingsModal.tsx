import React, { useState } from 'react';
import { X, Bell, User, Unlink, RotateCcw, Check } from 'lucide-react';
import { CoupleData, CoupleMemberData } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { uid: string; displayName: string; avatarBg: string };
  partner: CoupleMemberData | null;
  couple: CoupleData | null;
  onUpdateProfile: (name: string, color: string) => Promise<void>;
  onUnpair: () => Promise<void>;
  onResetDemo: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  partner,
  couple,
  onUpdateProfile,
  onUnpair,
  onResetDemo,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [avatarColor, setAvatarColor] = useState(currentUser.avatarBg);
  const [notifyVibes, setNotifyVibes] = useState(true);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const colorPalette = [
    '#F43F5E', // Rose
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    await onUpdateProfile(displayName.trim(), avatarColor);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div
        id="settings-modal-container"
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Settings & Account
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Profile form */}
          <form onSubmit={handleSave} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Your Profile
            </h3>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={20}
                className="w-full py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">
                Avatar Theme Color
              </label>
              <div className="flex items-center space-x-2">
                {colorPalette.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      avatarColor === color ? 'scale-125 ring-2 ring-stone-900 dark:ring-white ring-offset-2' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-stone-800 dark:bg-stone-700 hover:bg-stone-900 text-white font-medium text-xs flex items-center space-x-1.5 transition"
            >
              {saved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
              <span>{saved ? 'Saved!' : 'Save Profile'}</span>
            </button>
          </form>

          {/* Notifications Section */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Notifications
            </h3>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2.5">
                <Bell className="w-4 h-4 text-stone-500" />
                <div>
                  <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Partner Vibe Alerts
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Notify when your partner sends new vibes
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotifyVibes(!notifyVibes)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  notifyVibes ? 'bg-rose-500' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    notifyVibes ? 'left-5' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Connection management */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Partner Connection
            </h3>
            {partner && couple ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40">
                <div>
                  <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    Connected with {partner.displayName}
                  </div>
                  <div className="text-[10px] text-stone-500">
                    ID: {couple.id.substring(0, 16)}...
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Disconnect from partner?')) {
                      await onUnpair();
                      onClose();
                    }
                  }}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 px-2 py-1 rounded bg-white dark:bg-stone-800 border border-rose-200 shadow-2xs flex items-center space-x-1"
                >
                  <Unlink className="w-3 h-3" />
                  <span>Unpair</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-stone-400">
                Currently unpaired. Open the Partner tab to pair.
              </div>
            )}
          </div>

          {/* Demo Reset */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={async () => {
                await onResetDemo();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-medium flex items-center justify-center space-x-2 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Demo Sample Couple</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
