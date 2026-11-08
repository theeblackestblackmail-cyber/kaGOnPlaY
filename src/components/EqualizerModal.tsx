import React, { useEffect, useState } from 'react';
import { Sliders, Volume2, X, Zap, RotateCcw } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { EQ_FREQUENCIES, EQ_PRESETS } from '../utils/audioPresets';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const [eqGains, setEqGains] = useState<[number, number, number, number, number]>([0, 0, 0, 0, 0]);
  const [activePreset, setActivePreset] = useState('Flat');
  const [bassBoostEnabled, setBassBoostEnabled] = useState(false);
  const [bassBoostGain, setBassBoostGain] = useState(6);
  const [crossfade, setCrossfade] = useState(3);

  useEffect(() => {
    const updateFromEngine = () => {
      const state = audioEngine.getState();
      setEqGains(state.eqGains);
      setActivePreset(state.activePresetName);
      setBassBoostEnabled(state.bassBoostEnabled);
      setBassBoostGain(state.bassBoostGain);
      setCrossfade(state.crossfadeDuration);
    };

    updateFromEngine();
    return audioEngine.subscribe(updateFromEngine);
  }, []);

  if (!isOpen) return null;

  const handleBandChange = (index: number, val: number) => {
    audioEngine.setEqGain(index, val);
  };

  const handlePresetSelect = (presetName: string) => {
    audioEngine.setEqPreset(presetName);
  };

  const handleBassToggle = () => {
    audioEngine.setBassBoost(!bassBoostEnabled, bassBoostGain);
  };

  const handleBassGainChange = (gain: number) => {
    audioEngine.setBassBoost(bassBoostEnabled, gain);
  };

  const handleResetFlat = () => {
    audioEngine.setEqPreset('Flat');
    audioEngine.setBassBoost(false, 6);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-[#0c0c0e] border border-[#22222a] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#22222a]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#ff3e3e]/15 border border-[#ff3e3e]/40 text-[#ff3e3e]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-[#f2efeb]">
                Hardware DSP Studio
              </h2>
              <p className="text-xs font-mono text-[#f2efeb]/60">
                5-Band Graphic EQ & 80Hz Low-Shelf Sub Bass
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#f2efeb]/60 hover:text-[#f2efeb] rounded-lg hover:bg-[#141418] transition"
            aria-label="Close Equalizer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 12 Hardware Presets Selector */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#f2efeb]/80">
              Hardware Presets ({EQ_PRESETS.length})
            </label>
            <button
              onClick={handleResetFlat}
              className="flex items-center gap-1 text-[11px] font-mono text-[#ff3e3e] hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Flat</span>
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {EQ_PRESETS.map((p) => {
              const isSelected = activePreset.toLowerCase() === p.name.toLowerCase();
              return (
                <button
                  key={p.name}
                  onClick={() => handlePresetSelect(p.name)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#ff3e3e] text-white shadow-[0_0_12px_rgba(255,62,62,0.6)] font-bold'
                      : 'bg-[#141418] border border-[#22222a] text-[#f2efeb]/70 hover:border-[#ff3e3e]/40 hover:text-[#f2efeb]'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Band Biquad Graphic Equalizer Faders */}
        <div className="mt-6 p-4 rounded-xl bg-[#141418] border border-[#22222a]">
          <div className="flex items-center justify-between mb-4 text-xs font-mono text-[#f2efeb]/60">
            <span>+12 dB</span>
            <span className="text-[#ff3e3e] font-bold">BIQUAD FILTER GRAPH</span>
            <span>-12 dB</span>
          </div>

          <div className="grid grid-cols-5 gap-3 items-center text-center">
            {EQ_FREQUENCIES.map((freq, idx) => {
              const gainVal = eqGains[idx] || 0;
              const formattedFreq = freq >= 1000 ? `${freq / 1000}kHz` : `${freq}Hz`;

              return (
                <div key={freq} className="flex flex-col items-center">
                  {/* Gain label */}
                  <span className="text-xs font-mono font-bold text-[#ff3e3e] mb-2 tabular-nums">
                    {gainVal > 0 ? `+${gainVal}` : gainVal}dB
                  </span>

                  {/* Vertical Fader Slider */}
                  <div className="h-36 flex items-center justify-center">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={gainVal}
                      onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                      className="h-32 w-2 appearance-none bg-[#22222a] rounded-lg accent-[#ff3e3e] cursor-pointer"
                      style={{
                        writingMode: 'vertical-lr',
                        direction: 'rtl',
                      }}
                      aria-label={`${formattedFreq} EQ Fader`}
                    />
                  </div>

                  {/* Frequency label */}
                  <span className="text-[11px] font-mono text-[#f2efeb]/80 mt-2 font-semibold">
                    {formattedFreq}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 80Hz Low-shelf Bass Boost Module */}
        <div className="mt-5 p-4 rounded-xl bg-[#141418] border border-[#22222a]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${bassBoostEnabled ? 'text-[#ff3e3e]' : 'text-[#f2efeb]/40'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-[#f2efeb]">
                80Hz Low-Shelf Bass Boost
              </span>
            </div>
            <button
              onClick={handleBassToggle}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-full transition-colors ${
                bassBoostEnabled
                  ? 'bg-[#ff3e3e] text-white shadow-[0_0_10px_#ff3e3e]'
                  : 'bg-[#22222a] text-[#f2efeb]/50'
              }`}
            >
              {bassBoostEnabled ? 'ACTIVE (+dB)' : 'BYPASS'}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="14"
              step="0.5"
              disabled={!bassBoostEnabled}
              value={bassBoostGain}
              onChange={(e) => handleBassGainChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-[#22222a] rounded-lg accent-[#ff3e3e] cursor-pointer disabled:opacity-30"
              aria-label="Bass boost gain"
            />
            <span className="w-16 text-right text-xs font-mono font-bold text-[#ff3e3e] tabular-nums">
              +{bassBoostGain.toFixed(1)} dB
            </span>
          </div>
        </div>

        {/* Crossfader Duration Control */}
        <div className="mt-4 p-4 rounded-xl bg-[#141418] border border-[#22222a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#f2efeb]">
              Channel Crossfader Duration
            </span>
            <span className="text-xs font-mono font-bold text-[#ff3e3e] tabular-nums">
              {crossfade === 0 ? 'Cut (0.0s)' : `${crossfade.toFixed(1)}s`}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-[#f2efeb]/40">0s (CUT)</span>
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={crossfade}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCrossfade(val);
                audioEngine.setCrossfadeDuration(val);
              }}
              className="flex-1 h-2 bg-[#22222a] rounded-lg accent-[#ff3e3e] cursor-pointer"
              aria-label="Crossfade duration"
            />
            <span className="text-[10px] font-mono text-[#f2efeb]/40">12s (MAX)</span>
          </div>
          <p className="mt-2 text-[10px] font-mono text-[#f2efeb]/50">
            Crossfades between Channel 0 and Channel 1 on track change without muting.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#ff3e3e] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#e03030] transition shadow-[0_0_12px_rgba(255,62,62,0.4)]"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
