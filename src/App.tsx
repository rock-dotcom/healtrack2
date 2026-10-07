import React, { useState, useEffect } from "react";
import { User, Patient, UserRole } from "./types";
import { SplashView } from "./components/SplashView";
import { AuthView } from "./components/AuthView";
import { DoctorDashboard } from "./components/DoctorDashboard";
import { PatientDashboard } from "./components/PatientDashboard";
import { CaregiverDashboard } from "./components/CaregiverDashboard";
import {
  Stethoscope,
  User as UserIcon,
  HeartHandshake,
  RotateCcw,
} from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState<
    "splash" | "auth" | "doctor" | "patient" | "caregiver"
  >("auth");

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [initialAuthRole, setInitialAuthRole] = useState<UserRole>("healthcare");
  const [initialAuthCode, setInitialAuthCode] = useState<string>("");

  // Check URL path or query parameters on initial load and route changes
  useEffect(() => {
    const handleLocationRouting = () => {
      const params = new URLSearchParams(window.location.search);
      const roleParam = (params.get("role") || params.get("portal") || "").toLowerCase();
      const codeParam = params.get("code") || params.get("invite");

      if (roleParam === "doctor" || roleParam === "healthcare") {
        setInitialAuthRole("healthcare");
      } else if (roleParam === "patient") {
        setInitialAuthRole("patient");
      } else if (roleParam === "caregiver") {
        setInitialAuthRole("caregiver");
      }

      if (codeParam) {
        setInitialAuthCode(codeParam);
      }

      // Point 4: Always require authentication on initial page load / opening the link
      setCurrentView("auth");
    };

    handleLocationRouting();
    window.addEventListener("popstate", handleLocationRouting);

    return () => {
      window.removeEventListener("popstate", handleLocationRouting);
    };
  }, []);

  // Periodic sync only when a healthcare professional is logged in
  useEffect(() => {
    if (currentUser && currentUser.role === "healthcare" && currentUser.emailOrMobile) {
      fetchPatients(currentUser);
      const interval = setInterval(() => {
        fetchPatients(currentUser);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [currentUser?.emailOrMobile]);

  const fetchPatients = async (activeUser?: User | null) => {
    try {
      const user = activeUser !== undefined ? activeUser : currentUser;
      if (!user || user.role !== "healthcare" || !user.emailOrMobile) {
        return;
      }
      const url = `/api/patients?doctorEmail=${encodeURIComponent(user.emailOrMobile.toLowerCase())}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.patients)) {
        setPatients(data.patients);
        setActivePatient((prev) => {
          if (!prev && data.patients.length > 0) return data.patients[0];
          if (prev) {
            const matched = data.patients.find((p: Patient) => p.id === prev.id || p.invitationCode === prev.invitationCode);
            if (matched) return matched;
          }
          return data.patients.length > 0 ? data.patients[0] : null;
        });
      }
    } catch (err) {
      console.error("Failed to load patients from server:", err);
    }
  };

  // Called when user logs in or creates account
  const handleLoginSuccess = (user: User, associatedPatient?: Patient) => {
    setCurrentUser(user);

    if (user.role === "healthcare") {
      fetchPatients(user);
      setCurrentView("doctor");
    } else if (user.role === "patient") {
      setActivePatient(associatedPatient || null);
      setCurrentView("patient");
    } else if (user.role === "caregiver") {
      setActivePatient(associatedPatient || null);
      setCurrentView("caregiver");
    }
  };

  // Called when healthcare professional adds a patient after prescription OCR/NLP
  const handleAddPatient = (newPatient: Patient) => {
    setPatients((prev) => [newPatient, ...prev]);
    setActivePatient(newPatient);
  };

  // Called when patient updates profile or links caregiver
  const handleUpdatePatient = (updatedPatient: Patient) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p))
    );
    if (activePatient?.id === updatedPatient.id || !activePatient) {
      setActivePatient(updatedPatient);
    }
  };

  // Called when doctor deletes / discharges a patient
  const handleDeletePatient = (patientId: string) => {
    setPatients((prev) =>
      prev.filter((p) => p.id !== patientId && p.invitationCode !== patientId)
    );
    if (activePatient?.id === patientId || activePatient?.invitationCode === patientId) {
      setActivePatient(null);
    }
  };

  // Called when patient or caregiver updates medication status
  const handleUpdateMedicationStatus = async (
    patientId: string,
    medId: string,
    status: "taken" | "pending" | "missed"
  ) => {
    // Optimistic UI update
    const missedAlert =
      status === "missed"
        ? {
            id: `alert-${Date.now()}`,
            patientId,
            patientName: activePatient?.fullName || "Patient",
            type: "missed" as const,
            title: "Medicine missed",
            description: `Scheduled medication marked as missed`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            severity: "high" as const,
          }
        : null;

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        const updatedMedications = p.carePlan.medications.map((m) =>
          m.id === medId ? { ...m, status } : m
        );
        const updatedAlerts = missedAlert
          ? [missedAlert, ...(p.recentAlerts || [])]
          : p.recentAlerts || [];

        return {
          ...p,
          carePlan: {
            ...p.carePlan,
            medications: updatedMedications,
          },
          recentAlerts: updatedAlerts,
        };
      })
    );

    if (activePatient && activePatient.id === patientId) {
      setActivePatient((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          carePlan: {
            ...prev.carePlan,
            medications: prev.carePlan.medications.map((m) =>
              m.id === medId ? { ...m, status } : m
            ),
          },
          recentAlerts: missedAlert
            ? [missedAlert, ...(prev.recentAlerts || [])]
            : prev.recentAlerts || [],
        };
      });
    }

    try {
      await fetch(`/api/patients/${patientId}/medications/${medId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error("Failed to sync medication status with server:", err);
    }
  };

  // Report symptom from patient view -> notifies caregiver and doctor
  const handleReportSymptom = async (
    patientId: string,
    symptom: string,
    notes?: string
  ) => {
    // 1. Optimistic local update so alerts show up immediately on all screens
    const symptomAlert = {
      id: `alert-${Date.now()}`,
      patientId,
      patientName: activePatient?.fullName || "Patient",
      type: "symptom" as const,
      title: "Symptom reported",
      description: symptom + (notes ? ` - ${notes}` : ""),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      severity: "medium" as const,
    };

    setPatients((prev) => {
      const exists = prev.some((p) => p.id === patientId || p.invitationCode === patientId);
      if (exists) {
        return prev.map((p) =>
          p.id === patientId || p.invitationCode === patientId
            ? { ...p, recentAlerts: [symptomAlert, ...(p.recentAlerts || [])] }
            : p
        );
      } else if (activePatient) {
        const newEntry = {
          ...activePatient,
          id: patientId,
          recentAlerts: [symptomAlert, ...(activePatient.recentAlerts || [])],
        };
        return [newEntry, ...prev];
      }
      return prev;
    });

    if (activePatient) {
      setActivePatient((prev) =>
        prev
          ? { ...prev, recentAlerts: [symptomAlert, ...(prev.recentAlerts || [])] }
          : null
      );
    }

    // 2. Sync with backend
    try {
      const res = await fetch(`/api/patients/${patientId}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Symptom reported",
          description: symptom + (notes ? ` - ${notes}` : ""),
          type: "symptom",
          severity: "medium",
        }),
      });
      const data = await res.json();
      if (data.success && data.patient) {
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId || p.invitationCode === data.patient.invitationCode ? data.patient : p))
        );
        if (activePatient?.id === patientId || activePatient?.invitationCode === data.patient.invitationCode) {
          setActivePatient(data.patient);
        }
      }
    } catch (err) {
      console.error("Failed to report symptom to server:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("healtrack_user");
    localStorage.removeItem("healtrack_active_patient");
    localStorage.removeItem("healtrack_caregiver_profile");
    localStorage.removeItem("healtrack_last_caregiver_code");
    localStorage.removeItem("healtrack_read_alerts");
    setCurrentUser(null);
    setPatients([]);
    setActivePatient(null);
    setInitialAuthRole("healthcare");
    setInitialAuthCode("");
    setCurrentView("auth");
  };

  // Quick switch from Doctor Dashboard to Patient view with specific invitation code
  const handleSwitchToPatientView = (invitationCode: string) => {
    setInitialAuthRole("patient");
    setInitialAuthCode(invitationCode);
    setCurrentView("auth");
  };

  // Quick switch from Doctor Dashboard to Caregiver view with specific invitation code
  const handleSwitchToCaregiverView = (caregiverCode: string) => {
    setInitialAuthRole("caregiver");
    setInitialAuthCode(caregiverCode);
    setCurrentView("auth");
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* AUTHENTICATION VIEW: When not logged in or in auth view */}
      {(!currentUser || currentView === "auth") && (
        <AuthView
          initialRole={initialAuthRole}
          initialCode={initialAuthCode}
          onLoginSuccess={handleLoginSuccess}
          onBackToSplash={() => setCurrentView("splash")}
        />
      )}

      {/* SPLASH VIEW: Only when explicitly requested and not logged in */}
      {!currentUser && currentView === "splash" && (
        <SplashView
          onGetStarted={() => {
            setInitialAuthRole("healthcare");
            setCurrentView("auth");
          }}
        />
      )}

      {/* 3. HEALTHCARE PROFESSIONAL / DOCTOR DASHBOARD */}
      {currentUser && currentUser.role === "healthcare" && currentView === "doctor" && (
        <DoctorDashboard
          currentUser={currentUser}
          patients={patients}
          onAddPatient={handleAddPatient}
          onUpdatePatient={handleUpdatePatient}
          onDeletePatient={handleDeletePatient}
          onLogout={handleLogout}
          onSwitchToPatientView={handleSwitchToPatientView}
          onSwitchToCaregiverView={handleSwitchToCaregiverView}
        />
      )}

      {/* 4. PATIENT DASHBOARD */}
      {currentUser && currentUser.role === "patient" && currentView === "patient" && activePatient && (
        <PatientDashboard
          currentUser={currentUser}
          patient={activePatient}
          onUpdateMedicationStatus={handleUpdateMedicationStatus}
          onReportSymptom={handleReportSymptom}
          onLogout={handleLogout}
          onSwitchToHealthcare={() => {
            handleLogout();
            setInitialAuthRole("healthcare");
          }}
          onUpdatePatient={handleUpdatePatient}
        />
      )}

      {/* 5. CAREGIVER DASHBOARD */}
      {currentUser && currentUser.role === "caregiver" && currentView === "caregiver" && (
        <CaregiverDashboard
          currentUser={currentUser}
          patients={
            activePatient
              ? [activePatient]
              : []
          }
          onLogout={handleLogout}
          onSelectPatient={(p) => {
            setActivePatient(p);
            setCurrentView("patient");
          }}
          onSwitchToHealthcare={() => {
            handleLogout();
            setInitialAuthRole("healthcare");
          }}
        />
      )}
    </div>
  );
}
