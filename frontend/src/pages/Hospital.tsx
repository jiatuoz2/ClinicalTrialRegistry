import React, { useState } from "react";

export default function Hospital() {
  const username = "Dr. Smith";

  // ========== STATE ==========
  const [studyId, setStudyId] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [patientData, setPatientData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [drawerReport, setDrawerReport] = useState<any | null>(null);

  // ===== Purpose Modal State =====
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [pendingPatientId, setPendingPatientId] = useState<string | null>(null);

  // ========== MOCK DB ==========
  const mockPatients: any = {
    "CT-2025-0012": {
      authorized: true,
      age: 42,
      gender: "Female",
      medical_file: "initial_record_CT20250012.pdf",
      reports: [
        {
          date: "2025-02-10",
          medication_compliance: true,
          symptoms: [
            { symptom: "Chest Pain", severity: "severe" },
            { symptom: "Fatigue", severity: "moderate" },
          ],
        },
        {
          date: "2025-02-05",
          medication_compliance: false,
          symptoms: [{ symptom: "Nausea", severity: "mild" }],
        },
        {
          date: "2025-01-21",
          medication_compliance: true,
          symptoms: [
            { symptom: "Shortness of Breath", severity: "severe" },
            { symptom: "Headache", severity: "mild" },
          ],
        },
      ],
    },

    "CT-2025-0099": {
      authorized: false,
    },
  };

  const recent = [
    {
      id: "CT-2025-0012",
      authorized: true,
      reports: 3,
      last_update: "2025-02-10",
    },
    {
      id: "CT-2025-0099",
      authorized: false,
    },
  ];

  // ========== LOAD PATIENT (ONLY SHOW MODAL IF AUTHORIZED) ==========
  const loadPatient = (id: string) => {
    const data = mockPatients[id];

    if (!data || data.authorized === false) {
      setAuthorized(false);
      setPatientData(null);
      setStudyId(id);
      return;
    }

    setPendingPatientId(id);
    setShowPurposeModal(true);
  };

  // ========== CONFIRM PURPOSE (LOAD DATA AFTER PURPOSE) ==========
  const confirmPurpose = () => {
    if (!pendingPatientId) return;

    const data = mockPatients[pendingPatientId];

    if (!data) {
      setAuthorized(null);
      setPatientData(null);
    } else {
      setAuthorized(data.authorized);
      setPatientData(data.authorized ? data : null);
      setActiveTab("summary");
      setStudyId(pendingPatientId);
    }

    console.log("AUDIT LOG:", {
      hospital_user: username,
      patient_id: pendingPatientId,
      purpose: purpose,
      record_ids: ((data?.reports ?? []) as any[]).map((_: any, idx: number) => idx),
      timestamp: new Date().toISOString(),
    });

    setShowPurposeModal(false);
    setPurpose("");
    setPendingPatientId(null);
  };

  const handleSearch = () => {
    if (!studyId) return;
    loadPatient(studyId);
  };

  const handleBack = () => {
    setPatientData(null);
    setAuthorized(null);
    setStudyId("");
    setActiveTab("summary");
  };

  return (
    <div className="relative min-h-screen w-full flex p-10 overflow-hidden bg-gradient-to-br from-[#f6faff] via-[#e9f3ff] to-[#d9eaff]">

      {/* Glow blobs */}
      <div className="absolute -top-32 -left-32 w-[480px] h-[480px] bg-blue-200 rounded-full blur-[130px] opacity-40 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-cyan-200 rounded-full blur-[160px] opacity-35 animate-pulse"></div>

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.10) 1px, transparent 1px)",
          backgroundSize: "55px 55px",
        }}
      ></div>

      {/* LEFT PANEL */}
      <div className="relative z-10 w-[300px] mr-10 backdrop-blur-xl bg-white/70 shadow-2xl rounded-3xl p-6 h-fit">

        <h2 className="text-xl font-bold text-blue-700 mb-2">Hospital User</h2>
        <p className="text-2xl font-bold text-indigo-700">{username}</p>

        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search Study ID"
          value={studyId}
          onChange={(e) => setStudyId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="mt-6 w-full p-3 border rounded-xl focus:ring-4 focus:ring-blue-200/50 transition"
        />
        <button
          onClick={handleSearch}
          className="w-full mt-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 px-6 rounded-xl shadow-md hover:scale-[1.03] transition"
        >
          View
        </button>
      </div>

      {/* RIGHT PANEL */}
      <div className="relative z-10 flex-1 backdrop-blur-xl bg-white/70 shadow-2xl rounded-3xl p-8">

        {/* HOME PAGE */}
        {!patientData && studyId === "" && (
          <div>
            <h2 className="text-2xl font-bold text-blue-700 mb-4">Records</h2>

            <div className="space-y-4">
              {recent.map((item, i) => (
                <div
                  key={i}
                  onClick={() => loadPatient(item.id)}
                  className="cursor-pointer bg-white/60 p-5 rounded-xl shadow-sm hover:bg-white/80 hover:shadow-md transition border border-white/40"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-800 text-lg">{item.id}</span>

                    {item.authorized ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Granted
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-medium">
                        Denied
                      </span>
                    )}
                  </div>

                  {item.authorized && (
                    <div className="text-sm text-gray-600 mt-1">
                      {item.reports} Reports • Updated {item.last_update}
                    </div>
                  )}
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
              className="mb-6 px-4 py-2 bg-white border border-blue-300 rounded-xl shadow-sm 
                       hover:bg-blue-50 hover:shadow-md transition text-blue-700 flex items-center gap-2"
            >
              <span className="text-lg">←</span> Back to Records
            </button>

            <div className="p-6 bg-red-50 border border-red-100 rounded-xl shadow-sm">
              <p className="text-red-700 font-semibold text-lg mb-2">
                You do not have permission to view this data.
              </p>
              <p className="text-red-600 text-sm">
                The patient has not granted access. Please request consent before attempting to view clinical records.
              </p>
            </div>
          </div>
        )}

        {/* AUTHORIZED VIEW */}
        {patientData && (
          <>
            <button
              onClick={handleBack}
              className="mb-6 px-4 py-2 bg-white border border-blue-300 rounded-xl shadow-sm 
                       hover:bg-blue-50 hover:shadow-md transition text-blue-700 flex items-center gap-2"
            >
              <span className="text-lg">←</span> Back to Records
            </button>

            <div className="flex gap-6 mb-6 border-b pb-2">
              {["summary", "reports"].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`pb-2 text-lg font-medium ${
                    activeTab === t
                      ? "text-blue-700 border-b-4 border-blue-500"
                      : "text-gray-500 hover:text-blue-600"
                  }`}
                >
                  {t === "summary" && "Summary"}
                  {t === "reports" && "Reports"}
                </button>
              ))}
            </div>

            {/* SUMMARY */}
            {activeTab === "summary" && (
              <div className="space-y-6 animate-fadeIn">
                <h2 className="text-2xl font-bold text-blue-700 mb-4">Patient Summary</h2>

                <div>
                  <strong className="text-gray-700 text-lg">Authorization Status:</strong>
                  <div className="mt-2">
                    <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Access Granted
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-lg">
                  <p><strong>Age:</strong> {patientData.age}</p>
                  <p><strong>Gender:</strong> {patientData.gender}</p>
                  <p><strong>Medical File:</strong> {patientData.medical_file}</p>
                </div>
              </div>
            )}

            {/* REPORTS */}
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
                  {patientData.reports.map((r: any, i: number) => (
                    <tr
                      key={i}
                      className="border-b hover:bg-blue-50/40 transition"
                    >
                      <td className="p-3">{r.date}</td>
                      <td className="p-3">{r.symptoms.length} symptoms</td>
                      <td className="p-3">
                        {r.medication_compliance ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-red-600">No</span>
                        )}
                      </td>
                      <td
                        className="p-3 text-blue-600 font-medium cursor-pointer"
                        onClick={() => setDrawerReport(r)}
                      >
                        View →
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* REPORT DRAWER */}
      {drawerReport && (
        <div className="fixed top-0 right-0 w-[420px] h-full bg-white shadow-xl p-6 animate-fadeIn z-50">
          <h2 className="text-xl font-bold mb-4">
            Report Detail — {drawerReport.date}
          </h2>

          <div className="mb-6">
            <strong>Medication Compliance:</strong>{" "}
            {drawerReport.medication_compliance ? (
              <span className="text-green-700 font-semibold">Yes</span>
            ) : (
              <span className="text-red-600 font-semibold">No</span>
            )}
          </div>

          <div>
            <strong>Symptoms:</strong>
            <ul className="list-disc ml-6 mt-2">
              {drawerReport.symptoms.map((s: any, i: number) => (
                <li key={i}>
                  {s.symptom} ({s.severity})
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setDrawerReport(null)}
            className="absolute top-4 right-4 text-gray-500 hover:text-black text-2xl"
          >
            ✕
          </button>
        </div>
      )}

      {/* PURPOSE MODAL — WHITE GLASS VERSION */}
      {showPurposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">

          {/* Subtle white glow */}
          <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>

          {/* Glass Dialog */}
          <div className="relative bg-white/80 backdrop-blur-xl shadow-2xl 
                          border border-white/50 rounded-3xl p-8 w-[460px]
                          drop-shadow-xl">

            {/* Blue glow accent */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-200/40 blur-2xl rounded-full"></div>

            <h2 className="text-2xl font-bold text-blue-700 mb-3">
              Purpose Required
            </h2>

            <p className="text-gray-700 mb-5">
              Please provide the reason for accessing this patient's medical records.
            </p>

            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Clinical review for follow-up evaluation"
              className="w-full p-4 h-[130px] bg-white/70 backdrop-blur-xl border border-gray-200
                         shadow-inner rounded-2xl text-gray-700 focus:ring-4 
                         focus:ring-blue-300/40 outline-none transition"
            />

            <div className="flex justify-end gap-4 mt-7">
              <button
                onClick={() => {
                  setShowPurposeModal(false);
                  setPendingPatientId(null);
                  setPurpose("");
                }}
                className="px-5 py-2 rounded-xl border border-gray-300 bg-white/70 
                           text-gray-600 hover:bg-gray-100 shadow-sm transition"
              >
                Cancel
              </button>

              <button
                disabled={!purpose.trim()}
                onClick={confirmPurpose}
                className={`
                  px-6 py-2 rounded-xl text-white font-medium shadow-md transition
                  ${
                    purpose.trim()
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-[1.04]"
                      : "bg-blue-200 cursor-not-allowed"
                  }
                `}
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
