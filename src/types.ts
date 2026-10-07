export type UserRole = "healthcare" | "patient" | "caregiver";

export interface User {
  id: string;
  fullName: string;
  role: UserRole;
  emailOrMobile: string;
  specialty?: string;
  patientCode?: string;
  caregiverCode?: string;
  relationship?: string;
  secondaryPhone?: string;
  email?: string;
  createdAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage?: string;
  instructions: string;
  time: string;
  status?: "taken" | "pending" | "missed";
  color?: "blue" | "red" | "purple" | "teal" | "green" | "amber";
}

export interface Reminder {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  type?: "medication" | "followup" | "vitals" | "activity";
  active?: boolean;
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "symptom" | "medication" | "system" | "missed" | "vitals" | "info";
  severity?: "low" | "medium" | "high";
  patientId?: string;
  patientName?: string;
  patientCode?: string;
}

export interface CarePlan {
  summary: string;
  diagnosis?: string;
  medications: Medication[];
  diet: string[];
  activity: string[];
  symptomsToWatch: string[];
  reminders?: Reminder[];
  followUpDate?: string;
  followUpTime?: string;
  verificationReport?: VerificationReport;
}

export interface VerificationReport {
  extractedDoctor: string;
  extractedHospital: string;
  extractedCondition: string;
  extractionConfidence: number;
  ocrCharactersProcessed: number;
}

export interface CaregiverInfo {
  name: string;
  relationship: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  code: string;
}

export interface Patient {
  id: string;
  fullName: string;
  age?: number | string;
  gender?: string;
  condition: string;
  invitationCode: string;
  status: "Stable" | "Moderate" | "High Risk";
  doctorName?: string;
  doctorSpecialty?: string;
  doctorEmail?: string;
  caregiverName?: string;
  caregiverPhone?: string;
  caregiverRelationship?: string;
  caregiverInfo?: CaregiverInfo;
  carePlan: CarePlan;
  recentAlerts?: AlertItem[];
  createdAt: string;
}
