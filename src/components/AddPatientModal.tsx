import React, { useState, useRef, useEffect } from "react";
import { Patient, CarePlan, VerificationReport } from "../types";
import {
  PRESET_PRESCRIPTIONS,
  PresetPrescription,
  generatePrescriptionDataUrl,
} from "./SamplePrescriptions";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  Pill,
  Clock,
  ShieldCheck,
  RefreshCw,
  Eye,
  FileCheck2,
  Calendar,
  User,
  HeartPulse,
  FileText,
  Cpu,
  Layers,
  Activity,
  Binary,
  ArrowRight,
  HeartHandshake,
} from "lucide-react";

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientSaved: (patient: Patient) => void;
  onOpenPatientProfile?: (patient: Patient) => void;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorEmail?: string;
  onSwitchToPatientView?: (code: string) => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  onClose,
  onPatientSaved,
  onOpenPatientProfile,
  doctorName = "Dr. Sharma",
  doctorSpecialty = "Consultant Physician",
  doctorEmail,
  onSwitchToPatientView,
}) => {
  const [step, setStep] = useState<"upload" | "details" | "success">("upload");
  const [prescriptionImage, setPrescriptionImage] = useState<string>("");
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isPdfDocument, setIsPdfDocument] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetPrescription | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");

  // Extracted Patient fields (auto-populated with zero typing required)
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState<"Stable" | "Moderate" | "High Risk">("Stable");
  const [extractedDoctor, setExtractedDoctor] = useState("");

  // Extracted Care Plan state & Verification Report
  const [generatedCarePlan, setGeneratedCarePlan] = useState<CarePlan | null>(null);
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);

  // Created patient after save
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulate progress across stages when isProcessing is true
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isProcessing) {
      setProcessingStage(1);
      timer = setInterval(() => {
        setProcessingStage((prev) => (prev < 5 ? prev + 1 : prev));
      }, 450);
    } else {
      setProcessingStage(1);
    }
    return () => clearInterval(timer);
  }, [isProcessing]);

  if (!isOpen) return null;

  // Handle user uploading their own prescription photo or discharge summary (Image or PDF)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isText = file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt");

    if (!isImage && !isPdf && !isText) {
      setErrorMsg("Please upload a medical document image (JPEG, PNG, WebP) or PDF discharge summary.");
      return;
    }

    setUploadedFileName(file.name);
    setIsPdfDocument(isPdf);
    setImageMimeType(isPdf ? "application/pdf" : file.type || "image/jpeg");
    setSelectedPreset(null);
    setErrorMsg("");

    const reader = new FileReader();
    reader.onload = (event) => {
      setPrescriptionImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Select one of the authentic prescription samples
  const handleSelectPreset = (preset: PresetPrescription) => {
    setSelectedPreset(preset);
    setUploadedFileName(preset.label);
    setIsPdfDocument(false);
    setErrorMsg("");
    const imgUrl = generatePrescriptionDataUrl(preset);
    setPrescriptionImage(imgUrl);
    setImageMimeType("image/jpeg");
  };

  // Run backend OCR & Clinical NLP Entity Extraction
  const handleProcessPrescription = async () => {
    if (!prescriptionImage) {
      setErrorMsg("Please upload or select a doctor prescription or discharge summary first.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg("");

    try {
      const payload: any = {
        imageBase64: prescriptionImage,
        mimeType: imageMimeType,
        fileName: uploadedFileName,
      };

      if (selectedPreset) {
        payload.presetData = selectedPreset;
      }

      const res = await fetch("/api/prescription/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Document verification failed.");
      }

      // Auto-fill all patient details extracted by AI from the discharge summary (no manual typing needed)
      if (data.extractedPatient) {
        setFullName(data.extractedPatient.fullName || "");
        setAge(String(data.extractedPatient.age || ""));
        setGender(data.extractedPatient.gender || "Male");
        setCondition(data.extractedPatient.condition || "");
        setExtractedDoctor(data.extractedPatient.doctorName || doctorName);
        if (data.extractedPatient.phone) setPhone(data.extractedPatient.phone);
        if (data.extractedPatient.email) setEmail(data.extractedPatient.email);
        if (data.extractedPatient.status) setStatus(data.extractedPatient.status);
      }

      setGeneratedCarePlan(data.carePlan);
      setVerificationReport(data.verificationReport || data.carePlan?.verificationReport || null);
      setStep("details");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process document.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Save the patient and generate the invitation code / link
  const handleSavePatient = async () => {
    if (!fullName.trim()) {
      setErrorMsg("Patient Full Name could not be empty. Please verify document.");
      return;
    }
    if (!condition.trim()) {
      setErrorMsg("Clinical Condition could not be empty.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          age: age || "45",
          gender,
          phone: phone.trim() || "+91 98450 22334",
          email: email.trim(),
          condition: condition.trim(),
          status,
          doctorName: doctorName || extractedDoctor || "Doctor",
          doctorSpecialty,
          doctorEmail,
          carePlan: generatedCarePlan,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save patient.");
      }

      setCreatedPatient(data.patient);
      onPatientSaved(data.patient);
      setStep("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save patient.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy helpers
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = (code: string) => {
    const fullLink = `${window.location.origin}/?role=patient&code=${code}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              Rx
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                {step === "upload" && "Upload Doctor Prescription or Discharge Summary"}
                {step === "details" && "Auto-Extracted Patient Profile & Care Plan"}
                {step === "success" && "Patient Onboarded Successfully!"}
                {step === "details" && (
                  <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    OCR & NLP Matched
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                {step === "upload" && "Multimodal Neural OCR & Clinical NLP automatically extracts patient details, medications, timings & care plan."}
                {step === "details" && "Auto-filled directly from the uploaded document — please verify before saving."}
                {step === "success" && "Share access code or direct portal link with patient or caregiver."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-semibold">Processing Notice</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* STEP 1: UPLOAD & PROCESS PRESCRIPTION */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Primary Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                  prescriptionImage
                    ? "border-teal-500 bg-teal-50/30"
                    : "border-slate-300 hover:border-teal-600 bg-slate-50/50 hover:bg-teal-50/15"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp,image/jpg,application/pdf,.pdf,.txt"
                  className="hidden"
                />

                {prescriptionImage ? (
                  <div className="w-full flex flex-col items-center">
                    {isPdfDocument ? (
                      <div className="w-full max-w-sm p-6 rounded-2xl border border-slate-200 shadow-sm mb-3 bg-white flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-2">
                          <FileText className="w-7 h-7" />
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate max-w-xs">
                          {uploadedFileName || "Discharge_Summary.pdf"}
                        </p>
                        <span className="text-[11px] text-slate-500 mt-0.5">
                          PDF Document loaded for Clinical OCR & NLP
                        </span>
                      </div>
                    ) : (
                      <div className="relative w-full max-w-sm max-h-56 rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-3 bg-white">
                        <img
                          src={prescriptionImage}
                          alt="Prescription or discharge summary preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowImagePreview(true);
                          }}
                          className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-medium flex items-center gap-1 backdrop-blur-xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Full Image
                        </button>
                      </div>
                    )}

                    <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-700" />
                      Document Ready for OCR & Clinical NLP Feature Extraction
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      Click to replace with another photo, scan, or PDF
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-teal-100/80 text-teal-800 flex items-center justify-center mb-3">
                      <Upload className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      Upload Discharge Summary, Doctor Prescription, or Clinical Report
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                      Upload any hospital discharge summary, prescription photo, or treatment sheet. Patient name, age, clinical diagnosis, all medications with timings, and dietary advice are automatically recognized and filled.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-[11px] font-medium text-slate-600 border border-slate-200">
                        Supports PDF, JPEG, PNG, WebP
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Verified Presets Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                    Or Quick-Select Verified Clinical Document Presets:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Preloaded Inpatient Discharge & Cardiology Reports
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESET_PRESCRIPTIONS.map((preset) => {
                    const isSelected = selectedPreset?.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-teal-600 bg-teal-50/70 shadow-sm ring-2 ring-teal-600/20"
                            : "border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                              {preset.patientName} ({preset.age}Y, {preset.gender})
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-teal-800 font-medium mt-0.5">
                            {preset.conditionDescription}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                            {preset.medicines.map((m) => m.name).join(", ")}
                          </p>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center justify-between">
                          <span>{preset.doctorName}</span>
                          <span className="text-teal-700 font-semibold">{preset.hospitalName}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Processing Pipeline Animated Card */}
              {isProcessing && (
                <div className="p-4 rounded-2xl bg-teal-900 text-white shadow-lg space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-teal-300 animate-spin" />
                      Clinical OCR & NLP Pipeline Executing...
                    </span>
                    <span className="text-xs font-mono font-bold text-teal-200">
                      Step {processingStage} of 5
                    </span>
                  </div>

                  <div className="w-full bg-teal-950/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-300 ease-out"
                      style={{ width: `${(processingStage / 5) * 100}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className={`p-2 rounded-xl flex items-center gap-2 ${processingStage >= 1 ? "bg-teal-800/80 text-white" : "text-teal-400 opacity-50"}`}>
                      <Binary className="w-3.5 h-3.5 shrink-0" />
                      <span>1. Image Optical Ingestion</span>
                    </div>
                    <div className={`p-2 rounded-xl flex items-center gap-2 ${processingStage >= 2 ? "bg-teal-800/80 text-white" : "text-teal-400 opacity-50"}`}>
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>2. High-Resolution OCR</span>
                    </div>
                    <div className={`p-2 rounded-xl flex items-center gap-2 ${processingStage >= 3 ? "bg-teal-800/80 text-white" : "text-teal-400 opacity-50"}`}>
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      <span>3. Clinical NER (Drugs & Diagnosis)</span>
                    </div>
                    <div className={`p-2 rounded-xl flex items-center gap-2 ${processingStage >= 4 ? "bg-teal-800/80 text-white" : "text-teal-400 opacity-50"}`}>
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>4. Posology Chronotherapy Reasoning</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Architecture Info */}
              {!isProcessing && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800 block mb-0.5">
                      Academic & Clinical AI Verification Guarantee
                    </span>
                    The AI engine automatically segments prescription text, recognizes clinical entities (Rx, dosages, frequencies like BD/OD/TDS), and compiles an automated adherence schedule. Zero manual typing required.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!prescriptionImage || isProcessing}
                  onClick={handleProcessPrescription}
                  className="px-6 py-2.5 rounded-xl bg-[#0c5a4d] hover:bg-[#09473d] text-white text-sm font-semibold transition-all shadow-md shadow-teal-900/15 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Extracting OCR & Clinical Features...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4" />
                      <span>Scan & Auto-Fill Care Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: AUTO-EXTRACTED PATIENT PROFILE & MEDICATIONS */}
          {step === "details" && generatedCarePlan && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Highlight Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold text-emerald-900 block">
                    Discharge Document Matched & Features Extracted Successfully
                  </span>
                  <p className="text-emerald-800 mt-0.5">
                    Patient demographics, clinical condition, {generatedCarePlan.medications.length} prescribed medications with schedule times, dietary rules, and recovery instructions were automatically populated by the AI.
                  </p>
                </div>
              </div>

              {/* Split View: Document Preview + Extracted Form */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                {/* Document Thumbnail with zoom */}
                <div className="lg:col-span-1 bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col items-center">
                  <div className="w-full text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Source Document</span>
                    {!isPdfDocument && (
                      <button
                        type="button"
                        onClick={() => setShowImagePreview(true)}
                        className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Zoom
                      </button>
                    )}
                  </div>

                  {isPdfDocument ? (
                    <div className="w-full py-8 px-4 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center text-center">
                      <FileText className="w-10 h-10 text-rose-600 mb-2" />
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
                        {uploadedFileName || "Discharge_Summary.pdf"}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1">
                        PDF Optical Extraction
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => setShowImagePreview(true)}
                      className="w-full max-h-48 rounded-xl overflow-hidden border border-slate-200 shadow-xs cursor-pointer hover:opacity-90 transition-opacity bg-white"
                    >
                      <img
                        src={prescriptionImage}
                        alt="Uploaded Document"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 mt-2 text-center font-medium">
                    Verified Medical Document
                  </p>
                </div>

                {/* Auto-filled Patient Information */}
                <div className="lg:col-span-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-700" />
                      Auto-Filled Patient Information
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      Zero Typing Required
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Patient Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Condition / Indication
                      </label>
                      <input
                        type="text"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Age & Gender
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="Age"
                          className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 shadow-xs"
                        />
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 shadow-xs"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Risk Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 shadow-xs"
                      >
                        <option value="Stable">Stable</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High Risk">High Risk</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98450 22334"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="patient@example.com"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Prescribed Medications List */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-teal-700" />
                    Prescribed Medications Extracted from Document ({generatedCarePlan.medications.length})
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Automatic Schedule Reminders Formulated
                  </span>
                </div>

                <div className="space-y-2">
                  {generatedCarePlan.medications.map((med, idx) => (
                    <div
                      key={med.id || idx}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            med.color === "red"
                              ? "bg-rose-100 text-rose-700"
                              : med.color === "blue"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {med.name}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {med.instructions}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 flex items-center gap-1 shadow-2xs">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {med.time}
                        </span>
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded-md border border-teal-200">
                          Auto Reminder
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diet & Activity Advice Extracted */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                  <h4 className="text-xs font-bold text-amber-950 mb-1.5 flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-amber-700" />
                    Dietary Directives
                  </h4>
                  <ul className="text-[11px] text-amber-900 space-y-1">
                    {generatedCarePlan.diet.slice(0, 3).map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80">
                  <h4 className="text-xs font-bold text-blue-950 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    Rehabilitation & Follow-Up
                  </h4>
                  <p className="text-[11px] text-blue-900 mb-1">
                    • OPD Review: {generatedCarePlan.followUpDate} at {generatedCarePlan.followUpTime}
                  </p>
                  <ul className="text-[11px] text-blue-900 space-y-1">
                    {generatedCarePlan.activity.slice(0, 2).map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ← Choose Different Document
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSavePatient}
                    className="px-6 py-2.5 rounded-xl bg-[#0c5a4d] hover:bg-[#09473d] text-white text-sm font-semibold transition-all shadow-md shadow-teal-900/15 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Patient...</span>
                      </>
                    ) : (
                      <span>Save Patient & Generate Invite</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS & INVITATION CODE GENERATED */}
          {step === "success" && createdPatient && (
            <div className="text-center py-4 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {createdPatient.fullName} Successfully Added!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Discharge summary care plan, schedules, and alerts are active in the system.
                </p>
              </div>

              {/* Code Box */}
              <div className="max-w-md mx-auto p-5 rounded-2xl bg-teal-50 border border-teal-200">
                <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider mb-2">
                  Patient Dashboard Access Code
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-3xl font-black tracking-widest text-[#0c5a4d]">
                    {createdPatient.invitationCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(createdPatient.invitationCode)}
                    className="p-2 rounded-xl bg-white border border-teal-200 text-teal-800 hover:bg-teal-100 transition-colors shadow-2xs cursor-pointer"
                    title="Copy Code"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copiedCode && (
                  <p className="text-[11px] text-teal-700 font-semibold mt-2 animate-in fade-in">
                    ✓ Code copied to clipboard!
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-3">
                  The patient or caregiver can enter this code during Login to access their customized medication tracker.
                </p>
              </div>

              {/* Direct Access Link */}
              <div className="max-w-md mx-auto flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-600 truncate mr-2">
                  Direct Link: {window.location.origin}/?role=patient&code={createdPatient.invitationCode}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyLink(createdPatient.invitationCode)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedLink ? "Copied" : "Copy Link"}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
                {onOpenPatientProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPatientProfile(createdPatient);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold transition-all shadow-md shadow-purple-900/15 cursor-pointer flex items-center gap-2"
                  >
                    <HeartHandshake className="w-4 h-4" />
                    <span>Open Profile & Add Caregiver Access</span>
                  </button>
                )}
                {onSwitchToPatientView && (
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchToPatientView(createdPatient.invitationCode);
                      onClose();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#0c5a4d] hover:bg-[#09473d] text-white text-sm font-semibold transition-all shadow-md shadow-teal-900/15 cursor-pointer flex items-center gap-2"
                  >
                    <span>Go to Patient & Caregiver Dashboard</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Image Preview Modal */}
      {showImagePreview && prescriptionImage && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl overflow-hidden">
            <button
              onClick={() => setShowImagePreview(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 hover:bg-black text-white cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={prescriptionImage}
              alt="Prescription Full View"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

