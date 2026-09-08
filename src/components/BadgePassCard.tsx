import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Share2, 
  Copy, 
  Check, 
  Calendar, 
  MapPin, 
  Heart,
  Sparkles,
  ShieldCheck,
  Compass,
  Users,
  Clock,
  Download,
  Loader2
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Attendee, FairEventInfo, ACQUISITION_CHANNELS } from '../types';
import { formatItalianDate } from '../utils/qrUtils';
import { copyToClipboard } from '../utils/clipboard';
import { SamarateLogo } from './SamarateLogo';

interface BadgePassCardProps {
  attendee: Attendee;
  eventInfo: FairEventInfo;
  onNewRegistration?: () => void;
  compact?: boolean;
}

export const BadgePassCard: React.FC<BadgePassCardProps> = ({
  attendee,
  eventInfo,
  onNewRegistration,
  compact = false
}) => {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const channelLabel = ACQUISITION_CHANNELS.find(c => c.id === attendee.acquisitionChannel)?.label 
    || attendee.acquisitionChannel;

  const handleCopyId = async () => {
    const ok = await copyToClipboard(attendee.id);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPdf = async () => {
    if (!badgeRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const element = badgeRef.current;
      const imgData = await toPng(element, {
        pixelRatio: 2.5,
        backgroundColor: '#FFFFFF',
        skipFonts: true,
        cacheBust: false,
      });

      const img = new Image();
      img.src = imgData;
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = reject;
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      
      // Calculate proportionally to fit A4 gracefully
      const imgWidth = 150; 
      const imgHeight = (img.naturalHeight * imgWidth) / img.naturalWidth;
      const x = (pageWidth - imgWidth) / 2;
      const y = Math.max(12, (pageHeight - imgHeight) / 2 - 8);

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

      const sanitizedName = `${attendee.lastName}_${attendee.coupleNames}`
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_');
      pdf.save(`Pass-Samarate-Sposi-${sanitizedName}-${attendee.id}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pass Samarate Sposi - ${attendee.coupleNames} ${attendee.lastName}`,
          text: `Ecco il nostro Pass per la fiera Samarate Sposi! Codice: ${attendee.id}`,
          url: window.location.href,
        });
      } catch {
        handleCopyId();
      }
    } else {
      handleCopyId();
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      {/* Printable Badge Visual Card */}
      <div 
        id="printable-badge-area"
        ref={badgeRef}
        className="w-full bg-white rounded-3xl shadow-xl border border-[#CAC8AA] overflow-hidden relative transition-all duration-300 hover:shadow-2xl"
      >
        {/* Lanyard Clip Slot Simulation */}
        <div className="h-6 bg-[#F7F4EC] border-b border-[#CAC8AA]/80 flex justify-center items-center relative">
          <div className="w-14 h-2 bg-[#A89236]/30 rounded-full border border-[#A89236]/50 shadow-inner"></div>
        </div>

        {/* Header Ribbon / Event Banner */}
        <div className="bg-gradient-to-br from-[#16391C] via-[#1d4724] to-[#254f2c] px-6 py-5 text-white relative">
          <div className="flex items-center justify-between gap-3">
            <SamarateLogo size="md" variant="light" />
            <div className="text-right">
              <span className="inline-block bg-[#A89236] text-[#16391C] text-xs font-black uppercase px-3 py-1 rounded-full shadow-xs tracking-wider">
                {eventInfo.edition}
              </span>
              <p className="text-[10px] text-[#CAC8AA] mt-1 font-medium">
                {eventInfo.admission}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#F7F4EC]/90 mt-3 pt-2.5 border-t border-white/15">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C4AF56]" />
              {eventInfo.dates}
            </span>
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#C4AF56] shrink-0" />
              {eventInfo.venue}, {eventInfo.city}
            </span>
          </div>
        </div>

        {/* Badge Main Body */}
        <div className="p-6">
          {/* Couple Names & Title */}
          <div className="text-center pb-5 border-b border-dashed border-[#CAC8AA]">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#A89236] bg-[#A89236]/10 px-3 py-1 rounded-full mb-2">
              <Heart className="w-3 h-3 fill-[#A89236]" />
              Futuri Sposi
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#16391C] tracking-tight leading-tight">
              {attendee.coupleNames} {attendee.lastName}
            </h1>

            {/* Wedding Date Highlight */}
            <div className="inline-flex items-center gap-2 mt-2 px-3.5 py-1.5 bg-[#F7F4EC] rounded-xl border border-[#CAC8AA] text-[#16391C] text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#A89236]" />
              <span>Data Nozze: <strong>{attendee.weddingDate ? formatItalianDate(attendee.weddingDate) : 'In definizione'}</strong></span>
            </div>
          </div>

          {/* QR Code and Ticket ID Area */}
          <div className="py-5 flex flex-col items-center justify-center bg-[#F7F4EC]/70 rounded-2xl my-4 border border-[#CAC8AA]/60">
            <div className="p-3.5 bg-white rounded-2xl shadow-xs border border-[#CAC8AA] relative group">
              <QRCodeSVG
                id={`qr-svg-${attendee.id}`}
                value={attendee.id}
                size={180}
                level="H"
                includeMargin={true}
                fgColor="#16391C"
                bgColor="#FFFFFF"
              />
              <div className="absolute inset-0 bg-[#A89236]/5 rounded-2xl pointer-events-none border border-[#A89236]/30"></div>
            </div>

            {/* Ticket Code Tag */}
            <div className="mt-3.5 flex items-center gap-2">
              <span className="font-mono text-base font-bold text-[#16391C] tracking-wider bg-white px-3.5 py-1.5 rounded-xl border border-[#CAC8AA] shadow-2xs">
                {attendee.id}
              </span>
              <button
                id="btn-copy-ticket-id"
                onClick={handleCopyId}
                className="p-2 text-[#99A99C] hover:text-[#16391C] rounded-lg hover:bg-white border border-transparent hover:border-[#CAC8AA] transition-colors cursor-pointer"
                title="Copia codice pass"
                aria-label="Copia codice pass"
              >
                {copied ? <Check className="w-4 h-4 text-[#16391C]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[#99A99C] mt-1.5">
              Mostra questo QR Code al desk d'accoglienza all'ingresso
            </p>
          </div>

          {/* Additional details grid */}
          <div className="space-y-2 text-xs text-[#16391C]/80">
            <div className="flex justify-between items-center py-1.5 border-b border-[#CAC8AA]/30">
              <span className="text-[#99A99C] font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Partecipanti ammessi:
              </span>
              <span className="font-semibold text-[#16391C]">
                {attendee.guestCount || 2} {(attendee.guestCount || 2) === 1 ? 'persona' : 'persone (Coppia)'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-[#CAC8AA]/30">
              <span className="text-[#99A99C] font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Orari Fiera:
              </span>
              <span className="font-semibold text-[#16391C] text-right">
                {eventInfo.openingHours}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-[#CAC8AA]/30">
              <span className="text-[#99A99C] font-medium flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" /> Conosciuta tramite:
              </span>
              <span className="font-semibold text-[#16391C] text-right truncate max-w-[200px]">
                {channelLabel}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5">
              <span className="text-[#99A99C] font-medium">Stato Pass:</span>
              <span className={`inline-flex items-center gap-1 font-semibold px-2.5 py-0.5 rounded-full ${
                attendee.checkedIn 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-[#A89236]/15 text-[#16391C]'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5 text-[#16391C]" />
                {attendee.checkedIn ? 'Ingresso Registrato' : 'Attivo • Valido'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Tear-Off Stub simulation */}
        <div className="relative bg-[#16391C] text-[#CAC8AA] px-6 py-3.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#A89236]" />
            <span className="font-medium text-[#F7F4EC]">Pass Ufficiale Samarate Sposi</span>
          </div>
          <span className="font-mono text-[11px] text-[#CAC8AA]">
            {attendee.email}
          </span>
        </div>
      </div>

      {/* Action Controls Toolbar (Hidden in Print) */}
      {!compact && (
        <div className="no-print mt-6 w-full flex flex-col items-center gap-3">
          <div className="w-full flex flex-wrap items-center justify-center gap-3">
            <button
              id="btn-download-pdf-badge"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2.5 px-6 py-3 bg-[#16391C] hover:bg-[#1e4825] text-white rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-75"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#C4AF56] animate-spin" />
                  Generazione PDF in corso...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-[#C4AF56]" />
                  Scarica Pass in PDF
                </>
              )}
            </button>

            <button
              id="btn-share-badge"
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-[#F7F4EC] text-[#16391C] rounded-xl font-medium text-sm border border-[#CAC8AA] shadow-2xs transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#99A99C]" />
              {shareSuccess ? 'Copiato!' : 'Condividi'}
            </button>

            {onNewRegistration && (
              <button
                id="btn-new-registration-pass"
                onClick={onNewRegistration}
                className="flex items-center gap-2 px-4 py-3 bg-[#A89236]/20 hover:bg-[#A89236]/30 text-[#16391C] rounded-xl font-semibold text-sm border border-[#A89236]/40 transition-all cursor-pointer"
              >
                + Registra Altra Coppia
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
