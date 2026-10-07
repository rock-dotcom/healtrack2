import React, { useState, useEffect } from "react";
import { Patient, User, AlertItem } from "../types";
import { AddPatientModal } from "./AddPatientModal";
import {
  LayoutDashboard,
  Users,
  Bell,
  FileBarChart,
  Settings,
  LogOut,
  Search,
  Plus,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  ExternalLink,
  Copy,
  Pill,
  Activity,
  Phone,
  ShieldCheck,
  Check,
  Stethoscope,
  Building2,
  Save,
  CheckCheck,
  HeartHandshake,
  UserPlus,
  Droplets,
  Edit2,
  Share2,
  KeyRound,
  Sparkles,
  User as UserIcon,
  Trash2,
} from "lucide-react";

interface DoctorDashboardProps {
  currentUser: User;
  patients: Patient[];
  onAddPatient: (patient: Patient) => void;
  onUpdatePatient?: (patient: Patient) => void;
  onDeletePatient?: (patientId: string) => void;
  onLogout: () => void;
  onSwitchToPatientView: (code: string) => void;
  onSwitchToCaregiverView?: (code: string) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  currentUser,
  patients,
  onAddPatient,
  onUpdatePatient,
  onDeletePatient,
  onLogout,
  onSwitchToPatientView,
  onSwitchToCaregiverView,
}) => {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "patients" | "alerts" | "reports" | "settings"
  >("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState<Patient | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Caregiver Access & Linking State for Patient Profile
  const [isAddingCaregiver, setIsAddingCaregiver] = useState(false);
  const [caregiverName, setCaregiverName] = useState("");
  const [caregiverRelation, setCaregiverRelation] = useState("Friend");
  const [caregiverPhone, setCaregiverPhone] = useState("");
  const [caregiverSecondaryPhone, setCaregiverSecondaryPhone] = useState("");
  const [caregiverEmail, setCaregiverEmail] = useState("");
  const [isSavingCaregiver, setIsSavingCaregiver] = useState(false);
  const [generatedCaregiverCode, setGeneratedCaregiverCode] = useState<string | null>(null);
  const [copiedCaregiverCode, setCopiedCaregiverCode] = useState(false);
  const [copiedPatientCode, setCopiedPatientCode] = useState(false);
  const [caregiverSuccessMessage, setCaregiverSuccessMessage] = useState("");

  // Medicine Addition to Care Plan State
  const [isAddingMedicine, setIsAddingMedicine] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedDosage, setNewMedDosage] = useState("");
  const [newMedInstructions, setNewMedInstructions] = useState("");
  const [newMedTime, setNewMedTime] = useState("8:00 AM");
  const [isSavingMedicine, setIsSavingMedicine] = useState(false);
  const [medicineSuccessMessage, setMedicineSuccessMessage] = useState("");

  // Format any input time (24h or string) to standard 12-hour AM/PM format
  const formatTimeToAmPm = (val: string): string => {
    if (!val) return "8:00 AM";
    const trimmed = val.trim();
    // 1. Matches "9:26pm", "9:26 PM", "9:26am", "9:26 AM"
    const amPmMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (amPmMatch) {
      let hour = parseInt(amPmMatch[1], 10);
      const minute = amPmMatch[2] || "00";
      const period = amPmMatch[3].toUpperCase();
      if (hour > 12) hour -= 12;
      if (hour === 0) hour = 12;
      return `${hour}:${minute} ${period}`;
    }

    // 2. Matches "21:26" or "09:26" or "9:26"
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      let hour = parseInt(match[1], 10);
      const minute = match[2];
      if (hour >= 12 && hour < 24) {
        const h12 = hour > 12 ? hour - 12 : 12;
        return `${h12}:${minute} PM`;
      }
      // If hour < 12 and no AM/PM provided:
      // Match the current time of day so evening tests like 9:26 don't flip to 9:26 AM
      const currentHour = new Date().getHours();
      const defaultPeriod = currentHour >= 12 ? "PM" : "AM";
      const h12 = hour === 0 ? 12 : hour;
      return `${h12}:${minute} ${defaultPeriod}`;
    }

    if (/\b(am|pm)\b/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    return trimmed;
  };

  // Helper to quickly get live local time + N minutes (e.g. +1 min or +2 mins for live testing)
  const getLocalTimePlusMinutes = (mins = 1): string => {
    const d = new Date(Date.now() + mins * 60 * 1000);
    let hour = d.getHours();
    const minute = String(d.getMinutes()).padStart(2, "0");
    const period = hour >= 12 ? "PM" : "AM";
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${period}`;
  };

  // Keep selected patient for detail synchronized if patients list updates
  useEffect(() => {
    if (selectedPatientForDetail) {
      const updated = patients.find((p) => p.id === selectedPatientForDetail.id);
      if (updated) {
        setSelectedPatientForDetail(updated);
      }
    }
  }, [patients]);

  const handleOpenPatientProfile = (patient: Patient) => {
    setSelectedPatientForDetail(patient);
    setIsAddingCaregiver(false);
    setIsAddingMedicine(false);
    setCaregiverSuccessMessage("");
    setMedicineSuccessMessage("");
    if (patient.caregiverInfo) {
      setCaregiverName(patient.caregiverInfo.name);
      setCaregiverRelation(patient.caregiverInfo.relationship || "Friend");
      setCaregiverPhone(patient.caregiverInfo.phone || "");
      setCaregiverSecondaryPhone(patient.caregiverInfo.secondaryPhone || "");
      setCaregiverEmail(patient.caregiverInfo.email || "");
      setGeneratedCaregiverCode(patient.caregiverInfo.code);
    } else {
      setCaregiverName("");
      setCaregiverRelation("Friend");
      setCaregiverPhone("");
      setCaregiverSecondaryPhone("");
      setCaregiverEmail("");
      setGeneratedCaregiverCode(null);
    }
  };

  const handleSaveCaregiverAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForDetail || !caregiverName.trim()) return;

    setIsSavingCaregiver(true);
    setCaregiverSuccessMessage("");
    try {
      const res = await fetch(`/api/patients/${selectedPatientForDetail.id}/caregiver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: caregiverName.trim(),
          relationship: caregiverRelation.trim() || "Friend",
          phone: caregiverPhone.trim(),
          secondaryPhone: caregiverSecondaryPhone.trim(),
          email: caregiverEmail.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.patient) {
        const code = data.invitationCode || data.caregiverInfo?.code || "CG-8492";
        setGeneratedCaregiverCode(code);
        setSelectedPatientForDetail(data.patient);
        if (onUpdatePatient) {
          onUpdatePatient(data.patient);
        }
        setCaregiverSuccessMessage(`Caregiver "${caregiverName.trim()}" linked successfully! Access code generated.`);
        setIsAddingCaregiver(false);
      }
    } catch (err) {
      console.error("Failed to link caregiver:", err);
    } finally {
      setIsSavingCaregiver(false);
    }
  };

  const handleCopyCaregiverCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCaregiverCode(true);
    setTimeout(() => setCopiedCaregiverCode(false), 2500);
  };

  const handleCopyPatientCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPatientCode(true);
    setTimeout(() => setCopiedPatientCode(false), 2500);
  };

  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const executeDeletePatient = async (patientId: string) => {
    setIsDeletingPatient(true);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (onDeletePatient) {
          onDeletePatient(patientId);
        }
        setDeleteConfirmId(null);
        setSelectedPatientForDetail(null);
      } else {
        console.error("Delete patient error:", data.error);
      }
    } catch (err) {
      console.error("Network error while removing patient:", err);
    } finally {
      setIsDeletingPatient(false);
    }
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForDetail || !newMedName.trim()) return;

    setIsSavingMedicine(true);
    setMedicineSuccessMessage("");
    const formattedTime = formatTimeToAmPm(newMedTime) || "8:00 AM";
    try {
      const res = await fetch(`/api/patients/${selectedPatientForDetail.id}/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMedName.trim(),
          dosage: newMedDosage.trim() || undefined,
          instructions: newMedInstructions.trim() || "Take as directed after food",
          time: formattedTime,
        }),
      });
      const data = await res.json();
      if (data.success && data.patient) {
        setSelectedPatientForDetail(data.patient);
        if (onUpdatePatient) {
          onUpdatePatient(data.patient);
        }
        setMedicineSuccessMessage(`Medicine "${newMedName.trim()}" scheduled for ${formattedTime} added & synced in real-time!`);
        setNewMedName("");
        setNewMedDosage("");
        setNewMedInstructions("");
        setNewMedTime("8:00 AM");
        setIsAddingMedicine(false);
        setTimeout(() => setMedicineSuccessMessage(""), 4000);
      }
    } catch (err) {
      console.error("Failed to add medicine:", err);
    } finally {
      setIsSavingMedicine(false);
    }
  };

  // Doctor Identity: Strictly show physician's identity, never "Healthcare Professional" or patient names
  const rawName = currentUser?.fullName || "";
  const emailLower = (currentUser?.emailOrMobile || "").toLowerCase();
  const defaultByEmail = emailLower.includes("ramu")
    ? "Dr. Ramu"
    : emailLower.includes("janu")
    ? "Dr. Janu"
    : "Dr. Sharma";

  const isGeneric =
    !rawName ||
    rawName.toLowerCase().includes("healthcare") ||
    rawName.toLowerCase().includes("professional") ||
    rawName.toLowerCase().includes("ananya") ||
    rawName.toLowerCase().includes("rahul");
  const doctorDisplayName = isGeneric ? defaultByEmail : rawName;
  const doctorSpecialty =
    (currentUser?.role === "healthcare" ? currentUser.specialty : null) || "Consultant Physician";

  // Time-aware greeting
  const getDoctorGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Filtered patients based on search query (matches even on 2 letters or instant typing)
  const queryClean = searchQuery.trim().toLowerCase();
  const filteredPatients = patients.filter((p) => {
    if (!queryClean) return true;
    return (
      p.fullName.toLowerCase().includes(queryClean) ||
      p.condition.toLowerCase().includes(queryClean) ||
      p.invitationCode.toLowerCase().includes(queryClean) ||
      (p.caregiverInfo?.name && p.caregiverInfo.name.toLowerCase().includes(queryClean))
    );
  });

  // USER REQUIREMENT: Symptom Alerts ONLY for the doctor dashboard
  // "Regarding alerts, if I click on the alerts, it should show the alerts which are generated when the patient's symptoms are updated. Symptoms only, you need to alert to the doctor dashboard. For missed medications, don't alert."
  const allSymptomAlerts = patients.flatMap((p) =>
    (p.recentAlerts || [])
      .filter((a) => a.type === "symptom" || a.title?.toLowerCase().includes("symptom"))
      .map((a) => ({
        ...a,
        patientName: a.patientName || p.fullName,
        patientCode: p.invitationCode,
        patientCondition: p.condition,
        patientStatus: p.status,
      }))
  );

  // Doctor reviewed alerts state
  const [reviewedAlertIds, setReviewedAlertIds] = useState<string[]>([]);
  const pendingSymptomAlerts = allSymptomAlerts.filter(
    (a) => !reviewedAlertIds.includes(a.id)
  );

  const handleMarkAlertReviewed = (id: string) => {
    setReviewedAlertIds((prev) => [...prev, id]);
  };

  // Statistics
  const totalPatientsCount = patients.length;
  const highPriorityCount = patients.filter((p) => p.status === "High Risk").length;
  const followUpsCount = patients.filter((p) => p.carePlan?.followUpDate).length;

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Helper to calculate patient medication adherence percentage
  const calculatePatientAdherence = (patient: Patient) => {
    const meds = patient.carePlan?.medications || [];
    if (meds.length === 0) return { percent: 100, takenCount: 0, totalCount: 0 };
    const takenCount = meds.filter((m) => m.status === "taken").length;
    const percent = Math.round((takenCount / meds.length) * 100);
    return { percent, takenCount, totalCount: meds.length };
  };

  // Brand-new Doctor Settings State
  const [doctorSettings, setDoctorSettings] = useState({
    fullName: doctorDisplayName,
    specialty: doctorSpecialty,
    regNumber: "MCI-2018-84920",
    hospitalName: "Silver Oak Centre & City Care Hospital",
    department: "Department of Medicine & Patient Recovery",
    email: "dr.sharma@healtrack.hospital",
    phone: "+91 98765 43210",
    symptomAlertNotify: true,
    excludeMissedMedAlerts: true,
    highRiskUrgentSms: true,
    opdStartTime: "09:00",
    opdEndTime: "17:00",
    autoLockMinutes: "15",
  });
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row text-slate-800">
      {/* ----------------- LEFT DARK NAVY SIDEBAR ----------------- */}
      <aside className="w-full md:w-64 bg-[#0d2238] text-slate-200 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 shrink-0"
            >
              <path
                d="M24 24C24 14 13 8 13 8C13 8 13 19 24 24Z"
                fill="#10B981"
              />
              <path
                d="M24 24C24 14 35 8 35 8C35 8 35 19 24 24Z"
                fill="#059669"
              />
              <path
                d="M24 24C16 24 10 33 10 33C10 33 21 34 24 24Z"
                fill="#34D399"
              />
              <path
                d="M24 24C32 24 38 33 38 33C38 33 27 34 24 24Z"
                fill="#0D9488"
              />
              <circle cx="24" cy="24" r="2.5" fill="#FFFFFF" />
            </svg>
            <span className="text-xl font-bold tracking-tight text-white">
              HealTrack
            </span>
          </div>
        </div>

        {/* Sidebar Nav Items: Pruned per user instructions */}
        {/* Removed: Care Plans, Messages */}
        <nav className="p-4 space-y-1.5 flex-1">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-[#1e3a5f] text-white shadow-inner"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          {/* Patients */}
          <button
            onClick={() => setActiveTab("patients")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "patients"
                ? "bg-[#1e3a5f] text-white shadow-inner"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Patients</span>
            {patients.length > 0 && (
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-teal-400">
                {patients.length}
              </span>
            )}
          </button>

          {/* Alerts: Symptoms Only */}
          <button
            onClick={() => setActiveTab("alerts")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "alerts"
                ? "bg-[#1e3a5f] text-white shadow-inner"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Alerts</span>
            {pendingSymptomAlerts.length > 0 && (
              <span className="ml-auto w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {pendingSymptomAlerts.length}
              </span>
            )}
          </button>

          {/* Reports: Adherence & Patient Details Line */}
          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "reports"
                ? "bg-[#1e3a5f] text-white shadow-inner"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <FileBarChart className="w-4 h-4" />
            <span>Reports</span>
          </button>

          {/* Settings: Brand New */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-[#1e3a5f] text-white shadow-inner"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Doctor User Footer (Left Bottom Corner) */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0a1a2b]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-teal-900/70 border-2 border-teal-500 flex items-center justify-center font-bold text-teal-300 text-sm shrink-0">
              Dr
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">
                {doctorDisplayName}
              </p>
              <p className="text-[11px] text-teal-400 truncate font-medium">
                City Care Hospital
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ----------------- MAIN WORKSPACE ----------------- */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="px-6 py-5 bg-white border-b border-slate-200/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-800">
                {getDoctorGreeting()}, {doctorDisplayName}! 👋
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === "dashboard" && "Practice overview, patient adherence, and symptom monitoring."}
              {activeTab === "patients" && "Comprehensive directory of all registered patients under your care."}
              {activeTab === "alerts" && "Symptom alerts generated when patient symptoms are updated."}
              {activeTab === "reports" && "Medication adherence and clinical summary lines for all patients."}
              {activeTab === "settings" && "Physician credentials, symptom alert rules, and clinic OPD hours."}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-3 w-full lg:w-auto">
            {/* Live / Mockup Date */}
            <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
              {formattedDate}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 lg:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>

            {/* Prominent "+ Add Patient" Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-[#0c5a4d] hover:bg-[#09473d] text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-teal-900/15 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Patient</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6">
          {/* ======================================================== */}
          {/* 1. DASHBOARD OVERVIEW TAB */}
          {/* ======================================================== */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* STATS OVERVIEW ROW */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Patients */}
                <div
                  onClick={() => setActiveTab("patients")}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-teal-300 transition-colors"
                >
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Total Patients</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                      {totalPatientsCount}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* High Priority */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">High Priority</p>
                    <p className="text-2xl font-bold text-rose-600 mt-1">
                      {highPriorityCount}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <ArrowDownRight className="w-5 h-5 text-rose-500 rotate-45" />
                  </div>
                </div>

                {/* Symptom Alerts Only */}
                <div
                  onClick={() => setActiveTab("alerts")}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-300 transition-colors"
                >
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Symptom Alerts</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                      {pendingSymptomAlerts.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                </div>

                {/* Follow-ups Today */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Follow-ups Today</p>
                    <p className="text-2xl font-bold text-teal-700 mt-1">
                      {followUpsCount}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* MAIN TWO-COLUMN SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT / CENTER: RECENT PATIENTS LIST (2 Cols) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-base font-bold text-slate-800">
                          Recent Patients
                        </h2>
                        <p className="text-xs text-slate-500">
                          {patients.length === 0
                            ? "Only patients you enter will be saved here."
                            : `Showing ${filteredPatients.length} recorded patient(s)`}
                        </p>
                      </div>

                      {patients.length > 0 && (
                        <button
                          onClick={() => setActiveTab("patients")}
                          className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
                        >
                          View All ({patients.length})
                        </button>
                      )}
                    </div>

                    {/* Patient List or Clean Empty State */}
                    {patients.length === 0 ? (
                      <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center">
                        <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
                          <Users className="w-7 h-7" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">
                          No patients registered yet
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                          Add a patient via prescription OCR or upload to start tracking care plans and recovery vitals.
                        </p>
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="mt-4 px-4 py-2 rounded-xl bg-[#0c5a4d] hover:bg-[#09473d] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Upload Prescription & Add First Patient</span>
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredPatients.slice(0, 5).map((patient) => {
                          const statusColor =
                            patient.status === "High Risk"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : patient.status === "Moderate"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200";

                          return (
                            <div
                              key={patient.id}
                              className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 p-2 rounded-2xl transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm overflow-hidden shrink-0">
                                  {patient.fullName.charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-800">
                                      {patient.fullName}
                                    </p>
                                    <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                      {patient.invitationCode}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    {patient.condition}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                                  {patient.carePlan?.medications?.length || 0} Medicines Prescribed
                                </span>

                                <span
                                  title="Patient Clinical Monitoring Status: Clinically Stable means no acute distress symptoms reported."
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusColor}`}
                                >
                                  {patient.status || "Stable"}
                                </span>

                                {/* Copy Invitation Code */}
                                <button
                                  onClick={() => handleCopyCode(patient.invitationCode, patient.id)}
                                  title="Copy Invitation Code"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  {copiedCodeId === patient.id ? (
                                    <span className="text-[10px] text-emerald-600 font-bold">
                                      Copied!
                                    </span>
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>

                                {/* View Patient Profile & Caregiver Access */}
                                <button
                                  onClick={() => handleOpenPatientProfile(patient)}
                                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-200"
                                >
                                  <UserIcon className="w-3.5 h-3.5" />
                                  <span>Patient Profile</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: TODAY'S MEDICATION SCHEDULE & UPCOMING FOLLOW-UPS */}
                <div className="space-y-6">
                  {/* Today's Prescribed Regimen Summary */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-700" />
                        <span>Today's Prescribed Regimens</span>
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                        Live Sync
                      </span>
                    </div>

                    <div className="space-y-3">
                      {patients.flatMap(p => (p.carePlan?.medications || []).map(m => ({ ...m, patientName: p.fullName, patientCode: p.invitationCode }))).slice(0, 4).length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center">
                          No active prescriptions recorded yet.
                        </p>
                      ) : (
                        patients
                          .flatMap(p => (p.carePlan?.medications || []).map(m => ({ ...m, patientName: p.fullName, patientCode: p.invitationCode })))
                          .slice(0, 4)
                          .map((med, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                                  <Pill className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800">{med.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">Patient: {med.patientName}</p>
                                </div>
                              </div>
                              <span className="font-mono text-teal-900 bg-white px-2 py-0.5 rounded border border-teal-200 font-bold text-[10px]">
                                {med.time}
                              </span>
                            </div>
                          ))
                      )}
                    </div>

                    {/* Status Guide / Legend */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-700 mb-1.5">Clinical Monitoring Status Legend:</p>
                      <div className="space-y-1 text-[10px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span><strong>Clinically Stable:</strong> Outpatient recovering without acute distress.</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span><strong>High Risk:</strong> Active symptom distress alert sent by patient.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Upcoming Follow-ups */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-800">
                        Upcoming Follow-ups
                      </h3>
                      <span className="text-xs font-semibold text-slate-400">
                        {followUpsCount} Scheduled
                      </span>
                    </div>

                    <div className="space-y-3">
                      {patients.length > 0 ? (
                        patients.slice(0, 3).map((p) => (
                          <div
                            key={p.id}
                            className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                                {p.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  {p.fullName}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {p.carePlan?.followUpDate || "24 Sep 2024"}, {p.carePlan?.followUpTime || "10:00 AM"}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-400">
                          No follow-ups scheduled yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. PATIENTS TAB: STRICTLY LISTS PATIENTS ONLY */}
          {/* USER: "Keep the Patients section. Whenever I click on Patients, it should list the patients only." */}
          {/* ======================================================== */}
          {activeTab === "patients" && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-teal-700" />
                      <span>Patient Directory ({filteredPatients.length})</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      All patients assigned to {doctorDisplayName} across hospital and home care.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="py-2.5 px-4 rounded-xl bg-[#0c5a4d] hover:bg-[#09473d] text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add New Patient</span>
                  </button>
                </div>

                {/* Patient List */}
                {filteredPatients.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                    <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800">
                      No patients found
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Try searching with another name or add a new patient.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPatients.map((patient) => {
                      const adherence = calculatePatientAdherence(patient);
                      const statusBadge =
                        patient.status === "High Risk"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : patient.status === "Moderate"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200";

                      return (
                        <div
                          key={patient.id}
                          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-200 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          {/* Patient Info */}
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-800 font-bold text-sm flex items-center justify-center shrink-0 border border-teal-100">
                              {patient.fullName.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-extrabold text-slate-900">
                                  {patient.fullName}
                                </h3>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {patient.age ? `${patient.age} yrs` : ""} {patient.gender || ""}
                                </span>
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-bold">
                                  {patient.invitationCode}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">
                                {patient.condition}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Discharge Follow-up: {patient.carePlan?.followUpDate || "7 days"} at {patient.carePlan?.followUpTime || "10:00 AM"}
                              </p>
                            </div>
                          </div>

                          {/* Patient Actions */}
                          <div className="flex items-center flex-wrap gap-3 self-end md:self-auto">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge}`}
                            >
                              {patient.status}
                            </span>

                            {/* Copy Code */}
                            <button
                              onClick={() => handleCopyCode(patient.invitationCode, patient.id)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Copy invite code"
                            >
                              {copiedCodeId === patient.id ? (
                                <span className="text-emerald-600 font-bold">Copied!</span>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Code</span>
                                </>
                              )}
                            </button>

                            {/* Caregiver Status Badge */}
                            {patient.caregiverInfo ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                <HeartHandshake className="w-3 h-3 text-purple-600" />
                                <span>{patient.caregiverInfo.name}</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 hidden sm:inline">
                                No Caregiver
                              </span>
                            )}

                            {/* View Patient Profile & Caregiver Access */}
                            <button
                              onClick={() => handleOpenPatientProfile(patient)}
                              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-200"
                            >
                              <UserIcon className="w-3.5 h-3.5" />
                              <span>Patient Profile</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. ALERTS TAB: SYMPTOM UPDATES ONLY */}
          {/* USER: "Regarding alerts, if I click on the alerts, it should show the alerts which are generated when the patient's symptoms are updated. Symptoms only, you need to alert to the doctor dashboard. For missed medications, don't alert." */}
          {/* ======================================================== */}
          {activeTab === "alerts" && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-rose-600" />
                      <span>Clinical Symptom Alerts</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Doctor-specific feed displaying only symptom reports logged by patients. Missed medications are handled exclusively by caregivers.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    Symptoms Filtered ({allSymptomAlerts.length})
                  </span>
                </div>

                {allSymptomAlerts.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800">
                      No active symptom reports
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      None of your registered patients have reported distress symptoms today. All monitored conditions are stable.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allSymptomAlerts.map((alert) => {
                      const isReviewed = reviewedAlertIds.includes(alert.id);

                      return (
                        <div
                          key={alert.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isReviewed
                              ? "bg-slate-50/80 border-slate-200 opacity-60"
                              : "bg-purple-50/40 border-purple-200 shadow-2xs"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                  isReviewed
                                    ? "bg-slate-200 text-slate-600"
                                    : "bg-purple-600 text-white"
                                }`}
                              >
                                <Activity className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-extrabold text-slate-900">
                                    {alert.title}
                                  </h3>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                    Patient Symptom
                                  </span>
                                  {isReviewed && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Reviewed
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-slate-600 font-medium mt-1">
                                  Patient: <strong className="text-slate-800">{alert.patientName}</strong> ({alert.patientCode}) • Condition: {alert.patientCondition}
                                </p>

                                <div className="mt-2 p-2.5 rounded-xl bg-white/90 border border-slate-200 text-xs text-slate-700">
                                  <span className="font-semibold text-slate-900">Logged Symptom Details: </span>
                                  {alert.description}
                                </div>
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
                              <span className="text-xs font-semibold text-slate-400">
                                {alert.time || "Today"}
                              </span>

                              {!isReviewed && (
                                <button
                                  onClick={() => handleMarkAlertReviewed(alert.id)}
                                  className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                                >
                                  Mark Reviewed
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. REPORTS TAB: PATIENT DETAILS LINE + ADHERENCE ONLY */}
          {/* USER: "For reports also, you just give the patient details line. If we click on the reports, we need to show the all the patients and how much adherence or something about the patients list." */}
          {/* ======================================================== */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <FileBarChart className="w-5 h-5 text-teal-700" />
                      <span>Patient Care Plans & Clinical Reports</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Individual patient details line showing daily prescribed regimen, recovery status, and follow-up schedules.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                      Total: {patients.length} Patients
                    </span>
                  </div>
                </div>

                {/* Patient Details Lines Table / List */}
                {patients.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                    <FileBarChart className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">
                      No clinical reports recorded yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patients.map((patient) => {
                      const adherence = calculatePatientAdherence(patient);

                      return (
                        <div
                          key={patient.id}
                          className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 hover:bg-white hover:shadow-xs transition-all"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Patient Details Line */}
                            <div className="space-y-1">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="font-extrabold text-slate-900 text-sm">
                                  {patient.fullName}
                                </span>
                                <span className="font-mono text-xs text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-semibold">
                                  {patient.invitationCode}
                                </span>
                                <span className="text-xs text-slate-500">
                                  • {patient.age ? `${patient.age} yrs` : "Adult"}, {patient.gender || "Patient"}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    patient.status === "High Risk"
                                      ? "bg-rose-100 text-rose-700"
                                      : patient.status === "Moderate"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {patient.status}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600">
                                <strong className="text-slate-700">Diagnosis:</strong> {patient.condition}
                              </p>

                              <p className="text-[11px] text-slate-500">
                                <strong className="text-slate-700">Prescription:</strong> {patient.carePlan?.medications.map(m => m.name).join(", ") || "None registered"}
                              </p>
                            </div>

                            {/* Summary & Profile Action */}
                            <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                              <div className="text-right">
                                <span className="text-xs font-bold text-slate-850 block">
                                  {patient.carePlan?.medications?.length || 0} Prescribed Medications
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Follow-up: {patient.carePlan?.followUpDate || "7 days post-discharge"}
                                </span>
                              </div>

                              {/* Action: Open Patient Profile */}
                              <button
                                onClick={() => handleOpenPatientProfile(patient)}
                                className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-850 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                View Profile
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. SETTINGS TAB: BRAND NEW DOCTOR SETTINGS */}
          {/* USER: "and settings should be new." */}
          {/* ======================================================== */}
          {activeTab === "settings" && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-teal-700" />
                    <span>Physician Clinical Settings</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure your clinical identity, OPD consultation hours, and patient symptom alert filters.
                  </p>
                </div>

                {settingsSavedToast && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold animate-fadeIn">
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                    <span>Settings successfully updated and applied!</span>
                  </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
                  {/* Doctor Profile Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-teal-700" />
                      1. Doctor Profile & Registration
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Doctor Full Name
                        </label>
                        <input
                          type="text"
                          value={doctorSettings.fullName}
                          onChange={(e) =>
                            setDoctorSettings({ ...doctorSettings, fullName: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Clinical Specialty
                        </label>
                        <input
                          type="text"
                          value={doctorSettings.specialty}
                          onChange={(e) =>
                            setDoctorSettings({ ...doctorSettings, specialty: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Medical Council Reg No.
                        </label>
                        <input
                          type="text"
                          value={doctorSettings.regNumber}
                          onChange={(e) =>
                            setDoctorSettings({ ...doctorSettings, regNumber: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Hospital / Affiliation
                        </label>
                        <input
                          type="text"
                          value={doctorSettings.hospitalName}
                          onChange={(e) =>
                            setDoctorSettings({ ...doctorSettings, hospitalName: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Symptom Alerts Preferences */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-purple-700" />
                      2. Symptom Alerts & Notifications
                    </h3>

                    <div className="space-y-2.5">
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={doctorSettings.symptomAlertNotify}
                          onChange={(e) =>
                            setDoctorSettings({ ...doctorSettings, symptomAlertNotify: e.target.checked })
                          }
                          className="w-4 h-4 text-teal-700 rounded"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block">
                            Real-time Symptom Update Notification
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Receive notifications whenever a patient reports a symptom or discomfort.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={doctorSettings.excludeMissedMedAlerts}
                          onChange={(e) =>
                            setDoctorSettings({ ...doctorSettings, excludeMissedMedAlerts: e.target.checked })
                          }
                          className="w-4 h-4 text-teal-700 rounded"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block">
                            Exclude Missed Medication Dose Alerts
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Strictly mute missed dose pings on doctor dashboard (monitored by caregivers).
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={doctorSettings.highRiskUrgentSms}
                          onChange={(e) =>
                            setDoctorSettings({ ...doctorSettings, highRiskUrgentSms: e.target.checked })
                          }
                          className="w-4 h-4 text-teal-700 rounded"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block">
                            High Priority Escalation for Critical Symptoms
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Flash alert immediately if fever &gt;101°F or acute chest uneasiness is reported.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Clinic OPD Hours */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-700" />
                      3. Clinic OPD Working Hours
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          OPD Start Time
                        </label>
                        <input
                          type="time"
                          value={doctorSettings.opdStartTime}
                          onChange={(e) =>
                            setDoctorSettings({ ...doctorSettings, opdStartTime: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          OPD End Time
                        </label>
                        <input
                          type="time"
                          value={doctorSettings.opdEndTime}
                          onChange={(e) =>
                            setDoctorSettings({ ...doctorSettings, opdEndTime: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#0c5a4d] hover:bg-[#09473d] text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-900/10 cursor-pointer transition-all"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Clinical Settings</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Patient Profile & Clinical Care Record Modal */}
      {selectedPatientForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-6 animate-in fade-in">
            {/* Header: Demographics & Condition */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 font-black text-lg flex items-center justify-center shrink-0">
                  {selectedPatientForDetail.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {selectedPatientForDetail.fullName}
                    </h3>
                    <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">
                      {selectedPatientForDetail.invitationCode}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        selectedPatientForDetail.status === "High Risk"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : selectedPatientForDetail.status === "Moderate"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {selectedPatientForDetail.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedPatientForDetail.age ? `${selectedPatientForDetail.age} yrs` : "Adult"} • {selectedPatientForDetail.gender || "Patient"} • Condition: <span className="font-semibold text-slate-800">{selectedPatientForDetail.condition}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPatientForDetail(null);
                  setIsAddingCaregiver(false);
                  setIsAddingMedicine(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1 text-xs">
              {/* Doctor Summary Note */}
              {selectedPatientForDetail.carePlan?.summary && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 italic">
                  "{selectedPatientForDetail.carePlan.summary}"
                </div>
              )}

              {/* Success Notification Banners */}
              {caregiverSuccessMessage && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 font-bold animate-in fade-in">
                  <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{caregiverSuccessMessage}</span>
                </div>
              )}

              {medicineSuccessMessage && (
                <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center gap-2 font-bold animate-in fade-in">
                  <CheckCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{medicineSuccessMessage}</span>
                </div>
              )}

              {/* ======================================================== */}
              {/* PATIENT INVITATION CODE FOR PATIENT LOGIN */}
              {/* ======================================================== */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                      Patient Login Access Code
                    </span>
                    <div className="flex items-center gap-2.5 mt-1">
                      <span className="font-mono text-2xl font-black text-emerald-950 tracking-wider">
                        {selectedPatientForDetail.invitationCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPatientCode(selectedPatientForDetail.invitationCode)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        title="Copy Patient Code"
                      >
                        {copiedPatientCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                            <span className="text-emerald-700 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Patient Code</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-1">
                      Give this code to <strong>{selectedPatientForDetail.fullName}</strong>. When entered on the Patient Login page, it instantly fetches all their prescribed medicines, care plan, and doctor information.
                    </p>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* 1. CAREGIVER ACCESS & INVITATION CODE SECTION */}
              {/* USER: "Then we need to go to the patient profile. Then we need to see a button like add caregiver access. In that, we need to add the caregiver name, relation, and phone number. Then save and generate the invitation code. Then we need to get a code. We need to copy-paste that code and then we need to log in it in our caregiver dashboard." */}
              {/* ======================================================== */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-white border border-purple-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <span>Caregiver Access</span>
                        {selectedPatientForDetail.caregiverInfo && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Connected
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Designate a family member or caregiver to monitor scheduled recovery care.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button if already connected */}
                  {selectedPatientForDetail.caregiverInfo && !isAddingCaregiver && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCaregiver(true)}
                      className="px-3 py-1.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-purple-800 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                  )}
                </div>

                {/* State A: No Caregiver linked yet & not editing */}
                {!selectedPatientForDetail.caregiverInfo && !generatedCaregiverCode && !isAddingCaregiver && (
                  <div className="p-4 rounded-2xl bg-white border border-dashed border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-center sm:text-left">
                    <div>
                      <p className="font-bold text-slate-800 text-xs">
                        No Caregiver Access Assigned Yet
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Add a family member or caregiver to generate a secure login code.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingCaregiver(true)}
                      className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add Caregiver Access</span>
                    </button>
                  </div>
                )}

                {/* State B: Add / Edit Caregiver Form */}
                {isAddingCaregiver && (
                  <form
                    onSubmit={handleSaveCaregiverAccess}
                    className="p-4 rounded-2xl bg-white border border-purple-200 space-y-3 shadow-xs animate-in fade-in"
                  >
                    <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                      <span className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-purple-700" />
                        <span>Enter Caregiver Details</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Patient: {selectedPatientForDetail.fullName}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Caregiver Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={caregiverName}
                          onChange={(e) => setCaregiverName(e.target.value)}
                          placeholder="e.g. Akshita"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Relationship to Patient *
                        </label>
                        <input
                          type="text"
                          required
                          list="caregiver-relationships"
                          value={caregiverRelation}
                          onChange={(e) => setCaregiverRelation(e.target.value)}
                          placeholder="e.g. Daughter, Son, Friend, Nurse"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                        />
                        <datalist id="caregiver-relationships">
                          <option value="Daughter" />
                          <option value="Son" />
                          <option value="Spouse (Husband / Wife)" />
                          <option value="Parent (Mother / Father)" />
                          <option value="Sibling (Brother / Sister)" />
                          <option value="Friend" />
                          <option value="In-Home Nurse / Care Aide" />
                          <option value="Legal Guardian" />
                          <option value="Relative" />
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Primary Contact Phone *
                        </label>
                        <input
                          type="tel"
                          value={caregiverPhone}
                          onChange={(e) => setCaregiverPhone(e.target.value)}
                          placeholder="e.g. +91 98451 44320"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Secondary Emergency Number
                        </label>
                        <input
                          type="tel"
                          value={caregiverSecondaryPhone}
                          onChange={(e) => setCaregiverSecondaryPhone(e.target.value)}
                          placeholder="e.g. +91 98450 88991"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-50">
                      <button
                        type="button"
                        onClick={() => setIsAddingCaregiver(false)}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingCaregiver || !caregiverName.trim()}
                        className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{isSavingCaregiver ? "Saving & Generating..." : "Save & Generate Invitation Code"}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* State C: Caregiver is Linked & Invitation Code is Ready */}
                {(selectedPatientForDetail.caregiverInfo || generatedCaregiverCode) && !isAddingCaregiver && (
                  <div className="p-4 rounded-2xl bg-white border border-purple-200 space-y-3 shadow-xs">
                    {/* Caregiver Profile Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-extrabold text-sm flex items-center justify-center shrink-0">
                          {(selectedPatientForDetail.caregiverInfo?.name || caregiverName || "C").charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-extrabold text-slate-900 text-sm">
                              {selectedPatientForDetail.caregiverInfo?.name || caregiverName}
                            </h5>
                            <span className="text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                              {selectedPatientForDetail.caregiverInfo?.relationship || caregiverRelation}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-500">
                            {(selectedPatientForDetail.caregiverInfo?.phone || caregiverPhone) && (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{selectedPatientForDetail.caregiverInfo?.phone || caregiverPhone}</span>
                              </span>
                            )}
                            {(selectedPatientForDetail.caregiverInfo?.secondaryPhone || caregiverSecondaryPhone) && (
                              <span className="font-mono text-purple-800">
                                • 2nd Contact: {selectedPatientForDetail.caregiverInfo?.secondaryPhone || caregiverSecondaryPhone}
                              </span>
                            )}
                            {(selectedPatientForDetail.caregiverInfo?.email || caregiverEmail) && (
                              <span className="text-slate-600">
                                • {selectedPatientForDetail.caregiverInfo?.email || caregiverEmail}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Connected to Patient Record</span>
                        </span>
                      </div>
                    </div>

                    {/* Invitation Code Box with Copy & Launch */}
                    <div className="p-3.5 rounded-2xl bg-purple-50/90 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 block">
                          Caregiver Invitation Code
                        </span>
                        <div className="flex items-center gap-2.5 mt-1">
                          <span className="font-mono text-2xl font-black text-purple-950 tracking-wider">
                            {selectedPatientForDetail.caregiverInfo?.code || generatedCaregiverCode}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyCaregiverCode(
                                selectedPatientForDetail.caregiverInfo?.code || generatedCaregiverCode || "CG-8492"
                              )
                            }
                            className="px-3 py-1.5 rounded-xl bg-white border border-purple-300 text-purple-800 hover:bg-purple-100 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            title="Copy code"
                          >
                            {copiedCaregiverCode ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                                <span className="text-emerald-700 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-purple-700 mt-1">
                          Enter this code on the Caregiver Login screen to connect directly to {selectedPatientForDetail.fullName}'s dashboard.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* 2. PRESCRIBED MEDICATIONS & ADD MEDICINE SECTION */}
              {/* USER: "Whenever the medicine is added, it should update in caregiver." */}
              {/* ======================================================== */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-teal-700" />
                      <span>Prescribed Medications ({selectedPatientForDetail.carePlan?.medications?.length || 0})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Prescription schedule synchronized in real-time with Patient and Caregiver dashboards.
                    </p>
                  </div>

                  {!isAddingMedicine && (
                    <button
                      type="button"
                      onClick={() => setIsAddingMedicine(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0c5a4d] hover:bg-[#09473d] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Medicine</span>
                    </button>
                  )}
                </div>

                {/* Inline Add Medicine Form */}
                {isAddingMedicine && (
                  <form
                    onSubmit={handleAddMedicine}
                    className="p-4 rounded-2xl bg-white border border-teal-200 space-y-3 shadow-xs animate-in fade-in"
                  >
                    <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                      <span className="font-bold text-teal-900 text-xs flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-teal-700" />
                        <span>Add New Prescription to Care Plan</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Medicine Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newMedName}
                          onChange={(e) => setNewMedName(e.target.value)}
                          placeholder="e.g. Metoprolol 25 mg"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Dosage (Optional)
                        </label>
                        <input
                          type="text"
                          value={newMedDosage}
                          onChange={(e) => setNewMedDosage(e.target.value)}
                          placeholder="e.g. 25 mg"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Scheduled Dose Time *
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setNewMedTime(getLocalTimePlusMinutes(1))}
                              className="text-[10px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                              title="Set to Current Time + 1 Minute for exact minute notification testing"
                            >
                              🕒 Now (+1m)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewMedTime(getLocalTimePlusMinutes(2))}
                              className="text-[10px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                              title="Set to Current Time + 2 Minutes for reminder testing"
                            >
                              🕒 Now (+2m)
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            value={newMedTime}
                            onChange={(e) => setNewMedTime(e.target.value)}
                            placeholder="e.g. 9:26 PM or 09:26 or 21:26"
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const clean = newMedTime.toUpperCase();
                              if (clean.includes("AM")) {
                                setNewMedTime(clean.replace("AM", "PM").trim());
                              } else if (clean.includes("PM")) {
                                setNewMedTime(clean.replace("PM", "AM").trim());
                              } else {
                                setNewMedTime(`${newMedTime.trim()} PM`);
                              }
                            }}
                            className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors cursor-pointer shrink-0"
                            title="Toggle AM / PM"
                          >
                            {newMedTime.toUpperCase().includes("PM") ? "🌙 PM" : "☀️ AM"}
                          </button>
                        </div>
                        <p className="text-[10px] text-teal-700 font-semibold mt-1">
                          ⏰ Will notify patient at: <strong className="font-mono text-teal-900">{formatTimeToAmPm(newMedTime)}</strong>
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {["8:00 AM", "1:00 PM", "6:00 PM", "8:00 PM", "10:00 PM"].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setNewMedTime(t)}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                newMedTime === t
                                  ? "bg-teal-700 text-white border-teal-700"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Instructions
                        </label>
                        <input
                          type="text"
                          value={newMedInstructions}
                          onChange={(e) => setNewMedInstructions(e.target.value)}
                          placeholder="e.g. 1 tablet after food"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-teal-50">
                      <button
                        type="button"
                        onClick={() => setIsAddingMedicine(false)}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingMedicine || !newMedName.trim()}
                        className="px-4 py-2 rounded-xl bg-[#0c5a4d] hover:bg-[#09473d] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Pill className="w-3.5 h-3.5" />
                        <span>{isSavingMedicine ? "Saving..." : "Save Medicine to Care Plan"}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Medication List */}
                <div className="space-y-2">
                  {selectedPatientForDetail.carePlan?.medications?.length === 0 ? (
                    <p className="text-slate-400 py-3 text-center text-xs">
                      No medications prescribed yet. Click "Add Medicine" above to prescribe.
                    </p>
                  ) : (
                    selectedPatientForDetail.carePlan.medications.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-2xl bg-white border border-slate-200 text-xs flex justify-between items-center shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-xs">{m.name}</span>
                            <p className="text-[11px] text-slate-500">{m.instructions}</p>
                            {m.dosage && (
                              <span className="text-[10px] text-slate-400">Dose: {m.dosage}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 font-bold text-[11px]">
                            {m.time}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ======================================================== */}
              {/* 3. REPORTED SYMPTOMS & CLINICAL ALERTS */}
              {/* USER: "Whenever the symptoms are updated, it should be updated in caregiver. Whenever the symptoms are updated, it just shown in the doctor." */}
              {/* ======================================================== */}
              <div className="p-4 rounded-3xl bg-white border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-600" />
                    <span>Recent Reported Symptoms from Patient</span>
                  </h4>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    Live Symptom Sync
                  </span>
                </div>

                {selectedPatientForDetail.recentAlerts?.filter((a) => a.type === "symptom").length === 0 ? (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center text-slate-500 text-xs">
                    No discomfort symptoms reported by this patient yet. Patient reports will appear here instantly.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedPatientForDetail.recentAlerts
                      ?.filter((a) => a.type === "symptom")
                      .map((alert) => (
                        <div
                          key={alert.id}
                          className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-rose-950">{alert.title}</p>
                              <p className="text-rose-800 text-[11px] mt-0.5 font-medium">{alert.description}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-rose-700 bg-white/80 px-2 py-0.5 rounded border border-rose-200 shrink-0">
                            {alert.time}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* 4. Dietary & Recovery Advice */}
              {selectedPatientForDetail.carePlan?.diet && selectedPatientForDetail.carePlan.diet.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950">
                  <p className="font-bold mb-1 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-amber-700" />
                    <span>Dietary & Recovery Directives:</span>
                  </p>
                  <ul className="space-y-0.5 text-[11px] text-amber-900 pl-4 list-disc">
                    {selectedPatientForDetail.carePlan.diet.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 5. Follow-up Consultation */}
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-100 text-xs text-teal-900 flex items-center justify-between">
                <div>
                  <p className="font-bold">Next Follow-up Consultation</p>
                  <p className="text-[11px] text-teal-800 mt-0.5">
                    Scheduled on {selectedPatientForDetail.carePlan?.followUpDate || "7 days post-discharge"} at{" "}
                    {selectedPatientForDetail.carePlan?.followUpTime || "10:00 AM"}
                  </p>
                </div>
                <Calendar className="w-5 h-5 text-teal-700" />
              </div>

              {/* 6. Remove Patient Action (Point 2) */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-rose-950 text-xs flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Remove Patient</span>
                  </span>
                  <p className="text-[11px] text-rose-800 mt-0.5">
                    Permanently remove {selectedPatientForDetail.fullName}'s clinical profile and care plan from the hospital database.
                  </p>
                </div>

                {deleteConfirmId === selectedPatientForDetail.id ? (
                  <div className="flex items-center gap-2 shrink-0 animate-in fade-in">
                    <span className="text-[11px] font-bold text-rose-800">Confirm permanent removal?</span>
                    <button
                      type="button"
                      disabled={isDeletingPatient}
                      onClick={() => executeDeletePatient(selectedPatientForDetail.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isDeletingPatient ? "Removing..." : "Yes, Remove"}
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingPatient}
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-xs cursor-pointer hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(selectedPatientForDetail.id)}
                    className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Patient</span>
                  </button>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedPatientForDetail(null);
                  setIsAddingCaregiver(false);
                  setIsAddingMedicine(false);
                  setDeleteConfirmId(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Patient & AI Care Plan Modal */}
      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onPatientSaved={(newPatient) => {
          onAddPatient(newPatient);
        }}
        onOpenPatientProfile={(patient) => {
          setIsAddModalOpen(false);
          handleOpenPatientProfile(patient);
        }}
        doctorName={doctorDisplayName}
        doctorSpecialty={doctorSpecialty}
        doctorEmail={currentUser?.emailOrMobile}
        onSwitchToPatientView={(code) => {
          setIsAddModalOpen(false);
          onSwitchToPatientView(code);
        }}
      />
    </div>
  );
};
