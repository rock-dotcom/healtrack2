import React, { useState, useEffect, useRef } from "react";
import { Patient, Medication, Reminder, User } from "../types";
import {
  Menu,
  CheckCircle2,
  Clock,
  Pill,
  Apple,
  Activity,
  AlertCircle,
  Home,
  ClipboardList,
  FileBarChart,
  User as UserIcon,
  LogOut,
  Calendar,
  ShieldCheck,
  ChevronRight,
  Droplets,
  AlertTriangle,
  Stethoscope,
  Heart,
  Send,
  Info,
  Check,
  Copy,
  Users,
  Phone,
  UserPlus,
  Edit2,
  KeyRound,
  Volume2,
  VolumeX,
  Bell,
  Sparkles,
  X,
} from "lucide-react";

interface PatientDashboardProps {
  currentUser: User;
  patient: Patient;
  onUpdateMedicationStatus: (patientId: string, medId: string, status: "taken" | "pending" | "missed") => void;
  onReportSymptom: (patientId: string, symptom: string, notes?: string) => void;
  onLogout: () => void;
  onSwitchToHealthcare?: () => void;
  onUpdatePatient?: (updatedPatient: Patient) => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  currentUser,
  patient,
  onUpdateMedicationStatus,
  onReportSymptom,
  onLogout,
  onSwitchToHealthcare,
  onUpdatePatient,
}) => {
  const [currentPatient, setCurrentPatient] = useState<Patient>(patient);

  useEffect(() => {
    if (patient) {
      setCurrentPatient(patient);
    }
  }, [patient]);

  // Real-time synchronization with Doctor Dashboard
  useEffect(() => {
    if (!currentPatient?.id && !currentPatient?.invitationCode) return;
    const fetchLatest = async () => {
      try {
        const idOrCode = currentPatient.id || currentPatient.invitationCode;
        const res = await fetch(`/api/patients/${idOrCode}`);
        const data = await res.json();
        if (data.success && data.patient) {
          setCurrentPatient(data.patient);
          if (onUpdatePatient) onUpdatePatient(data.patient);
        }
      } catch {}
    };
    fetchLatest();
    const interval = setInterval(fetchLatest, 3000);
    return () => clearInterval(interval);
  }, [currentPatient?.id, currentPatient?.invitationCode]);

  const [selectedSubTab, setSelectedSubTab] = useState<"medications" | "diet" | "activity" | "symptoms">("medications");
  const [bottomNav, setBottomNav] = useState<"home" | "careplan" | "reminders" | "reports" | "profile">("home");
  const [reportedSymptomText, setReportedSymptomText] = useState("");
  const [symptomReportedSuccess, setSymptomReportedSuccess] = useState(false);
  const [confirmEarlyMed, setConfirmEarlyMed] = useState<Medication | null>(null);
  const [doseSuccessToast, setDoseSuccessToast] = useState<string | null>(null);

  // ----------------- LIVE DOSE ALERT SYSTEM (Point 8) -----------------
  const [snoozedMedTimes, setSnoozedMedTimes] = useState<{ [medId: string]: number }>({});
  const [testNotificationActive, setTestNotificationActive] = useState(false);

  // ----------------- LIVE CLOCK & TIME-BASED GREETING -----------------
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  // Dynamic greeting based on current local hour
  const greetingText =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 17
      ? "Good Afternoon"
      : "Good Evening";

  const greetingIcon = currentHour < 12 ? "🌅" : currentHour < 17 ? "☀️" : "🌙";

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedLiveTime = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const patientName = currentPatient?.fullName || currentUser.fullName || "Patient";
  const firstName = patientName.split(" ")[0];

  const medications: Medication[] = currentPatient?.carePlan?.medications || [];
  const dietItems = currentPatient?.carePlan?.diet || [
    "Stay well hydrated with 2 to 2.5 liters of boiled/filtered water daily.",
    "Light, low sodium meals with fresh vegetables and dal khichdi.",
    "Avoid high-salt packaged snacks, deep-fried foods, and sugary sodas.",
  ];
  const activityItems = currentPatient?.carePlan?.activity || [
    "15-20 minutes of gentle walking on flat ground as tolerated.",
    "Daily deep diaphragmatic breathing exercises (5-10 minutes).",
    "Avoid heavy lifting (>5 kg) and strenuous cardiovascular exertion.",
    "Ensure 7-8 hours of sound nighttime rest.",
  ];
  const reminders: Reminder[] = currentPatient?.carePlan?.reminders || [];

  // Completed medication count
  const takenCount = medications.filter((m) => m.status === "taken").length;
  const totalCount = medications.length || 1;
  const progressPercent = Math.round((takenCount / totalCount) * 100);

  // ----------------- TIME-BASED MEDICATION LOGIC (Exact Minute Precision) -----------------
  // Parse dose time into total minutes from midnight (e.g. "9:26 PM" -> 1286, "8:00 AM" -> 480)
  const parseDoseMinutes = (timeStr: string): number => {
    if (!timeStr) return 12 * 60;
    const clean = timeStr.trim().toUpperCase();
    if (clean.includes("BEDTIME") || clean.includes("NIGHT")) return 21 * 60;
    if (clean.includes("MORNING")) return 8 * 60;
    if (clean.includes("AFTERNOON") || clean.includes("NOON")) return 13 * 60;
    if (clean.includes("EVENING")) return 18 * 60;

    // Matches: 9:26PM, 9:26 PM, 09:26, 21:26, 9:26
    const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i) || clean.match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
    if (!match) return 12 * 60;
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3] ? match[3].toUpperCase() : null;

    if (period === "PM") {
      if (hour < 12) hour += 12;
    } else if (period === "AM") {
      if (hour === 12) hour = 0;
    } else {
      // No explicit AM/PM:
      // If hour is 12-23, it's 24-hr time
      // If hour < 12, infer PM if current time is PM so evening entries match current period
      if (hour < 12) {
        const curH = currentTime.getHours();
        if (curH >= 12) {
          hour += 12;
        }
      }
    }
    return hour * 60 + minute;
  };

  const parseDoseHour = (timeStr: string): number => {
    return Math.floor(parseDoseMinutes(timeStr) / 60);
  };

  const currentMinutesFromMidnight = currentTime.getHours() * 60 + currentTime.getMinutes();

  // ----------------- MOBILE PHONE PUSH NOTIFICATION SYSTEM -----------------
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [phoneNotification, setPhoneNotification] = useState<{
    med: Medication;
    key: string;
    isTest?: boolean;
  } | null>(null);

  const notifiedKeysRef = useRef<Set<string>>(new Set());

  // Realistic Smartphone Notification Sound (3-note pleasant marimba chime)
  const playPhoneNotificationSound = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const playTone = (freq: number, start: number, dur: number, vol = 0.28) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(vol, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur);
      };

      // Gentle phone chime: G5 (784Hz) -> C6 (1046.5Hz) -> E6 (1318.5Hz)
      playTone(783.99, 0.0, 0.28, 0.25);
      playTone(1046.5, 0.12, 0.35, 0.3);
      playTone(1318.51, 0.24, 0.55, 0.35);
    } catch (e) {
      console.warn("Audio chime:", e);
    }
  };

  const pendingMeds = medications.filter((m) => m.status !== "taken");

  // A dose is DUE strictly based on the time in the medication plan:
  // USER: "So I entered 9:26, but it gave at 9:25 only notification. Particular based on time only it need to give the notification."
  // 1. MUST NEVER trigger BEFORE the scheduled minute (diff >= 0)
  // 2. Triggers exactly when scheduled minute arrives (diff === 0 or diff <= 1)
  const isMedicationDueRightNow = (med: Medication): boolean => {
    if (med.status === "taken") return false;
    if (snoozedMedTimes[med.id] && Date.now() < snoozedMedTimes[med.id]) {
      return false;
    }
    const medMins = parseDoseMinutes(med.time);
    const diff = currentMinutesFromMidnight - medMins;
    // Exactly at that time: NEVER before (diff >= 0) and strictly within current minute window (diff <= 1)
    return diff >= 0 && diff <= 1;
  };

  // Only triggers when current time actually matches a medication's timing!
  const liveDueMedication = pendingMeds.find((m) => isMedicationDueRightNow(m)) || null;

  // Trigger Phone Notification and Sound strictly when medication scheduled time arrives
  useEffect(() => {
    if (liveDueMedication) {
      const todayDateStr = currentTime.toDateString();
      const notificationKey = `${todayDateStr}-${liveDueMedication.id}-${liveDueMedication.time}`;

      if (!notifiedKeysRef.current.has(notificationKey)) {
        notifiedKeysRef.current.add(notificationKey);
        setPhoneNotification({ med: liveDueMedication, key: notificationKey });
        if (audioEnabled) {
          playPhoneNotificationSound();
        }
      }
    }
  }, [liveDueMedication, audioEnabled, currentTime]);

  // Auto-dismiss phone notification after 8.5 seconds ("it should come like a notification and it should go")
  useEffect(() => {
    if (!phoneNotification) return;
    const timer = setTimeout(() => {
      setPhoneNotification(null);
    }, 8500);
    return () => clearTimeout(timer);
  }, [phoneNotification]);

  // Trigger a test notification anytime so patient can test sound and phone banner
  const handleTriggerTestNotification = () => {
    const medToTest = pendingMeds[0] || medications[0] || {
      id: "demo-test",
      name: "Paracetamol 500 mg",
      instructions: "1 tablet after food",
      time: formattedLiveTime,
      status: "pending",
      color: "red" as const,
    };

    setPhoneNotification({
      med: medToTest,
      key: `test-${Date.now()}`,
      isTest: true,
    });
    if (audioEnabled) {
      playPhoneNotificationSound();
    }
  };

  // Handle immediate Dose Taken confirmation
  const handleTakeDoseNow = (med: Medication) => {
    onUpdateMedicationStatus(currentPatient.id, med.id, "taken");
    setPhoneNotification(null);
    setDoseSuccessToast(`Dose for ${med.name} confirmed as taken! Excellent! 🎉`);
    setTimeout(() => setDoseSuccessToast(null), 4000);
  };

  // Handle Snooze / Remind Later
  const handleSnoozeDose = (med: Medication) => {
    setSnoozedMedTimes((prev) => ({
      ...prev,
      [med.id]: Date.now() + 10 * 60 * 1000, // 10 mins snooze
    }));
    setPhoneNotification(null);
    setDoseSuccessToast(`Reminder for ${med.name} snoozed. We will notify you again in 10 minutes. ⏰`);
    setTimeout(() => setDoseSuccessToast(null), 4000);
  };

  // Handle medication status toggle with time check
  const handleMedicationClick = (med: Medication) => {
    if (med.status === "taken") {
      // Allow undo if taken by mistake
      onUpdateMedicationStatus(patient.id, med.id, "pending");
      return;
    }

    const medHour = parseDoseHour(med.time);
    // If dose is in the future (e.g. current hour is afternoon/evening and dose is later tonight)
    if (currentHour < medHour - 1) {
      // Show confirmation prompt to verify user actually took it early
      setConfirmEarlyMed(med);
    } else {
      // Directly mark as taken
      confirmDoseTaken(med);
    }
  };

  const confirmDoseTaken = (med: Medication) => {
    onUpdateMedicationStatus(patient.id, med.id, "taken");
    setConfirmEarlyMed(null);
    setDoseSuccessToast(`Confirmed! ${med.name} marked as taken on schedule.`);
    setTimeout(() => setDoseSuccessToast(null), 3500);
  };

  // Handle reporting symptom
  const handleReportSymptomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedSymptomText.trim()) return;

    onReportSymptom(patient.id, reportedSymptomText.trim());
    setReportedSymptomText("");
    setSymptomReportedSuccess(true);
    setTimeout(() => setSymptomReportedSuccess(false), 3500);
  };

  // ----------------- DYNAMIC REMINDERS DIVISION -----------------
  // Doses scheduled before or up to current hour vs. remaining night doses
  const remainingReminders = reminders.filter((r) => {
    const hour = parseDoseHour(r.time);
    return hour >= currentHour - 1; // Upcoming from now onwards
  });

  const completedReminders = reminders.filter((r) => {
    const hour = parseDoseHour(r.time);
    return hour < currentHour - 1; // Prior hours
  });

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

          <div className="flex items-center gap-2.5">
            {/* Patient Avatar Pill (Bell icon removed per user instructions) */}
            <button
              onClick={() => setBottomNav("profile")}
              className="flex items-center gap-1.5 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 cursor-pointer hover:bg-teal-100 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                {firstName.charAt(0)}
              </div>
              <div className="text-left pr-1 leading-none">
                <p className="text-[11px] font-bold text-slate-800 truncate max-w-[80px]">
                  {firstName}
                </p>
                <p className="text-[9px] text-teal-700 font-medium">Patient</p>
              </div>
            </button>
          </div>
        </header>

        {/* ======================================================== */}
        {/* PHONE-STYLE PUSH NOTIFICATION (Floating Heads-Up Banner) */}
        {/* USER: "It should look simple at white, not that much dark. White and the button should be orange and green. Like that it should look colorfully and a small notification only, not that much big notification box. The bubble which is coming that is very big, so make it simpler, medium size notifivatio pop up" */}
        {/* ======================================================== */}
        {phoneNotification && (
          <div className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm sm:max-w-md animate-in slide-in-from-top duration-300 pointer-events-auto">
            <div className="bg-white text-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-xl border border-slate-200/90 ring-1 ring-slate-900/5 flex flex-col gap-2.5 transition-all">
              {/* Header: App Name, Time, Close */}
              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    💊
                  </div>
                  <span className="font-bold text-slate-900 text-xs">HealTrack Health</span>
                  <span className="text-[10px] text-slate-400 font-medium">• Notification</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">Now</span>
                  <button
                    type="button"
                    onClick={() => setPhoneNotification(null)}
                    className="w-5 h-5 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Dismiss notification"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Notification Body */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-orange-600 animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                      ⏰ Time to take medicine
                    </span>
                    {phoneNotification.isTest && (
                      <span className="text-[9px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        Demo Test
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-1 truncate">
                    {phoneNotification.med.name}
                    {phoneNotification.med.dosage ? ` (${phoneNotification.med.dosage})` : ""}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                    {phoneNotification.med.instructions || "Take as directed by your physician"}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-mono font-bold mt-1">
                    Scheduled for: {phoneNotification.med.time}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Orange and Green as requested */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    handleSnoozeDose(phoneNotification.med);
                    setPhoneNotification(null);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold transition-all cursor-pointer text-center shadow-xs"
                >
                  Remind in 10m
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleTakeDoseNow(phoneNotification.med);
                    setPhoneNotification(null);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>I Will Take Now</span>
                </button>
              </div>

              {/* Auto-dismiss countdown bar */}
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5">
                <div className="bg-emerald-500 h-full w-full animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SCROLLABLE CONTENT BODY ----------------- */}
        <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-4">
          {/* Dose Confirmed Notification Toast */}
          {doseSuccessToast && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{doseSuccessToast}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* 1. HOME VIEW */}
          {/* ======================================================== */}
          {bottomNav === "home" && (
            <>
              {/* Header Greeting & Time (Dynamic by actual time of day) */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-800">
                    {greetingText}, {firstName}! {greetingIcon}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Stay consistent with your care plan.
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {formattedDate}
                  </span>
                  <div className="flex items-center gap-1.5 justify-end mt-1">
                    <span className="block text-[10px] font-mono text-slate-500 font-semibold">
                      {formattedLiveTime}
                    </span>
                    <button
                      type="button"
                      onClick={handleTriggerTestNotification}
                      className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                      title="Test how phone push notification and chime sound appear"
                    >
                      <Bell className="w-3 h-3 text-emerald-600" />
                      <span>Test Alert</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* COMPACT REAL-TIME DOSE NOTIFICATION CARD */}
              {/* ======================================================== */}
              {liveDueMedication && liveDueMedication.status !== "taken" && (
                <div className="p-3.5 rounded-2xl bg-white border border-orange-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-4 h-4 text-orange-600 animate-bounce" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          Due Now
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          Scheduled: {liveDueMedication.time}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAudioEnabled(true);
                            playMedicationChime();
                          }}
                          className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Play Audio Chime"
                        >
                          <Volume2 className="w-3 h-3 text-slate-500" />
                          <span>Sound</span>
                        </button>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        Time to take {liveDueMedication.name}
                        {liveDueMedication.dosage ? ` (${liveDueMedication.dosage})` : ""}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {liveDueMedication.instructions || "Take as directed by your physician"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleSnoozeDose(liveDueMedication)}
                      className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer shadow-xs"
                      title="Snooze reminder for 10 minutes"
                    >
                      Remind Later
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTakeDoseNow(liveDueMedication)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>I Will Take Now</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Progress & Encouragement Cards Row (AI Logo Removed) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Today's Progress Card */}
                <div className="p-4 rounded-3xl bg-[#ecfdf5] border border-emerald-100 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold mb-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                    <span>Today's Progress</span>
                  </div>

                  <div className="flex items-center justify-center my-1">
                    {/* Radial progress ring */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-emerald-100"
                          strokeWidth="3.8"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-emerald-600"
                          strokeDasharray={`${progressPercent}, 100`}
                          strokeWidth="3.8"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-xs font-extrabold text-slate-800">
                          {takenCount}/{totalCount}
                        </span>
                        <span className="text-[8px] text-slate-500 font-medium">
                          Completed
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-center font-bold text-emerald-800 mt-1">
                    Tasks Completed
                  </p>
                </div>

                {/* Keep Going Card (AI Logo Removed from Next Dose) */}
                <div className="p-4 rounded-3xl bg-[#f0fdfa] border border-teal-100 flex flex-col justify-between shadow-xs">
                  <div>
                    <h3 className="text-sm font-bold text-teal-900 mb-1">
                      Keep Going!
                    </h3>
                    <p className="text-xs text-teal-700 leading-snug">
                      Small steps make a big difference.
                    </p>
                  </div>
                  {/* Next Dose Display - Clean medical text without any AI logo */}
                  <div className="mt-3 p-2.5 rounded-xl bg-white/90 border border-teal-200/80 text-[11px] text-slate-800 font-semibold flex items-center justify-between">
                    <span className="text-teal-700 text-[10px] uppercase font-bold">Next:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {liveDueMedication ? liveDueMedication.time : "Night dose"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs: [Medications] [Diet] [Activity] [Symptoms] */}
              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-100 text-xs font-semibold">
                <button
                  onClick={() => setSelectedSubTab("medications")}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer truncate ${
                    selectedSubTab === "medications"
                      ? "bg-[#0c5a4d] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Medications
                </button>

                <button
                  onClick={() => setSelectedSubTab("diet")}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer truncate ${
                    selectedSubTab === "diet"
                      ? "bg-[#0c5a4d] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Diet
                </button>

                <button
                  onClick={() => setSelectedSubTab("activity")}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer truncate ${
                    selectedSubTab === "activity"
                      ? "bg-[#0c5a4d] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Activity
                </button>

                <button
                  onClick={() => setSelectedSubTab("symptoms")}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer truncate ${
                    selectedSubTab === "symptoms"
                      ? "bg-[#0c5a4d] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Symptoms
                </button>
              </div>

              {/* 1. MEDICATIONS SUB-TAB (TIME-AWARE SCHEDULE) */}
              {selectedSubTab === "medications" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-800">
                      Today's Medications
                    </h2>
                    <span className="text-xs font-semibold text-teal-700">
                      {takenCount} of {medications.length} taken
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {medications.map((med) => {
                      const isTaken = med.status === "taken";
                      const medHour = parseDoseHour(med.time);
                      const isFuture = !isTaken && currentHour < medHour - 1;

                      return (
                        <div
                          key={med.id}
                          className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                med.color === "red"
                                  ? "bg-rose-100 text-rose-600"
                                  : med.color === "blue"
                                  ? "bg-sky-100 text-sky-600"
                                  : "bg-purple-100 text-purple-600"
                              }`}
                            >
                              <Pill className="w-4 h-4" />
                            </div>

                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                {med.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {med.instructions}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap font-mono">
                              {med.time}
                            </span>

                            {/* Time-Aware Status Button */}
                            <button
                              onClick={() => handleMedicationClick(med)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isTaken
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isFuture
                                  ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                                  : "bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
                              }`}
                              title={
                                isTaken
                                  ? "Marked as taken"
                                  : isFuture
                                  ? `Scheduled for ${med.time}`
                                  : "Due now - click to confirm taken"
                              }
                            >
                              <CheckCircle2
                                className={`w-3.5 h-3.5 ${
                                  isTaken
                                    ? "text-emerald-600"
                                    : isFuture
                                    ? "text-amber-600"
                                    : "text-sky-500"
                                }`}
                              />
                              <span>
                                {isTaken
                                  ? "Taken"
                                  : isFuture
                                  ? "Pending"
                                  : "Take Now"}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. DIET SUB-TAB */}
              {selectedSubTab === "diet" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Apple className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm font-bold">Post-Discharge Nutrition Advisory</h2>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2 text-xs text-amber-900">
                    <p className="font-bold">Doctor's Dietary Advice:</p>
                    <ul className="space-y-1.5">
                      {dietItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* 3. ACTIVITY SUB-TAB */}
              {selectedSubTab === "activity" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-bold">Recovery Activity Schedule</h2>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2 text-xs text-blue-900">
                    <p className="font-bold">Mobility & Movement Plan:</p>
                    <ul className="space-y-1.5">
                      {activityItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* 4. SYMPTOMS SUB-TAB (REAL-TIME NOTIFICATION TO CAREGIVER) */}
              {selectedSubTab === "symptoms" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-800">
                    <AlertCircle className="w-4 h-4 text-purple-600" />
                    <h2 className="text-sm font-bold">Report Symptom to Caregiver</h2>
                  </div>

                  <p className="text-xs text-slate-500">
                    Reporting a symptom will immediately send an active notification to your caregiver's dashboard and medical records.
                  </p>

                  {symptomReportedSuccess && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold">Symptom Reported Successfully!</p>
                        <p className="text-[11px] text-emerald-700">
                          Notification sent to your caregiver's dashboard and care team.
                        </p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleReportSymptomSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {["Mild headache", "Dizziness", "Nausea", "Fatigue / Weakness"].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setReportedSymptomText(sym)}
                          className={`p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-left ${
                            reportedSymptomText === sym
                              ? "bg-purple-100 border-purple-400 text-purple-900 shadow-xs"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          + {sym}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={reportedSymptomText}
                      onChange={(e) => setReportedSymptomText(e.target.value)}
                      placeholder="Or describe how you feel (e.g. Mild chest uneasiness, cough)..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                    />

                    <button
                      type="submit"
                      disabled={!reportedSymptomText.trim()}
                      className="w-full py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Alert to Caregiver & Doctor</span>
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {/* ======================================================== */}
          {/* 2. STRUCTURED COMPLETE CARE PLAN TAB */}
          {/* ======================================================== */}
          {bottomNav === "careplan" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Clinical Discharge Care Plan
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authorized recovery protocol from hospital discharge summary
                </p>
              </div>

              {/* Doctor & Facility Header */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 text-[11px] font-medium">Proceeding Doctor:</span>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                      {patient?.doctorName || "Dr. Sharma"}
                    </p>
                    <p className="text-[11px] text-teal-700 font-semibold">
                      {patient?.doctorSpecialty || "Consultant Physician"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px]">Clinical Case</span>
                    <p className="font-bold text-slate-800 text-xs mt-0.5">
                      {patient?.invitationCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Diagnosis & Summary */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-teal-700" />
                  Primary Clinical Diagnosis & Condition:
                </span>
                <p className="text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {patient?.condition || "Acute respiratory tract infection with fever and dehydration recovery."}
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  {patient?.carePlan?.summary || "Patient successfully stabilized and discharged on structured oral medical therapy and home convalescence."}
                </p>
              </div>

              {/* Structured Medication Schedule (Time-to-Time) */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-rose-600" />
                  Structured Medication Schedule (Time to Time):
                </span>

                <div className="space-y-2">
                  {medications.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-xs">
                            {m.name}
                          </span>
                          {m.dosage && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {m.dosage}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {m.instructions}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 font-bold text-xs shrink-0 border border-teal-100 font-mono">
                        {m.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diet & Nutrition Advisory (What to take & what to avoid) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Apple className="w-4 h-4 text-emerald-600" />
                  Dietary Protocol & Nutrition Advice:
                </span>

                <div>
                  <span className="text-emerald-800 font-bold text-[11px] block mb-1">
                    ✓ Recommended Foods & Hydration:
                  </span>
                  <ul className="space-y-1 pl-4 list-disc text-slate-600 text-[11px]">
                    <li>Drink 2.0 to 2.5 Liters of water daily to maintain electrolyte balance.</li>
                    <li>Warm vegetable soups, dal khichdi, and soft cooked grains.</li>
                    <li>Fresh seasonal fruits and easily digestible steamed vegetables.</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-rose-700 font-bold text-[11px] block mb-1">
                    ✕ Strictly Avoid:
                  </span>
                  <ul className="space-y-1 pl-4 list-disc text-slate-600 text-[11px]">
                    <li>Deep-fried, excessively oily, and heavily spiced food items.</li>
                    <li>High-salt canned or processed foods; restrict extra table salt.</li>
                    <li>Cold refrigerated beverages and carbonated sodas.</li>
                  </ul>
                </div>
              </div>

              {/* Recovery Activities */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Physical Activities & Recovery Guidelines:
                </span>
                <ul className="space-y-1.5 pl-4 list-disc text-slate-600 text-[11px]">
                  {activityItems.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>

              {/* Red Flag Symptoms */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs space-y-1.5 text-rose-950">
                <span className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Red Flag Warning Symptoms (Contact Doctor Immediately):
                </span>
                <p className="text-[11px] text-rose-800">
                  High fever (&gt; 100.4°F), sudden breathing difficulty, persistent dizziness upon standing, or inability to retain oral fluids.
                </p>
              </div>

              {/* Follow-up Clinic Consultation */}
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-teal-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-700" />
                    Review Follow-up Consultation
                  </span>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    {patient?.carePlan?.followUpDate || "7 days post-discharge"} at {patient?.carePlan?.followUpTime || "10:00 AM"}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-teal-700 text-white font-bold text-[10px]">
                  Scheduled
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. REMINDERS VIEW (TIME-BASED REMAINING DOSES) */}
          {/* ======================================================== */}
          {bottomNav === "reminders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Automatic Medication Reminders
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Synchronized with your digital prescription schedule
                  </p>
                </div>
                <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
                  {remainingReminders.length > 0 ? `${remainingReminders.length} Remaining` : "All Complete"}
                </span>
              </div>

              {/* Remaining Upcoming Reminders for Today */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Upcoming Active Reminders ({remainingReminders.length} for today)
                </h3>

                {remainingReminders.length > 0 ? (
                  <div className="space-y-2.5">
                    {remainingReminders.map((rem) => (
                      <div
                        key={rem.id}
                        className="p-3.5 rounded-2xl bg-white border border-teal-200 shadow-2xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{rem.title}</p>
                            <p className="text-[11px] text-slate-500">{rem.subtitle}</p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-100">
                          {rem.time}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-800">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                    <p className="font-bold">All remaining doses for today are completed!</p>
                  </div>
                )}
              </div>

              {/* Completed Earlier Today Section */}
              {completedReminders.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Completed Earlier Today ({completedReminders.length})
                  </h3>

                  <div className="space-y-2">
                    {completedReminders.map((rem) => (
                      <div
                        key={rem.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs opacity-75"
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="font-semibold text-slate-700 text-xs">{rem.title}</p>
                            <p className="text-[10px] text-slate-400">{rem.subtitle}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {rem.time} • Completed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. REPORTS VIEW (DAILY MEDICATION SCHEDULE & SYMPTOM LOG) */}
          {/* ======================================================== */}
          {bottomNav === "reports" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Daily Regimen & Activity Summary
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Timeline of prescribed daily medication intakes and logged symptoms
                </p>
              </div>

              {/* Today's Medication Status Table */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800">Today's Dose Status:</span>
                  <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                    {takenCount} of {medications.length} Doses Taken
                  </span>
                </div>

                <div className="space-y-2">
                  {medications.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Pill className="w-3.5 h-3.5 text-teal-700" />
                        <div>
                          <span className="font-bold text-slate-800">{m.name}</span>
                          <span className="text-[11px] text-slate-500 ml-1.5 font-mono">({m.time})</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === "taken"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {m.status === "taken" ? "Completed" : "Scheduled"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reported Symptoms Log */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Logged Recovery Symptoms
                </h3>
                {currentPatient.recentAlerts?.filter((a) => a.type === "symptom" && (!a.patientId || a.patientId === currentPatient.id)).length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">
                    No discomfort symptoms recorded today. You are recovering steadily.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {currentPatient.recentAlerts
                      ?.filter((a) => a.type === "symptom" && (!a.patientId || a.patientId === currentPatient.id))
                      .map((alert) => (
                        <div
                          key={alert.id}
                          className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-purple-950">{alert.title}</p>
                            <p className="text-[11px] text-purple-800">{alert.description}</p>
                          </div>
                          <span className="text-[10px] font-mono text-purple-700 font-bold">{alert.time}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. PROFILE VIEW (PROFESSIONAL CLINICAL PRESENTATION) */}
          {/* USER: "And in patient dashboard the caregiver access is there, right? You should remove it. Like here one, only one is enough. That too in hospital dashboard is good." */}
          {/* ======================================================== */}
          {bottomNav === "profile" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">
                Patient Medical Profile
              </h2>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3.5 text-xs">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-bold text-lg flex items-center justify-center">
                    {firstName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{patientName}</h3>
                    <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 mt-0.5 inline-block">
                      Access Code: {currentPatient.invitationCode}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Primary Medical Diagnosis:</span>
                    <p className="font-bold text-slate-900 text-xs mt-0.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      {currentPatient.condition || "Cardiovascular & Post-Discharge Clinical Care"}
                    </p>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Medical Specialty:</span>
                    <span className="font-bold text-slate-800">
                      {currentPatient.doctorSpecialty || "Cardiology / Internal Medicine"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Consulting Physician:</span>
                    <span className="font-bold text-slate-800">{currentPatient.doctorName || "Dr. Sharma"}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Age & Gender:</span>
                    <span className="font-semibold text-slate-700">
                      {currentPatient.age ? `${currentPatient.age} Years` : "48 Years"} • {currentPatient.gender || "Male"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Hospital Database Record:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Post-Discharge Regimen
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Caregiver Contact:</span>
                    <span className="font-bold text-purple-700">
                      {currentPatient.caregiverInfo
                        ? `${currentPatient.caregiverInfo.name} (${currentPatient.caregiverInfo.relationship})`
                        : currentPatient.caregiverName || "Configured via Hospital"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Patient Portal</span>
              </button>
            </div>
          )}
        </div>

        {/* ----------------- EARLY MEDICATION CONFIRMATION MODAL ----------------- */}
        {confirmEarlyMed && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5 text-xs">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Dose Scheduled for {confirmEarlyMed.time}
                </h3>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  <strong>{confirmEarlyMed.name}</strong> is scheduled for {confirmEarlyMed.time}. Taking medications at the exact prescribed hour ensures optimal therapeutic effect. Have you already taken it ahead of time?
                </p>
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmEarlyMed(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Wait for {confirmEarlyMed.time}
                </button>
                <button
                  type="button"
                  onClick={() => confirmDoseTaken(confirmEarlyMed)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition-colors shadow-xs"
                >
                  Yes, Mark as Taken
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- BOTTOM NAVIGATION ----------------- */}
        <nav className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-200/80 px-4 py-2 flex items-center justify-around z-20">
          <button
            onClick={() => setBottomNav("home")}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              bottomNav === "home" ? "text-[#0c5a4d]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold">Home</span>
          </button>

          <button
            onClick={() => setBottomNav("careplan")}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              bottomNav === "careplan" ? "text-[#0c5a4d]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px] font-bold">Care Plan</span>
          </button>

          <button
            onClick={() => setBottomNav("reminders")}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              bottomNav === "reminders" ? "text-[#0c5a4d]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-bold">Reminders</span>
          </button>

          <button
            onClick={() => setBottomNav("reports")}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              bottomNav === "reports" ? "text-[#0c5a4d]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <FileBarChart className="w-5 h-5" />
            <span className="text-[10px] font-bold">Reports</span>
          </button>

          <button
            onClick={() => setBottomNav("profile")}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              bottomNav === "profile" ? "text-[#0c5a4d]" : "text-slate-400 hover:text-slate-600"
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
