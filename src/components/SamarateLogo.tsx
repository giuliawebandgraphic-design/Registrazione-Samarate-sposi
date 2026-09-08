import React, { useState, useEffect } from 'react';
import officialLogoImg from '../assets/images/logo-03.png';
import { subscribeToCustomLogo } from '../lib/firebase';

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
  const [currentLogoSrc, setCurrentLogoSrc] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('samarate_sposi_custom_logo');
      if (saved) return saved;
    } catch {
      // safe
    }
    return officialLogoImg;
  });

  const [imageError, setImageError] = useState(false);
  const isLight = variant === 'light';

  useEffect(() => {
    // 1. Cloud Firestore real-time logo synchronization
    const unsubscribeCloud = subscribeToCustomLogo((cloudLogo) => {
      if (cloudLogo) {
        setCurrentLogoSrc(cloudLogo);
        setImageError(false);
      }
    });

    // 2. Local window event listener
    const handleLogoUpdate = () => {
      try {
        const saved = localStorage.getItem('samarate_sposi_custom_logo');
        if (saved) {
          setCurrentLogoSrc(saved);
          setImageError(false);
        } else {
          setCurrentLogoSrc(officialLogoImg);
          setImageError(false);
        }
      } catch {
        // safe
      }
    };

    window.addEventListener('samarate_logo_updated', handleLogoUpdate);
    return () => {
      unsubscribeCloud();
      window.removeEventListener('samarate_logo_updated', handleLogoUpdate);
    };
  }, []);

  const sizeConfig = {
    sm: {
      img: 'h-9 sm:h-10 max-w-[140px] sm:max-w-[170px]',
      wrapper: 'px-2 py-0.5',
      fallback: 'w-24 h-10',
    },
    md: {
      img: 'h-13 sm:h-15 max-w-[200px] sm:max-w-[240px]',
      wrapper: 'px-2.5 py-1',
      fallback: 'w-36 h-14',
    },
    lg: {
      img: 'h-20 sm:h-24 max-w-[280px] sm:max-w-[340px]',
      wrapper: 'px-4 py-2',
      fallback: 'w-48 h-20',
    },
    xl: {
      img: 'h-28 sm:h-36 max-w-[360px] sm:max-w-[460px]',
      wrapper: 'px-6 py-3',
      fallback: 'w-64 h-28',
    },
  }[size];

  const handleImgError = () => {
    if (currentLogoSrc !== officialLogoImg) {
      setCurrentLogoSrc(officialLogoImg);
    } else {
      setImageError(true);
    }
  };

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

  // If used on a dark background (e.g. VIP badge header banner), frame it in a luxury white card
  if (isLight) {
    return (
      <div className={`inline-flex items-center justify-center bg-white rounded-2xl ${sizeConfig.wrapper} shadow-sm border border-white/80 ${className}`}>
        <img
          src={currentLogoSrc}
          alt="Samarate Sposi - Salone Ufficiale"
          onError={handleImgError}
          className={`w-auto ${sizeConfig.img} object-contain`}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // On light or ivory background (header, forms, modals, footer): blend seamlessly with mix-blend-multiply
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <img
        src={currentLogoSrc}
        alt="Samarate Sposi - Salone Ufficiale"
        onError={handleImgError}
        className={`w-auto ${sizeConfig.img} object-contain mix-blend-multiply`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
