import React, { useState, useEffect } from "react";
import { HealTrackLogo } from "./HealTrackLogo";
import { UserRole, User, Patient } from "../types";
import {
  Eye,
  EyeOff,
  User as UserIcon,
  Stethoscope,
  HeartHandshake,
  KeyRound,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Check,
  Shield,
} from "lucide-react";

interface AuthViewProps {
  onLoginSuccess: (user: User, patient?: Patient) => void;
  initialRole?: UserRole;
  initialCode?: string;
  onBackToSplash?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  initialRole = "healthcare",
  initialCode = "",
  onBackToSplash,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [isSignUp, setIsSignUp] = useState(false);

  // Form states
  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorPassword, setDoctorPassword] = useState("");
  const [doctorFullName, setDoctorFullName] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");

  const [patientCode, setPatientCode] = useState(() => {
    if (initialCode && initialRole === "patient") return initialCode;
    return "";
  });

  const [caregiverCode, setCaregiverCode] = useState(() => {
    if (initialCode && initialRole === "caregiver") return initialCode;
    return "";
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Clean code input helper
  const cleanCodeInput = (val: string): string => {
    let clean = val.trim();
    const match = clean.match(/(?:code|invite)=([A-Za-z0-9-]+)/i);
    if (match) clean = match[1];
    return clean.toUpperCase();
  };

  // Sync props changes if navigation provides code
  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    }
    if (initialCode) {
      if (initialRole === "caregiver") {
        setCaregiverCode(initialCode);
      } else if (initialRole === "patient") {
        setPatientCode(initialCode);
      }
    }
  }, [initialRole, initialCode]);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage("");
    setSuccessMessage("");
    setIsSignUp(false); // Reset signup when switching tabs
  };

  // Password validation helper
  const checkPasswordRules = (pw: string) => {
    return {
      hasMinLength: pw.length >= 8,
      hasUpper: /[A-Z]/.test(pw),
      hasLower: /[a-z]/.test(pw),
      hasNumber: /[0-9]/.test(pw),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
    };
  };

  const pwRules = checkPasswordRules(doctorPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      // -----------------------------------------------------------------
      // 1. DOCTOR SIGNUP (Only Doctor has Sign Up)
      // -----------------------------------------------------------------
      if (selectedRole === "healthcare" && isSignUp) {
        if (!doctorFullName.trim()) {
          throw new Error("Please enter your Full Name.");
        }
        if (!doctorEmail.trim()) {
          throw new Error("Please enter your Doctor Email ID.");
        }

        const emailLower = doctorEmail.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailLower)) {
          throw new Error("Please enter a valid email address (e.g. doctor@hospital.com).");
        }

        // Validate password rules
        if (!pwRules.hasMinLength || !pwRules.hasUpper || !pwRules.hasLower || !pwRules.hasNumber || !pwRules.hasSpecial) {
          throw new Error(
            "Password must be at least 8 characters and contain uppercase, lowercase, number, and a special character."
          );
        }

        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "healthcare",
            emailOrMobile: emailLower,
            fullName: doctorFullName.trim(),
            password: doctorPassword,
            specialty: doctorSpecialty.trim(),
          }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Registration failed.");
        }

        setSuccessMessage(`Account registered for ${doctorFullName}! Signing you in...`);
        try {
          localStorage.setItem("healtrack_user", JSON.stringify(data.user));
        } catch {}

        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 500);
        return;
      }

      // -----------------------------------------------------------------
      // 2. DOCTOR LOGIN
      // -----------------------------------------------------------------
      if (selectedRole === "healthcare" && !isSignUp) {
        const emailLower = doctorEmail.trim().toLowerCase();
        if (!emailLower) {
          throw new Error("Please enter your Doctor Email ID.");
        }
        if (!doctorPassword) {
          throw new Error("Please enter your password.");
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "healthcare",
            emailOrMobile: emailLower,
            password: doctorPassword,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Login failed. Please verify your credentials.");
        }

        try {
          localStorage.setItem("healtrack_user", JSON.stringify(data.user));
        } catch {}

        onLoginSuccess(data.user);
        return;
      }

      // -----------------------------------------------------------------
      // 3. PATIENT LOGIN (Invitation Code Only)
      // -----------------------------------------------------------------
      if (selectedRole === "patient") {
        const cleanPatCode = cleanCodeInput(patientCode);
        if (!cleanPatCode) {
          throw new Error("Please enter your Patient Invitation Code (e.g. HT-8492).");
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "patient",
            patientCode: cleanPatCode,
            emailOrMobile: `${cleanPatCode.toLowerCase()}@patient.healtrack`,
            password: "patient123",
          }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || `Invitation code "${cleanPatCode}" not found. Please check with your doctor.`);
        }

        try {
          localStorage.setItem("healtrack_user", JSON.stringify(data.user));
          if (data.patient) {
            localStorage.setItem("healtrack_active_patient", JSON.stringify(data.patient));
          }
        } catch {}

        onLoginSuccess(data.user, data.patient);
        return;
      }

      // -----------------------------------------------------------------
      // 4. CAREGIVER LOGIN (Access Code Only)
      // -----------------------------------------------------------------
      if (selectedRole === "caregiver") {
        const cleanCgCode = cleanCodeInput(caregiverCode);
        if (!cleanCgCode) {
          throw new Error("Please enter your Caregiver Access Code (e.g. CG-8492).");
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "caregiver",
            caregiverCode: cleanCgCode,
            emailOrMobile: `${cleanCgCode.toLowerCase()}@caregiver.healtrack`,
            password: "caregiver123",
          }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || `Caregiver code "${cleanCgCode}" not found. Please verify your code.`);
        }

        try {
          localStorage.setItem("healtrack_user", JSON.stringify(data.user));
          if (data.patient) {
            localStorage.setItem("healtrack_active_patient", JSON.stringify(data.patient));
          }
        } catch {}

        onLoginSuccess(data.user, data.patient);
        return;
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-200/60 p-6 sm:p-8 relative">
        {onBackToSplash && (
          <button
            onClick={onBackToSplash}
            className="absolute top-6 left-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Back to Welcome screen"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* HealTrack Logo */}
        <div className="mb-4 mt-1 text-center flex flex-col items-center">
          <HealTrackLogo size="lg" showSubtitle={false} />
        </div>

        {/* Heading & Subtitle per Point 3 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Access Your Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Post-Discharge Care & Patient Recovery Companion
          </p>
        </div>

        {/* ========================================================= */}
        {/* THREE ROLE CARDS per Point 2 (NO sub-text / badges below) */}
        {/* ========================================================= */}
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-2.5">
            {/* Patient Role */}
            <button
              type="button"
              onClick={() => handleRoleSelect("patient")}
              className={`py-3.5 px-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer border ${
                selectedRole === "patient"
                  ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/25 shadow-xs"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-700"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                  selectedRole === "patient"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                <UserIcon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                Patient
              </span>
            </button>

            {/* Doctor / Healthcare Role */}
            <button
              type="button"
              onClick={() => handleRoleSelect("healthcare")}
              className={`py-3.5 px-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer border ${
                selectedRole === "healthcare"
                  ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/25 shadow-xs"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-700"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                  selectedRole === "healthcare"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                Doctor
              </span>
            </button>

            {/* Caregiver Role */}
            <button
              type="button"
              onClick={() => handleRoleSelect("caregiver")}
              className={`py-3.5 px-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer border ${
                selectedRole === "caregiver"
                  ? "bg-purple-50 border-purple-500 ring-2 ring-purple-500/25 shadow-xs"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-700"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                  selectedRole === "caregiver"
                    ? "bg-purple-600 text-white"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                Caregiver
              </span>
            </button>
          </div>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ========================================================= */}
          {/* A. PATIENT PORTAL (Point 6: Clean, No Green Box, No Pills) */}
          {/* ========================================================= */}
          {selectedRole === "patient" && (
            <div className="space-y-4 py-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Patient Invitation Code</span>
                </label>
                <input
                  type="text"
                  required
                  value={patientCode}
                  onChange={(e) => setPatientCode(e.target.value)}
                  placeholder="Enter patient invitation code (e.g. HT-8492)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono uppercase font-bold text-slate-800 placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-emerald-700 hover:bg-emerald-800 shadow-md shadow-emerald-900/15 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Login"
                )}
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* B. CAREGIVER PORTAL (Point 7: Clean, No Preview, No Chips) */}
          {/* ========================================================= */}
          {selectedRole === "caregiver" && (
            <div className="space-y-4 py-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-purple-600" />
                  <span>Caregiver Access Code</span>
                </label>
                <input
                  type="text"
                  required
                  value={caregiverCode}
                  onChange={(e) => setCaregiverCode(e.target.value)}
                  placeholder="Enter caregiver code (e.g. CG-8492)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono uppercase font-bold text-slate-800 placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-purple-700 hover:bg-purple-800 shadow-md shadow-purple-900/15 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Login"
                )}
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* C. DOCTOR DASHBOARD (Point 1, 4, 5: Sign Up & Login)     */}
          {/* ========================================================= */}
          {selectedRole === "healthcare" && (
            <div className="space-y-3.5 py-1">
              {/* Doctor Sign Up Mode Fields */}
              {isSignUp && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Doctor Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={doctorFullName}
                      onChange={(e) => setDoctorFullName(e.target.value)}
                      placeholder="e.g. Dr. Full Name"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Specialty / Department (Optional)
                    </label>
                    <input
                      type="text"
                      value={doctorSpecialty}
                      onChange={(e) => setDoctorSpecialty(e.target.value)}
                      placeholder="e.g. Cardiology & Post-Discharge Care"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                  </div>
                </>
              )}

              {/* Doctor Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Doctor Email ID
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={doctorEmail}
                    onChange={(e) => setDoctorEmail(e.target.value)}
                    placeholder="doctor@healtrack.in"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Doctor Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={doctorPassword}
                    onChange={(e) => setDoctorPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-11 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Policy Rules checklist in Sign Up mode */}
                {isSignUp && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                    <p className="font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      <span>Password Requirements:</span>
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <span className={`flex items-center gap-1 ${pwRules.hasMinLength ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                        <Check className="w-3 h-3" /> 8+ Characters
                      </span>
                      <span className={`flex items-center gap-1 ${pwRules.hasUpper ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                        <Check className="w-3 h-3" /> Uppercase (A-Z)
                      </span>
                      <span className={`flex items-center gap-1 ${pwRules.hasLower ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                        <Check className="w-3 h-3" /> Lowercase (a-z)
                      </span>
                      <span className={`flex items-center gap-1 ${pwRules.hasNumber ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                        <Check className="w-3 h-3" /> Number (0-9)
                      </span>
                      <span className={`flex items-center gap-1 col-span-2 ${pwRules.hasSpecial ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                        <Check className="w-3 h-3" /> Special symbol (@, #, $, etc.)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-blue-700 hover:bg-blue-800 shadow-md shadow-blue-900/15 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isSignUp ? (
                  "Sign Up as Doctor"
                ) : (
                  "Login"
                )}
              </button>

              {/* Doctor Sign Up / Login Toggle below Login button */}
              <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
                {isSignUp ? (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(false);
                        setErrorMessage("");
                        setSuccessMessage("");
                      }}
                      className="text-blue-700 font-bold hover:underline cursor-pointer"
                    >
                      Log In here
                    </button>
                  </p>
                ) : (
                  <p>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(true);
                        setErrorMessage("");
                        setSuccessMessage("");
                      }}
                      className="text-blue-700 font-bold hover:underline cursor-pointer"
                    >
                      Sign Up as Doctor
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
