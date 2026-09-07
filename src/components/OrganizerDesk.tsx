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
  RotateCcw
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
import { ShareRegistrationModal } from './ShareRegistrationModal';
import { CameraQrScanner } from './CameraQrScanner';

interface OrganizerDeskProps {
  attendees: Attendee[];
  eventInfo: FairEventInfo;
  onUpdateAttendee: (updated: Attendee) => void;
  onDeleteAttendee: (id: string) => void;
  onAddAttendee: (attendee: Attendee) => void;
  onViewBadge: (attendee: Attendee) => void;
}

export const OrganizerDesk: React.FC<OrganizerDeskProps> = ({
  attendees,
  eventInfo,
  onUpdateAttendee,
  onDeleteAttendee,
  onAddAttendee,
  onViewBadge,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checkedIn' | 'pending'>('all');
  
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

    let targetId = cleanCode;
    try {
      if (cleanCode.startsWith('http://') || cleanCode.startsWith('https://')) {
        const parsedUrl = new URL(cleanCode);
        const passParam = parsedUrl.searchParams.get('id') || parsedUrl.searchParams.get('pass') || parsedUrl.searchParams.get('code');
        if (passParam) {
          targetId = passParam;
        } else {
          const parts = parsedUrl.pathname.split('/').filter(Boolean);
          if (parts.length > 0) {
            targetId = parts[parts.length - 1];
          }
        }
      } else if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
        const parsed = JSON.parse(cleanCode);
        if (parsed.id) targetId = parsed.id;
      }
    } catch {
      // not a URL or JSON
    }

    // Look for standard ticket format SS-XX-XXXXX anywhere in string
    const idRegexMatch = targetId.match(/\bSS-\d{2}-[A-Za-z0-9]+\b/i);
    if (idRegexMatch) {
      targetId = idRegexMatch[0];
    }

    const cleanTarget = targetId.trim().toLowerCase();
    const matched = attendees.find(a => 
      a.id.trim().toLowerCase() === cleanTarget ||
      a.email.trim().toLowerCase() === cleanTarget
    );

    if (!matched) {
      playFeedbackSound('error');
      setScanResult({
        type: 'error',
        message: `Nessun pass trovato con codice o email: "${targetId}". Verifica che la registrazione sia stata completata.`
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
      window.dispatchEvent(new Event('samarate_logo_updated'));
      setHasCustomLogo(false);
      playFeedbackSound('success');
    } catch {
      // safe
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome & Event Status Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#CAC8AA] shadow-xs relative overflow-hidden">
        {/* Soft luxury golden radial accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#A89236]/10 via-[#F7F4EC]/40 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Title, Badge & Subtitle */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#A89236]/15 text-[#16391C] border border-[#A89236]/30 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <Sparkles className="w-3.5 h-3.5 text-[#A89236]" />
              <span>Desk Accoglienza & Reception • Samarate Sposi</span>
            </div>
            
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#16391C] tracking-tight leading-tight">
              Gestione Ingressi & Registro Coppie
            </h1>
            
            <p className="text-sm text-[#16391C]/75 mt-2 leading-relaxed max-w-xl">
              Effettua la scansione dei Pass QR Code ai tornelli, convalida gli accessi o registra sul posto le nuove coppie in arrivo.
            </p>
          </div>

          {/* Right Column: Unified & Elegant Action Bar */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Primary Action Button */}
            <button
              id="btn-quick-add-attendee"
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[#16391C] hover:bg-[#1e4825] text-white text-sm font-bold shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#C4AF56]" />
              <span>Iscrizione Rapida all'Ingresso</span>
            </button>

            {/* Secondary Toolbar Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-open-share-modal"
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-[#F7F4EC] text-[#16391C] text-xs sm:text-sm font-semibold border border-[#CAC8AA] shadow-2xs hover:border-[#A89236]/70 transition-all cursor-pointer"
                title="Condividi modulo esterno e scarica QR Code per locandine"
              >
                <Share2 className="w-4 h-4 text-[#A89236]" />
                <span>Link Esterno & QR</span>
              </button>

              <button
                id="btn-export-csv"
                onClick={() => exportAttendeesToCSV(attendees)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-[#F7F4EC] text-[#16391C] text-xs sm:text-sm font-semibold border border-[#CAC8AA] shadow-2xs hover:border-[#A89236]/70 transition-all cursor-pointer"
                title="Esporta elenco completo coppie in formato CSV per Excel"
              >
                <Download className="w-4 h-4 text-[#A89236]" />
                <span>Esporta CSV</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[#16391C]/10 text-[#16391C]">
                  {attendees.length}
                </span>
              </button>

              <div className="flex items-center">
                <label 
                  htmlFor="logo-file-input"
                  className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-white hover:bg-[#F7F4EC] text-[#16391C] text-xs sm:text-sm font-semibold border border-[#CAC8AA] shadow-2xs hover:border-[#A89236]/70 transition-all cursor-pointer"
                  title={hasCustomLogo ? "Cambia logo fiera personalizzato" : "Carica logo ufficiale personalizzato"}
                >
                  <ImageIcon className="w-4 h-4 text-[#A89236]" />
                  <span>Logo</span>
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
                    title="Ripristina logo predefinito Samarate Sposi"
                    className="ml-1 p-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-[#CAC8AA] shadow-2xs transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registered */}
        <div className="bg-white rounded-2xl p-5 border border-[#CAC8AA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#99A99C]">
              Coppie Iscritte
            </span>
            <div className="text-3xl font-extrabold text-[#16391C] mt-1 font-serif">
              {totalCount}
            </div>
            <p className="text-[11px] text-[#99A99C] mt-1">Pass d'ingresso generati</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#F7F4EC] border border-[#CAC8AA] flex items-center justify-center text-[#16391C]">
            <Heart className="w-6 h-6 text-[#A89236] fill-[#A89236]/20" />
          </div>
        </div>

        {/* Card 2: Checked In */}
        <div className="bg-white rounded-2xl p-5 border border-[#CAC8AA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#99A99C]">
              Ingressi Convalidati
            </span>
            <div className="text-3xl font-extrabold text-emerald-800 mt-1 font-serif">
              {checkedInCount}
            </div>
            <p className="text-[11px] text-emerald-600 mt-1">Coppie presenti in fiera</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Pending Arrival */}
        <div className="bg-white rounded-2xl p-5 border border-[#CAC8AA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#99A99C]">
              In Arrivo
            </span>
            <div className="text-3xl font-extrabold text-[#A89236] mt-1 font-serif">
              {pendingCount}
            </div>
            <p className="text-[11px] text-[#A89236] mt-1">Pass attivi in attesa di varco</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#A89236]/10 border border-[#A89236]/30 flex items-center justify-center text-[#A89236]">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Attendance Rate */}
        <div className="bg-white rounded-2xl p-5 border border-[#CAC8AA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#99A99C]">
              Affluenza Attuale
            </span>
            <div className="text-3xl font-extrabold text-[#16391C] mt-1 font-serif">
              {checkInRate}%
            </div>
            <p className="text-[11px] text-[#99A99C] mt-1">Tasso di presenza</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#16391C]/10 border border-[#16391C]/20 flex items-center justify-center text-[#16391C]">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* QR Scanner & Gate Simulator Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#CAC8AA] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#CAC8AA]/40">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#16391C] text-white flex items-center justify-center">
                <QrCode className="w-4 h-4 text-[#C4AF56]" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#16391C]">
                Terminale di Scansione & Check-in Rapido
              </h2>
            </div>
            <p className="text-xs text-[#16391C]/75 mt-1">
              Punta la fotocamera dello smartphone verso il Pass QR per convalidare l'accesso in tempo reale.
            </p>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F7F4EC] text-[#16391C] text-xs font-semibold rounded-full border border-[#CAC8AA]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Varco: {eventInfo.gate}
            </span>
          </div>
        </div>

        {/* Real-time Scan Result Banner */}
        {scanResult && (
          <div className={`p-5 rounded-2xl border transition-all shadow-xs ${
            scanResult.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-950 ring-2 ring-emerald-400/20' :
            scanResult.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/20' :
            'bg-rose-50 border-rose-300 text-rose-950 ring-2 ring-rose-400/20'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                {scanResult.type === 'success' && (
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                {scanResult.type === 'warning' && (
                  <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0 mt-0.5 shadow-xs">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
                {scanResult.type === 'error' && (
                  <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5 shadow-xs">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm sm:text-base font-serif">{scanResult.message}</h4>
                  {scanResult.attendee && (
                    <div className="mt-2.5 pt-2.5 border-t border-black/10 text-xs flex flex-wrap gap-x-5 gap-y-1.5 font-medium">
                      <span>Coppia: <strong className="font-bold text-sm">{scanResult.attendee.coupleNames} {scanResult.attendee.lastName}</strong></span>
                      <span>Nozze: <strong>{formatItalianDate(scanResult.attendee.weddingDate)}</strong></span>
                      <span>Email: <strong>{scanResult.attendee.email}</strong></span>
                      <span>Ospiti ammessi: <strong className="px-2 py-0.5 rounded bg-black/10 text-[#16391C] font-bold">{scanResult.attendee.guestCount || 2}</strong></span>
                      <span>ID Biglietto: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-black/10">{scanResult.attendee.id}</code></span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setScanResult(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
                title="Chiudi avviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Live Smartphone Camera QR Scanner */}
        <CameraQrScanner onScanSuccess={handleProcessScan} />

        {/* Manual ID / Gun Barcode Scanner Input */}
        <div className="pt-4 border-t border-[#CAC8AA]/40">
          <p className="text-xs font-semibold text-[#16391C] mb-2 flex items-center gap-1.5">
            <span>Oppure ricerca rapida / inserimento manuale codice:</span>
          </p>
          <form onSubmit={handleScanSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#99A99C]">
                <QrCode className="w-4 h-4" />
              </div>
              <input
                id="input-scan-code"
                type="text"
                placeholder="Digita codice ID Pass (es. SS-25-K8X92) o email invitato..."
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#F7F4EC]/60 rounded-xl text-sm text-[#16391C] border border-[#CAC8AA] focus:border-[#16391C] focus:ring-3 focus:ring-[#A89236]/20 focus:outline-none"
              />
            </div>

            <button
              id="btn-submit-scan"
              type="submit"
              className="px-6 py-3 bg-[#16391C] hover:bg-[#1f4a25] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-4 h-4 text-[#C4AF56]" />
              Valida Codice
            </button>
          </form>
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

      {/* Table of Registered Couples */}
      <div className="bg-white rounded-3xl border border-[#CAC8AA] shadow-sm overflow-hidden">
        {/* Filters Toolbar */}
        <div className="p-5 border-b border-[#CAC8AA]/40 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#F7F4EC]/30">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#99A99C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca nome, cognome, email o ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl text-xs sm:text-sm border border-[#CAC8AA] text-[#16391C] placeholder-[#99A99C] focus:border-[#16391C] focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-white rounded-xl text-xs font-semibold border border-[#CAC8AA] text-[#16391C] focus:outline-none focus:border-[#16391C]"
            >
              <option value="all">Tutti gli stati ({totalCount})</option>
              <option value="checkedIn">Convalidati ({checkedInCount})</option>
              <option value="pending">In attesa ({pendingCount})</option>
            </select>

            {/* Channel Filter */}
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              className="px-3 py-2 bg-white rounded-xl text-xs font-semibold border border-[#CAC8AA] text-[#16391C] focus:outline-none focus:border-[#16391C] max-w-[200px]"
            >
              <option value="all">Tutti i canali</option>
              {ACQUISITION_CHANNELS.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
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
                            <div className="font-mono text-[11px] text-[#A89236] font-semibold">
                              {attendee.id}
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
                            onClick={() => onViewBadge(attendee)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#16391C] hover:bg-[#F7F4EC] transition-colors"
                            title="Visualizza e Stampa Pass"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Sei sicuro di voler eliminare la registrazione di "${attendee.coupleNames} ${attendee.lastName}"?`)) {
                                onDeleteAttendee(attendee.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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

      {/* Share Registration Link & QR Poster Modal */}
      <ShareRegistrationModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        eventInfo={eventInfo}
      />
    </div>
  );
};
