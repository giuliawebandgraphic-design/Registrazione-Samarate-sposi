import React, { useState, useEffect } from 'react';
import { Attendee, FairEventInfo } from './types';
import { DEFAULT_EVENT, INITIAL_ATTENDEES } from './data/initialData';
import { Header } from './components/Header';
import { RegistrationForm } from './components/RegistrationForm';
import { BadgePassCard } from './components/BadgePassCard';
import { OrganizerDesk } from './components/OrganizerDesk';
import { BadgeModal } from './components/BadgeModal';
import { SamarateLogo } from './components/SamarateLogo';
import { AdminPinModal } from './components/AdminPinModal';
import { 
  testConnection, 
  subscribeToAttendees, 
  saveAttendeeToCloud, 
  deleteAttendeeFromCloud, 
  seedInitialAttendeesIfEmpty 
} from './lib/firebase';
import { 
  QrCode, 
  Search, 
  CheckCircle2, 
  ArrowRight, 
  Lock,
  Unlock,
  ShieldCheck
} from 'lucide-react';

const STORAGE_KEY_ATTENDEES = 'samarate_sposi_attendees_v1';
const STORAGE_KEY_LAST_PASS = 'samarate_sposi_last_pass_id_v1';
const STORAGE_KEY_STAFF_AUTH = 'samarate_sposi_staff_auth_v1';
const STAFF_PIN = '1011'; // Date della fiera: 10 e 11 Ottobre

export default function App() {
  const [eventInfo] = useState<FairEventInfo>(DEFAULT_EVENT);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  
  // Initialize attendees from localStorage or initial demo couples
  const [attendees, setAttendees] = useState<Attendee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ATTENDEES);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return INITIAL_ATTENDEES;
  });

  // Real-time Cloud Synchronization with Firebase Firestore
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initCloudSync() {
      // 1. Validate connection to Firestore
      const isOnline = await testConnection();
      setIsCloudConnected(isOnline);

      // 2. Ensure initial seed exists in database
      await seedInitialAttendeesIfEmpty(INITIAL_ATTENDEES);

      // 3. Real-time synchronization stream across all devices
      unsubscribe = subscribeToAttendees(
        (remoteAttendees) => {
          setIsCloudConnected(true);
          if (remoteAttendees.length > 0) {
            setAttendees(remoteAttendees);
            
            // Sync activeAttendee if present
            setActiveAttendee(prev => {
              if (!prev) return null;
              const match = remoteAttendees.find(a => a.id === prev.id);
              return match || null;
            });
          }
        },
        (error) => {
          console.warn('Real-time sync alert, local mode maintained:', error);
          setIsCloudConnected(false);
        }
      );
    }

    initCloudSync();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Standalone external registration mode: true if URL has ?mode=register or ?view=register
  const [isStandaloneMode] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'register' || 
             params.get('view') === 'register' || 
             params.get('register') === '1' ||
             params.get('esterno') === '1';
    } catch {
      return false;
    }
  });

  // Staff Mode Authorization: true if authenticated or if ?staff=1 in URL (disabled in standalone mode)
  const [isStaffMode, setIsStaffMode] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'register' || params.get('view') === 'register') {
        return false;
      }
      if (params.get('staff') === '1' || params.get('desk') === '1') {
        return true;
      }
      return localStorage.getItem(STORAGE_KEY_STAFF_AUTH) === 'true';
    } catch {
      return false;
    }
  });

  // Modal for entering Staff PIN
  const [showPinModal, setShowPinModal] = useState<boolean>(false);

  // Current active badge being viewed/generated
  const [activeAttendee, setActiveAttendee] = useState<Attendee | null>(() => {
    try {
      const lastId = localStorage.getItem(STORAGE_KEY_LAST_PASS);
      if (lastId) {
        const found = INITIAL_ATTENDEES.find(a => a.id === lastId);
        if (found) return found;
      }
    } catch {
      // fallback
    }
    return null;
  });

  // Current view tab: 'register' | 'pass' | 'desk'
  const [currentTab, setCurrentTab] = useState<'register' | 'pass' | 'desk'>('register');

  // Modal for viewing any attendee badge from desk
  const [selectedModalAttendee, setSelectedModalAttendee] = useState<Attendee | null>(null);

  // Ticket lookup state for "Trova il mio pass" view
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupMessage, setLookupMessage] = useState('');
  const [matchingAttendees, setMatchingAttendees] = useState<Attendee[]>([]);

  // Persist attendees changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ATTENDEES, JSON.stringify(attendees));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }, [attendees]);

  // Handle successful registration (Guests)
  const handleRegistrationSuccess = async (newAttendee: Attendee) => {
    setAttendees(prev => [newAttendee, ...prev]);
    setActiveAttendee(newAttendee);
    try {
      localStorage.setItem(STORAGE_KEY_LAST_PASS, newAttendee.id);
    } catch {
      // safe
    }
    setCurrentTab('pass');

    // Real-time Cloud Save
    try {
      await saveAttendeeToCloud(newAttendee);
    } catch (err) {
      console.warn('Could not save registration to cloud:', err);
    }
  };

  // Update existing attendee (e.g. check-in status from scanner or button)
  const handleUpdateAttendee = async (updated: Attendee) => {
    setAttendees(prev => prev.map(a => a.id === updated.id ? updated : a));
    if (activeAttendee && activeAttendee.id === updated.id) {
      setActiveAttendee(updated);
    }
    if (selectedModalAttendee && selectedModalAttendee.id === updated.id) {
      setSelectedModalAttendee(updated);
    }

    // Real-time Cloud Sync
    try {
      await saveAttendeeToCloud(updated);
    } catch (err) {
      console.warn('Could not update attendee in cloud:', err);
    }
  };

  // Delete attendee
  const handleDeleteAttendee = async (id: string) => {
    setAttendees(prev => prev.filter(a => a.id !== id));
    if (activeAttendee && activeAttendee.id === id) {
      setActiveAttendee(null);
    }

    // Real-time Cloud Sync
    try {
      await deleteAttendeeFromCloud(id);
    } catch (err) {
      console.warn('Could not delete attendee from cloud:', err);
    }
  };

  // Add manual attendee
  const handleAddManualAttendee = async (newAttendee: Attendee) => {
    setAttendees(prev => [newAttendee, ...prev]);

    // Real-time Cloud Sync
    try {
      await saveAttendeeToCloud(newAttendee);
    } catch (err) {
      console.warn('Could not save manual attendee to cloud:', err);
    }
  };

  // Staff Authentication Success
  const handleStaffUnlockSuccess = () => {
    setIsStaffMode(true);
    setShowPinModal(false);
    try {
      localStorage.setItem(STORAGE_KEY_STAFF_AUTH, 'true');
    } catch {
      // safe
    }
    setCurrentTab('desk');
  };

  // Exit Staff Mode
  const handleExitStaffMode = () => {
    setIsStaffMode(false);
    try {
      localStorage.removeItem(STORAGE_KEY_STAFF_AUTH);
    } catch {
      // safe
    }
    if (currentTab === 'desk') {
      setCurrentTab('register');
    }
  };

  // Switch tab safely with auth check
  const handleSelectTab = (tab: 'register' | 'pass' | 'desk') => {
    if (tab === 'desk' && !isStaffMode) {
      setShowPinModal(true);
      return;
    }
    setCurrentTab(tab);
  };

  // Search ticket lookup (for guests looking up their pass)
  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const q = lookupQuery.trim().toLowerCase();
    if (!q) return;

    const matches = attendees.filter(a => 
      a.id.toLowerCase() === q || 
      a.email.toLowerCase() === q ||
      a.lastName.toLowerCase() === q ||
      a.coupleNames.toLowerCase().includes(q) ||
      `${a.coupleNames} ${a.lastName}`.toLowerCase().includes(q)
    );

    if (matches.length === 1) {
      setActiveAttendee(matches[0]);
      setMatchingAttendees([]);
      setLookupMessage('');
    } else if (matches.length > 1) {
      setMatchingAttendees(matches);
      setLookupMessage('');
    } else {
      setMatchingAttendees([]);
      setLookupMessage('Nessun pass trovato con questi dati.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#16391C] flex flex-col selection:bg-[#A89236] selection:text-white font-sans">
      {/* Global Header & Nav */}
      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        eventInfo={eventInfo}
        hasActivePass={!!activeAttendee}
        totalAttendeesCount={attendees.length}
        isStaffMode={isStaffMode}
        isStandalone={isStandaloneMode}
        isCloudConnected={isCloudConnected}
        onOpenStaffLogin={() => setShowPinModal(true)}
        onExitStaffMode={handleExitStaffMode}
      />

      {/* Staff Status Notification Banner (visible only when outside of Desk) */}
      {isStaffMode && currentTab !== 'desk' && (
        <div className="no-print bg-[#16391C] text-[#F7F4EC] px-3 sm:px-4 py-1.5 text-xs border-b border-[#A89236]/40 animate-fade-in">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C4AF56]" />
              <span className="font-semibold text-[11px] sm:text-xs">Modalità Staff attiva</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentTab('desk')}
                className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#A89236] text-[#16391C] cursor-pointer hover:bg-[#bba33d] transition-colors"
              >
                Vai al Desk
              </button>
              <button
                onClick={handleExitStaffMode}
                className="flex items-center gap-1 text-[11px] font-medium text-[#C4AF56] hover:text-white cursor-pointer ml-1"
              >
                <Unlock className="w-3 h-3" />
                Esci
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab 1: Guest Registration Form */}
        {currentTab === 'register' && (
          <RegistrationForm
            eventInfo={eventInfo}
            onRegistered={handleRegistrationSuccess}
          />
        )}

        {/* Tab 2: Trova il mio pass */}
        {currentTab === 'pass' && (
          <div className="max-w-xl mx-auto space-y-5">
            {activeAttendee ? (
              <div className="space-y-3">
                {/* Minimal Top Bar */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16391C]">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>Pass: {activeAttendee.coupleNames} {activeAttendee.lastName}</span>
                  </div>
                  <button
                    onClick={() => {
                      setActiveAttendee(null);
                      setLookupQuery('');
                      setLookupMessage('');
                      setMatchingAttendees([]);
                    }}
                    className="text-xs text-[#A89236] hover:text-[#16391C] font-semibold underline cursor-pointer"
                  >
                    Cerca un altro pass
                  </button>
                </div>

                {/* Display Active Badge */}
                <BadgePassCard
                  attendee={activeAttendee}
                  eventInfo={eventInfo}
                  onNewRegistration={() => setCurrentTab('register')}
                />
              </div>
            ) : (
              /* Minimal Search Form */
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#CAC8AA]/70 shadow-xs text-center">
                <div className="w-12 h-12 bg-[#F7F4EC] text-[#16391C] rounded-2xl flex items-center justify-center mx-auto border border-[#CAC8AA] mb-3">
                  <Search className="w-5 h-5 text-[#A89236]" />
                </div>
                <h2 className="text-xl font-bold text-[#16391C] font-serif">
                  Trova il tuo Pass
                </h2>
                <p className="text-xs text-[#16391C]/70 mt-1 mb-5">
                  Inserisci email o cognome
                </p>

                <form onSubmit={handleLookup} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Email o cognome..."
                      value={lookupQuery}
                      onChange={e => {
                        setLookupQuery(e.target.value);
                        if (lookupMessage) setLookupMessage('');
                        if (matchingAttendees.length) setMatchingAttendees([]);
                      }}
                      className="w-full px-4 py-2.5 bg-[#F7F4EC]/40 rounded-xl text-xs sm:text-sm border border-[#CAC8AA] text-[#16391C] placeholder-[#99A99C] focus:outline-none focus:border-[#16391C] transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#16391C] hover:bg-[#1f4a25] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Cerca
                  </button>
                </form>

                {lookupMessage && (
                  <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
                    <span>{lookupMessage}</span>
                    <button
                      onClick={() => setCurrentTab('register')}
                      className="font-bold underline ml-2 cursor-pointer"
                    >
                      Registrati ora
                    </button>
                  </div>
                )}

                {/* Multiple Matches List */}
                {matchingAttendees.length > 1 && (
                  <div className="mt-4 space-y-2 text-left">
                    <p className="text-[11px] font-semibold text-[#99A99C] uppercase tracking-wider">
                      Seleziona il tuo pass:
                    </p>
                    {matchingAttendees.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setActiveAttendee(m);
                          setMatchingAttendees([]);
                          setLookupMessage('');
                        }}
                        className="w-full p-3 bg-[#F7F4EC]/60 hover:bg-[#F7F4EC] rounded-xl border border-[#CAC8AA] flex items-center justify-between text-xs transition-all cursor-pointer text-left"
                      >
                        <div>
                          <span className="font-bold text-[#16391C] block">{m.coupleNames} {m.lastName}</span>
                          <span className="text-[11px] text-[#99A99C]">ID: {m.id} • Data: {m.weddingDate}</span>
                        </div>
                        <span className="text-xs font-semibold text-[#A89236]">Apri Pass →</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-[#CAC8AA]/50 text-xs text-[#16391C]/70">
                  Non sei ancora registrato?{' '}
                  <button
                    onClick={() => setCurrentTab('register')}
                    className="font-semibold text-[#16391C] underline hover:text-[#A89236] cursor-pointer"
                  >
                    Registrati gratis
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Organizer Desk & Scanner (Visible ONLY in Staff Mode) */}
        {currentTab === 'desk' && isStaffMode && (
          <OrganizerDesk
            attendees={attendees}
            eventInfo={eventInfo}
            onUpdateAttendee={handleUpdateAttendee}
            onDeleteAttendee={handleDeleteAttendee}
            onAddAttendee={handleAddManualAttendee}
            onViewBadge={(attendee) => setSelectedModalAttendee(attendee)}
            onExitStaff={handleExitStaffMode}
          />
        )}
      </main>

      {/* Modal for entering Staff PIN */}
      <AdminPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handleStaffUnlockSuccess}
        staffPin={STAFF_PIN}
      />

      {/* Modal for viewing any attendee pass from Organizer Desk */}
      <BadgeModal
        attendee={selectedModalAttendee}
        eventInfo={eventInfo}
        onClose={() => setSelectedModalAttendee(null)}
      />

      {/* Elegant Wedding Footer */}
      <footer className="no-print mt-auto border-t border-[#CAC8AA]/60 bg-white/80 py-8 text-center text-xs text-[#16391C]/80">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SamarateLogo size="sm" />
            <div className="text-left pl-3 border-l border-[#CAC8AA]/70">
              <span className="block text-xs font-semibold text-[#16391C]">
                {eventInfo.dates}
              </span>
              <span className="block text-[11px] text-[#99A99C]">
                {eventInfo.venue} • {eventInfo.city}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right text-[11px] text-[#99A99C]">
            <div>
              <span className="block text-[#16391C] font-semibold">Salone Ufficiale per Futuri Sposi & Cerimonie</span>
              Pass d'ingresso gratuito con QR Code nominale
            </div>

            {/* Discrete Footer Staff Link */}
            {!isStandaloneMode && (
              <div className="sm:pl-4 sm:border-l border-[#CAC8AA]/40">
                {isStaffMode ? (
                  <div className="flex items-center gap-2 text-[10px] text-[#16391C]/50">
                    <button
                      onClick={() => setCurrentTab('desk')}
                      className="hover:text-[#16391C] underline font-medium cursor-pointer"
                    >
                      Desk
                    </button>
                    <span>•</span>
                    <button
                      onClick={handleExitStaffMode}
                      className="hover:text-rose-700 cursor-pointer"
                    >
                      Esci
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPinModal(true)}
                    className="text-[#16391C]/25 hover:text-[#16391C]/60 transition-colors cursor-pointer text-[10px] flex items-center gap-1 tracking-tight"
                    title="Staff"
                  >
                    <Lock className="w-2.5 h-2.5 opacity-25" />
                    <span>Desk</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
