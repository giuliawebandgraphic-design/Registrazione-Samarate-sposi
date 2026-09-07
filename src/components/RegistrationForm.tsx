import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Heart, 
  Mail, 
  Phone, 
  Calendar, 
  Sparkles,
  Users,
  Compass,
  Check,
  ArrowRight,
  ShieldCheck,
  QrCode
} from 'lucide-react';
import { 
  Attendee, 
  FairEventInfo, 
  RegistrationFormData,
  ACQUISITION_CHANNELS,
  ROLE_DETAILS,
  WeddingRoleCategory,
  AcquisitionChannel
} from '../types';
import { generateTicketId, formatItalianDate } from '../utils/qrUtils';
import { SamarateLogo } from './SamarateLogo';
import { QRCodeSVG } from 'qrcode.react';

interface RegistrationFormProps {
  eventInfo: FairEventInfo;
  onRegistered: (attendee: Attendee) => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  eventInfo,
  onRegistered,
}) => {
  const [formData, setFormData] = useState<RegistrationFormData>({
    coupleNames: '',
    lastName: '',
    email: '',
    phone: '',
    weddingDate: '',
    weddingDateStatus: 'fixed',
    acquisitionChannel: 'instagram_facebook',
    acquisitionChannelOther: '',
    guestCount: 2,
    category: 'coppia',
    privacyConsent: true,
    marketingConsent: true,
  });

  const [dateUndecided, setDateUndecided] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.coupleNames.trim()) {
      newErrors.coupleNames = 'Inserisci il nome degli sposi (es. Marco e Sofia)';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Inserisci il cognome di riferimento';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Inserisci l\'email di riferimento per ricevere il Pass';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato email non valido';
    }

    if (!dateUndecided && !formData.weddingDate) {
      newErrors.weddingDate = 'Seleziona la data prevista delle nozze oppure indica "Data ancora da definire"';
    }

    if (formData.acquisitionChannel === 'altro' && !formData.acquisitionChannelOther?.trim()) {
      newErrors.acquisitionChannelOther = 'Specifica come sei venuto a conoscenza della fiera';
    }

    if (!formData.privacyConsent) {
      newErrors.privacyConsent = 'È necessario accettare l\'informativa privacy per generare il pass';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const ticketId = generateTicketId();
    const effectiveWeddingDate = dateUndecided ? 'In definizione' : formData.weddingDate;

    const newAttendee: Attendee = {
      ...formData,
      weddingDate: effectiveWeddingDate,
      weddingDateStatus: dateUndecided ? 'tbd' : 'fixed',
      id: ticketId,
      registrationDate: new Date().toLocaleString('it-IT', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      qrPayload: JSON.stringify({
        id: ticketId,
        sposi: `${formData.coupleNames} ${formData.lastName}`.trim(),
        email: formData.email,
        dataNozze: effectiveWeddingDate,
        fiera: "Samarate Sposi",
        valid: true
      }),
      checkedIn: false
    };

    // Confetti celebration with golden and emerald sparkles
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#A89236', '#16391C', '#99A99C', '#F7F4EC', '#D9C66E']
      });
    } catch {
      // safe
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onRegistered(newAttendee);
    }, 450);
  };

  const previewDisplayName = formData.coupleNames.trim() 
    ? `${formData.coupleNames} ${formData.lastName}`.trim()
    : 'Nome Sposi & Cognome';

  const previewWeddingDateText = dateUndecided 
    ? 'Data nozze in definizione' 
    : (formData.weddingDate ? formatItalianDate(formData.weddingDate) : 'Seleziona data nozze');

  return (
    <div className="max-w-6xl mx-auto">
      {/* Intro Romantic Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#CAC8AA]/60 shadow-xs mb-8 text-center relative overflow-hidden">
        {/* Subtle Decorative Arch */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#A89236]/5 pointer-events-none blur-xl"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#16391C]/5 pointer-events-none blur-xl"></div>

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          <SamarateLogo size="lg" className="mb-3" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#A89236]/15 text-[#16391C] border border-[#A89236]/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#A89236]" />
            Registrazione Ufficiale Futuri Sposi & Pass Ingresso Gratuito
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl text-[#16391C] font-bold tracking-tight mt-1">
            Il Tuo Matrimonio Inizia Qui
          </h1>
          
          <p className="text-sm text-[#16391C]/75 mt-2 leading-relaxed">
            Compila i dati della coppia per scaricare istantaneamente il tuo <strong>Pass d'Ingresso con QR Code</strong>. 
            Presentalo all'accoglienza per accedere agli atelier, location e degustazioni della fiera.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs font-medium text-[#16391C]/80 pt-2 border-t border-[#CAC8AA]/40">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#A89236]" />
              {eventInfo.dates}
            </span>
            <span className="text-[#99A99C]">•</span>
            <span>{eventInfo.venue} ({eventInfo.city})</span>
            <span className="text-[#99A99C]">•</span>
            <span className="text-[#16391C] font-semibold">{eventInfo.admission}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Form Box */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#CAC8AA]/70 shadow-sm">
          <div className="mb-6 pb-4 border-b border-[#CAC8AA]/30 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#16391C]">
                Modulo di Registrazione Sposi
              </h2>
              <p className="text-xs text-[#99A99C] mt-0.5">
                I campi contrassegnati con <span className="text-rose-500 font-bold">*</span> sono obbligatori
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#F7F4EC] border border-[#CAC8AA] flex items-center justify-center text-[#A89236]">
              <Heart className="w-4 h-4 fill-[#A89236]/20" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Field 1: Nome sposi */}
            <div>
              <label htmlFor="input-couple-names" className="block text-xs font-bold uppercase tracking-wider text-[#16391C] mb-1.5">
                Nome Sposi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#99A99C]">
                  <Heart className="w-4 h-4" />
                </div>
                <input
                  id="input-couple-names"
                  type="text"
                  placeholder="Es. Marco e Sofia (o nome degli sposi)"
                  value={formData.coupleNames}
                  onChange={e => setFormData({ ...formData, coupleNames: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#F7F4EC]/50 rounded-xl text-[#16391C] placeholder-[#99A99C] text-sm border ${
                    errors.coupleNames ? 'border-rose-400 focus:ring-rose-200' : 'border-[#CAC8AA] focus:border-[#16391C] focus:ring-[#A89236]/20'
                  } focus:outline-none focus:ring-3 transition-all`}
                />
              </div>
              {errors.coupleNames && <p className="text-rose-500 text-xs mt-1 font-medium">{errors.coupleNames}</p>}
            </div>

            {/* Field 2 & 3: Cognome e Mail di riferimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="input-last-name" className="block text-xs font-bold uppercase tracking-wider text-[#16391C] mb-1.5">
                  Cognome <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-last-name"
                  type="text"
                  placeholder="Es. Colombo o Rossi"
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  className={`w-full px-3.5 py-2.5 bg-[#F7F4EC]/50 rounded-xl text-[#16391C] placeholder-[#99A99C] text-sm border ${
                    errors.lastName ? 'border-rose-400 focus:ring-rose-200' : 'border-[#CAC8AA] focus:border-[#16391C] focus:ring-[#A89236]/20'
                  } focus:outline-none focus:ring-3 transition-all`}
                />
                {errors.lastName && <p className="text-rose-500 text-xs mt-1 font-medium">{errors.lastName}</p>}
              </div>

              <div>
                <label htmlFor="input-email" className="block text-xs font-bold uppercase tracking-wider text-[#16391C] mb-1.5">
                  Mail di Riferimento <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#99A99C]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="input-email"
                    type="email"
                    placeholder="tuaemail@esempio.it"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full pl-10 pr-4 py-2.5 bg-[#F7F4EC]/50 rounded-xl text-[#16391C] placeholder-[#99A99C] text-sm border ${
                      errors.email ? 'border-rose-400 focus:ring-rose-200' : 'border-[#CAC8AA] focus:border-[#16391C] focus:ring-[#A89236]/20'
                    } focus:outline-none focus:ring-3 transition-all`}
                  />
                </div>
                {errors.email && <p className="text-rose-500 text-xs mt-1 font-medium">{errors.email}</p>}
              </div>
            </div>

            {/* Field 4: Data del matrimonio + Telefono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="input-wedding-date" className="text-xs font-bold uppercase tracking-wider text-[#16391C]">
                    Data del Matrimonio {!dateUndecided && <span className="text-rose-500">*</span>}
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#99A99C]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    id="input-wedding-date"
                    type="date"
                    disabled={dateUndecided}
                    value={dateUndecided ? '' : formData.weddingDate}
                    onChange={e => setFormData({ ...formData, weddingDate: e.target.value })}
                    className={`w-full pl-10 pr-4 py-2.5 bg-[#F7F4EC]/50 rounded-xl text-[#16391C] text-sm border ${
                      dateUndecided ? 'opacity-40 bg-slate-100 cursor-not-allowed border-[#CAC8AA]' :
                      errors.weddingDate ? 'border-rose-400 focus:ring-rose-200' : 'border-[#CAC8AA] focus:border-[#16391C] focus:ring-[#A89236]/20'
                    } focus:outline-none focus:ring-3 transition-all`}
                  />
                </div>
                {errors.weddingDate && !dateUndecided && (
                  <p className="text-rose-500 text-xs mt-1 font-medium">{errors.weddingDate}</p>
                )}

                {/* Option if date not yet fixed */}
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dateUndecided}
                    onChange={e => setDateUndecided(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#16391C] rounded border-[#CAC8AA]"
                  />
                  <span className="text-xs text-[#16391C]/70">Non abbiamo ancora fissato la data esatta</span>
                </label>
              </div>

              <div>
                <label htmlFor="input-phone" className="block text-xs font-bold uppercase tracking-wider text-[#16391C] mb-1.5">
                  Cellulare / WhatsApp <span className="text-[#99A99C] font-normal text-[11px]">(consigliato)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#99A99C]">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="input-phone"
                    type="tel"
                    placeholder="Es. +39 347 1234567"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F7F4EC]/50 rounded-xl text-[#16391C] placeholder-[#99A99C] text-sm border border-[#CAC8AA] focus:border-[#16391C] focus:ring-3 focus:ring-[#A89236]/20 focus:outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#99A99C] mt-1">
                  Per invio promemoria ingresso e sorteggi premi sposi
                </p>
              </div>
            </div>

            {/* Field 5: Come hanno conosciuto la fiera */}
            <div>
              <label htmlFor="select-channel" className="block text-xs font-bold uppercase tracking-wider text-[#16391C] mb-2 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#A89236]" />
                Come hai conosciuto la fiera Samarate Sposi? <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ACQUISITION_CHANNELS.map(ch => {
                  const isSelected = formData.acquisitionChannel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      id={`btn-channel-${ch.id}`}
                      onClick={() => setFormData({ ...formData, acquisitionChannel: ch.id })}
                      className={`p-3 rounded-xl text-left border text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'border-[#16391C] bg-[#16391C]/5 text-[#16391C] ring-2 ring-[#A89236]/30 font-semibold' 
                          : 'border-[#CAC8AA]/70 hover:border-[#99A99C] bg-white text-[#16391C]/80 hover:bg-[#F7F4EC]/50'
                      }`}
                    >
                      <span>{ch.label}</span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-[#16391C] text-white flex items-center justify-center shrink-0 ml-2">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {formData.acquisitionChannel === 'altro' && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    placeholder="Specificare come hai saputo dell'evento..."
                    value={formData.acquisitionChannelOther}
                    onChange={e => setFormData({ ...formData, acquisitionChannelOther: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F7F4EC]/50 rounded-xl text-xs sm:text-sm border border-[#CAC8AA] text-[#16391C] placeholder-[#99A99C] focus:border-[#16391C] focus:outline-none"
                  />
                  {errors.acquisitionChannelOther && (
                    <p className="text-rose-500 text-xs mt-1">{errors.acquisitionChannelOther}</p>
                  )}
                </div>
              )}
            </div>

            {/* Accompagnatori / Ospiti al seguito */}
            <div className="pt-2 border-t border-[#CAC8AA]/30">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#16391C] mb-1.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#99A99C]" />
                Numero Partecipanti con questo Pass
              </label>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFormData({ ...formData, guestCount: num })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formData.guestCount === num 
                        ? 'border-[#16391C] bg-[#16391C] text-white shadow-xs' 
                        : 'border-[#CAC8AA] bg-white text-[#16391C] hover:bg-[#F7F4EC]'
                    }`}
                  >
                    {num === 2 ? '2 (La Coppia)' : `${num} ${num === 1 ? 'Persona' : 'Persone'}`}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#99A99C] mt-1.5">
                Il pass è valido per l'intera coppia ed eventuali accompagnatori (genitori o testimoni).
              </p>
            </div>

            {/* Privacy Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  id="checkbox-privacy"
                  type="checkbox"
                  checked={formData.privacyConsent}
                  onChange={e => setFormData({ ...formData, privacyConsent: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-[#16391C] rounded border-[#CAC8AA]"
                />
                <span className="text-xs text-[#16391C]/80 leading-relaxed">
                  Dichiaro di aver preso visione dell'informativa privacy e acconsento al trattamento dei dati per la registrazione a <strong>Samarate Sposi</strong> e l'emissione del Pass d'ingresso con QR Code. <span className="text-rose-500">*</span>
                </span>
              </label>
              {errors.privacyConsent && <p className="text-rose-500 text-xs mt-1 font-medium">{errors.privacyConsent}</p>}
            </div>

            {/* Submit Action */}
            <div className="pt-3">
              <button
                id="btn-submit-wedding-registration"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-2xl bg-[#16391C] hover:bg-[#1f4a25] active:bg-[#122e17] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75 group"
              >
                <div className="w-7 h-7 rounded-full bg-[#A89236]/30 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-[#C4AF56]" />
                </div>
                <span className="tracking-wide">
                  {isSubmitting ? 'Creazione Pass in corso...' : 'Genera Pass Ingresso Samarate Sposi'}
                </span>
                <ArrowRight className="w-4 h-4 text-[#C4AF56] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>
        </div>

        {/* Live Wedding Pass Mockup Preview */}
        <div className="lg:col-span-5 sticky top-24">
          <div className="bg-[#F7F4EC] p-3.5 rounded-2xl border border-[#CAC8AA] mb-3 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#16391C]">
              <span className="w-2 h-2 rounded-full bg-[#A89236] animate-ping"></span>
              Anteprima Pass Nozze in Tempo Reale
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#A89236] bg-white px-2 py-0.5 rounded-md border border-[#CAC8AA]/60">
              PASS DIGITALE
            </span>
          </div>

          {/* Luxury Pass Card Rendering */}
          <div className="bg-white rounded-3xl shadow-xl border border-[#CAC8AA] overflow-hidden max-w-sm mx-auto relative transition-all">
            {/* Top Lanyard simulation with golden touch */}
            <div className="h-6 bg-[#F7F4EC] border-b border-[#CAC8AA]/80 flex justify-center items-center">
              <div className="w-12 h-2 bg-[#A89236]/30 rounded-full border border-[#A89236]/40"></div>
            </div>

            {/* Pass Header Banner with Forest Green & Gold */}
            <div className="bg-gradient-to-br from-[#16391C] via-[#1b4422] to-[#254f2c] px-5 py-5 text-white relative">
              <div className="flex items-center justify-between">
                <SamarateLogo size="sm" variant="light" showSubline={false} />
                <span className="bg-[#A89236] text-[#16391C] text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-2xs">
                  {eventInfo.edition}
                </span>
              </div>
              <div className="mt-3 pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-[#CAC8AA]">
                <span>{eventInfo.venue}</span>
                <span>{eventInfo.dates}</span>
              </div>
            </div>

            {/* Pass Content Body */}
            <div className="p-6 text-center">
              <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[#A89236] bg-[#A89236]/10 px-3 py-1 rounded-full mb-2">
                INVITO NOMINALE SPOSI
              </span>

              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#16391C] leading-tight truncate">
                {previewDisplayName}
              </h3>

              <div className="inline-flex items-center gap-1.5 text-xs text-[#16391C]/80 mt-1.5 font-medium bg-[#F7F4EC] px-3 py-1 rounded-xl border border-[#CAC8AA]/50">
                <Calendar className="w-3.5 h-3.5 text-[#A89236]" />
                <span>Nozze: <strong>{previewWeddingDateText}</strong></span>
              </div>

              {/* QR Code Container */}
              <div className="my-5 p-3 bg-[#F7F4EC] rounded-2xl inline-block border-2 border-[#CAC8AA]/60 relative group shadow-inner">
                <QRCodeSVG
                  value={`SAMARATE-SPOSI:PREVIEW:${formData.coupleNames || 'OSPITE'}`}
                  size={135}
                  level="M"
                  includeMargin={true}
                  fgColor="#16391C"
                  bgColor="#F7F4EC"
                />
              </div>

              {/* Fake Ticket ID */}
              <div className="text-xs font-mono font-bold tracking-wider text-[#16391C] bg-[#CAC8AA]/30 py-1 px-3 rounded-lg inline-block border border-[#CAC8AA]">
                SS-25-PREVIEW
              </div>

              <div className="mt-4 pt-3 border-t border-[#CAC8AA]/40 flex items-center justify-between text-[11px] text-[#16391C]/70">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#16391C]" />
                  Ingresso Gratuito
                </span>
                <span className="font-semibold text-[#16391C]">
                  {formData.guestCount} {formData.guestCount === 1 ? 'Persona' : 'Persone'}
                </span>
              </div>
            </div>

            {/* Bottom Tear-Off Stub simulation */}
            <div className="bg-[#16391C] px-5 py-2.5 text-center text-[10px] text-[#CAC8AA] tracking-wider uppercase font-medium">
              Samarate Sposi • Valido per l'accesso ai padiglioni
            </div>
          </div>

          <p className="text-center text-xs text-[#99A99C] mt-3">
            Il codice QR ufficiale e univoco per l'accesso ai varchi verrà rilasciato non appena invierai la registrazione.
          </p>
        </div>
      </div>
    </div>
  );
};
