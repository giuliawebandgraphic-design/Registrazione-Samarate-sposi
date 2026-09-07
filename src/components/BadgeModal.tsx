import React from 'react';
import { X } from 'lucide-react';
import { Attendee, FairEventInfo } from '../types';
import { BadgePassCard } from './BadgePassCard';

interface BadgeModalProps {
  attendee: Attendee | null;
  eventInfo: FairEventInfo;
  onClose: () => void;
}

export const BadgeModal: React.FC<BadgeModalProps> = ({
  attendee,
  eventInfo,
  onClose
}) => {
  if (!attendee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg my-8">
        <button
          id="btn-close-badge-modal"
          onClick={onClose}
          className="no-print absolute -top-12 right-0 p-2 text-white/90 hover:text-white bg-[#16391C] hover:bg-[#1f4a25] rounded-full transition-colors flex items-center gap-1.5 text-xs px-3 shadow-md border border-[#CAC8AA]/40 cursor-pointer"
        >
          <X className="w-4 h-4" />
          Chiudi Anteprima
        </button>

        <BadgePassCard
          attendee={attendee}
          eventInfo={eventInfo}
        />
      </div>
    </div>
  );
};
