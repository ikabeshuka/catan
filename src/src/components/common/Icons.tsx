import React from 'react';

// General style rules: Clean lines, stands out on the background, at most two tones/colors per icon.

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export const WoodIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#059669', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Log rings / body */}
    <path d="M12 3c-4.97 0-9 1.34-9 3s4.03 3 9 3 9-1.34 9-3-4.03-3-9-3z" stroke={secondaryColor} strokeWidth="2" />
    <path d="M3 6v12c0 1.66 4.03 3 9 3s9-1.34 9-3V6" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" stroke={secondaryColor} strokeDasharray="3 3" />
  </svg>
);

export const BrickIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#ea580c', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" stroke={secondaryColor} />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
    <path d="M9 3v6" stroke={secondaryColor} />
    <path d="M15 9v6" stroke={secondaryColor} />
    <path d="M9 15v6" stroke={secondaryColor} />
  </svg>
);

export const SheepIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#84cc16', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Curly coat outline */}
    <path d="M12 4a4 4 0 0 0-3.5 2.1 3 3 0 0 0-2.5 2.9 3 3 0 0 0 2 2.8 3.5 3.5 0 0 0 .5 7.2 3.5 3.5 0 0 0 6 0 3 3 0 0 0 2.5-3.2 3 3 0 0 0-1.5-2.8A4 4 0 0 0 12 4z" stroke={secondaryColor} />
    {/* Cute ears and head details */}
    <path d="M9 13a3 3 0 0 0 6 0" />
    <circle cx="10" cy="10" r="1.2" fill={primaryColor} />
    <circle cx="14" cy="10" r="1.2" fill={primaryColor} />
  </svg>
);

export const WheatIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#d97706', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 22V2" stroke={secondaryColor} />
    {/* Grains */}
    <path d="M12 5c-2-1.5-4 .5-4 2.5 0 1.5 2 2.5 4 2.5" />
    <path d="M12 5c2-1.5 4 .5 4 2.5 0 1.5-2 2.5-4 2.5" />
    <path d="M12 10c-2-1.5-4 .5-4 2.5 0 1.5 2 2.5 4 2.5" />
    <path d="M12 10c2-1.5 4 .5 4 2.5 0 1.5-2 2.5-4 2.5" />
    <path d="M12 15c-2-1.5-4 .5-4 2.5 0 1.5 2 2.5 4 2.5" />
    <path d="M12 15c2-1.5 4 .5 4 2.5 0 1.5-2 2.5-4 2.5" />
  </svg>
);

export const OreIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#64748b', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Rock crystal contours */}
    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={secondaryColor} />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
    <path d="M12 12v10" stroke={secondaryColor} strokeDasharray="2 2" />
  </svg>
);

export const SettlementIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#f59e0b', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Beautiful simple house */}
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
    <path d="M9 22V12h6v10" stroke={secondaryColor} />
  </svg>
);

export const RoadIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#10b981', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Road lane perspective */}
    <path d="M4 22L9 2M20 22L15 2" />
    <path d="M12 4v4M12 12v4" stroke={secondaryColor} strokeWidth="2.5" strokeDasharray="1 1" />
  </svg>
);

export const CityIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#3b82f6', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Castle / Towers */}
    <path d="M3 21h18M4 21V9l3-3 3 3v12M14 21V5l3-3 3 3v16" />
    <path d="M7 12h2M17 10h2M17 14h2" stroke={secondaryColor} />
  </svg>
);

export const DiceIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#d97706', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke={secondaryColor} />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill={secondaryColor} />
  </svg>
);

export const RobberIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#f43f5e', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Bandit / Hooded figure */}
    <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" stroke={secondaryColor} />
    <path d="M6 14a6 6 0 0 0-3 5.19V22h18v-2.81a6 6 0 0 0-3-5.19" />
    <path d="M9 10h6" stroke={secondaryColor} />
  </svg>
);

export const CardIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#a855f7', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Overlapping cards */}
    <rect x="3" y="6" width="12" height="15" rx="2" transform="rotate(-10 3 6)" stroke={secondaryColor} />
    <rect x="8" y="3" width="12" height="15" rx="2" />
  </svg>
);

export const KnightIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#3b82f6', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Shield & helmet crest */}
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={secondaryColor} />
    <path d="M12 6v10M9 9h6" />
  </svg>
);

export const MonopolyIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#06b6d4', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Classic top hat */}
    <path d="M5 20h14" strokeWidth="3" />
    <path d="M7 20V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12" />
    <path d="M7 14h10" stroke={secondaryColor} strokeWidth="2" />
  </svg>
);

export const RoadBuildingIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#f97316', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Construction Barrier */}
    <rect x="3" y="10" width="18" height="6" rx="1" stroke={secondaryColor} />
    <path d="M6 10V6M18 10V6" />
    <path d="M4 16l-1 5M20 16l1 5M9 10l6 6" stroke={secondaryColor} />
  </svg>
);

export const EasyIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#10b981', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Sprout */}
    <path d="M12 22V10" stroke={secondaryColor} />
    <path d="M12 10c0-4-3-6-6-6 4 0 6 3 6 6zM12 12c0-4 3-6 6-6-4 0-6 3-6 6z" />
  </svg>
);

export const MediumIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#eab308', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Lightning */}
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={secondaryColor} />
  </svg>
);

export const HardIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#ef4444', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Fire flame */}
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 3.5 3.5z" stroke={secondaryColor} />
  </svg>
);

export const SuperHardIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#a855f7', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Skull style */}
    <path d="M12 2a5 5 0 0 0-5 5v3a3 3 0 0 0 1 2.2V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4.8a3 3 0 0 0 1-2.2V7a5 5 0 0 0-5-5z" stroke={secondaryColor} />
    <path d="M10 17v2M14 17v2" stroke={secondaryColor} />
    <circle cx="9.5" cy="9.5" r="1" fill={secondaryColor} stroke={secondaryColor} />
    <circle cx="14.5" cy="9.5" r="1" fill={secondaryColor} stroke={secondaryColor} />
    <path d="M10 14h4" stroke={secondaryColor} />
  </svg>
);

export const UserIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#3b82f6', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" stroke={secondaryColor} />
  </svg>
);

export const BotIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#6366f1', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Robot */}
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="1" stroke={secondaryColor} />
    <path d="M12 6v5" />
    <path d="M8 15h.01M16 15h.01" stroke={secondaryColor} strokeWidth="3" />
    <path d="M9 18h6" />
  </svg>
);

export const CrownIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#eab308', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Crown */}
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" stroke={secondaryColor} />
    <path d="M3 20h18" />
  </svg>
);

export const DealIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#10b981', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Handshake */}
    <path d="M10 18H5a3 3 0 0 1-3-3v-2c0-.5.5-1 1-1h7M14 18h5a3 3 0 0 0 3-3v-2c0-.5-.5-1-1-1h-7" stroke={secondaryColor} />
    <path d="M10 12l2 2 2-2M12 14v4" />
  </svg>
);

export const CrossIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 18, className = '', primaryColor = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const CompressIcon: React.FC<IconProps> = ({ size = 18, className = '', primaryColor = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
  </svg>
);

export const WarningIcon: React.FC<IconProps> = ({ size = 24, className = '', primaryColor = 'currentColor', secondaryColor = '#ef4444', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={secondaryColor} />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
  </svg>
);
