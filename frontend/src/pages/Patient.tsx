import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import ClinicalTrialRegistryABI from "../abi/ClinicalTrialRegistry.json";
import {
  Activity,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  FileText,
} from "lucide-react";

const CONTRACT_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS;

// Common preset symptoms
const COMMON_SYMPTOMS = [
  "Headache",
  "Nausea",
  "Fatigue",
  "Dizziness",
  "Insomnia",
  "Joint Pain",
];

type ConsentEvent = {
  status: "granted" | "revoked";
  tx_hash: string;
  timestamp: string;
};

export default function Patient() {
  const backend = "http://127.0.0.1:8000";

  // ---------------- Core state ----------------
  const [hasBasicInfo, setHasBasicInfo] = useState(false);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [medicalFile, setMedicalFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  const [consentActive, setConsentActive] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<{ [k: string]: number }>({});
  const [medicationCompliance, setMedicationCompliance] = useState<boolean | null>(null);

  const [pastReports, setPastReports] = useState<any[]>([]);
  const [studyId, setStudyId] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">("dashboard");

  // On-chain / Drawer
  const [uploadTxHash, setUploadTxHash] = useState<string>("");
  const [consentEvents, setConsentEvents] = useState<ConsentEvent[]>([]);
  const [drawerReport, setDrawerReport] = useState<any | null>(null);

  const wallet = localStorage.getItem("patient_wallet");
  const normalizedWallet = wallet ? wallet.toLowerCase() : null;

  // ---------------- Helpers ----------------
  const shortHash = (h?: string | null) =>
    h ? `${h.slice(0, 10)}...${h.slice(-6)}` : "—";

  // Store consent history in state + localStorage
  const recordConsentEvent = (status: "granted" | "revoked", tx_hash: string) => {
    const event: ConsentEvent = {
      status,
      tx_hash,
      timestamp: new Date().toISOString(),
    };
    setConsentEvents((prev) => {
      const next = [...prev, event];
      if (normalizedWallet) {
        localStorage.setItem(
          `consent_events_${normalizedWallet}`,
          JSON.stringify(next)
        );
      }
      return next;
    });
  };

  const sortedReports = [...pastReports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const latestConsent =
    consentEvents.length > 0 ? consentEvents[consentEvents.length - 1] : null;

  // ---------------- Init ----------------
  useEffect(() => {
    if (!normalizedWallet) {
      window.location.href = "/";
      return;
    }

    (async () => {
      const info = await loadBasicInfo();

      if (info.exists === false) {
        console.log("First login detected → clearing consent history");
        localStorage.removeItem(`consent_events_${normalizedWallet}`);
      }

      const raw = localStorage.getItem(`consent_events_${normalizedWallet}`);
      if (raw) {
        try {
          setConsentEvents(JSON.parse(raw));
        } catch {}
      }
    })();
  }, []);

  // ---------------- Blockchain helper ----------------
  const getContract = async () => {
    if (!(window as any).ethereum) throw new Error("No MetaMask detected");
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(
      CONTRACT_ADDRESS,
      ClinicalTrialRegistryABI,
      signer
    );
  };

  // ---------------- Load basic info ----------------
  const loadBasicInfo = async () => {
    try {
      const res = await fetch(`${backend}/patient/basic-info/${normalizedWallet}`);
      const data = await res.json();

      if (!data.exists) {
        return { exists: false };
      }

      setAge(String(data.age ?? ""));
      setGender(data.gender ?? "");
      setFileName(data.initial_record_url || "");
      setHasBasicInfo(true);
      setUploadTxHash(data.initial_record_tx_hash || "");

      if (data.study_id) {
        setStudyId(data.study_id);
        loadReports(data.study_id);
      }

      setConsentActive(data.authorized === true);
      return { exists: true };
    } catch (err) {
      console.error(err);
      return { exists: false };
    }
  };

  // ---------------- Load reports ----------------
  const loadReports = async (sid: string) => {
    try {
      const res = await fetch(`${backend}/self-report/${sid}`);
      const data = await res.json();
      setPastReports(data.self_reports || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- Save profile & upload hash ----------------
  const handleSaveBasicInfo = async () => {
    if (!normalizedWallet) {
      alert("Please connect wallet first.");
      return;
    }
    if (!age || !gender || !medicalFile) {
      alert("Please complete age, gender, and upload PDF.");
      return;
    }

    try {
      // Hash PDF
      const buffer = await medicalFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const fileHash = ethers.keccak256(bytes);

      // Upload hash on-chain
      const contract = await getContract();
      const tx = await contract.uploadData(fileHash);
      await tx.wait();

      // Send file to backend
      const formData = new FormData();
      formData.append("wallet_address", normalizedWallet);
      formData.append("age", age);
      formData.append("gender", gender);
      formData.append("file", medicalFile);
      formData.append("tx_hash", tx.hash);

      const res = await fetch(`${backend}/patient/basic-info`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        alert("Backend error.");
        return;
      }

      const data = await res.json();

      setHasBasicInfo(true);
      setFileName(data.initial_record_url);
      setStudyId(data.study_id);
      setUploadTxHash(data.initial_record_tx_hash || tx.hash);

      if (data.study_id) loadReports(data.study_id);
    } catch (err) {
      console.error(err);
      alert("Error saving profile.");
    }
  };

  // ---------------- Grant consent ----------------
  const handleGrant = async () => {
    try {
      const contract = await getContract();
      const tx = await contract.grantConsent();
      await tx.wait();

      await fetch(`${backend}/patient/consent/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: normalizedWallet,
          tx_hash: tx.hash,
        }),
      });

      setConsentActive(true);
      recordConsentEvent("granted", tx.hash);
    } catch (err) {
      console.error(err);
      alert("Error granting consent.");
    }
  };

  // ---------------- Revoke consent ----------------
  const handleRevoke = async () => {
    try {
      const contract = await getContract();
      const tx = await contract.revokeConsent();
      await tx.wait();

      await fetch(`${backend}/patient/consent/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: normalizedWallet,
          tx_hash: tx.hash,
        }),
      });

      setConsentActive(false);
      recordConsentEvent("revoked", tx.hash);
    } catch (err) {
      console.error(err);
      alert("Error revoking consent.");
    }
  };

  // ---------------- Symptom toggles ----------------
  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => {
      const next = { ...prev };
      if (next[symptom]) delete next[symptom];
      else next[symptom] = 1;
      return next;
    });
  };

  const setSeverity = (symptom: string, level: number) => {
    setSelectedSymptoms((prev) => ({ ...prev, [symptom]: level }));
  };

  // ---------------- Submit report ----------------
  const handleSubmitReport = async () => {
    if (!normalizedWallet) {
      alert("Please connect wallet first.");
      return;
    }

    const symptomsList = Object.entries(selectedSymptoms).map(([s, severity]) => ({
      symptom: s,
      severity: severity === 1 ? "Mild" : severity === 2 ? "Moderate" : "Severe",
    }));

    const payload = {
      wallet_address: normalizedWallet,
      symptoms: symptomsList,
      medication_compliance: medicationCompliance || false,
      content_hash: ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(symptomsList))
      ),
      tx_hash: "offchain-" + Date.now(),
    };

    try {
      const res = await fetch(`${backend}/self-report/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        alert("Error submitting report.");
        return;
      }

      setSelectedSymptoms({});
      setMedicationCompliance(null);

      if (studyId) loadReports(studyId);

      setActiveTab("history");
      alert("Report submitted.");
    } catch (err) {
      console.error(err);
      alert("Error submitting report.");
    }
  };

  const isNewPatient = !hasBasicInfo;

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 font-sans">

      {/* Top bar */}
      <div className="bg-white shadow-sm border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            CT
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Patient Portal</h1>
            <p className="text-xs text-slate-500">
              {normalizedWallet?.slice(0, 6)}...{normalizedWallet?.slice(-4)}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("patient_wallet");
            window.location.href = "/";
          }}
          className="text-slate-500 hover:text-red-600 text-sm font-medium"
        >
          Sign Out
        </button>
      </div>

      {/* Layout */}
      <div
        className={
          isNewPatient
            ? "min-h-[70vh] flex justify-center items-center p-8"
            : "max-w-6xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8"
        }
      >

        {/* LEFT SIDE */}
        <div className={isNewPatient ? "w-full max-w-sm" : "lg:col-span-4 space-y-6"}>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <Activity size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {hasBasicInfo ? "Patient" : "New Patient"}
                </h2>
                <p className="text-blue-600 font-medium text-sm">
                  {studyId || "Pending Enrollment"}
                </p>
              </div>
            </div>

            {/* New patient form */}
            {!hasBasicInfo ? (
              <div className="space-y-4">
                <input
                  className="w-full p-3 bg-slate-50 border rounded-xl"
                  placeholder="Age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />

                <select
                  className="w-full p-3 bg-slate-50 border rounded-xl"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>

                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setMedicalFile(e.target.files?.[0] || null)}
                  className="w-full p-3 bg-slate-50 border rounded-xl"
                />

                <button
                  onClick={handleSaveBasicInfo}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                >
                  Save Profile
                </button>
              </div>
            ) : (
              /* Existing patient info */
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex justify-between border-b pb-2">
                  <span>Age</span>
                  <span className="font-medium">{age}</span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span>Gender</span>
                  <span className="font-medium capitalize">{gender}</span>
                </div>

                {fileName && (
                  <div className="flex items-center gap-2 pt-2">
                    <FileText size={16} />
                    <a
                      href={fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline truncate"
                    >
                      Medical File
                    </a>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1">
                  <span>Consent</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      consentActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {consentActive ? "GRANTED" : "REVOKED"}
                  </span>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    onClick={handleGrant}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs"
                  >
                    Grant
                  </button>
                  <button
                    onClick={handleRevoke}
                    className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ------------------ On-chain activity card ------------------ */}
          {hasBasicInfo && (
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-4">Blockchain Records</h3>

              <div className="space-y-6 text-sm">

                {/* Initial upload */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-blue-200 text-xs">Initial Upload</p>

                    {uploadTxHash && (
                      <span className="text-xs text-blue-100 truncate max-w-[150px]">
                        {shortHash(uploadTxHash)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Consent history */}
                <div>
                  <p className="text-blue-200 text-xs mb-2">Consent History</p>

                  {consentEvents.length === 0 && (
                    <p className="text-blue-200 text-xs">
                      No consent activity recorded.
                    </p>
                  )}

                  <div className="space-y-2">
                    {consentEvents.map((ev, i) => (
                      <div key={i} className="text-xs text-blue-100">
                        <div className="flex justify-between">
                          <span className="font-semibold">
                            {ev.status.toUpperCase()}
                          </span>

                          <span className="truncate max-w-[150px]">
                            {shortHash(ev.tx_hash)}
                          </span>
                        </div>

                        <p className="text-[10px] text-blue-300">
                          {new Date(ev.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* ------------------ RIGHT SIDE ------------------ */}
        {hasBasicInfo && (
          <div className="lg:col-span-8">

            {/* Tabs */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-5 py-2 rounded-full text-sm font-medium ${
                  activeTab === "dashboard"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-500 border border-slate-200"
                }`}
              >
                Report Symptoms
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`px-5 py-2 rounded-full text-sm font-medium ${
                  activeTab === "history"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-500 border border-slate-200"
                }`}
              >
                History
              </button>
            </div>

            {/* ---------------- Dashboard ---------------- */}
            {activeTab === "dashboard" && (
              <div className="bg-white rounded-2xl shadow-sm border p-8">
                <div className="flex items-center gap-3 mb-6">
                  <ClipboardList className="text-blue-600" />
                  <h2 className="text-xl font-bold">Daily Check-in</h2>
                </div>

                {/* Medication section */}
                <div className="mb-8">
                  <p className="text-sm font-bold uppercase text-slate-500 mb-3">
                    1. Medication Adherence
                  </p>

                  <div className="bg-slate-50 p-5 rounded-xl border">
                    <p className="mb-3">Did you take your dose today?</p>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setMedicationCompliance(true)}
                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 ${
                          medicationCompliance === true
                            ? "bg-green-50 border-green-300 text-green-700 ring-2 ring-green-400"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <CheckCircle size={18} /> Yes
                      </button>

                      <button
                        onClick={() => setMedicationCompliance(false)}
                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 ${
                          medicationCompliance === false
                            ? "bg-red-50 border-red-300 text-red-700 ring-2 ring-red-400"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <AlertCircle size={18} /> No
                      </button>
                    </div>
                  </div>
                </div>

                {/* Symptoms */}
                <div className="mb-8">
                  <p className="text-sm font-bold uppercase text-slate-500 mb-3">
                    2. Symptom Check
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {COMMON_SYMPTOMS.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleSymptom(s)}
                        className={`p-3 rounded-xl border text-left ${
                          selectedSymptoms[s]
                            ? "bg-blue-50 border-blue-300 text-blue-700 ring-1 ring-blue-400"
                            : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Severity */}
                {Object.keys(selectedSymptoms).length > 0 && (
                  <div className="mb-8">
                    <p className="text-sm font-bold uppercase text-slate-500 mb-3">
                      3. Severity Rating
                    </p>

                    <div className="space-y-4">
                      {Object.keys(selectedSymptoms).map((s) => (
                        <div
                          key={s}
                          className="bg-slate-50 p-4 rounded-xl border flex items-center justify-between"
                        >
                          <span className="font-semibold">{s}</span>

                          <div className="flex gap-2">
                            {[1, 2, 3].map((lvl) => (
                              <button
                                key={lvl}
                                onClick={() => setSeverity(s, lvl)}
                                className={`w-20 py-1.5 text-xs font-bold rounded-lg border ${
                                  selectedSymptoms[s] === lvl
                                    ? lvl === 1
                                      ? "bg-yellow-100 border-yellow-300 text-yellow-700"
                                      : lvl === 2
                                      ? "bg-orange-100 border-orange-300 text-orange-700"
                                      : "bg-red-100 border-red-300 text-red-700"
                                    : "bg-white text-slate-400 border-slate-200"
                                }`}
                              >
                                {lvl === 1
                                  ? "MILD"
                                  : lvl === 2
                                  ? "MODERATE"
                                  : "SEVERE"}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  disabled={medicationCompliance === null}
                  onClick={handleSubmitReport}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-40"
                >
                  Submit Daily Report
                </button>
              </div>
            )}

            {/* ---------------- History ---------------- */}
            {activeTab === "history" && (
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                      <th className="p-4 text-left">Date</th>
                      <th className="p-4 text-left">Symptoms</th>
                      <th className="p-4 text-left">Medication</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {sortedReports.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                          No reports yet.
                        </td>
                      </tr>
                    )}

                    {sortedReports.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <td className="p-4 font-medium">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          {r.symptoms.length > 0 ? (
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">
                              {r.symptoms.length} Issues
                            </span>
                          ) : (
                            "None"
                          )}
                        </td>
                        <td className="p-4">
                          {r.medication_compliance ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle size={14} /> Taken
                            </span>
                          ) : (
                            <span className="text-red-500 flex items-center gap-1">
                              <AlertCircle size={14} /> Missed
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-full"
                            onClick={() => setDrawerReport(r)}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------- Drawer ---------------- */}
      {drawerReport && (
        <div>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setDrawerReport(null)}
          ></div>

          <div className="fixed top-0 right-0 w-[420px] h-full bg-white shadow-2xl z-50 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Report Detail</h2>
              <button
                onClick={() => setDrawerReport(null)}
                className="text-slate-500 hover:text-slate-700 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Date */}
            <div className="mb-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-700 mb-1">Date</p>
              <p>{new Date(drawerReport.created_at).toLocaleString()}</p>
            </div>

            {/* Medication */}
            <div className="mb-6">
              <p className="font-semibold text-slate-700 mb-1">
                Medication Compliance
              </p>
              {drawerReport.medication_compliance ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                  Taken
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  Missed
                </span>
              )}
            </div>

            {/* Symptoms */}
            <div>
              <p className="font-semibold text-slate-700 mb-2">Symptoms</p>

              {(!drawerReport.symptoms ||
                drawerReport.symptoms.length === 0) && (
                <p className="text-slate-400 text-sm">
                  No symptoms reported.
                </p>
              )}

              <div className="space-y-3">
                {drawerReport.symptoms?.map((s: any, i: number) => (
                  <div
                    key={i}
                    className="border border-slate-200 bg-slate-50 rounded-xl p-3 flex justify-between items-center"
                  >
                    <span className="font-medium text-slate-700">
                      {s.symptom}
                    </span>

                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        s.severity === "Mild"
                          ? "bg-yellow-100 text-yellow-700"
                          : s.severity === "Moderate"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {(s.severity || "").toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
