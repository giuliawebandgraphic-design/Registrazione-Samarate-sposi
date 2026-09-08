import React from 'react';
import { 
  Heart, 
  Users, 
  QrCode, 
  Calendar, 
  MapPin, 
  Lock,
  Unlock,
  ShieldAlert,
  Cloud,
  CheckCircle2
} from 'lucide-react';
import { FairEventInfo } from '../types';
import { SamarateLogo } from './SamarateLogo';

interface HeaderProps {
  currentTab: 'register' | 'pass' | 'desk';
  onSelectTab: (tab: 'register' | 'pass' | 'desk') => void;
  eventInfo: FairEventInfo;
  hasActivePass: boolean;
  totalAttendeesCount: number;
  isStaffMode: boolean;
  isStandalone?: boolean;
  isCloudConnected?: boolean;
  onOpenStaffLogin: () => void;
  onExitStaffMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  eventInfo,
  hasActivePass,
  totalAttendeesCount,
  isStaffMode,
  isStandalone = false,
  isCloudConnected = true,
  onOpenStaffLogin,
  onExitStaffMode,
}) => {
  return (
    <header className="no-print bg-[#F7F4EC]/95 backdrop-blur-md sticky top-0 z-40 border-b border-[#CAC8AA]/70 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo and Event Branding */}
          <div 
            className="flex items-center gap-4 cursor-pointer" 
            onClick={() => onSelectTab('register')}
            title="Torna alla registrazione"
          >
            <SamarateLogo size="md" variant="dark" showSubline={true} />
            
            <div className="hidden lg:block pl-3 border-l border-[#CAC8AA]/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#16391C]">
                <Calendar className="w-3.5 h-3.5 text-[#A89236]" />
                <span>{eventInfo.dates}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#99A99C]">
                <MapPin className="w-3.5 h-3.5 text-[#A89236]" />
                <span>{eventInfo.venue} • {eventInfo.city}</span>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            <nav className="flex items-center bg-white/80 p-1.5 rounded-2xl border border-[#CAC8AA] text-xs shadow-2xs">
              {/* Tab 1: Guest Registration */}
              <button
                id="tab-btn-register"
                onClick={() => onSelectTab('register')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                  currentTab === 'register'
                    ? 'bg-[#16391C] text-white shadow-xs'
                    : 'text-[#16391C]/75 hover:text-[#16391C] hover:bg-[#F7F4EC]'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${currentTab === 'register' ? 'fill-[#A89236] text-[#A89236]' : 'text-[#A89236]'}`} />
                <span>Registra Sposi</span>
              </button>

              {/* Tab 2: Guest Pass */}
              <button
                id="tab-btn-pass"
                onClick={() => onSelectTab('pass')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all relative cursor-pointer ${
                  currentTab === 'pass'
                    ? 'bg-[#16391C] text-white shadow-xs'
                    : 'text-[#16391C]/75 hover:text-[#16391C] hover:bg-[#F7F4EC]'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-[#A89236]" />
                <span>Il Mio Pass QR</span>
                {hasActivePass && (
                  <span className="w-2 h-2 rounded-full bg-[#A89236] ring-2 ring-white"></span>
                )}
              </button>

              {/* Tab 3: Staff Reception Desk (Visible ONLY when Staff Mode is Unlocked) */}
              {isStaffMode && (
                <button
                  id="tab-btn-desk"
                  onClick={() => onSelectTab('desk')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                    currentTab === 'desk'
                      ? 'bg-[#16391C] text-white shadow-xs'
                      : 'text-[#16391C]/75 hover:text-[#16391C] hover:bg-[#F7F4EC]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-[#A89236]" />
                  <span className="hidden sm:inline">Desk Accoglienza</span>
                  <span className="sm:hidden">Desk</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    currentTab === 'desk'
                      ? 'bg-[#A89236] text-[#16391C]'
                      : 'bg-[#CAC8AA]/50 text-[#16391C]'
                  }`}>
                    {totalAttendeesCount}
                  </span>
                </button>
              )}
            </nav>

            {/* Cloud Sync Status Indicator */}
            <div 
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/70 border border-[#CAC8AA]/80 text-[11px] font-medium text-[#16391C]"
              title={isCloudConnected ? "Database sincronizzato in tempo reale su tutti i dispositivi" : "Connessione al database in corso..."}
            >
              <Cloud className="w-3.5 h-3.5 text-[#A89236]" />
              <span className="hidden xl:inline">Database Live</span>
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            </div>

            {/* Staff Mode Access / Toggle Button (Hidden in Standalone Public Mode) */}
            {!isStandalone && (
              isStaffMode ? (
                <button
                  onClick={onExitStaffMode}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 border border-amber-300 text-xs font-semibold transition-all cursor-pointer"
                  title="Esci dall'area riservata e torna a vista Ospiti"
                >
                  <Unlock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Blocca Desk</span>
                </button>
              ) : (
                <button
                  onClick={onOpenStaffLogin}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 hover:bg-white text-[#16391C]/80 hover:text-[#16391C] border border-[#CAC8AA] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  title="Accesso riservato agli organizzatori della fiera"
                >
                  <Lock className="w-3.5 h-3.5 text-[#A89236]" />
                  <span className="hidden md:inline">Area Staff</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
