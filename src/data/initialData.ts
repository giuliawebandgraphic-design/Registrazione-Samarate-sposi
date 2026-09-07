import { Attendee, FairEventInfo } from '../types';

export const DEFAULT_EVENT: FairEventInfo = {
  name: "Samarate Sposi",
  subTitle: "Salone dell'Abito da Sposa, Ricevimento e Cerimonie",
  edition: "Edizione 2025",
  dates: "10 & 11 Ottobre 2025",
  openingHours: "10:00 - 19:30 (Orario Continuato)",
  venue: "Villa Montevecchio",
  city: "Samarate (Varese)",
  gate: "Ingresso d'Onore & Desk Accoglienza",
  admission: "Ingresso Gratuito per la Coppia con Pass QR"
};

export const INITIAL_ATTENDEES: Attendee[] = [
  {
    id: "SS-25-K8X92",
    coupleNames: "Chiara e Alessandro",
    lastName: "Colombo",
    email: "chiara.colombo@gmail.com",
    phone: "+39 347 1234567",
    weddingDate: "2026-06-20",
    weddingDateStatus: "fixed",
    acquisitionChannel: "instagram_facebook",
    category: "coppia",
    guestCount: 2,
    privacyConsent: true,
    marketingConsent: true,
    registrationDate: "2025-10-02 11:20",
    qrPayload: JSON.stringify({
      id: "SS-25-K8X92",
      sposi: "Chiara e Alessandro Colombo",
      dataNozze: "2026-06-20",
      fiera: "Samarate Sposi",
      valid: true
    }),
    checkedIn: true,
    checkInTime: "10 Ott 10:45",
    gateScanned: "Desk Accoglienza Parco"
  },
  {
    id: "SS-25-P4W17",
    coupleNames: "Matteo e Francesca",
    lastName: "Ferrari",
    email: "matteo.ferrari@outlook.it",
    phone: "+39 333 9876543",
    weddingDate: "2026-09-12",
    weddingDateStatus: "fixed",
    acquisitionChannel: "passaparola",
    category: "coppia",
    guestCount: 3,
    privacyConsent: true,
    marketingConsent: false,
    registrationDate: "2025-10-04 15:40",
    qrPayload: JSON.stringify({
      id: "SS-25-P4W17",
      sposi: "Matteo e Francesca Ferrari",
      dataNozze: "2026-09-12",
      fiera: "Samarate Sposi",
      valid: true
    }),
    checkedIn: false
  },
  {
    id: "SS-25-R9N83",
    coupleNames: "Sofia e Gabriele",
    lastName: "Riva",
    email: "sofia.riva@yahoo.it",
    phone: "+39 328 5544332",
    weddingDate: "2027-05-22",
    weddingDateStatus: "fixed",
    acquisitionChannel: "location_fornitore",
    category: "coppia",
    guestCount: 2,
    privacyConsent: true,
    marketingConsent: true,
    registrationDate: "2025-10-06 18:05",
    qrPayload: JSON.stringify({
      id: "SS-25-R9N83",
      sposi: "Sofia e Gabriele Riva",
      dataNozze: "2027-05-22",
      fiera: "Samarate Sposi",
      valid: true
    }),
    checkedIn: true,
    checkInTime: "10 Ott 11:15",
    gateScanned: "Desk Accoglienza Parco"
  },
  {
    id: "SS-25-L2M64",
    coupleNames: "Elena e Marco",
    lastName: "Fontana",
    email: "elena.fontana@libero.it",
    phone: "+39 340 7788990",
    weddingDate: "2026-04-18",
    weddingDateStatus: "fixed",
    acquisitionChannel: "google_ricerca",
    category: "coppia",
    guestCount: 2,
    privacyConsent: true,
    marketingConsent: true,
    registrationDate: "2025-10-08 09:30",
    qrPayload: JSON.stringify({
      id: "SS-25-L2M64",
      sposi: "Elena e Marco Fontana",
      dataNozze: "2026-04-18",
      fiera: "Samarate Sposi",
      valid: true
    }),
    checkedIn: false
  }
];
