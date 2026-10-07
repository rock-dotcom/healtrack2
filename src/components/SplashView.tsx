import React from "react";
import { ArrowRight, Shield, Stethoscope, HeartHandshake, User } from "lucide-react";

interface SplashViewProps {
  onSelectRole?: (role: "healthcare" | "patient" | "caregiver") => void;
  onGetStarted?: () => void;
}

export const SplashView: React.FC<SplashViewProps> = ({ onSelectRole, onGetStarted }) => {
  const handleRoleSelect = (role: "healthcare" | "patient" | "caregiver") => {
    if (onSelectRole) onSelectRole(role);
    if (onGetStarted) onGetStarted();
  };
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-8 relative z-10 text-center">
        {/* Logo and Branding */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-600 to-emerald-400 p-0.5 shadow-xl shadow-teal-500/20 mb-4 flex items-center justify-center">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10"
            >
              <path d="M24 24C24 14 13 8 13 8C13 8 13 19 24 24Z" fill="#ffffff" />
              <path d="M24 24C24 14 35 8 35 8C35 8 35 19 24 24Z" fill="#e2e8f0" />
              <path d="M24 24C16 24 10 33 10 33C10 33 21 34 24 24Z" fill="#99f6e4" />
              <path d="M24 24C32 24 38 33 38 33C38 33 27 34 24 24Z" fill="#5eead4" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">HealTrack</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            Hospital-Grade Post-Discharge Patient Monitoring & Caregiver Support
          </p>
        </div>

        {/* Portals Selector */}
        <div className="space-y-3 text-left">
          <button
            onClick={() => handleRoleSelect("healthcare")}
            className="w-full p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500/50 transition-all cursor-pointer flex items-center justify-between group shadow-lg"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold border border-teal-500/20 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Doctor / Hospital Portal</p>
                <p className="text-xs text-slate-400">Scan Prescriptions, Care Plans & Alerts</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => handleRoleSelect("patient")}
            className="w-full p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500/50 transition-all cursor-pointer flex items-center justify-between group shadow-lg"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Patient Portal</p>
                <p className="text-xs text-slate-400">Medicine Timetable & Symptom Alerts</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => handleRoleSelect("caregiver")}
            className="w-full p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/50 transition-all cursor-pointer flex items-center justify-between group shadow-lg"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold border border-purple-500/20 group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Caregiver Portal</p>
                <p className="text-xs text-slate-400">Monitor recovery & emergency alerts</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* Security badge */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-slate-500 text-xs font-medium">
          <Shield className="w-3.5 h-3.5 text-teal-400" />
          <span>NABH & HIPAA Compliant Healthcare Protocol</span>
        </div>
      </div>
    </div>
  );
};
