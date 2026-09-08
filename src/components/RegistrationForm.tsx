import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Heart, 
  Mail, 
  Phone, 
  Calendar, 
  Users, 
  ArrowRight, 
  Check, 
  QrCode,
  MapPin,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { 
  Attendee, 
  FairEventInfo, 
  RegistrationFormData,
  ACQUISITION_CHANNELS,
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
      newErrors.coupleNames = 'Inserisci i nomi degli sposi';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Inserisci il cognome';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Inserisci la tua email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Indirizzo email non valido';
    }

    if (!dateUndecided && !formData.weddingDate) {
      newErrors.weddingDate = 'Seleziona una data o spunta "Data da definire"';
    }

    if (formData.acquisitionChannel === 'altro' && !formData.acquisitionChannelOther?.trim()) {
      newErrors.acquisitionChannelOther = 'Specifica come ci hai conosciuto';
    }

    if (!formData.privacyConsent) {
      newErrors.privacyConsent = 'È necessario accettare l\'informativa privacy';
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

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#A89236', '#16391C', '#C4AF56', '#F7F4EC']
      });
    } catch {
      // safe
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onRegistered(newAttendee);
    }, 350);
  };

  const previewNames = formData.coupleNames.trim()
    ? `${formData.coupleNames} ${formData.lastName}`.trim()
    : 'Nomi degli Sposi';

  const previewDate = dateUndecided 
    ? 'Data da definire' 
    : (formData.weddingDate ? formatItalianDate(formData.weddingDate) : 'Data delle nozze');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header pulito ed essenziale */}
      <div className="text-center max-w-xl mx-auto pt-2 pb-1">
        <div className="flex justify-center mb-3">
          <SamarateLogo size="lg" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#16391C] tracking-tight">
          Pass Ingresso Gratuito
        </h1>
        <p className="text-sm text-[#16391C]/75 mt-1.5 leading-relaxed">
          Compila i campi per ricevere all'istante il tuo biglietto con QR Code.
        </p>

        <div className="inline-flex items-center gap-2 mt-3 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#CAC8AA]/80 text-xs text-[#16391C] shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-[#A89236]" />
          <span className="font-semibold">{eventInfo.dates}</span>
          <span className="text-[#CAC8AA]">•</span>
          <MapPin className="w-3.5 h-3.5 text-[#A89236]" />
          <span>{eventInfo.venue} ({eventInfo.city})</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form di registrazione rapido */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#CAC8AA]/70 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sezione 1: Sposi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="input-couple-names" className="block text-xs font-semibold text-[#16391C] mb-1">
                  Nomi degli Sposi <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#99A99C]">
                    <Heart className="w-4 h-4" />
                  </div>
                  <input
                    id="input-couple-names"
                    type="text"
                    placeholder="es. Marco e Sofia"
                    value={formData.coupleNames}
                    onChange={e => {
                      setFormData({ ...formData, coupleNames: e.target.value });
                      if (errors.coupleNames) setErrors(prev => ({ ...prev, coupleNames: '' }));
                    }}
                    className={`w-full pl-9 pr-3 py-2.5 bg-[#F7F4EC]/40 rounded-xl text-[#16391C] placeholder-[#99A99C] text-sm border ${
                      errors.coupleNames ? 'border-rose-400 bg-rose-50/30' : 'border-[#CAC8AA] focus:border-[#16391C]'
                    } focus:outline-none focus:ring-2 focus:ring-[#A89236]/20 transition-all`}
                  />
                </div>
                {errors.coupleNames && <p className="text-rose-500 text-xs mt-1">{errors.coupleNames}</p>}
              </div>

              <div>
                <label htmlFor="input-last-name" className="block text-xs font-semibold text-[#16391C] mb-1">
                  Cognome <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-last-name"
                  type="text"
                  placeholder="es. Colombo"
                  value={formData.lastName}
                  onChange={e => {
                    setFormData({ ...formData, lastName: e.target.value });
                    if (errors.lastName) setErrors(prev => ({ ...prev, lastName: '' }));
                  }}
                  className={`w-full px-3 py-2.5 bg-[#F7F4EC]/40 rounded-xl text-[#16391C] placeholder-[#99A99C] text-sm border ${
                    errors.lastName ? 'border-rose-400 bg-rose-50/30' : 'border-[#CAC8AA] focus:border-[#16391C]'
                  } focus:outline-none focus:ring-2 focus:ring-[#A89236]/20 transition-all`}
                />
                {errors.lastName && <p className="text-rose-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Sezione 2: Contatti */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="input-email" className="block text-xs font-semibold text-[#16391C] mb-1">
                  Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#99A99C]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="input-email"
                    type="email"
                    placeholder="nome@email.it"
                    value={formData.email}
                    onChange={e => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    }}
                    className={`w-full pl-9 pr-3 py-2.5 bg-[#F7F4EC]/40 rounded-xl text-[#16391C] placeholder-[#99A99C] text-sm border ${
                      errors.email ? 'border-rose-400 bg-rose-50/30' : 'border-[#CAC8AA] focus:border-[#16391C]'
                    } focus:outline-none focus:ring-2 focus:ring-[#A89236]/20 transition-all`}
                  />
                </div>
                {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="input-phone" className="block text-xs font-semibold text-[#16391C] mb-1">
                  Telefono <span className="text-[#99A99C] font-normal text-[11px]">(facoltativo)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#99A99C]">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="input-phone"
                    type="tel"
                    placeholder="es. 347 1234567"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#F7F4EC]/40 rounded-xl text-[#16391C] placeholder-[#99A99C] text-sm border border-[#CAC8AA] focus:border-[#16391C] focus:outline-none focus:ring-2 focus:ring-[#A89236]/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Sezione 3: Data Nozze */}
            <div className="bg-[#F7F4EC]/60 rounded-2xl p-3.5 border border-[#CAC8AA]/60">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label htmlFor="input-wedding-date" className="text-xs font-semibold text-[#16391C]">
                  Data Nozze {!dateUndecided && <span className="text-rose-500">*</span>}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !dateUndecided;
                    setDateUndecided(next);
                    if (next && errors.weddingDate) {
                      setErrors(prev => ({ ...prev, weddingDate: '' }));
                    }
                  }}
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer ${
                    dateUndecided 
                      ? 'bg-[#16391C] text-white border-[#16391C]' 
                      : 'bg-white text-[#16391C]/80 border-[#CAC8AA] hover:bg-white/80'
                  }`}
                >
                  {dateUndecided ? '✓ Data da definire' : 'Data non ancora fissata'}
                </button>
              </div>

              {!dateUndecided ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#99A99C]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    id="input-wedding-date"
                    type="date"
                    value={formData.weddingDate}
                    onChange={e => {
                      setFormData({ ...formData, weddingDate: e.target.value });
                      if (errors.weddingDate) setErrors(prev => ({ ...prev, weddingDate: '' }));
                    }}
                    className={`w-full pl-9 pr-3 py-2 bg-white rounded-xl text-[#16391C] text-sm border ${
                      errors.weddingDate ? 'border-rose-400' : 'border-[#CAC8AA] focus:border-[#16391C]'
                    } focus:outline-none focus:ring-2 focus:ring-[#A89236]/20 transition-all`}
                  />
                </div>
              ) : (
                <div className="py-2 px-3 bg-white/70 rounded-xl text-xs text-[#16391C]/70 border border-[#CAC8AA]/60 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Nessun problema, potrai aggiornarla in qualsiasi momento.</span>
                </div>
              )}
              {errors.weddingDate && !dateUndecided && (
                <p className="text-rose-500 text-xs mt-1">{errors.weddingDate}</p>
              )}
            </div>

            {/* Sezione 4: Numero Partecipanti */}
            <div>
              <label className="block text-xs font-semibold text-[#16391C] mb-1.5 flex items-center justify-between">
                <span>Numero Partecipanti</span>
                <span className="text-[11px] font-normal text-[#99A99C]">(coppia + accompagnatori)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { num: 2, label: '2 (Coppia)' },
                  { num: 1, label: '1 Persona' },
                  { num: 3, label: '3 Persone' },
                  { num: 4, label: '4+ Persone' },
                ].map(item => (
                  <button
                    key={item.num}
                    type="button"
                    onClick={() => setFormData({ ...formData, guestCount: item.num })}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      formData.guestCount === item.num 
                        ? 'border-[#16391C] bg-[#16391C] text-white shadow-2xs' 
                        : 'border-[#CAC8AA] bg-[#F7F4EC]/30 text-[#16391C]/80 hover:bg-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sezione 5: Come ci hai conosciuto (compatto) */}
            <div>
              <label htmlFor="select-channel" className="block text-xs font-semibold text-[#16391C] mb-1">
                Come ci hai conosciuto?
              </label>
              <select
                id="select-channel"
                value={formData.acquisitionChannel}
                onChange={e => setFormData({ ...formData, acquisitionChannel: e.target.value as AcquisitionChannel })}
                className="w-full px-3 py-2.5 bg-[#F7F4EC]/40 rounded-xl text-xs sm:text-sm text-[#16391C] border border-[#CAC8AA] focus:border-[#16391C] focus:outline-none focus:ring-2 focus:ring-[#A89236]/20 transition-all cursor-pointer"
              >
                {ACQUISITION_CHANNELS.map(ch => (
                  <option key={ch.id} value={ch.id}>
                    {ch.label}
                  </option>
                ))}
              </select>

              {formData.acquisitionChannel === 'altro' && (
                <input
                  type="text"
                  placeholder="Specifica..."
                  value={formData.acquisitionChannelOther}
                  onChange={e => setFormData({ ...formData, acquisitionChannelOther: e.target.value })}
                  className="w-full mt-2 px-3 py-2 bg-[#F7F4EC]/40 rounded-xl text-xs border border-[#CAC8AA] text-[#16391C] focus:border-[#16391C] focus:outline-none"
                />
              )}
            </div>

            {/* Privacy Checkbox pulito */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  id="checkbox-privacy"
                  type="checkbox"
                  checked={formData.privacyConsent}
                  onChange={e => {
                    setFormData({ ...formData, privacyConsent: e.target.checked });
                    if (errors.privacyConsent) setErrors(prev => ({ ...prev, privacyConsent: '' }));
                  }}
                  className="w-4 h-4 accent-[#16391C] rounded border-[#CAC8AA] shrink-0"
                />
                <span className="text-xs text-[#16391C]/80">
                  Accetto l'informativa privacy per l'emissione del Pass Gratuito.
                </span>
              </label>
              {errors.privacyConsent && <p className="text-rose-500 text-xs mt-1">{errors.privacyConsent}</p>}
            </div>

            {/* Pulsante Principale di Invio */}
            <div className="pt-2">
              <button
                id="btn-submit-wedding-registration"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#16391C] hover:bg-[#1f4a25] active:bg-[#122e17] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 group"
              >
                <QrCode className="w-4 h-4 text-[#C4AF56]" />
                <span>{isSubmitting ? 'Creazione in corso...' : 'Scarica il Tuo Pass Gratuito'}</span>
                <ArrowRight className="w-4 h-4 text-[#C4AF56] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>
        </div>

        {/* Anteprima Pass Elegante e Minimale */}
        <div className="lg:col-span-5 sticky top-24">
          <div className="bg-white rounded-3xl p-6 border border-[#CAC8AA]/70 shadow-sm text-center relative overflow-hidden">
            {/* Badge anteprima */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#A89236]/10 border border-[#A89236]/30 text-[11px] font-semibold text-[#16391C] mb-4">
              <Sparkles className="w-3 h-3 text-[#A89236]" />
              <span>Anteprima Biglietto</span>
            </div>

            {/* Logo e Dettaglio Coppia */}
            <div className="mb-4">
              <SamarateLogo size="md" />
            </div>

            <div className="bg-[#F7F4EC]/60 rounded-2xl p-4 border border-[#CAC8AA]/60 mb-4">
              <p className="text-[11px] uppercase tracking-wider text-[#A89236] font-bold">
                Pass Ufficiale Sposi
              </p>
              <h3 className="font-serif text-xl font-bold text-[#16391C] mt-1 leading-snug break-words">
                {previewNames}
              </h3>
              <p className="text-xs text-[#16391C]/75 mt-1">
                Nozze: <span className="font-semibold">{previewDate}</span>
              </p>
            </div>

            {/* QR Code in tempo reale */}
            <div className="p-3 bg-white rounded-2xl inline-block border border-[#CAC8AA]/80 shadow-xs mb-3">
              <QRCodeSVG
                value={`SAMARATE-SPOSI:PREVIEW:${formData.coupleNames || 'OSPITE'}`}
                size={130}
                level="M"
                fgColor="#16391C"
                bgColor="#FFFFFF"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#16391C]/80 pt-3 border-t border-[#CAC8AA]/50 max-w-xs mx-auto">
              <span className="flex items-center gap-1 text-emerald-800 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Ingresso Gratuito
              </span>
              <span className="font-medium bg-[#CAC8AA]/30 px-2 py-0.5 rounded-md">
                {formData.guestCount} {formData.guestCount === 1 ? 'Ospite' : 'Ospiti'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
