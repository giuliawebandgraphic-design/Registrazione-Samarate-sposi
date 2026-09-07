export type WeddingRoleCategory = 'coppia' | 'accompagnatore' | 'espositore' | 'wedding_planner' | 'stampa';

export type AcquisitionChannel = 
  | 'instagram_facebook'
  | 'passaparola'
  | 'google_ricerca'
  | 'location_fornitore'
  | 'cartelloni_volantini'
  | 'altro';

export interface FairEventInfo {
  name: string;
  subTitle: string;
  edition: string;
  dates: string;
  openingHours: string;
  venue: string;
  city: string;
  gate: string;
  admission: string;
}

export interface RegistrationFormData {
  coupleNames: string;      // "Nome sposi" (es. Marco e Sofia)
  lastName: string;         // "Cognome" di riferimento
  email: string;            // "Mail di riferimento"
  phone?: string;           // Cellulare / WhatsApp
  weddingDate: string;      // "Data del matrimonio" (YYYY-MM-DD o data concordata)
  weddingDateStatus?: 'fixed' | 'tbd'; // Data definita o ancora da fissare
  acquisitionChannel: AcquisitionChannel; // "Come hanno conosciuto la fiera"
  acquisitionChannelOther?: string;       // Specifica se "Altro"
  guestCount?: number;      // Numero persone (es. Sposi + accompagnatori)
  category: WeddingRoleCategory;
  privacyConsent: boolean;
  marketingConsent?: boolean;
}

export interface Attendee extends RegistrationFormData {
  id: string; // es. SS-25-A8F2K
  registrationDate: string;
  qrPayload: string;
  checkedIn: boolean;
  checkInTime?: string;
  gateScanned?: string;
  notes?: string;
}

export const ACQUISITION_CHANNELS: { id: AcquisitionChannel; label: string; iconName?: string }[] = [
  { id: 'instagram_facebook', label: 'Social Network (Instagram / Facebook)' },
  { id: 'passaparola', label: 'Passaparola (Amici, Parenti o Conoscenti)' },
  { id: 'google_ricerca', label: 'Ricerca Google / Internet' },
  { id: 'location_fornitore', label: 'Location o Fornitore Partner' },
  { id: 'cartelloni_volantini', label: 'Cartellonistica o Volantini' },
  { id: 'altro', label: 'Altro canale' },
];

export const ROLE_DETAILS: Record<WeddingRoleCategory, {
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  headerBg: string;
  description: string;
}> = {
  coppia: {
    label: 'Futuri Sposi',
    badgeBg: 'bg-[#A89236]/15',
    badgeText: 'text-[#16391C]',
    borderColor: 'border-[#A89236]',
    headerBg: 'from-[#16391C] to-[#254f2c]',
    description: 'Ingresso gratuito per la coppia & accesso alle degustazioni',
  },
  accompagnatore: {
    label: 'Accompagnatore',
    badgeBg: 'bg-[#99A99C]/20',
    badgeText: 'text-[#16391C]',
    borderColor: 'border-[#99A99C]',
    headerBg: 'from-[#16391C] via-[#325238] to-[#99A99C]',
    description: 'Ospite / Famigliare al seguito della coppia',
  },
  wedding_planner: {
    label: 'Wedding Planner & VIP',
    badgeBg: 'bg-[#A89236]/25',
    badgeText: 'text-[#16391C]',
    borderColor: 'border-[#A89236]',
    headerBg: 'from-[#16391C] to-[#A89236]',
    description: 'Accredito professionale & accesso lounge riservata',
  },
  espositore: {
    label: 'Espositore Fiera',
    badgeBg: 'bg-[#16391C]/15',
    badgeText: 'text-[#16391C]',
    borderColor: 'border-[#16391C]',
    headerBg: 'from-[#16391C] to-[#1e4825]',
    description: 'Staff stand espositivo & fornitori del settore nozze',
  },
  stampa: {
    label: 'Media & Fotoreporter',
    badgeBg: 'bg-[#99A99C]/30',
    badgeText: 'text-[#16391C]',
    borderColor: 'border-[#99A99C]',
    headerBg: 'from-[#1e3422] to-[#3a5840]',
    description: 'Accredito giornalisti e fotografi ufficiali',
  },
};
