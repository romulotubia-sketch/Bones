import React from 'react';
import { Activity, Download, RotateCcw, Settings, Volume2, VolumeX, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

export interface SettingsModalProps {
  muted: boolean;
  joystickScale: number;
  skillButtonScale: number;
  disableScreenShake?: boolean;
  onUpdateSettings: (patch: {
    muted?: boolean;
    joystickScale?: number;
    skillButtonScale?: number;
    disableScreenShake?: boolean;
  }) => void;
  onClose: () => void;
}

const SCALE_MIN = 0.7;
const SCALE_MAX = 1.35;
const SCALE_STEP = 0.05;

const PRESETS: { label: string; value: number }[] = [
  { label: 'Compact (80%)', value: 0.8 },
  { label: 'Default (100%)', value: 1.0 },
  { label: 'Large (120%)', value: 1.2 },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  muted,
  joystickScale,
  skillButtonScale,
  disableScreenShake = false,
  onUpdateSettings,
  onClose,
}) => {
  const handleToggleSound = (nextMuted: boolean) => {
    onUpdateSettings({ muted: nextMuted });
  };

  const handleToggleScreenShake = (disabled: boolean) => {
    soundEngine.playUiClick(500);
    onUpdateSettings({ disableScreenShake: disabled });
  };

  const handleResetDefaults = () => {
    soundEngine.playUiClick(520);
    onUpdateSettings({
      muted: false,
      joystickScale: 1.0,
      skillButtonScale: 1.0,
      disableScreenShake: false,
    });
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2.5 sm:p-4 safe-hud-insets pointer-events-auto"
    >
      <div
        role="dialog"
        aria-label="Game Settings"
        className="w-full max-w-xl max-h-full flex flex-col bg-[#16131E] border border-[#352E47] rounded-2xl shadow-2xl overflow-hidden text-[#F5F0E6]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#1C1827] border-b border-[#2C253B] shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#4ADE80]" />
            <h2 className="font-display text-sm sm:text-base font-bold text-[#F5F0E6]">
              Settings &amp; Controls
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(460);
              onClose();
            }}
            aria-label="Close settings"
            className="min-w-[38px] min-h-[38px] rounded-xl text-[#ABA3BC] hover:text-white active:bg-[#282238] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3">
          {/* Audio Mute / Unmute */}
          <div className="p-3 rounded-xl bg-[#1D1928] border border-[#2E273F] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#F5F0E6]">Game Audio</div>
              <p className="text-[11px] text-[#A39BB5] leading-snug">
                Choose whether sound effects and combat audio play or stay muted.
              </p>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#120F19] border border-[#2B243A] shrink-0">
              <button
                type="button"
                onClick={() => handleToggleSound(false)}
                className={`min-h-[38px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  !muted
                    ? 'bg-[#4ADE80] text-[#0E1912]'
                    : 'text-[#9E96B0] hover:text-[#F5F0E6]'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Sound On</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleSound(true)}
                className={`min-h-[38px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  muted
                    ? 'bg-[#FB7185] text-[#1F0810]'
                    : 'text-[#9E96B0] hover:text-[#F5F0E6]'
                }`}
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Muted</span>
              </button>
            </div>
          </div>

          {/* Screen Shake Setting Toggle */}
          <div className="p-3 rounded-xl bg-[#1D1928] border border-[#2E273F] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#F5F0E6] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Screen Shake</span>
              </div>
              <p className="text-[11px] text-[#A39BB5] leading-snug">
                Camera rumble and impact feedback on heavy strikes, critical hits, and boss slams.
              </p>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#120F19] border border-[#2B243A] shrink-0">
              <button
                type="button"
                onClick={() => handleToggleScreenShake(false)}
                className={`min-h-[38px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  !disableScreenShake
                    ? 'bg-[#38BDF8] text-[#0A1A24]'
                    : 'text-[#9E96B0] hover:text-[#F5F0E6]'
                }`}
              >
                <span>Enabled</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleScreenShake(true)}
                className={`min-h-[38px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  disableScreenShake
                    ? 'bg-[#FB7185] text-[#1F0810]'
                    : 'text-[#9E96B0] hover:text-[#F5F0E6]'
                }`}
              >
                <span>Disabled</span>
              </button>
            </div>
          </div>

          {/* Touch Controls Grid: Joystick Size + Skill Buttons Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Joystick Scale */}
            <div className="p-3 rounded-xl bg-[#1D1928] border border-[#2E273F] flex flex-col justify-between gap-2.5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-bold text-[#F5F0E6]">
                    Joystick Size
                  </span>
                  <span className="font-mono-num text-xs font-bold text-[#4ADE80]">
                    {Math.round(joystickScale * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-[#A39BB5] mt-0.5 leading-snug">
                  Left-thumb virtual movement stick scale.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  aria-label="Joystick size percentage"
                  min={SCALE_MIN}
                  max={SCALE_MAX}
                  step={SCALE_STEP}
                  value={joystickScale}
                  onChange={(e) =>
                    onUpdateSettings({ joystickScale: parseFloat(e.target.value) })
                  }
                  className="flex-1 accent-[#4ADE80] h-2 bg-[#110E18] rounded-lg cursor-pointer"
                />
                {/* Live visual size indicator */}
                <div className="w-12 h-12 rounded-xl bg-[#120F19] border border-[#2B243A] flex items-center justify-center shrink-0 overflow-hidden">
                  <div
                    className="w-7 h-7 rounded-full border-2 border-[#4ADE80] bg-[#182220] flex items-center justify-center transition-transform duration-100 will-change-transform"
                    style={{ transform: `scale(${joystickScale})` }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80]" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {PRESETS.map((preset) => {
                  const active = Math.abs(joystickScale - preset.value) < 0.02;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(540);
                        onUpdateSettings({ joystickScale: preset.value });
                      }}
                      className={`min-h-[30px] px-1.5 rounded-lg text-[10px] font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#283B33] border border-[#4ADE80] text-[#DCFCE7]'
                          : 'bg-[#13101B] border border-[#292338] text-[#9E96B0]'
                      }`}
                    >
                      {preset.label.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skill Buttons Scale */}
            <div className="p-3 rounded-xl bg-[#1D1928] border border-[#2E273F] flex flex-col justify-between gap-2.5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-bold text-[#F5F0E6]">
                    Skill Buttons Size
                  </span>
                  <span className="font-mono-num text-xs font-bold text-[#38BDF8]">
                    {Math.round(skillButtonScale * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-[#A39BB5] mt-0.5 leading-snug">
                  Right-thumb attack, normal &amp; ultimate cluster scale.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  aria-label="Skill buttons size percentage"
                  min={SCALE_MIN}
                  max={SCALE_MAX}
                  step={SCALE_STEP}
                  value={skillButtonScale}
                  onChange={(e) =>
                    onUpdateSettings({ skillButtonScale: parseFloat(e.target.value) })
                  }
                  className="flex-1 accent-[#38BDF8] h-2 bg-[#110E18] rounded-lg cursor-pointer"
                />
                {/* Live visual size indicator */}
                <div className="w-12 h-12 rounded-xl bg-[#120F19] border border-[#2B243A] flex items-center justify-center shrink-0 overflow-hidden">
                  <div
                    className="relative w-8 h-8 flex items-center justify-center transition-transform duration-100 will-change-transform"
                    style={{ transform: `scale(${skillButtonScale})` }}
                  >
                    <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-[1.5px] border-[#38BDF8] bg-[#182436]" />
                    <span className="absolute bottom-1 left-0.5 w-2.5 h-2.5 rounded-full border border-[#FBBF24] bg-[#2C2314]" />
                    <span className="absolute top-0.5 right-1 w-2.5 h-2.5 rounded-full border border-[#FB7185] bg-[#2B1620]" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {PRESETS.map((preset) => {
                  const active = Math.abs(skillButtonScale - preset.value) < 0.02;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(560);
                        onUpdateSettings({ skillButtonScale: preset.value });
                      }}
                      className={`min-h-[30px] px-1.5 rounded-lg text-[10px] font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#1A2D42] border border-[#38BDF8] text-[#E0F2FE]'
                          : 'bg-[#13101B] border border-[#292338] text-[#9E96B0]'
                      }`}
                    >
                      {preset.label.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Direct Offline Game & Source Download */}
          <div className="p-3 rounded-xl bg-[#1D1928] border border-[#2E273F] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#F5F0E6]">
                Direct Game Download
              </div>
              <p className="text-[11px] text-[#A39BB5] leading-snug">
                Download a standalone offline HTML copy or full project source archive.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/api/download/game"
                download="hearth-and-bone.html"
                onClick={() => soundEngine.playUiClick(580)}
                className="min-h-[36px] px-3 rounded-lg bg-[#4ADE80] text-[#0E1912] text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Playable HTML</span>
              </a>
              <a
                href="/api/download/source.zip"
                download="hearth-and-bone-source.zip"
                onClick={() => soundEngine.playUiClick(540)}
                className="min-h-[36px] px-3 rounded-lg bg-[#272236] border border-[#3B3350] text-[#E4DFD3] text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Source ZIP</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 bg-[#1C1827] border-t border-[#2C253B] shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="min-h-[40px] px-3.5 rounded-xl bg-[#252034] text-[#D6D0C4] text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#ABA3BC]" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(600);
              onClose();
            }}
            className="min-h-[40px] px-6 rounded-xl bg-[#4ADE80] text-[#0E1912] text-xs font-bold active:scale-95 transition-transform whitespace-nowrap"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
