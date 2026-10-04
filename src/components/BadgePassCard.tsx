import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
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
  Loader2,
  Printer
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Attendee, FairEventInfo, ACQUISITION_CHANNELS } from '../types';
import { formatItalianDate, formatItalianDateTime } from '../utils/qrUtils';
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
  const pdfExportRef = useRef<HTMLDivElement>(null);
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
    const targetElement = pdfExportRef.current || badgeRef.current;
    if (!targetElement) return;

    setIsGeneratingPdf(true);
    try {
      // 1. Ensure fonts are loaded and all images in the container have completed loading
      if (document.fonts) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore font ready errors
        }
      }

      const imgs = Array.from(targetElement.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.all(
        imgs.map(img => {
          if (img.complete) return Promise.resolve(true);
          return new Promise(res => {
            img.onload = () => res(true);
            img.onerror = () => res(true);
          });
        })
      );

      // Brief tick for rendering engine to paint the container
      await new Promise(res => setTimeout(res, 60));

      // 2. High-resolution capture (2.5x pixel ratio for pin-sharp 300 DPI results)
      let imgData: string;
      try {
        imgData = await toPng(targetElement, {
          pixelRatio: 2.5,
          backgroundColor: '#FFFFFF',
          cacheBust: false,
        });
      } catch (err) {
        console.warn('Standard toPng failed, trying fallback with skipFonts:', err);
        imgData = await toPng(targetElement, {
          pixelRatio: 2.5,
          backgroundColor: '#FFFFFF',
          skipFonts: true,
        });
      }

      const img = new Image();
      img.src = imgData;
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = reject;
      });

      // 3. Construct A4 PDF with calculated bounds guaranteeing ZERO cut-offs on mobile and desktop
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;

      // Printable zone inside comfortable page margins
      const maxW = 160; // mm (leaves 25mm margin on left and right)
      const maxH = 225; // mm (leaves plenty of room for A4 header, badge, and footer)

      let imgWidth = maxW;
      let imgHeight = (img.naturalHeight * imgWidth) / img.naturalWidth;

      // BOUNDING CHECK: If calculated height exceeds maxH, scale down proportionally!
      if (imgHeight > maxH) {
        imgHeight = maxH;
        imgWidth = (img.naturalWidth * imgHeight) / img.naturalHeight;
      }

      const x = (pageWidth - imgWidth) / 2;
      const y = Math.max(26, (pageHeight - imgHeight) / 2 - 4);

      // Decorative Top Header on A4 page
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(22, 57, 28); // #16391C
      pdf.text('SAMARATE SPOSI — 10ª EDIZIONE', pageWidth / 2, 15, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(153, 169, 156); // #99A99C
      pdf.text('Villa Montevecchio, Samarate (VA) • 10 e 11 Ottobre 2026 • Ingresso Gratuito con Pass', pageWidth / 2, 20.5, { align: 'center' });

      // Thin separator line at top
      pdf.setDrawColor(202, 200, 170); // #CAC8AA
      pdf.setLineWidth(0.3);
      pdf.line(25, 23.5, pageWidth - 25, 23.5);

      // Render the high-resolution badge image
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');

      // Bottom Footer on A4 page
      const footerY = Math.min(285, y + imgHeight + 9);
      pdf.line(25, footerY - 4, pageWidth - 25, footerY - 4);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(22, 57, 28);
      pdf.text('Mostra questo Pass dal cellulare oppure stampalo su foglio A4 per accedere senza attesa all’ingresso', pageWidth / 2, footerY, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(153, 169, 156);
      pdf.text(`Codice Pass: ${attendee.id} • www.samaratesposi.it • Orari: Sabato 14:00-19:30 | Domenica 10:00-19:00`, pageWidth / 2, footerY + 4.5, { align: 'center' });

      const sanitizedName = `${attendee.lastName}_${attendee.coupleNames}`
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_');
      const fileName = `Pass-Samarate-Sposi-${sanitizedName}-${attendee.id}.pdf`;

      // 4. Save with reliable mobile fallback
      try {
        pdf.save(fileName);
      } catch (saveErr) {
        console.warn('pdf.save failed, executing blob link fallback:', saveErr);
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      }
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
      {/* Printable Badge Visual Card (On-Screen display) */}
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

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#16391C] tracking-tight leading-tight break-words">
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
              <QRCodeCanvas
                id={`qr-canvas-${attendee.id}`}
                value={attendee.id}
                size={180}
                level="H"
                includeMargin={true}
                fgColor="#16391C"
                bgColor="#FFFFFF"
                className="max-w-full h-auto"
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
              <span className="text-[#99A99C] font-medium flex items-center gap-1.5 shrink-0">
                <Users className="w-3.5 h-3.5 shrink-0" /> Partecipanti ammessi:
              </span>
              <span className="font-semibold text-[#16391C] text-right">
                {attendee.guestCount || 2} {(attendee.guestCount || 2) === 1 ? 'persona' : 'persone (Coppia)'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-[#CAC8AA]/30">
              <span className="text-[#99A99C] font-medium flex items-center gap-1.5 shrink-0">
                <Clock className="w-3.5 h-3.5 shrink-0" /> Orari Fiera:
              </span>
              <span className="font-semibold text-[#16391C] text-right">
                {eventInfo.openingHours}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-[#CAC8AA]/30">
              <span className="text-[#99A99C] font-medium flex items-center gap-1.5 shrink-0">
                <Compass className="w-3.5 h-3.5 shrink-0" /> Conosciuta tramite:
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
        <div className="relative bg-[#16391C] text-[#CAC8AA] px-6 py-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#A89236]" />
            <span className="font-medium text-[#F7F4EC]">Pass Ufficiale</span>
            <span className="text-[10px] text-[#CAC8AA]/70">• Reg: {formatItalianDateTime(attendee.registrationDate)}</span>
          </div>
          <span className="font-mono text-[11px] text-[#CAC8AA]">
            {attendee.email}
          </span>
        </div>
      </div>

      {/* Hidden dedicated high-resolution template for PDF generation with fixed desktop proportions */}
      <div
        className="fixed top-0 left-0 pointer-events-none select-none"
        style={{
          zIndex: -9999,
          width: '520px',
          opacity: isGeneratingPdf ? 1 : 0,
          visibility: isGeneratingPdf ? 'visible' : 'hidden',
        }}
        aria-hidden="true"
      >
        <div
          ref={pdfExportRef}
          className="w-[520px] bg-white rounded-3xl border-2 border-[#CAC8AA] overflow-hidden"
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Lanyard Clip Slot Simulation */}
          <div className="h-6 bg-[#F7F4EC] border-b border-[#CAC8AA]/80 flex justify-center items-center">
            <div className="w-14 h-2 bg-[#A89236]/30 rounded-full border border-[#A89236]/50 shadow-inner"></div>
          </div>

          {/* Header Ribbon / Event Banner */}
          <div className="bg-gradient-to-br from-[#16391C] via-[#1d4724] to-[#254f2c] px-6 py-5 text-white">
            <div className="flex items-center justify-between gap-4">
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

            <div className="flex items-center justify-between text-xs text-[#F7F4EC]/90 mt-3 pt-2.5 border-t border-white/15">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C4AF56]" />
                {eventInfo.dates}
              </span>
              <span className="flex items-center gap-1.5">
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

              <h1 
                className="text-3xl font-bold text-[#16391C] tracking-tight leading-tight"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, Cambria, serif" }}
              >
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
              <div className="p-4 bg-white rounded-2xl shadow-xs border border-[#CAC8AA]">
                <QRCodeCanvas
                  value={attendee.id}
                  size={190}
                  level="H"
                  includeMargin={true}
                  fgColor="#16391C"
                  bgColor="#FFFFFF"
                />
              </div>

              {/* Ticket Code Tag */}
              <div className="mt-3.5 flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-[#16391C] tracking-wider bg-white px-4 py-1.5 rounded-xl border border-[#CAC8AA] shadow-2xs">
                  {attendee.id}
                </span>
              </div>
              <p className="text-xs text-[#16391C]/75 mt-1.5 font-medium">
                Mostra questo QR Code al desk d'accoglienza all'ingresso
              </p>
            </div>

            {/* Additional details grid */}
            <div className="space-y-2.5 text-xs text-[#16391C]/85">
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
                <span className="font-semibold text-[#16391C] text-right truncate max-w-[260px]">
                  {channelLabel}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-[#99A99C] font-medium">Stato Pass:</span>
                <span className="inline-flex items-center gap-1 font-semibold px-2.5 py-0.5 rounded-full bg-[#A89236]/15 text-[#16391C]">
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
              <span className="text-[10px] text-[#CAC8AA]/80 ml-2">• Reg: {formatItalianDateTime(attendee.registrationDate)}</span>
            </div>
            <span className="font-mono text-[11px] text-[#CAC8AA]">
              {attendee.email}
            </span>
          </div>
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
              id="btn-print-badge"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-[#F7F4EC] text-[#16391C] rounded-xl font-medium text-sm border border-[#CAC8AA] shadow-2xs transition-all cursor-pointer"
              title="Stampa diretta del Pass"
            >
              <Printer className="w-4 h-4 text-[#A89236]" />
              Stampa
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
