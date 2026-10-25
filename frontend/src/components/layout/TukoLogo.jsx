import React from "react";

export default function TukoLogo({
  className = "w-9 h-9",
  fullLogo = false,
  withText = false,
  textClassName = "text-lg font-extrabold"
}) {
  if (fullLogo) {
    return (
      <div className="flex flex-col items-center select-none">
        <img
          src="/logo-full.png"
          alt="Tuko Chat"
          className="max-w-[200px] sm:max-w-[240px] rounded-2xl shadow-xl filter drop-shadow-lg hover:scale-102 transition-transform object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2.5 select-none">
      <div className={`relative ${className} shrink-0 rounded-2xl overflow-hidden shadow-glow`}>
        <img
          src="/logo.png"
          alt="Tuko Chat Logo"
          className="w-full h-full object-cover rounded-2xl hover:scale-105 transition-transform"
        />
      </div>
      {withText && (
        <div className="flex flex-col leading-none">
          <span className={`tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent ${textClassName}`}>
            Tuko <span className="text-brand-400">Chat</span>
          </span>
          <span className="text-[9px] text-brand-300 font-medium tracking-widest uppercase mt-0.5">
            Chat • Call • Connect
          </span>
        </div>
      )}
    </div>
  );
}
