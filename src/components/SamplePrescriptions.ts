export interface PresetPrescription {
  id: string;
  label: string;
  patientName: string;
  age: number;
  gender: string;
  conditionDescription: string;
  doctorName: string;
  doctorSpecialty: string;
  hospitalName: string;
  medicines: {
    name: string;
    dosage: string;
    instructions: string;
    time: string;
    color?: "blue" | "red" | "purple";
  }[];
  diet: string[];
  activity: string[];
  symptomsToWatch: string[];
  summary: string;
}

export const PRESET_PRESCRIPTIONS: PresetPrescription[] = [
  {
    id: "post_op_cardiac",
    label: "Post-Operative Cardiac Bypass Discharge Summary",
    patientName: "Kavita Rao",
    age: 52,
    gender: "Female",
    conditionDescription: "Post-Operative Coronary Artery Bypass Recovery",
    doctorName: "Dr. Sharma",
    doctorSpecialty: "Chief Cardiac Surgeon",
    hospitalName: "Silver Oak Heart Institute & Care Centre",
    medicines: [
      {
        name: "Metoprolol Succinate",
        dosage: "25 mg",
        instructions: "1 tablet with morning water after breakfast",
        time: "8:00 AM",
        color: "blue",
      },
      {
        name: "Atorvastatin Calcium",
        dosage: "20 mg",
        instructions: "1 tablet at bedtime after food",
        time: "8:00 PM",
        color: "purple",
      },
      {
        name: "Ecosprin (Aspirin)",
        dosage: "75 mg",
        instructions: "1 tablet after lunch with full glass of water",
        time: "1:00 PM",
        color: "red",
      },
    ],
    diet: [
      "Strict low-sodium (less than 2g salt/day) heart-healthy meals.",
      "Include steamed vegetables, oats, lentils, and fresh fruits.",
      "Avoid fried items, heavy saturated fats, and processed foods.",
    ],
    activity: [
      "Gentle 15-minute room walking twice daily as tolerated.",
      "Deep breathing exercises using spirometer 3 times daily.",
      "Avoid lifting weights greater than 3 kg.",
    ],
    symptomsToWatch: [
      "Sudden chest discomfort or pressure",
      "Shortness of breath at rest",
      "Swelling in feet or ankles",
      "High fever above 100.4°F",
    ],
    summary:
      "Patient completed uncomplicated surgical revascularization. Discharged hemodynamically stable on prophylactic cardiac regimen and home physical therapy.",
  },
  {
    id: "ortho_joint",
    label: "Total Knee Arthroplasty (Joint Replacement) Discharge Summary",
    patientName: "Rajesh Kothari",
    age: 64,
    gender: "Male",
    conditionDescription: "Right Total Knee Replacement Post-Surgical Care",
    doctorName: "Dr. Ramu",
    doctorSpecialty: "Orthopedic Surgeon",
    hospitalName: "Apollo Ortho & Spine Hospital",
    medicines: [
      {
        name: "Paracetamol Extended Release",
        dosage: "650 mg",
        instructions: "1 tablet thrice daily after meals for joint comfort",
        time: "8:00 AM",
        color: "blue",
      },
      {
        name: "Rivaroxaban (Xarelto)",
        dosage: "10 mg",
        instructions: "1 tablet once daily with evening snack for DVT prophylaxis",
        time: "6:00 PM",
        color: "red",
      },
      {
        name: "Calcium Carbonate + Vit D3",
        dosage: "500 mg",
        instructions: "1 tablet after lunch",
        time: "1:00 PM",
        color: "purple",
      },
    ],
    diet: [
      "High-protein diet with paneer, dal, and lean proteins for tissue healing.",
      "Hydration: Minimum 2.5 Liters of water daily.",
    ],
    activity: [
      "Perform quadriceps sets and ankle pumps every 2 hours.",
      "Use walker for all ambulation; do not twist knee joint.",
    ],
    symptomsToWatch: [
      "Calf warmth, tenderness, or swelling",
      "Incision discharge or redness",
      "Persistent calf pain on dorsiflexion",
    ],
    summary:
      "Successful unilateral total knee arthroplasty. Surgical site clean and dry. Advised non-weight bearing assisted walking.",
  },
];

export const generatePrescriptionDataUrl = (preset: PresetPrescription): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
    <rect width="600" height="800" fill="#ffffff"/>
    <rect x="20" y="20" width="560" height="760" fill="#fafafa" stroke="#e2e8f0" stroke-width="2" rx="12"/>
    <rect x="20" y="20" width="560" height="90" fill="#0d2238" rx="12"/>
    <text x="40" y="55" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">${preset.hospitalName}</text>
    <text x="40" y="80" font-family="Arial, sans-serif" font-size="12" fill="#38bdf8">${preset.doctorName} • ${preset.doctorSpecialty}</text>
    <text x="40" y="140" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0f172a">PATIENT DISCHARGE SUMMARY</text>
    <text x="40" y="165" font-family="Arial, sans-serif" font-size="12" fill="#475569">Name: <tspan font-weight="bold" fill="#0f172a">${preset.patientName}</tspan> | Age: ${preset.age} Yrs | Gender: ${preset.gender}</text>
    <text x="40" y="190" font-family="Arial, sans-serif" font-size="12" fill="#475569">Diagnosis: <tspan font-weight="bold" fill="#0f172a">${preset.conditionDescription}</tspan></text>
    <line x1="40" y1="210" x2="560" y2="210" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="40" y="235" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0c5a4d">Rx / PRESCRIBED MEDICATIONS & SCHEDULE</text>
    ${preset.medicines
      .map(
        (m, i) => `
      <rect x="40" y="${255 + i * 55}" width="520" height="46" fill="#ffffff" stroke="#e2e8f0" rx="8"/>
      <text x="55" y="${275 + i * 55}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${i + 1}. ${m.name} (${m.dosage})</text>
      <text x="55" y="${293 + i * 55}" font-family="Arial, sans-serif" font-size="11" fill="#64748b">${m.instructions} — Time: ${m.time}</text>
    `
      )
      .join("")}
    <text x="40" y="450" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">CLINICAL DIRECTIVES & DIET</text>
    <text x="40" y="475" font-family="Arial, sans-serif" font-size="11" fill="#475569">• ${preset.diet[0]}</text>
    <text x="40" y="495" font-family="Arial, sans-serif" font-size="11" fill="#475569">• ${preset.activity[0]}</text>
    <text x="40" y="540" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#991b1b">WARNING / RED FLAG SYMPTOMS:</text>
    <text x="40" y="560" font-family="Arial, sans-serif" font-size="11" fill="#991b1b">• ${preset.symptomsToWatch[0]}</text>
    <text x="400" y="740" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#0d2238">Authorized Digital Sign:</text>
    <text x="400" y="760" font-family="Arial, sans-serif" font-size="12" font-style="italic" fill="#0c5a4d">${preset.doctorName}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
