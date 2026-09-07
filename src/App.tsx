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
    return INITIAL_ATTENDEES[0];
  });

  // Current view tab: 'register' | 'pass' | 'desk'
  const [currentTab, setCurrentTab] = useState<'register' | 'pass' | 'desk'>('register');

  // Modal for viewing any attendee badge from desk
  const [selectedModalAttendee, setSelectedModalAttendee] = useState<Attendee | null>(null);

  // Ticket lookup state for "Pass & QR" view when searching
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupMessage, setLookupMessage] = useState('');

  // Persist attendees changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ATTENDEES, JSON.stringify(attendees));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }, [attendees]);

  // Handle successful registration (Guests)
  const handleRegistrationSuccess = (newAttendee: Attendee) => {
    setAttendees(prev => [newAttendee, ...prev]);
    setActiveAttendee(newAttendee);
    try {
      localStorage.setItem(STORAGE_KEY_LAST_PASS, newAttendee.id);
    } catch {
      // safe
    }
    setCurrentTab('pass');
  };

  // Update existing attendee (e.g. check-in status)
  const handleUpdateAttendee = (updated: Attendee) => {
    setAttendees(prev => prev.map(a => a.id === updated.id ? updated : a));
    if (activeAttendee && activeAttendee.id === updated.id) {
      setActiveAttendee(updated);
    }
    if (selectedModalAttendee && selectedModalAttendee.id === updated.id) {
      setSelectedModalAttendee(updated);
    }
  };

  // Delete attendee
  const handleDeleteAttendee = (id: string) => {
    setAttendees(prev => prev.filter(a => a.id !== id));
    if (activeAttendee && activeAttendee.id === id) {
      setActiveAttendee(null);
    }
  };

  // Add manual attendee
  const handleAddManualAttendee = (newAttendee: Attendee) => {
    setAttendees(prev => [newAttendee, ...prev]);
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

    const found = attendees.find(a => 
      a.id.toLowerCase() === q || 
      a.email.toLowerCase() === q ||
      a.lastName.toLowerCase() === q ||
      a.coupleNames.toLowerCase().includes(q)
    );

    if (found) {
      setActiveAttendee(found);
      setLookupMessage('');
      setLookupQuery('');
    } else {
      setLookupMessage('Nessun pass trovato con questi dati. Verifica l\'ID Pass, il cognome o l\'email.');
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
        onOpenStaffLogin={() => setShowPinModal(true)}
        onExitStaffMode={handleExitStaffMode}
      />

      {/* Staff Status Notification Banner (visible only when in staff mode) */}
      {isStaffMode && (
        <div className="no-print bg-[#16391C] text-[#F7F4EC] px-4 py-2 text-xs border-b border-[#A89236]/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C4AF56]" />
              <span className="font-semibold">Area Riservata Staff Attiva</span>
              <span className="text-[#CAC8AA] hidden sm:inline">• Terminale di controllo ingressi e gestione visitatori</span>
            </div>
            <button
              onClick={handleExitStaffMode}
              className="flex items-center gap-1 text-[11px] font-bold text-[#C4AF56] hover:text-white underline cursor-pointer"
            >
              <Unlock className="w-3 h-3" />
              Blocca Desk & Torna a Vista Ospite
            </button>
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

        {/* Tab 2: Guest Badge & QR Code View */}
        {currentTab === 'pass' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Quick Banner if pass was just generated */}
            {activeAttendee && (
              <div className="no-print bg-white border border-[#CAC8AA] rounded-2xl p-4 text-[#16391C] flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#16391C] text-[#C4AF56] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm font-serif">Pass Sposi Generato con Successo!</h3>
                    <p className="text-xs text-[#16391C]/75">
                      Conserva questo QR code. Puoi scaricarlo in formato PDF per l'accesso gratuito al salone il 10 e 11 Ottobre.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Display Active Badge */}
            {activeAttendee ? (
              <BadgePassCard
                attendee={activeAttendee}
                eventInfo={eventInfo}
                onNewRegistration={() => setCurrentTab('register')}
              />
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-[#CAC8AA] text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 bg-[#F7F4EC] text-[#16391C] rounded-2xl flex items-center justify-center mx-auto border border-[#CAC8AA]">
                  <QrCode className="w-8 h-8 text-[#A89236]" />
                </div>
                <h3 className="text-xl font-bold text-[#16391C] font-serif">
                  Nessun pass selezionato al momento
                </h3>
                <p className="text-sm text-[#16391C]/70 max-w-md mx-auto">
                  Compila il modulo per registrare la coppia e ottenere subito il Pass d'Ingresso nominale, oppure recupera un pass precedentemente registrato.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setCurrentTab('register')}
                    className="px-6 py-3 bg-[#16391C] hover:bg-[#1f4a25] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    Vai alla Registrazione Sposi
                    <ArrowRight className="w-4 h-4 text-[#A89236]" />
                  </button>
                </div>
              </div>
            )}

            {/* Lookup existing pass form */}
            <div className="no-print bg-white rounded-3xl p-6 border border-[#CAC8AA] shadow-xs mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#16391C] mb-2 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#A89236]" />
                Hai già effettuato la registrazione? Recupera il tuo Pass
              </h4>
              <form onSubmit={handleLookup} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Inserisci ID Pass (es. SS-25-K8X92), Cognome o Email..."
                  value={lookupQuery}
                  onChange={e => {
                    setLookupQuery(e.target.value);
                    if (lookupMessage) setLookupMessage('');
                  }}
                  className="flex-1 px-3.5 py-2.5 bg-[#F7F4EC]/60 rounded-xl text-xs sm:text-sm border border-[#CAC8AA] text-[#16391C] placeholder-[#99A99C] focus:outline-none focus:border-[#16391C]"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#16391C] hover:bg-[#1f4a25] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cerca Pass
                </button>
              </form>
              {lookupMessage && (
                <p className="text-xs text-rose-600 mt-2 font-medium">{lookupMessage}</p>
              )}
            </div>
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
            <SamarateLogo size="sm" showSubline={false} />
            <div className="text-left pl-3 border-l border-[#CAC8AA]/70">
              <span className="font-bold text-[#16391C]">{eventInfo.name}</span>
              <span className="block text-[11px] text-[#99A99C]">
                {eventInfo.dates} • {eventInfo.venue}, {eventInfo.city}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right text-[11px] text-[#99A99C]">
            <div>
              <span className="block text-[#16391C] font-semibold">Salone Ufficiale per Futuri Sposi & Cerimonie</span>
              Pass d'ingresso gratuito con QR Code nominale
            </div>

            {/* Discrete Footer Staff Access link (Hidden in Standalone Public Mode) */}
            {!isStandaloneMode && (
              <div className="sm:pl-4 sm:border-l border-[#CAC8AA]/60">
                {isStaffMode ? (
                  <button
                    onClick={handleExitStaffMode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5 text-amber-700" />
                    Staff Connesso (Esci)
                  </button>
                ) : (
                  <button
                    onClick={() => setShowPinModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#16391C]/70 hover:text-[#16391C] hover:bg-[#F7F4EC] border border-[#CAC8AA]/60 transition-colors cursor-pointer"
                    title="Accesso per gli organizzatori al check-in"
                  >
                    <Lock className="w-3 h-3 text-[#A89236]" />
                    Area Staff Organizzatori
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
