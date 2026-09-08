import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Link2, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  QrCode, 
  Share2, 
  Globe, 
  Smartphone, 
  Sparkles,
  X,
  Instagram,
  MessageCircle,
  Code
} from 'lucide-react';
import { SamarateLogo } from './SamarateLogo';
import { FairEventInfo } from '../types';
import { copyToClipboard } from '../utils/clipboard';

interface ShareRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventInfo: FairEventInfo;
}

export const ShareRegistrationModal: React.FC<ShareRegistrationModalProps> = ({
  isOpen,
  onClose,
  eventInfo,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedCleanLink, setCopiedCleanLink] = useState(false);

  if (!isOpen) return null;

  // Build the clean public standalone registration URL
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isVercelOrCustom = currentOrigin.includes('vercel.app') || (!currentOrigin.includes('run.app') && !currentOrigin.includes('localhost'));
  const origin = isVercelOrCustom ? currentOrigin : 'https://samaratesposi.vercel.app';
  
  // Clean public registration URL
  const publicRegisterUrl = `${origin}/?mode=register`;
  const embedCode = `<iframe src="${publicRegisterUrl}" width="100%" height="850" frameborder="0" style="border:none; border-radius:16px; overflow:hidden;"></iframe>`;

  const handleCopyLink = async () => {
    await copyToClipboard(publicRegisterUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCleanLink = async (url: string) => {
    await copyToClipboard(url);
    setCopiedCleanLink(true);
    setTimeout(() => setCopiedCleanLink(false), 2500);
  };

  const handleCopyEmbed = async () => {
    await copyToClipboard(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  const handleDownloadQrPoster = () => {
    const svg = document.getElementById('qr-public-register-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // High resolution for print
    canvas.width = 1200;
    canvas.height = 1400;

    img.onload = () => {
      if (!ctx) return;

      // Background Ivory
      ctx.fillStyle = '#F7F4EC';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer golden border
      ctx.strokeStyle = '#A89236';
      ctx.lineWidth = 12;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      // Inner thin border
      ctx.strokeStyle = '#CAC8AA';
      ctx.lineWidth = 3;
      ctx.strokeRect(45, 45, canvas.width - 90, canvas.height - 90);

      // Header Texts
      ctx.fillStyle = '#16391C';
      ctx.textAlign = 'center';
      
      // Title
      ctx.font = 'bold 56px "Playfair Display", Georgia, serif';
      ctx.fillText('SAMARATE SPOSI', canvas.width / 2, 140);

      // Subtitle
      ctx.fillStyle = '#A89236';
      ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('10 & 11 OTTOBRE 2025 • VILLA MONTEVECCHIO', canvas.width / 2, 190);

      // Call to action
      ctx.fillStyle = '#16391C';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('INQUADRA E REGISTRATI SUBITO', canvas.width / 2, 270);
      ctx.font = 'normal 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#4a5d4e';
      ctx.fillText('Ingresso Gratuito • Ricevi il Pass con QR Code', canvas.width / 2, 315);

      // White box for QR code
      const qrBoxSize = 720;
      const qrBoxX = (canvas.width - qrBoxSize) / 2;
      const qrBoxY = 360;

      ctx.fillStyle = '#FFFFFF';
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 30);
      ctx.fill();
      ctx.strokeStyle = '#CAC8AA';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw QR Image
      const qrMargin = 50;
      ctx.drawImage(img, qrBoxX + qrMargin, qrBoxY + qrMargin, qrBoxSize - qrMargin * 2, qrBoxSize - qrMargin * 2);

      // Footer
      ctx.fillStyle = '#16391C';
      ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('www.samaratesposi.it', canvas.width / 2, 1150);

      ctx.fillStyle = '#839686';
      ctx.font = 'normal 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Via 5 Giornate, 12 - Samarate (VA)', canvas.width / 2, 1195);

      // Download trigger
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = 'QR-Locandina-Samarate-Sposi-Registrazione.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-[#CAC8AA] shadow-2xl relative text-[#16391C] my-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#16391C] text-[#C4AF56] flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold text-[#16391C]">
              Link Esterno per la Registrazione Sposi
            </h3>
            <p className="text-xs text-[#16391C]/75">
              Condividi questo link con il pubblico: gli ospiti vedranno solo il modulo d'iscrizione e il loro Pass QR, senza accesso ai dati dell'organizzazione.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {/* Main Direct URL Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F7F4EC] border border-[#CAC8AA]">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#16391C] mb-2">
              Link Pubblico Diretto (Ospiti & Social)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={publicRegisterUrl}
                className="flex-1 px-3.5 py-2.5 bg-white rounded-xl text-xs sm:text-sm font-mono text-[#16391C] border border-[#CAC8AA] focus:outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-[#16391C] hover:bg-[#1f4a25] text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-[#C4AF56]" />
                    Copiato!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#C4AF56]" />
                    Copia Link
                  </>
                )}
              </button>
              <a
                href={publicRegisterUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-[#16391C] text-xs font-bold rounded-xl border border-[#CAC8AA] transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                title="Apri link in nuova scheda"
              >
                <ExternalLink className="w-4 h-4 text-[#A89236]" />
                <span className="sm:hidden md:inline">Testa Link</span>
              </a>
            </div>
            <p className="text-[11px] text-[#99A99C] mt-2">
              Questo link isola l'esperienza dell'ospite: nessun menu verso l'area organizzatori o dati altrui.
            </p>
          </div>

          {/* QR Code For Printed Posters & Social */}
          <div className="p-5 rounded-2xl bg-white border border-[#CAC8AA] flex flex-col sm:flex-row items-center gap-6">
            <div className="p-3 bg-white rounded-2xl border-2 border-[#CAC8AA] shadow-xs shrink-0 flex flex-col items-center">
              <QRCodeSVG
                id="qr-public-register-svg"
                value={publicRegisterUrl}
                size={160}
                level="H"
                includeMargin={true}
                fgColor="#16391C"
                bgColor="#FFFFFF"
              />
              <span className="text-[10px] font-bold text-[#A89236] mt-1 font-mono uppercase tracking-wider">
                Scansiona & Iscriviti
              </span>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-3">
              <div>
                <h4 className="font-serif text-lg font-bold text-[#16391C]">
                  QR Code per Locandine e Volantini
                </h4>
                <p className="text-xs text-[#16391C]/75 mt-1 leading-relaxed">
                  Scarica la grafica del QR Code in alta risoluzione per stamparlo sui manifesti pubblicitari, cartelloni 6x3 e pieghevoli: chi lo inquadra con lo smartphone apre direttamente il form di registrazione.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  onClick={handleDownloadQrPoster}
                  className="px-4 py-2.5 bg-[#16391C] hover:bg-[#1f4a25] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#C4AF56]" />
                  Scarica Immagine Grafica QR (PNG)
                </button>
              </div>
            </div>
          </div>

          {/* How to use Channels */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#F7F4EC]/70 border border-[#CAC8AA]/60 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#16391C] mb-1">
                <Instagram className="w-4 h-4 text-[#A89236]" />
                Instagram & TikTok
              </div>
              <p className="text-[11px] text-[#16391C]/70">
                Incolla il link nel campo <em>"Sito web"</em> della bio del profilo o nell'adesivo "Link" delle Storie.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F4EC]/70 border border-[#CAC8AA]/60 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#16391C] mb-1">
                <MessageCircle className="w-4 h-4 text-[#A89236]" />
                WhatsApp & Email
              </div>
              <p className="text-[11px] text-[#16391C]/70">
                Invia il link alle coppie di sposi e agli atelier partner per farli registrare prima dell'evento.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F4EC]/70 border border-[#CAC8AA]/60 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#16391C] mb-1">
                <Printer className="w-4 h-4 text-[#A89236]" />
                Cartelli & Totem
              </div>
              <p className="text-[11px] text-[#16391C]/70">
                Stampa il QR Code all'ingresso di Villa Montevecchio per chi deve ancora registrarsi all'arrivo.
              </p>
            </div>
          </div>

          {/* Embed Option for external website */}
          <div className="p-4 rounded-2xl bg-white border border-[#CAC8AA]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#16391C] flex items-center gap-1.5">
                <Code className="w-4 h-4 text-[#A89236]" />
                Codice Embed per Sito Web Esterno (Iframe)
              </label>
              <button
                onClick={handleCopyEmbed}
                className="text-xs text-[#16391C] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedEmbed ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedEmbed ? 'Copiato!' : 'Copia codice HTML'}
              </button>
            </div>
            <textarea
              readOnly
              rows={2}
              value={embedCode}
              className="w-full p-2.5 bg-[#F7F4EC] rounded-xl text-[11px] font-mono text-[#16391C] border border-[#CAC8AA] focus:outline-none select-all"
            />
            <p className="text-[11px] text-[#99A99C] mt-1">
              Incolla questo snippet HTML dentro qualsiasi pagina web per mostrare il modulo di registrazione direttamente all'interno del tuo sito.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#16391C] hover:bg-[#1f4a25] text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
