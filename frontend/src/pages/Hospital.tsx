import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import ClinicalTrialRegistryABI from "../abi/ClinicalTrialRegistry.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS;

export default function Hospital() {
  const backend = "http://127.0.0.1:8000";

  const [studyId, setStudyId] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [patientData, setPatientData] = useState<any | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("summary");
  const [drawerReport, setDrawerReport] = useState<any | null>(null);

  // Purpose modal
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [pendingPatientId, setPendingPatientId] = useState<string | null>(null);

  const hospitalWallet = localStorage.getItem("hospital_wallet");

  const shortFileName = (url: string) =>
    url ? url.split("/").pop() || url : "";

  // ============================================================
  // Contract helper (unchanged)
  // ============================================================
  const callViewOnChain = async (patientWallet: string, purpose: string) => {
    try {
      if (!window.ethereum) {
        alert("Metamask not found");
        return null;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddr = await signer.getAddress();

      if (hospitalWallet?.toLowerCase() !== signerAddr.toLowerCase()) {
        alert(
          "Please switch MetaMask to the hospital wallet.\n" +
            `Current: ${signerAddr}\nExpected: ${hospitalWallet}`
        );
        return null;
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ClinicalTrialRegistryABI,
        signer
      );

      console.log("Calling viewData()...");
      const tx = await contract.viewData(patientWallet, purpose);

      console.log("Waiting for confirmation...");
      await tx.wait();

      console.log("viewData transaction confirmed:", tx.hash);
      return tx.hash;
    } catch (err: any) {
      console.error("viewData error:", err);
      alert("Blockchain error: " + (err.reason || err.message));
      return null;
    }
  };

  // ============================================================
  // Fetch patient list (unchanged)
  // ============================================================
  useEffect(() => {
    const fetchPatients = () => {
      fetch(`${backend}/patients`)
        .then((res) => res.json())
        .then((data) => data.patients && setPatients(data.patients))
        .catch((err) => console.error("Failed to load patients:", err));
    };

    fetchPatients();
    const interval = setInterval(fetchPatients, 3000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // Fetch single patient (unchanged)
  // ============================================================
  const fetchPatientFromApi = async (id: string) => {
    try {
      const res = await fetch(`${backend}/self-report/${id}`);

      if (!res.ok) {
        setAuthorized(false);
        setPatientData(null);
        return;
      }

      const data = await res.json();
      const pt = data.patient;

      setAuthorized(pt.authorized);

      if (!pt.authorized) {
        setPatientData(null);
        setReports([]);
        return;
      }

      setPatientData(pt);
      setReports(data.self_reports || []);
    } catch (err) {
      console.error("Error fetching patient:", err);
      setAuthorized(null);
      setPatientData(null);
    }
  };

  // ============================================================
  // Auto refresh patient (unchanged)
  // ============================================================
  useEffect(() => {
    if (!patientData) return;

    const interval = setInterval(() => {
      fetchPatientFromApi(patientData.study_id);
    }, 3000);

    return () => clearInterval(interval);
  }, [patientData]);

  // ============================================================
  // Load patient
  // ============================================================
  const loadPatient = (id: string) => {
    const pt = patients.find((p) => p.study_id === id);

    if (pt && pt.authorized === false) {
      setStudyId(id);
      setAuthorized(false);
      setPatientData(null);
      setReports([]);
      return;
    }

    setPendingPatientId(id);
    setShowPurposeModal(true);
  };

  // ============================================================
  // Confirm purpose (UNCHANGED LOGIC)
  // ============================================================
  const confirmPurpose = async () => {
    if (!pendingPatientId) return;

    const walletRes = await fetch(
      `${backend}/patient/wallet/${pendingPatientId}`
    );
    const walletData = await walletRes.json();
    const patientWallet = walletData.wallet_address;

    const txHash = await callViewOnChain(patientWallet, purpose);
    if (!txHash) return;

    await fetch(`${backend}/access-log/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        study_id: pendingPatientId,
        purpose,
        tx_hash: txHash,
      }),
    });

    await fetchPatientFromApi(pendingPatientId);
    setStudyId(pendingPatientId);
    setActiveTab("summary");

    setShowPurposeModal(false);
    setPurpose("");
    setPendingPatientId(null);
  };

  const handleSearch = () => {
    if (!studyId.trim()) return;
    loadPatient(studyId.trim());
  };

  const handleBack = () => {
    setPatientData(null);
    setAuthorized(null);
    setStudyId("");
    setReports([]);
    setActiveTab("summary");
  };

  // =====================================================================
  // ===============================  UI  ================================
  // =====================================================================

  return (
    <div className="relative min-h-screen w-full flex p-10 bg-gradient-to-br from-[#f6faff] via-[#e9f3ff] to-[#d9eaff]">
      {/* LEFT PANEL */}
      <div className="relative z-10 w-[300px] mr-10 backdrop-blur-xl bg-white/70 shadow-2xl rounded-3xl p-6 h-fit">
        <h2 className="text-xl font-bold text-blue-700 mb-2">Hospital Panel</h2>

        <input
          type="text"
          placeholder="Search Study ID"
          value={studyId}
          onChange={(e) => setStudyId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="mt-6 w-full p-3 border rounded-xl"
        />

        <button
          onClick={handleSearch}
          className="w-full mt-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 rounded-xl shadow-md"
        >
          View
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("hospital_wallet");
            window.location.href = "/";
          }}
          className="mt-6 w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 rounded-xl shadow-md"
        >
          Logout
        </button>
      </div>

      {/* MAIN PANEL */}
      <div className="relative z-10 flex-1 backdrop-blur-xl bg-white/70 shadow-2xl rounded-3xl p-8">
        {/* LIST PAGE */}
        {!patientData && studyId === "" && (
          <div>
            <h2 className="text-2xl font-bold text-blue-700 mb-4">Records</h2>

            {patients.length === 0 && (
              <div className="text-gray-500">No patients found.</div>
            )}

            <div className="space-y-4">
              {patients.map((p, i) => (
                <div
                  key={i}
                  onClick={() => p.authorized && loadPatient(p.study_id)}
                  className={`cursor-pointer bg-white/60 p-5 rounded-xl shadow-sm transition border border-white/40 ${
                    p.authorized
                      ? "hover:bg-white/80 hover:shadow-md"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-800 text-lg">
                      {p.study_id}
                    </span>

                    {p.authorized ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Granted
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-medium">
                        Denied
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UNAUTHORIZED VIEW */}
        {studyId !== "" && !patientData && authorized === false && (
          <div className="animate-fadeIn">
            <button
              onClick={handleBack}
              className="mb-6 px-4 py-2 bg-white border border-blue-300 rounded-xl text-blue-700"
            >
              ← Back
            </button>

            <div className="p-6 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-red-700 font-semibold text-lg mb-2">
                You do not have permission to view this data.
              </p>
            </div>
          </div>
        )}

        {/* AUTHORIZED VIEW */}
        {patientData && (
          <>
            <button
              onClick={handleBack}
              className="mb-6 px-4 py-2 bg-white border border-blue-300 rounded-xl text-blue-700"
            >
              ← Back to Records
            </button>

            <div className="flex gap-6 mb-6 border-b pb-2">
              {["summary", "reports"].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`pb-2 text-lg font-medium ${
                    activeTab === t
                      ? "text-blue-700 border-b-4 border-blue-500"
                      : "text-gray-600 hover:text-blue-600"
                  }`}
                >
                  {t === "summary" ? "Summary" : "Reports"}
                </button>
              ))}
            </div>

            {/* Summary */}
            {activeTab === "summary" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-blue-700 mb-4">
                  Patient Summary
                </h2>

                <p>
                  <strong>Study ID:</strong> {patientData.study_id}
                </p>
                <p>
                  <strong>Age:</strong> {patientData.age}
                </p>
                <p>
                  <strong>Gender:</strong> {patientData.gender}
                </p>

                <p className="flex items-center gap-2">
                  <strong>Medical File:</strong>{" "}
                  <a
                    href={patientData.initial_record_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline truncate max-w-[200px]"
                  >
                    {shortFileName(patientData.initial_record_url)}
                  </a>
                </p>
              </div>
            )}

            {/* Reports */}
            {activeTab === "reports" && (
              <table className="w-full text-left bg-white/60 rounded-xl overflow-hidden">
                <thead className="bg-blue-100 text-gray-700">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Symptoms</th>
                    <th className="p-3">Medication</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr
                      key={i}
                      className="border-b hover:bg-blue-50/40 cursor-pointer"
                      onClick={() => setDrawerReport(r)}
                    >
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
                      <td className="p-3 text-blue-600 font-medium">View →</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* ============================================================
          REPORT DRAWER
      ============================================================ */}
      {drawerReport && (
        <div className="fixed top-0 right-0 w-[420px] h-full bg-white shadow-xl p-6 animate-fadeIn z-50">
          <button
            onClick={() => setDrawerReport(null)}
            className="absolute top-4 right-4 text-gray-600 hover:text-black text-2xl"
          >
            ✕
          </button>

          <h2 className="text-xl font-bold mb-4">
            Report – {new Date(drawerReport.created_at).toLocaleString()}
          </h2>

          <p className="mb-3">
            <strong>Medication Compliance:</strong>{" "}
            {drawerReport.medication_compliance ? (
              <span className="text-green-700 font-semibold">Yes</span>
            ) : (
              <span className="text-red-600 font-semibold">No</span>
            )}
          </p>

          <div>
            <strong>Symptoms:</strong>
            <ul className="list-disc ml-6 mt-2">
              {drawerReport.symptoms.map((s, i) => (
                <li key={i}>
                  {s.symptom} ({s.severity})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ============================================================
          PURPOSE MODAL
      ============================================================ */}
      {showPurposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>

          <div className="relative bg-white/80 backdrop-blur-xl shadow-2xl border border-white/50 rounded-3xl p-8 w-[460px] p-8">
            <h2 className="text-2xl font-bold text-blue-700 mb-3">
              Purpose Required
            </h2>

            <p className="text-gray-700 mb-5">
              Please provide the reason for accessing this patient's records.
            </p>

            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Clinical review for follow-up evaluation"
              className="w-full p-4 h-[130px] bg-white/70 border border-gray-200 shadow-inner rounded-2xl text-gray-700 focus:ring-blue-300 outline-none transition"
            />

            <div className="flex justify-end gap-4 mt-7">
              <button
                onClick={() => {
                  setShowPurposeModal(false);
                  setPendingPatientId(null);
                  setPurpose("");
                }}
                className="px-5 py-2 rounded-xlborder border-gray-300 bg-white/70 text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                disabled={!purpose.trim()}
                onClick={confirmPurpose}
                className={`px-6 py-2 rounded-xl text-white font-medium shadow-md transition ${
                  purpose.trim()
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-[1.04]"
                    : "bg-blue-200 cursor-not-allowed"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
