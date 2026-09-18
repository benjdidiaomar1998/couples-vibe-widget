import React, { useState } from 'react';
import { Heart, Copy, Check, ArrowRight, RefreshCw, Unlink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CoupleData, CoupleMemberData } from '../types';

interface PairingScreenProps {
  currentUserId: string;
  currentUser: { uid: string; displayName: string; avatarBg: string };
  partner: CoupleMemberData | null;
  couple: CoupleData | null;
  onGenerateCode: () => Promise<{ code: string; expiresAt: number }>;
  onConnectCode: (code: string) => Promise<void>;
  onUnpair: () => Promise<void>;
  onClose?: () => void;
}

export const PairingScreen: React.FC<PairingScreenProps> = ({
  currentUser,
  partner,
  couple,
  onGenerateCode,
  onConnectCode,
  onUnpair,
}) => {
  const isPaired = Boolean(partner && couple);
  const [activeTab, setActiveTab] = useState<'share' | 'enter'>('share');
  const [myCode, setMyCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await onGenerateCode();
      setMyCode(res.code);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not create a code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await onConnectCode(inputCode.trim());
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F43F5E', '#EC4899', '#FB7185'],
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "We couldn't connect with that code. Please check and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm(`Disconnect from ${partner?.displayName || 'your partner'}?`)) {
      setIsLoading(true);
      try {
        await onUnpair();
        setMyCode(null);
        setInputCode('');
      } catch (err: any) {
        setErrorMsg('Could not disconnect. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div id="pairing-screen" className="flex-1 flex flex-col p-4 overflow-y-auto select-none">
      {/* Intimate Title */}
      <div className="text-center my-3">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 mb-2 shadow-2xs">
          <Heart className="w-5 h-5 fill-rose-500" />
        </div>
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
          {isPaired ? "You're connected ❤️" : 'Connect with your partner ❤️'}
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto mt-0.5">
          {isPaired
            ? 'Your home-screen widgets are synced in real time'
            : 'Pair your phones to see each other on your home screens'}
        </p>
      </div>

      {/* Connected State Banner */}
      {isPaired && partner ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-5 shadow-xs text-center space-y-4 my-2">
          <div className="flex items-center justify-center space-x-3">
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs"
              style={{ backgroundColor: currentUser.avatarBg }}
            >
              {currentUser.displayName.charAt(0).toUpperCase()}
            </span>
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs"
              style={{ backgroundColor: partner.avatarBg }}
            >
              {partner.displayName.charAt(0).toUpperCase()}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              {currentUser.displayName} & {partner.displayName}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Live and connected
            </p>
          </div>

          <div className="pt-2">
            <button
              id="disconnect-partner-btn"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="text-xs text-stone-400 hover:text-rose-500 flex items-center justify-center space-x-1 mx-auto transition cursor-pointer"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Unpair partner</span>
            </button>
          </div>
        </div>
      ) : (
        /* Pairing Flow */
        <div className="space-y-4 my-2">
          {/* Tabs: Share vs Enter */}
          <div className="flex p-1 bg-stone-100 dark:bg-stone-800/80 rounded-2xl">
            <button
              id="tab-share-code"
              onClick={() => setActiveTab('share')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'share'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Share Code
            </button>
            <button
              id="tab-enter-code"
              onClick={() => setActiveTab('enter')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'enter'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Enter Code
            </button>
          </div>

          {/* Tab 1: Share Code */}
          {activeTab === 'share' && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-5 text-center space-y-4 shadow-xs">
              {myCode ? (
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Your code
                  </span>
                  <div className="text-3xl font-mono font-black tracking-widest text-rose-500">
                    {myCode}
                  </div>
                  <p className="text-xs text-stone-400">
                    Share this with your partner.
                  </p>

                  <div className="flex items-center justify-center space-x-2 pt-2">
                    <button
                      id="copy-pairing-code-btn"
                      onClick={handleCopy}
                      className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy code'}</span>
                    </button>
                    <button
                      id="refresh-code-btn"
                      onClick={handleGenerate}
                      disabled={isLoading}
                      className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition cursor-pointer"
                      title="New code"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-4 space-y-3">
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Generate a simple one-time code to share with your partner.
                  </p>
                  <button
                    id="generate-pairing-code-btn"
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs tracking-wide shadow-sm active:scale-[0.98] transition cursor-pointer"
                  >
                    {isLoading ? 'Creating code...' : 'Generate Code'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Enter Partner's Code */}
          {activeTab === 'enter' && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-5 space-y-4 shadow-xs">
              <form onSubmit={handleConnect} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    Partner's Code
                  </label>
                  <input
                    id="input-partner-code"
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="7K4P-92"
                    maxLength={10}
                    className="w-full text-center text-xl font-mono font-bold tracking-widest px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 uppercase focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <button
                  id="connect-with-partner-btn"
                  type="submit"
                  disabled={isLoading || !inputCode.trim()}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] transition cursor-pointer"
                >
                  <span>{isLoading ? 'Connecting...' : 'Connect'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 text-center">
              {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
