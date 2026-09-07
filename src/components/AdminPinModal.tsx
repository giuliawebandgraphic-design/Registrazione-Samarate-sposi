import React, { useState } from 'react';
import { Lock, X, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staffPin: string;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  staffPin,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === staffPin.trim()) {
      setError('');
      setPinInput('');
      onSuccess();
    } else {
      setError('PIN non corretto. Riprova.');
      setPinInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-[#CAC8AA] shadow-2xl relative text-[#16391C]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-[#16391C] text-[#C4AF56] flex items-center justify-center mx-auto mb-4 shadow-xs">
          <KeyRound className="w-6 h-6" />
        </div>

        <h3 className="font-serif text-xl font-bold text-center text-[#16391C]">
          Area Riservata Staff
        </h3>
        <p className="text-xs text-center text-[#16391C]/75 mt-1 mb-6">
          Inserisci il PIN organizzatore per accedere al terminale di accoglienza, scanner QR code e registro coppie.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type="password"
                maxLength={8}
                autoFocus
                placeholder="Inserisci PIN (es. 1011)"
                value={pinInput}
                onChange={e => {
                  setPinInput(e.target.value);
                  if (error) setError('');
                }}
                className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 px-4 bg-[#F7F4EC] rounded-xl border border-[#CAC8AA] focus:outline-none focus:border-[#16391C] text-[#16391C]"
              />
            </div>
            {error && (
              <div className="flex items-center gap-1 text-xs text-rose-600 mt-2 font-medium justify-center">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <p className="text-[11px] text-center text-[#99A99C] mt-2">
              PIN predefinito di prova: <strong className="text-[#16391C]">1011</strong> (le date della fiera)
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#CAC8AA] text-xs font-semibold text-[#16391C] hover:bg-[#F7F4EC]"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#16391C] hover:bg-[#1f4a25] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-[#C4AF56]" />
              Sblocca Desk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
