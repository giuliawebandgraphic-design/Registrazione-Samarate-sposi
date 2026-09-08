import React from 'react';
import { 
  Heart, 
  Search, 
  Calendar, 
  MapPin, 
  Cloud,
  Users
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
  isCloudConnected = true,
}) => {
  return (
    <header className="no-print bg-[#F7F4EC]/95 backdrop-blur-md sticky top-0 z-40 border-b border-[#CAC8AA]/70 shadow-xs">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          {/* Logo and Event Branding */}
          <div 
            className="flex items-center gap-2 sm:gap-4 cursor-pointer shrink-0" 
            onClick={() => onSelectTab('register')}
            title="Torna alla registrazione"
          >
            <div className="hidden sm:block">
              <SamarateLogo size="md" variant="dark" />
            </div>
            <div className="sm:hidden">
              <SamarateLogo size="sm" variant="dark" />
            </div>
            
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
          <div className="flex items-center gap-1.5 sm:gap-3">
            <nav className="flex items-center bg-white/90 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-[#CAC8AA] text-xs shadow-2xs">
              {/* Tab 1: Guest Registration */}
              <button
                id="tab-btn-register"
                onClick={() => onSelectTab('register')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  currentTab === 'register'
                    ? 'bg-[#16391C] text-white shadow-xs'
                    : 'text-[#16391C]/75 hover:text-[#16391C] hover:bg-[#F7F4EC]'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 shrink-0 ${currentTab === 'register' ? 'fill-[#A89236] text-[#A89236]' : 'text-[#A89236]'}`} />
                <span className="hidden sm:inline">Registra Sposi</span>
                <span className="sm:hidden">Registra</span>
              </button>

              {/* Tab 2: Trova il mio pass */}
              <button
                id="tab-btn-pass"
                onClick={() => onSelectTab('pass')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold transition-all relative cursor-pointer whitespace-nowrap ${
                  currentTab === 'pass'
                    ? 'bg-[#16391C] text-white shadow-xs'
                    : 'text-[#16391C]/75 hover:text-[#16391C] hover:bg-[#F7F4EC]'
                }`}
              >
                <Search className="w-3.5 h-3.5 shrink-0 text-[#A89236]" />
                <span className="hidden sm:inline">Trova il mio pass</span>
                <span className="sm:hidden">Trova Pass</span>
                {hasActivePass && (
                  <span className="w-2 h-2 rounded-full bg-[#A89236] ring-2 ring-white"></span>
                )}
              </button>

              {/* Tab 3: Only when Staff Mode is ALREADY unlocked */}
              {isStaffMode && (
                <button
                  id="tab-btn-desk"
                  onClick={() => onSelectTab('desk')}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    currentTab === 'desk'
                      ? 'bg-[#16391C] text-white shadow-xs'
                      : 'text-[#16391C]/75 hover:text-[#16391C] hover:bg-[#F7F4EC]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0 text-[#A89236]" />
                  <span>Desk</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
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
              title={isCloudConnected ? "Database connesso" : "Connessione in corso..."}
            >
              <Cloud className="w-3.5 h-3.5 text-[#A89236]" />
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
