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

export function formatItalianDateTime(dateTimeStr?: string): string {
  if (!dateTimeStr) return '-';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateTimeStr)) {
    return dateTimeStr;
  }
  try {
    const d = new Date(dateTimeStr.replace(' ', 'T'));
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch {
    // fallback
  }
  return dateTimeStr;
}

export function splitDateTime(dateTimeStr?: string): { date: string; time: string } {
  const formatted = formatItalianDateTime(dateTimeStr);
  if (!formatted || formatted === '-') return { date: '-', time: '' };
  const parts = formatted.split(/[,\s]+/);
  if (parts.length >= 2) {
    return { date: parts[0], time: parts[1] };
  }
  return { date: formatted, time: '' };
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
