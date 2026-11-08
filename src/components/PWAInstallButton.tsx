import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#f2efeb] bg-[#ff3e3e]/20 border border-[#ff3e3e]/50 hover:bg-[#ff3e3e]/30 rounded-md transition-colors"
        aria-label="Install kaGO.PIaY PWA"
      >
        <Download className="w-3.5 h-3.5 text-[#ff3e3e]" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#f2efeb]/80 bg-[#141418] border border-[#22222a] hover:border-[#ff3e3e]/40 rounded-md transition-colors"
          aria-label="Install instructions for iOS"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#ff3e3e]" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-[#141418] border border-[#22222a] p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#22222a]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#f2efeb]">
                  Install on iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-[#f2efeb]/60 hover:text-[#f2efeb]"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#f2efeb]/80">
                1. Tap the <strong className="text-[#ff3e3e]">Share</strong> button in Safari toolbar.
                <br />
                2. Scroll down and tap <strong className="text-[#ff3e3e]">Add to Home Screen</strong>.
                <br />
                3. Launch kaGO.PIaY in full-screen standalone audio mode.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-md bg-[#ff3e3e] py-2 text-xs font-bold text-white uppercase tracking-wider hover:bg-[#e03030] transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
