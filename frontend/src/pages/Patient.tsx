import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import ClinicalTrialRegistryABI from "../abi/ClinicalTrialRegistry.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS;

export default function Patient() {
  const backend = "http://127.0.0.1:8000";

  // ----------------- States -----------------
  const [hasBasicInfo, setHasBasicInfo] = useState(false);

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [medicalFile, setMedicalFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  const [consentActive, setConsentActive] = useState(false);

  const [symptoms, setSymptoms] = useState([{ symptom: "", severity: "" }]);
  const [medicationCompliance, setMedicationCompliance] = useState(false);
  const [pastReports, setPastReports] = useState<any[]>([]);
  const [drawerReport, setDrawerReport] = useState<any | null>(null);
  const [studyId, setStudyId] = useState("");

  const [logs, setLogs] = useState<string[]>([]);
  const appendLog = (msg: string) =>
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const [activeTab, setActiveTab] = useState("selfReport");

  // ----------------- Wallet -----------------
  const wallet = localStorage.getItem("patient_wallet");
  const normalizedWallet = wallet ? wallet.toLowerCase() : null;

  if (!normalizedWallet) {
    alert("Please login via MetaMask first.");
    window.location.href = "/";
    return null;
  }

  // ----------------- Contract Helper -----------------
  const getContract = async () => {
    if (!window.ethereum) {
      appendLog("Metamask not found");
      throw new Error("No ethereum provider");
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ClinicalTrialRegistryABI,
      signer
    );
    return { contract, signer };
  };

  const shortFileName = (url: string) => {
    if (!url) return "";
    return url.split("/").pop();
  };

  // ---------------- Load Basic Info ----------------
  const loadBasicInfo = async () => {
    try {
      const res = await fetch(`${backend}/patient/basic-info/${normalizedWallet}`);
      const data = await res.json();

      if (!data.exists) return;

      setAge(data.age);
      setGender(data.gender);
      setFileName(data.initial_record_url);
      setHasBasicInfo(true);

      if (data.study_id) {
        setStudyId(data.study_id);
        loadReports(data.study_id);
      }

      loadConsentStatus();
    } catch (err) {
      console.error(err);
      appendLog("Failed to load basic info.");
    }
  };

  // ---------------- Load Consent Status ----------------
  const loadConsentStatus = async () => {
    try {
      const res = await fetch(`${backend}/patient/consent/status/${normalizedWallet}`);
      const data = await res.json();
      if (data.exists) setConsentActive(data.authorized === true);
    } catch (err) {
      console.error("Consent load failed");
    }
  };

  // ---------------- Load Reports ----------------
  const loadReports = async (sid: string) => {
    try {
      const res = await fetch(`${backend}/self-report/${sid}`);
      const data = await res.json();
      setPastReports(data.self_reports || []);
    } catch (err) {
      console.error(err);
      appendLog("Failed to load reports.");
    }
  };

  useEffect(() => {
    loadBasicInfo();
  }, []);

  // ---------------- Save Basic Info ----------------
  const handleSaveBasicInfo = async () => {
    if (!age || !gender || !medicalFile) {
      appendLog("Basic info incomplete.");
      return;
    }

    try {
      const { contract } = await getContract();

      const buffer = await medicalFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const fileHash = ethers.keccak256(bytes);

      appendLog("Uploading PDF hash to blockchain...");
      const tx = await contract.uploadData(fileHash);
      appendLog(`Waiting for transaction: ${tx.hash}`);
      await tx.wait();
      appendLog("PDF hash stored on blockchain.");

      const formData = new FormData();
      formData.append("wallet_address", normalizedWallet);
      formData.append("age", String(age));
      formData.append("gender", gender);
      formData.append("file", medicalFile);
      formData.append("tx_hash", tx.hash);

      const res = await fetch(`${backend}/patient/basic-info`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        appendLog("Failed to save basic info on backend.");
        return;
      }

      appendLog("Basic info saved on backend.");
      setHasBasicInfo(true);
      setFileName(data.initial_record_url);
      setStudyId(data.study_id);

      loadReports(data.study_id);
    } catch (err) {
      console.error(err);
      appendLog("Error saving basic info.");
    }
  };

  // ---------------- Submit Self Report ----------------
  const handleSubmitReport = async () => {
    try {
      const payload = {
        wallet_address: normalizedWallet,
        symptoms,
        medication_compliance: medicationCompliance,
      };
      const raw = JSON.stringify(payload);
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes(raw));

      appendLog("Uploading self-report hash to blockchain...");
      const { contract } = await getContract();
      const tx = await contract.uploadData(contentHash);
      await tx.wait();
      appendLog("Self-report hash stored on-chain.");

      const res = await fetch(`${backend}/self-report/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: normalizedWallet,
          symptoms,
          medication_compliance: medicationCompliance,
          content_hash: contentHash,
          tx_hash: tx.hash,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        appendLog("Submit failed: " + data.detail);
        return;
      }

      appendLog("Self-report submitted.");
      if (studyId) loadReports(studyId);
    } catch (err) {
      console.error(err);
      appendLog("Error submitting self-report.");
    }
  };

  // ---------------- Consent: Grant ----------------
  const handleGrant = async () => {
    try {
      appendLog("Granting consent on-chain...");

      const { contract } = await getContract();
      const tx = await contract.grantConsent();
      await tx.wait();

      appendLog("Blockchain consent granted.");

      const res = await fetch(`${backend}/patient/consent/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: normalizedWallet,
          tx_hash: tx.hash,
        }),
      });

      if (!res.ok) {
        appendLog("Backend consent sync FAILED.");
        return;
      }

      appendLog("Backend consent updated.");
      setConsentActive(true);
    } catch (err: any) {
      appendLog("Grant failed: " + (err.reason || err.message));
    }
  };

  // ---------------- Consent: Revoke ----------------
  const handleRevoke = async () => {
    try {
      appendLog("Revoking consent on-chain...");

      const { contract } = await getContract();
      const tx = await contract.revokeConsent();
      await tx.wait();

      appendLog("Blockchain consent revoked.");

      const res = await fetch(`${backend}/patient/consent/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: normalizedWallet,
          tx_hash: tx.hash,
        }),
      });

      if (!res.ok) {
        appendLog("Backend revoke sync FAILED.");
        return;
      }

      appendLog("Backend consent updated.");
      setConsentActive(false);
    } catch (err: any) {
      appendLog("Revoke failed: " + (err.reason || err.message));
    }
  };

  // ---------------- Add Symptom ----------------
  const addSymptom = () => {
    setSymptoms([...symptoms, { symptom: "", severity: "" }]);
  };

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen w-full flex p-10 relative bg-gradient-to-br from-[#f6faff] via-[#e9f3ff] to-[#d9eaff] overflow-hidden">

      {/* LEFT PANEL */}
      <div className="relative z-10 w-[320px] mr-10 backdrop-blur-xl bg-white/70 shadow-2xl rounded-3xl p-6">

        <h2 className="text-xl font-bold text-blue-700 mb-4">Patient Profile</h2>

        {hasBasicInfo ? (
          <div className="space-y-2">
            <p><strong>Age:</strong> {age}</p>
            <p><strong>Gender:</strong> {gender}</p>
            <p className="flex items-center gap-2">
              <strong>Medical File:</strong>
              {fileName ? (
                <a
                  href={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline truncate max-w-[200px]"
                >
                  {shortFileName(fileName)}
                </a>
              ) : "None"}
            </p>

            <button
              onClick={() => {
                localStorage.removeItem("patient_wallet");
                window.location.href = "/";
              }}
              className="mt-6 w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 rounded-xl shadow-md"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              className="w-full p-3 border rounded-xl"
              type="number"
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />

            <select
              className="w-full p-3 border rounded-xl"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            <div
              className="border-2 border-dashed border-blue-300 rounded-2xl p-6 text-center cursor-pointer"
              onClick={() => document.getElementById("fileUpload")?.click()}
            >
              <p className="text-blue-700 font-semibold">
                {medicalFile ? medicalFile.name : "Click to upload PDF"}
              </p>

              <input
                id="fileUpload"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setMedicalFile(e.target.files?.[0] || null)}
              />
            </div>

            <button
              onClick={handleSaveBasicInfo}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 rounded-xl shadow-md"
            >
              Save Info
            </button>
          </div>
        )}
      </div>

      {/* RIGHT MAIN PANEL */}
      <div className="relative z-10 flex-1 backdrop-blur-xl bg-white/70 shadow-2xl rounded-3xl p-8">

        {!hasBasicInfo ? (
          <div className="text-center text-gray-700 text-lg font-semibold py-20">
            Please complete your basic information first.
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-6 mb-6 border-b pb-2">
              {[
                { id: "selfReport", name: "Self Report" },
                { id: "myReports", name: "My Reports" },
                { id: "consent", name: "Consent" },
                { id: "logs", name: "System Logs" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-2 text-lg font-medium ${
                    activeTab === tab.id
                      ? "text-blue-700 border-b-4 border-blue-500"
                      : "text-gray-600 hover:text-blue-600"
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Self Report Tab */}
            {activeTab === "selfReport" && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-blue-700">
                  Submit New Report
                </h2>

                {symptoms.map((row, i) => (
                  <div key={i} className="grid grid-cols-2 gap-4 mb-3">
                    <input
                      className="p-3 border rounded-xl"
                      placeholder="Symptom"
                      value={row.symptom}
                      onChange={(e) => {
                        const s = [...symptoms];
                        s[i].symptom = e.target.value;
                        setSymptoms(s);
                      }}
                    />

                    <select
                      className="p-3 border rounded-xl"
                      value={row.severity}
                      onChange={(e) => {
                        const s = [...symptoms];
                        s[i].severity = e.target.value;
                        setSymptoms(s);
                      }}
                    >
                      <option value="" disabled hidden>
                        Severity
                      </option>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                  </div>
                ))}

                <button className="text-blue-700 mb-4" onClick={addSymptom}>
                  + Add Symptom
                </button>

                <div className="mb-6">
                  <p className="mb-2">Medication compliance</p>
                  <div className="inline-flex rounded-full bg-gray-100 p-1">
                    <button
                      onClick={() => setMedicationCompliance(true)}
                      className={`px-4 py-1 rounded-full ${
                        medicationCompliance
                          ? "bg-blue-600 text-white"
                          : "text-gray-600"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setMedicationCompliance(false)}
                      className={`px-4 py-1 rounded-full ${
                        !medicationCompliance
                          ? "bg-red-100 text-red-700"
                          : "text-gray-600"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <button
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 px-6 rounded-xl"
                  onClick={handleSubmitReport}
                >
                  Submit Report
                </button>
              </div>
            )}

            {/* My Reports */}
            {activeTab === "myReports" && (
              <table className="w-full bg-white/60 rounded-xl overflow-hidden">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Symptoms</th>
                    <th className="p-3">Medication</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {pastReports.map((r, i) => (
                    <tr key={i} className="border-b hover:bg-blue-50/40">
                      <td className="p-3">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">{r.symptoms.length} symptoms</td>
                      <td className="p-3">
                        {r.medication_compliance ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-red-600">No</span>
                        )}
                      </td>
                      <td
                        className="p-3 text-blue-600 cursor-pointer"
                        onClick={() => setDrawerReport(r)}
                      >
                        View →
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Consent */}
            {activeTab === "consent" && (
              <div>
                <p>
                  Status:{" "}
                  <strong>{consentActive ? "Active" : "Not Granted"}</strong>
                </p>
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={handleGrant}
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 px-6 rounded-xl"
                  >
                    Grant Consent
                  </button>
                  <button
                    onClick={handleRevoke}
                    className="bg-red-500 text-white py-2 px-6 rounded-xl"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            )}

            {/* Logs */}
            {activeTab === "logs" && (
              <div className="bg-white/50 p-4 rounded-xl h-64 overflow-auto text-sm">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer */}
      {drawerReport && (
        <div className="fixed top-0 right-0 w-[420px] h-full bg-white shadow-xl p-6 z-50">
          <h2 className="text-xl font-bold mb-4">
            Report Detail —{" "}
            {new Date(drawerReport.created_at).toLocaleString()}
          </h2>

          <div className="mb-6">
            <strong>Medication Compliance:</strong>{" "}
            {drawerReport.medication_compliance ? (
              <span className="text-green-700">Yes</span>
            ) : (
              <span className="text-red-600">No</span>
            )}
          </div>

          <strong>Symptoms:</strong>
          <ul className="list-disc ml-6 mt-2">
            {drawerReport.symptoms.map((s: any, i: number) => (
              <li key={i}>
                {s.symptom} ({s.severity})
              </li>
            ))}
          </ul>

          <button
            onClick={() => setDrawerReport(null)}
            className="absolute top-4 right-4 text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
