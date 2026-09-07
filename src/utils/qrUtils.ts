import { Attendee, ACQUISITION_CHANNELS } from '../types';

export function generateTicketId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SS-25-${randomPart}`;
}

export function formatItalianDate(dateString: string): string {
  if (!dateString) return 'In definizione';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function exportAttendeesToCSV(attendees: Attendee[]) {
  const headers = [
    'ID Biglietto',
    'Nome Sposi',
    'Cognome',
    'Email di Riferimento',
    'Telefono / WhatsApp',
    'Data Matrimonio',
    'Come hanno conosciuto la fiera',
    'Categoria',
    'Check-in Ingresso',
    'Orario Check-in',
    'Data Registrazione'
  ];

  const channelMap = new Map(ACQUISITION_CHANNELS.map(c => [c.id, c.label]));

  const rows = attendees.map(a => {
    const channelLabel = a.acquisitionChannel === 'altro' && a.acquisitionChannelOther
      ? `Altro: ${a.acquisitionChannelOther}`
      : channelMap.get(a.acquisitionChannel) || a.acquisitionChannel;

    return [
      `"${a.id}"`,
      `"${a.coupleNames.replace(/"/g, '""')}"`,
      `"${a.lastName.replace(/"/g, '""')}"`,
      `"${a.email}"`,
      `"${a.phone || '-'}"`,
      `"${a.weddingDate || 'In definizione'}"`,
      `"${channelLabel.replace(/"/g, '""')}"`,
      `"${a.category}"`,
      a.checkedIn ? '"SI (INGRESSO EFFETTUATO)"' : '"NO (ATTESA)"',
      `"${a.checkInTime || '-'}"`,
      `"${a.registrationDate}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `samarate_sposi_iscritti_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
