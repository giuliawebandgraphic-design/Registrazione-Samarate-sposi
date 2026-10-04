import React, { useState } from 'react';
import officialLogoImg from '../assets/images/logo-samarate-sposi-verde-oro.png';

interface SamarateLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'dark' | 'light' | 'gold';
  showSubline?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export const SamarateLogo: React.FC<SamarateLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'dark',
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(officialLogoImg);
  const [imageError, setImageError] = useState(false);
  const isLight = variant === 'light';

  const handleImgError = () => {
    if (currentSrc !== '/logo-samarate-sposi-verde-oro.png') {
      // Fallback to direct public path
      setCurrentSrc('/logo-samarate-sposi-verde-oro.png');
    } else {
      setImageError(true);
    }
  };

  const sizeConfig = {
    sm: {
      img: 'h-9 sm:h-10 max-w-[145px] sm:max-w-[170px]',
      wrapper: 'px-2 py-1',
      fallback: 'w-28 h-9',
    },
    md: {
      img: 'h-12 sm:h-14 max-w-[190px] sm:max-w-[230px]',
      wrapper: 'px-2.5 py-1.5',
      fallback: 'w-36 h-12',
    },
    lg: {
      img: 'h-16 sm:h-20 max-w-[260px] sm:max-w-[320px]',
      wrapper: 'px-3.5 py-2',
      fallback: 'w-48 h-18',
    },
    xl: {
      img: 'h-24 sm:h-32 max-w-[340px] sm:max-w-[420px]',
      wrapper: 'px-5 py-2.5',
      fallback: 'w-60 h-24',
    },
  }[size];

  if (imageError) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <svg viewBox="0 0 160 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${sizeConfig.fallback}`}>
          <text x="5" y="24" fontFamily="Alex Brush, cursive" fontSize="22" fill="#16391C">Samarate</text>
          <text x="5" y="44" fontFamily="serif" fontWeight="bold" fontSize="16" letterSpacing="4" fill="#16391C">SPOSI</text>
          <ellipse cx="68" cy="38" rx="7" ry="7" stroke="#A89236" strokeWidth="2.5" />
          <ellipse cx="76" cy="38" rx="7" ry="7" stroke="#A89236" strokeWidth="2.5" />
        </svg>
      </div>
    );
  }

  // If used on a dark background (e.g. VIP badge header banner), frame it in an elegant white card
  if (isLight) {
    return (
      <div className={`inline-flex items-center justify-center bg-white/95 rounded-xl ${sizeConfig.wrapper} shadow-2xs border border-white/90 shrink-0 ${className}`}>
        <img
          src={currentSrc}
          alt="Samarate Sposi"
          onError={handleImgError}
          className={`w-auto ${sizeConfig.img} object-contain select-none`}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // On light or ivory background (header, forms, modals, footer): transparent display
  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <img
        src={currentSrc}
        alt="Samarate Sposi"
        onError={handleImgError}
        className={`w-auto ${sizeConfig.img} object-contain select-none`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
