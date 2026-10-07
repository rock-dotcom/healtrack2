import React, { useState, useEffect } from "react";
import { Patient, User, AlertItem } from "../types";
import {
  Menu,
  Bell,
  AlertTriangle,
  Clock,
  ChevronRight,
  Home,
  Users,
  FileBarChart,
  User as UserIcon,
  LogOut,
  Pill,
  CheckCircle2,
  Calendar,
  Activity,
  Phone,
  ShieldCheck,
  Heart,
  Download,
  Share2,
  Sparkles,
  AlertCircle,
  Stethoscope,
  RefreshCw,
  Check,
  Edit3,
  MessageSquare,
  Droplets,
  TrendingUp,
} from "lucide-react";

interface CaregiverDashboardProps {
  currentUser: User;
  patients: Patient[];
  onLogout: () => void;
  onSelectPatient: (patient: Patient) => void;
  onSwitchToHealthcare?: () => void;
}

export const CaregiverDashboard: React.FC<CaregiverDashboardProps> = ({
  currentUser,
  patients,
  onLogout,
  onSelectPatient,
  onSwitchToHealthcare,
}) => {
  const [bottomNav, setBottomNav] = useState<"home" | "patient" | "alerts" | "reports" | "profile">("home");
  const [alertsFilter, setAlertsFilter] = useState<"all" | "symptoms" | "missed">("all");
  const [localPatients, setLocalPatients] = useState<Patient[]>(patients);

  // Keep localPatients in sync with props
  useEffect(() => {
    setLocalPatients(patients || []);
  }, [patients]);

  // Primary linked loved one: match by currentUser.caregiverCode first, or active patient from props
  const matchedLovedOne = currentUser.caregiverCode
    ? localPatients.find(
        (p) =>
          (p.caregiverInfo && p.caregiverInfo.code.toUpperCase() === currentUser.caregiverCode?.toUpperCase()) ||
          p.invitationCode.toUpperCase() === currentUser.caregiverCode?.toUpperCase()
      )
    : null;
  const lovedOne = matchedLovedOne || (patients && patients.length > 0 ? patients[0] : (localPatients.length > 0 ? localPatients[0] : null));

  // Periodic poll to ensure symptom reports and missed medicines for THIS patient update in real-time
  useEffect(() => {
    let isMounted = true;
    const pollLinkedPatient = async () => {
      try {
        const targetIdOrCode =
          lovedOne?.id ||
          lovedOne?.invitationCode ||
          currentUser.caregiverCode ||
          currentUser.patientCode;

        if (!targetIdOrCode) return;
        const res = await fetch(`/api/patients/${targetIdOrCode}`);
        const data = await res.json();
        if (isMounted && data.success && data.patient) {
          setLocalPatients([data.patient]);
        }
      } catch (err) {
        // keep local state
      }
    };

    pollLinkedPatient();
    const timer = setInterval(pollLinkedPatient, 3000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [currentUser.caregiverCode, currentUser.patientCode, lovedOne?.id, lovedOne?.invitationCode]);

  // ----------------- CAREGIVER PROFILE STATE -----------------
  const [caregiverProfile, setCaregiverProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("healtrack_caregiver_profile");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      fullName: currentUser.fullName || "Suresh Rao",
      role: "Son / Primary Family Caregiver",
      phone: "+91 98451 44320",
      altPhone: "+91 98450 77112",
      email: currentUser.emailOrMobile.includes("@") ? currentUser.emailOrMobile : "suresh.rao@caremail.org",
      emergencyContact: "+91 98450 11223",
      address: "Riverton, Bangalore - 560001",
      smsAlerts: true,
      whatsappAlerts: true,
    };
  });

  const [profileForm, setProfileForm] = useState(caregiverProfile);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setCaregiverProfile(profileForm);
    setIsEditingProfile(false);
    try {
      localStorage.setItem("healtrack_caregiver_profile", JSON.stringify(profileForm));
    } catch {}
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 3500);
  };

  const handleCaregiverLogout = () => {
    localStorage.removeItem("healtrack_caregiver_profile");
    localStorage.removeItem("healtrack_read_alerts");
    localStorage.removeItem("healtrack_last_caregiver_code");
    localStorage.removeItem("healtrack_active_patient");
    localStorage.removeItem("healtrack_user");
    onLogout();
  };

  // Dynamically sync caregiver profile details with patient's linked caregiver info
  useEffect(() => {
    const cgName =
      (currentUser.role === "caregiver" && currentUser.fullName && currentUser.fullName !== lovedOne?.fullName)
        ? currentUser.fullName
        : lovedOne?.caregiverInfo?.name ||
          lovedOne?.caregiverName ||
          currentUser.fullName ||
          "Caregiver";

    const cgRole =
      (currentUser.role === "caregiver" && currentUser.relationship)
        ? currentUser.relationship
        : lovedOne?.caregiverInfo?.relationship ||
          "Friend";

    const cgPhone =
      (currentUser.role === "caregiver" && currentUser.emailOrMobile && !currentUser.emailOrMobile.includes("@") && !currentUser.emailOrMobile.toUpperCase().startsWith("CG-"))
        ? currentUser.emailOrMobile
        : lovedOne?.caregiverInfo?.phone || "+91 98451 44320";

    const cgAltPhone =
      lovedOne?.caregiverInfo?.secondaryPhone ||
      currentUser.secondaryPhone ||
      "+91 98450 88991";

    const cgEmail =
      lovedOne?.caregiverInfo?.email ||
      currentUser.email ||
      (currentUser.emailOrMobile?.includes("@")
        ? currentUser.emailOrMobile
        : `${cgName.toLowerCase().replace(/\s+/g, "")}.caregiver@gmail.com`);

    setCaregiverProfile((prev: any) => ({
      ...prev,
      fullName: cgName,
      role: cgRole,
      phone: cgPhone,
      altPhone: cgAltPhone,
      email: cgEmail,
    }));
    setProfileForm((prev: any) => ({
      ...prev,
      fullName: cgName,
      role: cgRole,
      phone: cgPhone,
      altPhone: cgAltPhone,
      email: cgEmail,
    }));
  }, [currentUser, lovedOne]);

  const caregiverName = caregiverProfile.fullName || "Primary Caregiver";
  const firstName = caregiverName.split(" ")[0];

  // ----------------- ALERTS STATE & UNREAD MANAGEMENT -----------------
  // Strictly display alerts belonging only to this specific patient
  const displayedAlerts: AlertItem[] = (lovedOne?.recentAlerts || []).filter(
    (a) => !a.patientId || a.patientId === lovedOne?.id
  );

  // Track read alert IDs in state and localStorage so that opening clears the count
  const [readAlertIds, setReadAlertIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("healtrack_read_alerts");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Clear read alert IDs if lovedOne changes
  useEffect(() => {
    setReadAlertIds(new Set());
  }, [lovedOne?.id]);

  // Calculate unread count based on items NOT in readAlertIds
  const unreadCount = displayedAlerts.filter((a) => !readAlertIds.has(a.id)).length;
  const latestUnreadAlert = displayedAlerts.find((a) => !readAlertIds.has(a.id));

  // Time-aware greeting
  const currentHour = new Date().getHours();
  const caregiverGreeting = currentHour < 12 ? "Good Morning" : currentHour < 17 ? "Good Afternoon" : "Good Evening";

  // When clicking Bell or navigating to alerts, mark all current alerts as read
  const handleOpenAlerts = () => {
    setBottomNav("alerts");
    const newRead = new Set(readAlertIds);
    displayedAlerts.forEach((a) => newRead.add(a.id));
    setReadAlertIds(newRead);
    try {
      localStorage.setItem("healtrack_read_alerts", JSON.stringify(Array.from(newRead)));
    } catch {}
  };

  // Filter alerts by category
  const filteredAlerts = displayedAlerts.filter((a) => {
    if (alertsFilter === "symptoms") return a.type === "symptom";
    if (alertsFilter === "missed") return a.type === "missed";
    return true;
  });

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Weekly report state
  const [reportWeek, setReportWeek] = useState<"current" | "previous">("current");
  const [reportToast, setReportToast] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center py-0 sm:py-6 px-0 sm:px-4">
      {/* Mobile-first card container */}
      <div className="w-full max-w-md bg-white sm:rounded-3xl shadow-xl border-x sm:border border-slate-200/80 flex flex-col min-h-screen sm:min-h-[840px] relative overflow-hidden">
        {/* ----------------- TOP APP BAR ----------------- */}
        <header className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 shrink-0"
              >
                <path d="M24 24C24 14 13 8 13 8C13 8 13 19 24 24Z" fill="#10B981" />
                <path d="M24 24C24 14 35 8 35 8C35 8 35 19 24 24Z" fill="#059669" />
                <path d="M24 24C16 24 10 33 10 33C10 33 21 34 24 24Z" fill="#34D399" />
                <path d="M24 24C32 24 38 33 38 33C38 33 27 34 24 24Z" fill="#0D9488" />
              </svg>
              <span className="font-bold text-slate-800 text-sm tracking-tight">
                HealTrack
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell with Dynamic Unread Badge */}
            <button
              onClick={handleOpenAlerts}
              className="relative p-1.5 text-slate-600 hover:text-slate-800 rounded-full hover:bg-slate-100 cursor-pointer"
              title="Notifications & Alerts"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Caregiver Avatar Pill */}
            <button
              onClick={() => setBottomNav("profile")}
              className="flex items-center gap-1.5 bg-purple-50 px-2 py-1 rounded-full border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                {firstName.charAt(0)}
              </div>
              <div className="text-left pr-1 leading-none">
                <p className="text-[11px] font-bold text-slate-800 truncate max-w-[75px]">
                  {firstName}
                </p>
                <p className="text-[9px] text-purple-700 font-medium">Caregiver</p>
              </div>
            </button>
          </div>
        </header>

        {/* ----------------- SCROLLABLE CONTENT BODY ----------------- */}
        <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-5">
          {/* ======================================================== */}
          {/* 1. HOME VIEW */}
          {/* ======================================================== */}
          {bottomNav === "home" && (
            <>
              {/* Header Greeting & Date */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-800">
                    {caregiverGreeting}, {firstName}! 👋
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {caregiverProfile.role} • {lovedOne?.fullName ? `${lovedOne.fullName}'s Caregiver` : "Caregiver"}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {formattedDate}
                </span>
              </div>

              {/* Real-Time Live Notification Banner for New Symptoms/Alerts */}
              {latestUnreadAlert && (
                <div
                  onClick={handleOpenAlerts}
                  className="p-4 rounded-3xl bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-md flex items-start justify-between gap-3 cursor-pointer hover:opacity-95 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded-full">
                          New Alert
                        </span>
                        <span className="text-[10px] text-purple-200">
                          {latestUnreadAlert.time}
                        </span>
                      </div>
                      <p className="text-xs font-bold mt-1">
                        {latestUnreadAlert.patientName} • {latestUnreadAlert.title}
                      </p>
                      <p className="text-[11px] text-purple-100 mt-0.5 line-clamp-1">
                        "{latestUnreadAlert.description}"
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-white text-purple-900 px-2.5 py-1.5 rounded-xl shrink-0 mt-1 shadow-2xs">
                    View
                  </span>
                </div>
              )}

              {/* SECTION: "Your Loved Ones" (Clean Header - View All Removed) */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-800">
                  Your Loved Ones
                </h2>

                {lovedOne ? (
                  <div
                    onClick={() => onSelectPatient(lovedOne)}
                    className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 hover:border-purple-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-base overflow-hidden shrink-0 border border-teal-200">
                        {lovedOne.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                            {lovedOne.fullName}
                          </p>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {lovedOne.invitationCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {lovedOne.condition}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {lovedOne.age}Y • {lovedOne.gender}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {lovedOne.status || "Stable"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-purple-50/50 border border-dashed border-purple-200 text-center text-xs text-slate-600">
                    No connected patient yet. Connected patient details will appear once entered by healthcare.
                  </div>
                )}
              </div>

              {/* Treating Physician Section (Call Care Team Button Removed) */}
              {lovedOne && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                        Treating Physician
                      </span>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">
                        {lovedOne.doctorName}
                      </p>
                      <p className="text-[11px] text-teal-800 font-medium">
                        {lovedOne.doctorSpecialty || "Consultant Physician"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px]">Care Team Status</span>
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[11px] font-semibold text-emerald-700">Active Review</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: "Today's Alerts" */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Today's Alerts</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </h2>
                  <button
                    onClick={handleOpenAlerts}
                    className="text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2.5">
                  {displayedAlerts.slice(0, 3).map((alert) => {
                    const isMissed = alert.type === "missed";
                    const isRead = readAlertIds.has(alert.id);

                    return (
                      <div
                        key={alert.id}
                        onClick={handleOpenAlerts}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs transition-all cursor-pointer hover:shadow-sm ${
                          isMissed
                            ? "bg-[#fff1f2] border-rose-200"
                            : "bg-[#f5f3ff] border-purple-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Circular status badge */}
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              isMissed
                                ? "bg-rose-500 text-white"
                                : "bg-purple-600 text-white"
                            }`}
                          >
                            {isMissed ? (
                              <Pill className="w-4 h-4" />
                            ) : (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <p
                                className={`text-xs font-bold ${
                                  isMissed ? "text-rose-700" : "text-purple-900"
                                }`}
                              >
                                {alert.title}
                              </p>
                              {!isRead && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              {alert.description}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                          {alert.time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* 2. ALERTS VIEW (REAL-TIME SYMPTOMS & MISSED MEDICINES) */}
          {/* ======================================================== */}
          {bottomNav === "alerts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Patient Alerts & Notifications
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live updates of missed doses and patient-reported symptoms
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 text-xs">
                <button
                  onClick={() => setAlertsFilter("all")}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-center ${
                    alertsFilter === "all"
                      ? "bg-white text-slate-800 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All ({displayedAlerts.length})
                </button>
                <button
                  onClick={() => setAlertsFilter("symptoms")}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-center ${
                    alertsFilter === "symptoms"
                      ? "bg-white text-purple-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Symptoms ({displayedAlerts.filter((a) => a.type === "symptom").length})
                </button>
                <button
                  onClick={() => setAlertsFilter("missed")}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-center ${
                    alertsFilter === "missed"
                      ? "bg-white text-rose-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Missed ({displayedAlerts.filter((a) => a.type === "missed").length})
                </button>
              </div>

              {/* Alerts List */}
              <div className="space-y-3">
                {filteredAlerts.length > 0 ? (
                  filteredAlerts.map((alert) => {
                    const isMissed = alert.type === "missed";
                    const isSymptom = alert.type === "symptom";

                    return (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-2xl border text-xs shadow-xs transition-all ${
                          isMissed
                            ? "bg-rose-50/50 border-rose-200"
                            : isSymptom
                            ? "bg-purple-50/50 border-purple-200"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isMissed
                                  ? "bg-rose-500 text-white"
                                  : "bg-purple-600 text-white"
                              }`}
                            >
                              {isMissed ? (
                                <Pill className="w-4 h-4" />
                              ) : (
                                <Activity className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {alert.title}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isMissed
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-purple-100 text-purple-700"
                                  }`}
                                >
                                  {isMissed ? "Missed Dose" : "Symptom Logged"}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 font-medium">
                                Patient: {alert.patientName || lovedOne?.fullName || "Patient"}
                              </span>
                            </div>
                          </div>

                          <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                            {alert.time}
                          </span>
                        </div>

                        <div className="mt-2 pl-10">
                          <p className="text-slate-700 font-medium text-xs leading-relaxed bg-white/80 p-2.5 rounded-xl border border-slate-200/60">
                            {alert.description}
                          </p>

                          <div className="mt-2.5 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">
                              Severity:{" "}
                              <strong className={isMissed ? "text-rose-600" : "text-amber-600"}>
                                {alert.severity ? alert.severity.toUpperCase() : "MEDIUM"}
                              </strong>
                            </span>
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Synced with Care Team
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 rounded-3xl bg-slate-50 border border-dashed border-slate-200 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">
                      No active alerts in this category
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      All medications are on schedule and no distress symptoms have been logged.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. PATIENT MEDICATIONS & CARE PLAN VIEW */}
          {/* ======================================================== */}
          {bottomNav === "patient" && lovedOne && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    {lovedOne.fullName}'s Medications
                  </h2>
                  <p className="text-xs text-slate-500">
                    Prescribed schedule and instructions
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  {lovedOne.carePlan.medications.length} Medicines
                </span>
              </div>

              <div className="space-y-2.5">
                {lovedOne.carePlan.medications.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 mt-0.5 border border-teal-100 font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{m.name}</p>
                        <p className="text-slate-600 text-[11px] mt-0.5">{m.instructions}</p>
                        {m.dosage && (
                          <span className="inline-block mt-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            Dose: {m.dosage}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-bold text-[11px] shrink-0 border border-teal-100">
                      {m.time}
                    </span>
                  </div>
                ))}
              </div>

              {/* Lifestyle & Diet Guidelines */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <div>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <Droplets className="w-4 h-4 text-sky-600" />
                    Prescribed Diet Advice:
                  </span>
                  <ul className="space-y-1 pl-5 list-disc text-slate-600 text-[11px]">
                    {lovedOne.carePlan.diet.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    Recovery & Physical Activity:
                  </span>
                  <ul className="space-y-1 pl-5 list-disc text-slate-600 text-[11px]">
                    {lovedOne.carePlan.activity.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. WEEKLY REPORT VIEW (WEEKLY CARE & ADHERENCE SUMMARY) */}
          {/* ======================================================== */}
          {bottomNav === "reports" && (
            <div className="space-y-4">
              {/* Header & Week Period Selector */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Weekly Recovery Report
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Summary of medication adherence & recovery activities
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReportToast(true);
                    setTimeout(() => setReportToast(false), 3000);
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Download / Share PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {reportToast && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Weekly report exported as PDF successfully!
                </div>
              )}

              {/* Week Toggle */}
              <div className="flex p-1 rounded-2xl bg-slate-100 text-xs">
                <button
                  onClick={() => setReportWeek("current")}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-center ${
                    reportWeek === "current"
                      ? "bg-white text-purple-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Current Week (Sep 15 - 22)
                </button>
                <button
                  onClick={() => setReportWeek("previous")}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-center ${
                    reportWeek === "previous"
                      ? "bg-white text-purple-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Last Week (Sep 8 - 14)
                </button>
              </div>

              {/* Patient Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                    Patient Monitored
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {lovedOne?.fullName || "Ananya Rao"}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {lovedOne?.condition || "Post-discharge clinical recovery"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500">Consultant</span>
                  <p className="font-semibold text-slate-800 text-xs">
                    {lovedOne?.doctorName || "Dr. Meera Kulkarni"}
                  </p>
                </div>
              </div>

              {/* Adherence Score Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Overall Weekly Adherence
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    86% On-Track
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: "86%" }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>24 of 28 doses taken on time</span>
                  <span className="font-medium text-amber-700">4 doses missed/delayed</span>
                </div>
              </div>

              {/* Breakdown: Missed Medicines */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-rose-600" />
                    Medications Missed or Delayed This Week:
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                    4 total
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">Cardivon 5 mg</p>
                      <p className="text-[11px] text-slate-500">Missed Morning dose (8:00 AM)</p>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100/70 px-2 py-1 rounded-md">
                      Tuesday
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">Pantorel 40 mg</p>
                      <p className="text-[11px] text-slate-500">Delayed before breakfast (taken 9:15 AM)</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-1 rounded-md">
                      Thursday
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">Gluceran-M 500 mg</p>
                      <p className="text-[11px] text-slate-500">Missed Evening dose (8:00 PM)</p>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100/70 px-2 py-1 rounded-md">
                      Saturday
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">Azithral 500 mg</p>
                      <p className="text-[11px] text-slate-500">Delayed afternoon dose (taken 4:00 PM)</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-1 rounded-md">
                      Sunday
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-xl">
                  Tip for Caregiver: Most missed doses occurred during morning routines. Setting a recurring morning alarm at 7:45 AM will help keep Cardivon and Pantorel on track.
                </p>
              </div>

              {/* Lifestyle & Activity Adherence */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Weekly Activity & Lifestyle Log:
                </span>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Gentle Walking</span>
                    <strong className="text-emerald-700 text-sm font-extrabold block mt-0.5">
                      5 / 7 Days
                    </strong>
                    <span className="text-[9px] text-slate-500">Avg 18 min/day</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Breathing Ex.</span>
                    <strong className="text-emerald-700 text-sm font-extrabold block mt-0.5">
                      6 / 7 Days
                    </strong>
                    <span className="text-[9px] text-slate-500">Daily routine</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Hydration Goal</span>
                    <strong className="text-emerald-700 text-sm font-extrabold block mt-0.5">
                      6 / 7 Days
                    </strong>
                    <span className="text-[9px] text-slate-500">2 - 2.5L daily</span>
                  </div>
                </div>
              </div>

              {/* Reported Symptoms Recap */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-purple-600" />
                  Symptoms Logged During the Week:
                </span>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px]">
                    <div>
                      <span className="font-bold text-slate-800">Mild headache</span>
                      <p className="text-slate-500">Rested 20 mins, resolved with hydration</p>
                    </div>
                    <span className="text-slate-400">Sep 18</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px]">
                    <div>
                      <span className="font-bold text-slate-800">Mild fatigue after walking</span>
                      <p className="text-slate-500">Vitals checked, normalized quickly</p>
                    </div>
                    <span className="text-slate-400">Sep 16</span>
                  </div>
                </div>
              </div>

              {/* Next Clinic Follow-up */}
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-teal-900 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-700" />
                    Next Clinic Follow-up Consultation
                  </span>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    {lovedOne?.carePlan?.followUpDate || "Sep 25, 2026"} at {lovedOne?.carePlan?.followUpTime || "10:00 AM"}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-teal-700 text-white font-bold text-[10px]">
                  Scheduled
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. CAREGIVER PROFILE VIEW (EDITABLE DETAILS) */}
          {/* ======================================================== */}
          {bottomNav === "profile" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Caregiver Profile
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage your identity, relationship, and contact numbers
                  </p>
                </div>

                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              {profileSavedToast && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Caregiver profile details updated successfully!
                </div>
              )}

              {/* Profile Card / Edit Form */}
              {isEditingProfile ? (
                <form
                  onSubmit={handleSaveProfile}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3.5 text-xs"
                >
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Caregiver Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.fullName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, fullName: e.target.value })
                      }
                      placeholder="e.g. Suresh Rao"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Role / Relationship with Patient
                    </label>
                    <select
                      value={profileForm.role}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, role: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 bg-white"
                    >
                      <option value="Son / Primary Family Caregiver">Son / Primary Family Caregiver</option>
                      <option value="Daughter / Primary Family Caregiver">Daughter / Primary Family Caregiver</option>
                      <option value="Spouse / Primary Family Caregiver">Spouse / Primary Family Caregiver</option>
                      <option value="Sibling / Family Caregiver">Sibling / Family Caregiver</option>
                      <option value="Parent / Family Caregiver">Parent / Family Caregiver</option>
                      <option value="Professional Home Nurse / Caregiver">Professional Home Nurse / Caregiver</option>
                      <option value="Close Relative / Guardian">Close Relative / Guardian</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Primary Contact Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, phone: e.target.value })
                      }
                      placeholder="e.g. +91 98451 44320"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Emergency / Secondary Contact Number
                    </label>
                    <input
                      type="tel"
                      value={profileForm.altPhone}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, altPhone: e.target.value })
                      }
                      placeholder="e.g. +91 98450 77112"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, email: e.target.value })
                      }
                      placeholder="e.g. suresh.rao@caremail.org"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Residential Address / City
                    </label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, address: e.target.value })
                      }
                      placeholder="e.g. Riverton, Bangalore - 560001"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      Save & Update Profile
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4 text-xs">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                    <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
                      {firstName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {caregiverProfile.fullName}
                      </h3>
                      <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 font-bold text-[10px] border border-purple-200">
                        {caregiverProfile.role}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">Primary Mobile:</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {caregiverProfile.phone}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">Secondary / Emergency No:</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {caregiverProfile.altPhone || "Not set"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">Email Address:</span>
                      <span className="font-semibold text-slate-800">
                        {caregiverProfile.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">Assigned Patient:</span>
                      <span className="font-bold text-teal-800">
                        {lovedOne?.fullName || "Patient"} ({lovedOne?.invitationCode || "HT-8492"})
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">Caregiver Access Code:</span>
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {lovedOne?.caregiverInfo?.code || currentUser.caregiverCode || "CG-8492"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">City / Location:</span>
                      <span className="text-slate-700">
                        {caregiverProfile.address}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700 block mb-2">
                      Alert Channels Active:
                    </span>
                    <div className="flex items-center gap-4 text-[11px] text-slate-600">
                      <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        SMS Alerts Enabled
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        WhatsApp Alerts Enabled
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={handleCaregiverLogout}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors border border-slate-200/80"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Caregiver Dashboard</span>
              </button>
            </div>
          )}
        </div>

        {/* ----------------- BOTTOM NAVIGATION ----------------- */}
        <nav className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-200/80 px-4 py-2 flex items-center justify-around z-20">
          <button
            onClick={() => setBottomNav("home")}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              bottomNav === "home" ? "text-purple-700" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold">Home</span>
          </button>

          <button
            onClick={() => setBottomNav("patient")}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              bottomNav === "patient" ? "text-purple-700" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-bold">Patient</span>
          </button>

          {/* Alerts Tab with Dynamic Unread Badge (Cleared when opened!) */}
          <button
            onClick={handleOpenAlerts}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              bottomNav === "alerts" ? "text-purple-700" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold">Alerts</span>
          </button>

          <button
            onClick={() => setBottomNav("reports")}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              bottomNav === "reports" ? "text-purple-700" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <FileBarChart className="w-5 h-5" />
            <span className="text-[10px] font-bold">Reports</span>
          </button>

          <button
            onClick={() => setBottomNav("profile")}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              bottomNav === "profile" ? "text-purple-700" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold">Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
