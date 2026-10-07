import React from "react";

interface HealTrackLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
}

export const HealTrackLogo: React.FC<HealTrackLogoProps> = ({
  className = "",
  size = "md",
  showSubtitle = false,
}) => {
  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-11 h-11",
    xl: "w-14 h-14",
  };

  const titleSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* 4 Leaf Emblem matching HealTrack visual identity */}
      <div className="flex items-center gap-2.5">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${iconSizes[size]} text-emerald-500 shrink-0`}
        >
          {/* Top Left Leaf */}
          <path
            d="M24 24C24 14 13 8 13 8C13 8 13 19 24 24Z"
            fill="#10B981"
            className="opacity-95"
          />
          {/* Top Right Leaf */}
          <path
            d="M24 24C24 14 35 8 35 8C35 8 35 19 24 24Z"
            fill="#059669"
            className="opacity-95"
          />
          {/* Bottom Left Leaf */}
          <path
            d="M24 24C16 24 10 33 10 33C10 33 21 34 24 24Z"
            fill="#34D399"
          />
          {/* Bottom Right Leaf */}
          <path
            d="M24 24C32 24 38 33 38 33C38 33 27 34 24 24Z"
            fill="#0D9488"
          />
          {/* Center stem dot */}
          <circle cx="24" cy="24" r="2.5" fill="#065F46" />
        </svg>

        <span className={`font-bold tracking-tight text-slate-800 font-display ${titleSizes[size]}`}>
          <span className="text-[#0c5a4d]">Heal</span>
          <span className="text-[#0d2238]">Track</span>
        </span>
      </div>

      {showSubtitle && (
        <p className="text-xs text-slate-500 font-medium mt-0.5 tracking-tight text-center">
          Your Post-Discharge Care Companion
        </p>
      )}
    </div>
  );
};
