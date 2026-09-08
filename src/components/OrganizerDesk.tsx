import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Search, 
  QrCode, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ExternalLink, 
  Check, 
  X,
  Plus,
  RefreshCw,
  Filter,
  Heart,
  Calendar,
  Compass,
  Sparkles,
  Phone,
  Mail,
  Image as ImageIcon,
  Link2,
  Share2,
  Copy,
  RotateCcw,
  BarChart3,
  ArrowRight,
  Unlock
} from 'lucide-react';
import { 
  Attendee, 
  FairEventInfo, 
  ACQUISITION_CHANNELS, 
  AcquisitionChannel 
} from '../types';
import { exportAttendeesToCSV, generateTicketId, formatItalianDate } from '../utils/qrUtils';
import { playFeedbackSound } from '../utils/audioFeedback';
import { copyToClipboard } from '../utils/clipboard';
import { QRCodeSVG } from 'qrcode.react';
import { ShareRegistrationModal } from './ShareRegistrationModal';
import { CameraQrScanner } from './CameraQrScanner';
import { saveCustomLogoToCloud } from '../lib/firebase';

interface OrganizerDeskProps {
  attendees: Attendee[];
  eventInfo: FairEventInfo;
  onUpdateAttendee: (updated: Attendee) => void;
  onDeleteAttendee: (id: string) => void;
  onAddAttendee: (attendee: Attendee) => void;
  onViewBadge: (attendee: Attendee) => void;
  onExitStaff?: () => void;
}

export const OrganizerDesk: React.FC<OrganizerDeskProps> = ({
  attendees,
  eventInfo,
  onUpdateAttendee,
  onDeleteAttendee,
  onAddAttendee,
  onViewBadge,
  onExitStaff,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checkedIn' | 'pending'>('all');
  const [activeDeskTab, setActiveDeskTab] = useState<'scan' | 'attendees' | 'analytics'>('scan');
  
  // Scanner state
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    attendee?: Attendee;
  } | null>(null);

  // Quick manual add form modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCoupleNames, setNewCoupleNames] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newWeddingDate, setNewWeddingDate] = useState('');
  const [newChannel, setNewChannel] = useState<AcquisitionChannel>('passaparola');
  const [addModalError, setAddModalError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedQrModalAttendee, setSelectedQrModalAttendee] = useState<Attendee | null>(null);
  const [copiedModalId, setCopiedModalId] = useState(false);
  const [hasCustomLogo, setHasCustomLogo] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('samarate_sposi_custom_logo');
    } catch {
      return false;
    }
  });

  // Stats calculation
  const totalCount = attendees.length;
  const checkedInCount = attendees.filter(a => a.checkedIn).length;
  const pendingCount = totalCount - checkedInCount;
  const checkInRate = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  // Channel distribution for statistics
  const channelStats = ACQUISITION_CHANNELS.map(ch => {
    const count = attendees.filter(a => a.acquisitionChannel === ch.id).length;
    const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    return { ...ch, count, percentage };
  });

  // Filter attendees
  const filteredAttendees = attendees.filter(a => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      a.coupleNames.toLowerCase().includes(q) ||
      a.lastName.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.phone && a.phone.includes(q)) ||
      a.id.toLowerCase().includes(q);

    const matchesChannel = channelFilter === 'all' || a.acquisitionChannel === channelFilter;
    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'checkedIn' ? a.checkedIn :
      !a.checkedIn;

    return matchesSearch && matchesChannel && matchesStatus;
  });

  const handleProcessScan = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Check if it's the preview code from the registration form
    if (cleanCode.toUpperCase().includes('PREVIEW')) {
      playFeedbackSound('warning');
      setScanResult({
        type: 'warning',
        message: 'Rilevato Pass Anteprima: Questo è il QR Code di anteprima della schermata di registrazione. Per convalidare un ingresso effettivo, usa il Pass definitivo generato dopo l\'invio del modulo o seleziona una coppia registrata dalla lista.'
      });
      return;
    }

    const rawLower = cleanCode.toLowerCase();

    // 1. Direct ID match (case-insensitive)
    let matched = attendees.find(a => a.id.toLowerCase() === rawLower);

    // 2. Direct Email match
    if (!matched) {
      matched = attendees.find(a => a.email.toLowerCase() === rawLower);
    }

    // 3. JSON payload parsing (as in qrPayload or structured tickets)
    if (!matched) {
      let extractedId = '';
      let extractedEmail = '';
      try {
        if ((cleanCode.startsWith('{') && cleanCode.endsWith('}')) || cleanCode.includes('"id"') || cleanCode.includes('"ticketId"')) {
          const jsonStart = cleanCode.indexOf('{');
          const jsonEnd = cleanCode.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            const jsonStr = cleanCode.substring(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(jsonStr);
            if (parsed.id) extractedId = String(parsed.id);
            else if (parsed.ticketId) extractedId = String(parsed.ticketId);
            else if (parsed.code) extractedId = String(parsed.code);
            if (parsed.email) extractedEmail = String(parsed.email);
          }
        }
      } catch {
        // safe
      }
      if (extractedId) {
        matched = attendees.find(a => a.id.toLowerCase() === extractedId.toLowerCase());
      }
      if (!matched && extractedEmail) {
        matched = attendees.find(a => a.email.toLowerCase() === extractedEmail.toLowerCase());
      }
    }

    // 4. URL query params or path (e.g. ?id=SS-25-K8X92, ?pass=..., or #SS-25-K8X92)
    if (!matched && (cleanCode.includes('http://') || cleanCode.includes('https://') || cleanCode.includes('?'))) {
      try {
        const urlStr = cleanCode.startsWith('http') ? cleanCode : `https://dummy.com/${cleanCode}`;
        const parsedUrl = new URL(urlStr);
        const passParam = parsedUrl.searchParams.get('id') || parsedUrl.searchParams.get('pass') || parsedUrl.searchParams.get('code') || parsedUrl.searchParams.get('ticket');
        if (passParam) {
          matched = attendees.find(a => a.id.toLowerCase() === passParam.toLowerCase());
        }
        if (!matched && parsedUrl.hash) {
          const hashId = parsedUrl.hash.replace('#', '').trim();
          if (hashId) {
            matched = attendees.find(a => a.id.toLowerCase() === hashId.toLowerCase());
          }
        }
      } catch {
        // safe
      }
    }

    // 5. Look for standard ticket regex SS-XX-XXXXX anywhere in string
    if (!matched) {
      const idRegexMatch = cleanCode.match(/SS-\d{2}-[A-Za-z0-9]{4,6}/i);
      if (idRegexMatch) {
        const candidate = idRegexMatch[0].toUpperCase();
        matched = attendees.find(a => a.id.toUpperCase() === candidate);
      }
    }

    // 6. Normalized alphanumeric comparison (e.g. "SS25K8X92" or "SS 25 K8X92" matching "SS-25-K8X92")
    if (!matched) {
      const cleanAlphanumeric = cleanCode.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      if (cleanAlphanumeric.length >= 4) {
        matched = attendees.find(a => {
          const aClean = a.id.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
          return aClean === cleanAlphanumeric;
        });
        // Suffix match (e.g. "K8X92" matching "SS-25-K8X92")
        if (!matched && cleanAlphanumeric.length === 5) {
          matched = attendees.find(a => {
            const aClean = a.id.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
            return aClean.endsWith(cleanAlphanumeric);
          });
        }
      }
    }

    // 7. Check qrPayload exact or substring match
    if (!matched) {
      matched = attendees.find(a => a.qrPayload && (a.qrPayload === cleanCode || a.qrPayload.includes(cleanCode) || cleanCode.includes(a.qrPayload)));
    }

    // 8. Match by couple names or last name (at least 3 chars)
    if (!matched && cleanCode.length >= 3) {
      matched = attendees.find(a => {
        const fullName = `${a.coupleNames} ${a.lastName}`.toLowerCase();
        const targetLow = cleanCode.toLowerCase();
        return fullName === targetLow || a.lastName.toLowerCase() === targetLow || fullName.includes(targetLow);
      });
    }

    // 9. Match phone number digits
    if (!matched) {
      const phoneDigits = cleanCode.replace(/\D/g, '');
      if (phoneDigits.length >= 6) {
        matched = attendees.find(a => {
          if (!a.phone) return false;
          const aDigits = a.phone.replace(/\D/g, '');
          return aDigits.includes(phoneDigits) || phoneDigits.includes(aDigits);
        });
      }
    }

    if (!matched) {
      playFeedbackSound('error');
      setScanResult({
        type: 'error',
        message: `Nessun pass trovato corrispondente a "${cleanCode}". Verifica che il codice appartenga a una coppia iscritta nella lista.`
      });
      return;
    }

    if (matched.checkedIn) {
      playFeedbackSound('warning');
      setScanResult({
        type: 'warning',
        message: `Attenzione: La coppia "${matched.coupleNames} ${matched.lastName}" ha già effettuato il check-in il ${matched.checkInTime || 'precedentemente'}.`,
        attendee: matched
      });
    } else {
      playFeedbackSound('success');
      const nowStr = new Date().toLocaleString('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      const updated: Attendee = {
        ...matched,
        checkedIn: true,
        checkInTime: nowStr,
        gateScanned: eventInfo.gate
      };
      onUpdateAttendee(updated);
      setScanResult({
        type: 'success',
        message: `Ingresso Autorizzato! Benvenuti a Samarate Sposi: ${matched.coupleNames} ${matched.lastName}.`,
        attendee: updated
      });
    }

    setScanInput('');
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessScan(scanInput);
  };

  const handleToggleCheckIn = (attendee: Attendee) => {
    const newStatus = !attendee.checkedIn;
    const updated: Attendee = {
      ...attendee,
      checkedIn: newStatus,
      checkInTime: newStatus ? new Date().toLocaleString('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }) : undefined
    };
    onUpdateAttendee(updated);
    if (newStatus) {
      playFeedbackSound('success');
    }
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupleNames.trim() || !newLastName.trim() || !newEmail.trim()) {
      setAddModalError('Compila Nome Sposi, Cognome ed Email.');
      return;
    }

    const ticketId = generateTicketId();
    const newAttendee: Attendee = {
      id: ticketId,
      coupleNames: newCoupleNames.trim(),
      lastName: newLastName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
      weddingDate: newWeddingDate || 'In definizione',
      weddingDateStatus: newWeddingDate ? 'fixed' : 'tbd',
      acquisitionChannel: newChannel,
      guestCount: 2,
      category: 'coppia',
      privacyConsent: true,
      registrationDate: new Date().toLocaleString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      qrPayload: JSON.stringify({
        id: ticketId,
        sposi: `${newCoupleNames} ${newLastName}`.trim(),
        fiera: 'Samarate Sposi',
        valid: true
      }),
      checkedIn: true, // Auto check-in for walk-in couples at reception desk!
      checkInTime: new Date().toLocaleString('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }),
      gateScanned: 'Desk Accoglienza Diretta'
    };

    onAddAttendee(newAttendee);
    setShowAddModal(false);
    setNewCoupleNames('');
    setNewLastName('');
    setNewEmail('');
    setNewPhone('');
    setNewWeddingDate('');
    setAddModalError('');
    playFeedbackSound('success');
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        try {
          localStorage.setItem('samarate_sposi_custom_logo', base64);
          saveCustomLogoToCloud(base64);
          window.dispatchEvent(new Event('samarate_logo_updated'));
          setHasCustomLogo(true);
          playFeedbackSound('success');
        } catch {
          // safe
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    try {
      localStorage.removeItem('samarate_sposi_custom_logo');
      saveCustomLogoToCloud(null);
      window.dispatchEvent(new Event('samarate_logo_updated'));
      setHasCustomLogo(false);
      playFeedbackSound('success');
    } catch {
      // safe
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header Bar - Mobile-First & Sleek */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-[#CAC8AA]/80 shadow-2xs">
        {/* Main Title Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16391C]">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
              <span>Desk Accoglienza</span>
              <span className="text-[#CAC8AA]">•</span>
              <span className="text-[#A89236] font-medium truncate">Varco Ingressi</span>
            </div>
            <h1 className="font-serif text-lg sm:text-2xl font-bold text-[#16391C] mt-0.5 tracking-tight truncate">
              Gestione Ingressi
            </h1>
          </div>

          <button
            id="btn-quick-add-attendee"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#16391C] hover:bg-[#1e4825] active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#C4AF56] shrink-0" />
            <span>Nuova Coppia</span>
          </button>
        </div>

        {/* Action Toolbar Row */}
        <div className="mt-3 pt-3 border-t border-[#CAC8AA]/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1">
            <button
              id="btn-open-share-modal"
              onClick={() => setShowShareModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#F7F4EC]/60 hover:bg-[#F7F4EC] text-[#16391C] text-xs font-medium border border-[#CAC8AA]/70 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              title="Condividi link registrazione e scarica QR"
            >
              <Share2 className="w-3.5 h-3.5 text-[#A89236] shrink-0" />
              <span>Condividi</span>
            </button>

            <button
              id="btn-export-csv"
              onClick={() => exportAttendeesToCSV(attendees)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#F7F4EC]/60 hover:bg-[#F7F4EC] text-[#16391C] text-xs font-medium border border-[#CAC8AA]/70 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              title="Esporta elenco completo in CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#A89236] shrink-0" />
              <span>CSV</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#16391C]/10 font-bold font-mono">
                {attendees.length}
              </span>
            </button>

            <label 
              htmlFor="logo-file-input"
              className="p-1.5 sm:p-2 rounded-xl bg-[#F7F4EC]/60 hover:bg-[#F7F4EC] text-[#16391C] border border-[#CAC8AA]/70 shadow-2xs transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
              title={hasCustomLogo ? "Cambia logo fiera" : "Carica logo fiera"}
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#A89236]" />
              <input
                id="logo-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoFileUpload}
              />
            </label>

            {hasCustomLogo && (
              <button
                type="button"
                onClick={handleResetLogo}
                title="Ripristina logo Samarate Sposi"
                className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {onExitStaff && (
            <button
              type="button"
              onClick={onExitStaff}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-[#16391C]/60 hover:text-rose-700 hover:bg-rose-50/60 border border-transparent hover:border-rose-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="Esci dalla modalità staff"
            >
              <Unlock className="w-3 h-3" />
              <span className="hidden sm:inline">Esci Staff</span>
              <span className="sm:hidden">Esci</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Desk Tabs: Sticky Navigation */}
      <div className="sticky top-14 sm:top-18 z-30 -mx-1 sm:mx-0 px-1 sm:px-0 py-1 bg-[#F7F4EC]/95 backdrop-blur-md">
        <div className="flex items-center justify-between gap-1 sm:gap-2 bg-white p-1 rounded-2xl border border-[#CAC8AA] shadow-xs">
          {/* Tab 1: Scansione QR & Varco */}
          <button
            type="button"
            id="tab-desk-scanner"
            onClick={() => setActiveDeskTab('scan')}
            className={`flex-1 min-h-[42px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeDeskTab === 'scan'
                ? 'bg-[#16391C] text-white shadow-xs'
                : 'text-[#16391C]/75 hover:text-[#16391C] hover:bg-[#F7F4EC]'
            }`}
          >
            <QrCode className="w-4 h-4 text-[#C4AF56] shrink-0" />
            <span>Scansione</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 shrink-0 ${
              activeDeskTab === 'scan'
                ? 'bg-[#C4AF56] text-[#16391C]'
                : 'bg-[#F7F4EC] text-[#16391C] border border-[#CAC8AA]'
            }`}>
              {checkedInCount}/{totalCount}
            </span>
          </button>

          {/* Tab 2: Registro Coppie */}
          <button
            type="button"
            id="tab-desk-attendees"
            onClick={() => setActiveDeskTab('attendees')}
            className={`flex-1 min-h-[42px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeDeskTab === 'attendees'
                ? 'bg-[#16391C] text-white shadow-xs'
                : 'text-[#16391C]/75 hover:text-[#16391C] hover:bg-[#F7F4EC]'
            }`}
          >
            <Users className="w-4 h-4 text-[#A89236] shrink-0" />
            <span>Registro</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 shrink-0 ${
              activeDeskTab === 'attendees'
                ? 'bg-[#A89236] text-[#16391C]'
                : 'bg-[#F7F4EC] text-[#16391C] border border-[#CAC8AA]'
            }`}>
              {filteredAttendees.length}
            </span>
          </button>

          {/* Tab 3: Statistiche & Canali */}
          <button
            type="button"
            id="tab-desk-analytics"
            onClick={() => setActiveDeskTab('analytics')}
            className={`flex-1 min-h-[42px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeDeskTab === 'analytics'
                ? 'bg-[#16391C] text-white shadow-xs'
                : 'text-[#16391C]/75 hover:text-[#16391C] hover:bg-[#F7F4EC]'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#A89236] shrink-0" />
            <span>Statistiche</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SCANSIONE QR & CONTROLLO INGRESSI */}
      {/* ======================================================== */}
      {activeDeskTab === 'scan' && (
        <div className="space-y-3.5 sm:space-y-5 animate-fade-in">
          {/* Quick Metrics Bar - 1 compact row on mobile and desktop */}
          <div className="grid grid-cols-4 gap-2 bg-white p-2.5 sm:p-3 rounded-2xl border border-[#CAC8AA] shadow-2xs text-center">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#99A99C]">Iscritti</div>
              <div className="text-base sm:text-xl font-bold text-[#16391C] font-serif">{totalCount}</div>
            </div>
            <div className="border-l border-[#CAC8AA]/30 pl-1">
              <div className="text-[10px] uppercase font-bold text-emerald-700">Presenti</div>
              <div className="text-base sm:text-xl font-bold text-emerald-700 font-serif">{checkedInCount}</div>
            </div>
            <div className="border-l border-[#CAC8AA]/30 pl-1">
              <div className="text-[10px] uppercase font-bold text-[#A89236]">In attesa</div>
              <div className="text-base sm:text-xl font-bold text-[#A89236] font-serif">{pendingCount}</div>
            </div>
            <div className="border-l border-[#CAC8AA]/30 pl-1">
              <div className="text-[10px] uppercase font-bold text-[#16391C]/70">Affluenza</div>
              <div className="text-base sm:text-xl font-bold text-[#16391C] font-serif">{checkInRate}%</div>
            </div>
          </div>

          {/* Real-time Scan Result Banner */}
          {scanResult && (
            <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-xs ${
              scanResult.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-950 ring-2 ring-emerald-400/20' :
              scanResult.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/20' :
              'bg-rose-50 border-rose-300 text-rose-950 ring-2 ring-rose-400/20'
            }`}>
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                  {scanResult.type === 'success' && (
                    <div className="p-1.5 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5 shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                  {scanResult.type === 'warning' && (
                    <div className="p-1.5 rounded-xl bg-amber-600 text-white shrink-0 mt-0.5 shadow-xs">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}
                  {scanResult.type === 'error' && (
                    <div className="p-1.5 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5 shadow-xs">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-sm sm:text-base font-serif">{scanResult.message}</h4>
                    {scanResult.attendee && (
                      <div className="mt-2 pt-2 border-t border-black/10 text-xs flex flex-wrap gap-x-3 gap-y-1 font-medium">
                        <span>Coppia: <strong className="font-bold">{scanResult.attendee.coupleNames} {scanResult.attendee.lastName}</strong></span>
                        <span>Nozze: <strong>{formatItalianDate(scanResult.attendee.weddingDate)}</strong></span>
                        <span>Ospiti: <strong className="px-1.5 py-0.2 rounded bg-black/10 font-bold">{scanResult.attendee.guestCount || 2}</strong></span>
                        <span>ID: <code className="font-mono bg-white px-1 py-0.2 rounded border border-black/10 font-bold">{scanResult.attendee.id}</code></span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setScanResult(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                  title="Chiudi avviso"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Live Smartphone Camera QR Scanner */}
          <CameraQrScanner onScanSuccess={handleProcessScan} />

          {/* Manual ID Search & Quick Check-in Bar */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#CAC8AA] shadow-xs space-y-2.5">
            <form onSubmit={handleScanSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#99A99C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-scan-code"
                  type="text"
                  placeholder="Cerca cognome, email o ID (es. K8X92)..."
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-[#F7F4EC]/60 rounded-xl text-xs sm:text-sm text-[#16391C] border border-[#CAC8AA] focus:border-[#16391C] focus:outline-none"
                />
                {scanInput && (
                  <button
                    type="button"
                    onClick={() => setScanInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                id="btn-submit-scan"
                type="submit"
                className="px-4 py-2.5 bg-[#16391C] hover:bg-[#1f4a25] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C4AF56]" />
                <span>Convalida</span>
              </button>
            </form>

            {/* Instant match suggestions if typing search */}
            {scanInput.trim().length >= 2 && (
              <div className="pt-2 border-t border-[#CAC8AA]/30 space-y-1.5 max-h-48 overflow-y-auto">
                {attendees
                  .filter(a => 
                    `${a.coupleNames} ${a.lastName}`.toLowerCase().includes(scanInput.toLowerCase()) ||
                    a.email.toLowerCase().includes(scanInput.toLowerCase()) ||
                    a.id.toLowerCase().includes(scanInput.toLowerCase())
                  )
                  .slice(0, 4)
                  .map(att => (
                    <div 
                      key={att.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#F7F4EC] hover:bg-[#eae6d8] transition-colors text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-bold text-[#16391C] truncate">{att.coupleNames} {att.lastName}</div>
                        <div className="text-[10px] text-[#99A99C] flex items-center gap-2">
                          <span className="font-mono font-bold text-[#A89236]">{att.id}</span>
                          <span>{att.guestCount || 2} ospiti</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleProcessScan(att.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                          att.checkedIn
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-[#16391C] text-white hover:bg-[#1f4a25]'
                        }`}
                      >
                        {att.checkedIn ? '✓ Presente' : 'Convalida'}
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* Collapsible 1-Click Test Simulator */}
            <details className="text-xs text-[#16391C]/75 pt-1">
              <summary className="cursor-pointer font-semibold select-none text-[#16391C]/80 hover:text-[#16391C] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#A89236]" />
                <span>Simula test con 1 clic</span>
              </summary>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {attendees.slice(0, 5).map(att => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => handleProcessScan(att.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-all shadow-2xs ${
                      att.checkedIn 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                        : 'bg-white text-[#16391C] border-[#CAC8AA] hover:bg-[#F7F4EC]'
                    }`}
                  >
                    <span>{att.coupleNames} {att.lastName}</span>
                    <code className="text-[10px] font-mono opacity-70">({att.id.slice(-5)})</code>
                    {att.checkedIn && <Check className="w-3 h-3 text-emerald-600" />}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: REGISTRO COPPIE (LISTA PARTECIPANTI & CARDS MOBILE) */}
      {/* ======================================================== */}
      {activeDeskTab === 'attendees' && (
        <div className="space-y-4 animate-fade-in">
          {/* Registry Toolbar - Compact on mobile */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#CAC8AA] shadow-xs space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#99A99C] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cerca nome, cognome, email o ID pass..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-[#F7F4EC]/60 rounded-xl text-xs sm:text-sm border border-[#CAC8AA] text-[#16391C] placeholder-[#99A99C] focus:border-[#16391C] focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Pills & Channel Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    statusFilter === 'all'
                      ? 'bg-[#16391C] text-white shadow-2xs'
                      : 'bg-[#F7F4EC] text-[#16391C]/75 hover:text-[#16391C] border border-[#CAC8AA]/60'
                  }`}
                >
                  Tutti ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('checkedIn')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    statusFilter === 'checkedIn'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  Presenti ({checkedInCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    statusFilter === 'pending'
                      ? 'bg-[#A89236] text-[#16391C] shadow-2xs font-black'
                      : 'bg-[#A89236]/10 text-[#16391C]/80 hover:bg-[#A89236]/20 border border-[#A89236]/30'
                  }`}
                >
                  In attesa ({pendingCount})
                </button>
              </div>

              {/* Channel Selector */}
              <select
                value={channelFilter}
                onChange={e => setChannelFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F7F4EC]/60 rounded-lg text-xs font-semibold border border-[#CAC8AA] text-[#16391C] focus:outline-none focus:border-[#16391C]"
              >
                <option value="all">Tutti i canali</option>
                {ACQUISITION_CHANNELS.map(ch => (
                  <option key={ch.id} value={ch.id}>{ch.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Attendee Display Container */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#CAC8AA] shadow-sm overflow-hidden">
            {/* 1. MOBILE VIEW: Touch Cards (< md) */}
            <div className="block md:hidden divide-y divide-[#CAC8AA]/30">
              {filteredAttendees.length === 0 ? (
                <div className="py-10 px-4 text-center text-slate-400">
                  <Heart className="w-8 h-8 text-[#CAC8AA] mx-auto mb-2" />
                  <p className="text-xs">Nessuna coppia trovata con i filtri selezionati.</p>
                </div>
              ) : (
                filteredAttendees.map((attendee) => {
                  const channel = ACQUISITION_CHANNELS.find(c => c.id === attendee.acquisitionChannel)?.label || attendee.acquisitionChannel;
                  return (
                    <div 
                      key={attendee.id}
                      className={`p-3.5 space-y-2.5 transition-colors ${
                        attendee.checkedIn ? 'bg-emerald-50/20' : 'bg-white'
                      }`}
                    >
                      {/* Top: Names, Pass ID & Big 1-Touch Check-in button */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-serif font-bold text-slate-900 text-base leading-snug truncate">
                            {attendee.coupleNames} {attendee.lastName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] font-bold text-[#A89236] bg-[#A89236]/10 px-1.5 py-0.2 rounded border border-[#A89236]/20">
                              {attendee.id}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {attendee.guestCount || 2} ospiti
                            </span>
                            {attendee.checkedIn && attendee.checkInTime && (
                              <span className="text-[10px] text-emerald-700 font-semibold">
                                ({attendee.checkInTime})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Direct 1-Touch Check-in button */}
                        <button
                          type="button"
                          onClick={() => handleToggleCheckIn(attendee)}
                          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs ${
                            attendee.checkedIn
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-[#16391C] hover:bg-[#1f4a25] text-white'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>{attendee.checkedIn ? 'Presente' : 'Check-in'}</span>
                        </button>
                      </div>

                      {/* Mid: Wedding Date & Direct Contacts */}
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-600 pt-0.5">
                        <div className="flex items-center gap-1 text-[#16391C]">
                          <Calendar className="w-3.5 h-3.5 text-[#A89236]" />
                          <span>Nozze: <strong>{formatItalianDate(attendee.weddingDate)}</strong></span>
                        </div>

                        <div className="flex items-center gap-2">
                          {attendee.phone && (
                            <a 
                              href={`tel:${attendee.phone}`}
                              className="flex items-center gap-1 text-[#16391C] font-semibold bg-[#F7F4EC] px-2 py-0.5 rounded-md border border-[#CAC8AA]"
                              title={`Chiama ${attendee.phone}`}
                            >
                              <Phone className="w-3 h-3 text-[#A89236]" />
                              <span>{attendee.phone}</span>
                            </a>
                          )}
                          <a 
                            href={`mailto:${attendee.email}`} 
                            className="text-slate-500 hover:text-[#16391C] p-1"
                            title={`Invia email a ${attendee.email}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Bottom: Channel badge & Action buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-black/5 text-xs">
                        <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {channel}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedQrModalAttendee(attendee)}
                            className="px-2.5 py-1 rounded-lg bg-[#F7F4EC] hover:bg-[#eae6d8] text-[#16391C] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#A89236]" />
                            <span>QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onViewBadge(attendee)}
                            className="px-2.5 py-1 rounded-lg bg-[#F7F4EC] hover:bg-[#eae6d8] text-[#16391C] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#A89236]" />
                            <span>Pass</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Eliminare ${attendee.coupleNames} ${attendee.lastName}?`)) {
                                onDeleteAttendee(attendee.id);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. DESKTOP VIEW: Multi-Column Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F7F4EC] text-[#16391C] text-[11px] uppercase tracking-wider font-bold border-b border-[#CAC8AA]/60">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Pass ID & Sposi</th>
                    <th className="py-3.5 px-4">Contatti</th>
                    <th className="py-3.5 px-4">Data Matrimonio</th>
                    <th className="py-3.5 px-4">Fonte Conoscenza</th>
                    <th className="py-3.5 px-4">Check-in</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CAC8AA]/30 text-[#16391C]">
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Heart className="w-8 h-8 text-[#CAC8AA] mx-auto mb-2" />
                        Nessuna coppia trovata con i filtri selezionati.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map((attendee) => {
                      const channel = ACQUISITION_CHANNELS.find(c => c.id === attendee.acquisitionChannel)?.label || attendee.acquisitionChannel;
                      return (
                        <tr 
                          key={attendee.id} 
                          className={`hover:bg-[#F7F4EC]/40 transition-colors ${
                            attendee.checkedIn ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          {/* Couple Name & Ticket ID */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                attendee.checkedIn ? 'bg-emerald-100 text-emerald-800' : 'bg-[#F7F4EC] border border-[#CAC8AA] text-[#A89236]'
                              }`}>
                                <Heart className={`w-4 h-4 ${attendee.checkedIn ? 'fill-emerald-600' : 'fill-[#A89236]/30'}`} />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">
                                  {attendee.coupleNames} {attendee.lastName}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[11px] text-[#A89236] font-semibold">
                                    {attendee.id}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedQrModalAttendee(attendee)}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-[#A89236]/10 text-[#16391C] hover:bg-[#A89236]/20 transition-colors cursor-pointer"
                                    title="Mostra QR Code per scansione"
                                  >
                                    <QrCode className="w-2.5 h-2.5 text-[#A89236]" />
                                    QR
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contacts */}
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                              <span className="flex items-center gap-1 truncate max-w-xs text-slate-800">
                                <Mail className="w-3.5 h-3.5 text-[#99A99C]" />
                                {attendee.email}
                              </span>
                              {attendee.phone && (
                                <span className="flex items-center gap-1 text-[11px] text-[#99A99C]">
                                  <Phone className="w-3 h-3 text-[#99A99C]" />
                                  {attendee.phone}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Wedding Date */}
                          <td className="py-4 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F7F4EC] border border-[#CAC8AA]/60 text-xs font-semibold text-[#16391C]">
                              <Calendar className="w-3.5 h-3.5 text-[#A89236]" />
                              {formatItalianDate(attendee.weddingDate)}
                            </div>
                          </td>

                          {/* Acquisition Channel */}
                          <td className="py-4 px-4">
                            <span className="inline-block text-xs font-medium text-slate-600 max-w-[180px] truncate" title={channel}>
                              {channel}
                            </span>
                          </td>

                          {/* Check-in Toggle Button */}
                          <td className="py-4 px-4">
                            <button
                              onClick={() => handleToggleCheckIn(attendee)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                attendee.checkedIn 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200' 
                                  : 'bg-white text-slate-600 border border-[#CAC8AA] hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              {attendee.checkedIn ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  Ingresso Effettuato
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  In Attesa
                                </>
                              )}
                            </button>
                            {attendee.checkedIn && attendee.checkInTime && (
                              <div className="text-[10px] text-emerald-700 mt-1">
                                {attendee.checkInTime}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedQrModalAttendee(attendee)}
                                className="p-1.5 rounded-lg text-[#A89236] hover:text-[#16391C] hover:bg-[#F7F4EC] transition-colors cursor-pointer"
                                title="Visualizza QR Code Pass"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onViewBadge(attendee)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#16391C] hover:bg-[#F7F4EC] transition-colors cursor-pointer"
                                title="Visualizza Pass"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Sei sicuro di voler eliminare la registrazione di "${attendee.coupleNames} ${attendee.lastName}"?`)) {
                                    onDeleteAttendee(attendee.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Elimina"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: STATISTICHE CANALI & LINK PUBBLICO */}
      {/* ======================================================== */}
      {activeDeskTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          {/* External Registration Link & QR Code Banner */}
          <div className="bg-white rounded-3xl p-6 border border-[#CAC8AA] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 bg-gradient-to-r from-white via-white to-[#F7F4EC]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#16391C] text-[#C4AF56] flex items-center justify-center shrink-0 shadow-xs">
                <Link2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-bold text-[#16391C]">
                    Link Pubblico per la Registrazione Esterna degli Sposi
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#A89236]/15 text-[#16391C] border border-[#A89236]/30">
                    Per Instagram & Locandine
                  </span>
                </div>
                <p className="text-xs text-[#16391C]/75 mt-0.5">
                  Condividi questo link esterno: i visitatori vedranno solo il modulo d'iscrizione e riceveranno il Pass QR personale, senza accedere al desk o ai dati altrui.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
              <button
                onClick={async () => {
                  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
                  const isVercelOrCustom = currentOrigin.includes('vercel.app') || (!currentOrigin.includes('run.app') && !currentOrigin.includes('localhost'));
                  const origin = isVercelOrCustom ? currentOrigin : 'https://samaratesposi.vercel.app';
                  const url = `${origin}/?mode=register`;
                  await copyToClipboard(url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F7F4EC] text-[#16391C] text-xs font-bold border border-[#CAC8AA] transition-all shadow-2xs cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#A89236]" />}
                {copiedLink ? 'Link Copiato!' : 'Copia Link Esterno'}
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#16391C] hover:bg-[#1f4a25] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-[#C4AF56]" />
                Scarica QR Locandina & Iframe
              </button>
            </div>
          </div>

          {/* Analytics Breakdown: Come hanno conosciuto la fiera */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#CAC8AA] shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#CAC8AA]/40 mb-5">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#A89236]" />
                <h3 className="font-serif text-lg font-bold text-[#16391C]">
                  Statistiche Canali: "Come hanno conosciuto la fiera"
                </h3>
              </div>
              <span className="text-xs font-semibold text-[#99A99C]">
                Totale risposte: {totalCount}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {channelStats.map(stat => (
                <div 
                  key={stat.id}
                  className="p-3.5 rounded-2xl bg-[#F7F4EC]/60 border border-[#CAC8AA]/70 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-[#16391C]/80 line-clamp-1">{stat.label}</span>
                    <span className="font-bold text-sm text-[#16391C] ml-2">{stat.count}</span>
                  </div>
                  <div>
                    <div className="w-full bg-[#CAC8AA]/40 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#16391C] h-full rounded-full transition-all"
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-right text-[10px] text-[#99A99C] font-semibold mt-1">
                      {stat.percentage}% delle coppie
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Quick Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#CAC8AA] shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#16391C] text-[#C4AF56] flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#16391C]">
                Iscrizione Veloce all'Ingresso
              </h3>
            </div>

            <p className="text-xs text-[#16391C]/70 mb-5">
              Registra una coppia arrivata direttamente in fiera senza pre-iscrizione online. Verrà convalidata istantaneamente all'ingresso.
            </p>

            <form onSubmit={handleQuickAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#16391C] mb-1">
                  Nome Sposi *
                </label>
                <input
                  type="text"
                  placeholder="Es. Leonardo e Beatrice"
                  value={newCoupleNames}
                  onChange={e => setNewCoupleNames(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CAC8AA] text-sm text-[#16391C] focus:border-[#16391C] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#16391C] mb-1">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    placeholder="Es. Moretti"
                    value={newLastName}
                    onChange={e => setNewLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CAC8AA] text-sm text-[#16391C] focus:border-[#16391C] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#16391C] mb-1">
                    Data Nozze
                  </label>
                  <input
                    type="date"
                    value={newWeddingDate}
                    onChange={e => setNewWeddingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CAC8AA] text-sm text-[#16391C] focus:border-[#16391C] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#16391C] mb-1">
                  Email di Riferimento *
                </label>
                <input
                  type="email"
                  placeholder="email@esempio.it"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CAC8AA] text-sm text-[#16391C] focus:border-[#16391C] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#16391C] mb-1">
                  Cellulare / WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="+39 ..."
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CAC8AA] text-sm text-[#16391C] focus:border-[#16391C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#16391C] mb-1">
                  Come hanno conosciuto la fiera?
                </label>
                <select
                  value={newChannel}
                  onChange={e => setNewChannel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CAC8AA] text-sm text-[#16391C] focus:border-[#16391C] focus:outline-none"
                >
                  {ACQUISITION_CHANNELS.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.label}</option>
                  ))}
                </select>
              </div>

              {addModalError && (
                <p className="text-xs text-rose-500 font-medium">{addModalError}</p>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#16391C] text-white text-xs font-bold shadow-xs hover:bg-[#1f4a25]"
                >
                  Iscrivi & Registra Entrata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Individual Couple QR Code Inspection & Test Modal */}
      {selectedQrModalAttendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-[#CAC8AA] shadow-2xl relative text-center">
            <button
              onClick={() => setSelectedQrModalAttendee(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#16391C] text-[#C4AF56] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <QrCode className="w-6 h-6" />
            </div>

            <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-[#A89236]/15 text-[#16391C] border border-[#A89236]/30">
              Pass Ingresso Ufficiale
            </span>

            <h3 className="font-serif text-xl font-bold text-[#16391C] mt-2">
              {selectedQrModalAttendee.coupleNames} {selectedQrModalAttendee.lastName}
            </h3>

            <p className="text-xs text-[#16391C]/70 mt-1">
              Data Nozze: <strong>{formatItalianDate(selectedQrModalAttendee.weddingDate)}</strong> • Ospiti: <strong>{selectedQrModalAttendee.guestCount || 2}</strong>
            </p>

            {/* High-contrast QR Code Box for Screen Scanning */}
            <div className="my-5 p-4 bg-white rounded-2xl inline-block border-2 border-[#CAC8AA]/80 shadow-md">
              <QRCodeSVG
                value={selectedQrModalAttendee.id}
                size={190}
                level="H"
                includeMargin={true}
                fgColor="#16391C"
                bgColor="#FFFFFF"
              />
            </div>

            {/* Ticket ID with Copy button */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <code className="text-sm font-mono font-bold bg-[#F7F4EC] px-3 py-1.5 rounded-xl border border-[#CAC8AA] text-[#16391C]">
                {selectedQrModalAttendee.id}
              </code>
              <button
                type="button"
                onClick={async () => {
                  await copyToClipboard(selectedQrModalAttendee.id);
                  setCopiedModalId(true);
                  setTimeout(() => setCopiedModalId(false), 2000);
                }}
                className="p-2 rounded-xl border border-[#CAC8AA] hover:bg-[#F7F4EC] text-[#16391C] transition-colors cursor-pointer"
                title="Copia codice ID"
              >
                {copiedModalId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#A89236]" />}
              </button>
            </div>

            {/* Direct Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  handleProcessScan(selectedQrModalAttendee.id);
                  setSelectedQrModalAttendee(null);
                }}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                  selectedQrModalAttendee.checkedIn
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                    : 'bg-[#16391C] hover:bg-[#1f4a25] text-white'
                }`}
              >
                {selectedQrModalAttendee.checkedIn ? (
                  <>
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                    Riconvalida / Verifica Check-in
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#C4AF56]" />
                    Valida Ingresso Subito
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  const att = selectedQrModalAttendee;
                  setSelectedQrModalAttendee(null);
                  onViewBadge(att);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white hover:bg-[#F7F4EC] text-[#16391C] border border-[#CAC8AA] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#A89236]" />
                Apri Badge Pass Completo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Registration Link & QR Poster Modal */}
      <ShareRegistrationModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        eventInfo={eventInfo}
      />
    </div>
  );
};
