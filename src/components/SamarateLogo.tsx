import React, { useState, useEffect } from 'react';
import defaultLogoImg from '../assets/images/samarate_sposi_logo_1788813094721.jpg';

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
  showSubline = true,
  orientation = 'horizontal',
}) => {
  const [currentLogoSrc, setCurrentLogoSrc] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('samarate_sposi_custom_logo');
      if (saved) return saved;
    } catch {
      // safe
    }
    return '/logo-03.png';
  });

  const [imageError, setImageError] = useState(false);
  const isLight = variant === 'light';
  
  const textColor = isLight ? 'text-[#F7F4EC]' : 'text-[#16391C]';

  useEffect(() => {
    const handleLogoUpdate = () => {
      try {
        const saved = localStorage.getItem('samarate_sposi_custom_logo');
        if (saved) {
          setCurrentLogoSrc(saved);
          setImageError(false);
        }
      } catch {
        // safe
      }
    };

    window.addEventListener('samarate_logo_updated', handleLogoUpdate);
    return () => window.removeEventListener('samarate_logo_updated', handleLogoUpdate);
  }, []);

  const sizeConfig = {
    sm: {
      img: 'w-10 h-10',
      script: 'text-lg',
      sposi: 'text-xs tracking-[0.22em]',
      container: 'gap-2',
      ringsSvg: 'w-7 h-7',
    },
    md: {
      img: 'w-14 h-14',
      script: 'text-2xl',
      sposi: 'text-sm tracking-[0.28em]',
      container: 'gap-2.5',
      ringsSvg: 'w-10 h-10',
    },
    lg: {
      img: 'w-24 h-24 sm:w-28 sm:h-28',
      script: 'text-3xl sm:text-4xl',
      sposi: 'text-lg tracking-[0.35em]',
      container: 'gap-3',
      ringsSvg: 'w-16 h-16',
    },
    xl: {
      img: 'w-32 h-32 sm:w-36 sm:h-36',
      script: 'text-4xl sm:text-5xl',
      sposi: 'text-xl tracking-[0.4em]',
      container: 'gap-4',
      ringsSvg: 'w-20 h-20',
    },
  }[size];

  const isVertical = orientation === 'vertical';

  const handleImgError = () => {
    // If '/logo-03.png' failed, try default bundled asset
    if (currentLogoSrc !== defaultLogoImg) {
      setCurrentLogoSrc(defaultLogoImg);
    } else {
      setImageError(true);
    }
  };

  return (
    <div className={`flex ${isVertical ? 'flex-col items-center text-center' : 'items-center'} ${sizeConfig.container} ${className}`}>
      {/* Official Logo Artwork */}
      {!imageError ? (
        <div className={`relative shrink-0 ${sizeConfig.img} rounded-2xl overflow-hidden shadow-xs border ${isLight ? 'border-[#A89236]/50' : 'border-[#CAC8AA]'} bg-white p-0.5`}>
          <img
            src={currentLogoSrc}
            alt="Logo Ufficiale Samarate Sposi"
            onError={handleImgError}
            className="w-full h-full object-cover rounded-xl"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        /* Precise Vector Fallback with Golden Intertwined Rings */
        <div className={`relative shrink-0 ${sizeConfig.ringsSvg} flex items-center justify-center`}>
          <svg
            viewBox="0 0 100 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full filter drop-shadow-xs"
          >
            <defs>
              <linearGradient id="goldGradFallback" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D9C66E" />
                <stop offset="50%" stopColor="#A89236" />
                <stop offset="100%" stopColor="#877322" />
              </linearGradient>
            </defs>
            <ellipse cx="38" cy="42" rx="24" ry="24" stroke="url(#goldGradFallback)" strokeWidth="6" />
            <ellipse cx="62" cy="38" rx="24" ry="24" stroke="url(#goldGradFallback)" strokeWidth="6" />
            <path d="M 46 22 A 24 24 0 0 1 60 30" stroke="url(#goldGradFallback)" strokeWidth="6.5" />
          </svg>
        </div>
      )}

      {/* Brand Typography */}
      <div className={`flex flex-col ${isVertical ? 'items-center mt-1' : ''}`}>
        <span
          className={`font-['Alex_Brush',cursive] leading-none ${sizeConfig.script} ${textColor} select-none`}
          style={{ transform: 'rotate(-2deg)', display: 'inline-block' }}
        >
          Samarate
        </span>
        <span
          className={`font-serif font-bold uppercase ${sizeConfig.sposi} ${textColor} leading-tight select-none`}
          style={{ letterSpacing: '0.28em' }}
        >
          SPOSI
        </span>
        {showSubline && (
          <span className={`text-[10px] tracking-widest uppercase font-semibold ${isLight ? 'text-[#CAC8AA]' : 'text-[#A89236]'} mt-0.5`}>
            Salone delle Nozze
          </span>
        )}
      </div>
    </div>
  );
};
