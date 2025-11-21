import React, { useState, useEffect } from "react";

export default function Hospital() {
  const backend = "http://127.0.0.1:8000";

  // ========== STATE ==========
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

  const shortFileName = (url: string) => {
    if (!url) return "";
    return url.split("/").pop() || url;
  };

  // ============================================================
  // REFRESH PATIENT LIST (every 3 sec)
  // ============================================================
  useEffect(() => {
    const fetchPatients = () => {
      fetch(`${backend}/patients`)
        .then((res) => res.json())
        .then((data) => {
          if (data.patients) setPatients(data.patients);
        })
        .catch((err) => console.error("Failed to load patients:", err));
    };

    fetchPatients(); // initial load

    const interval = setInterval(fetchPatients, 3000); // auto refresh
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // Fetch single patient
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
  // AUTO REFRESH ACTIVE PATIENT (every 3 sec)
  // ============================================================
  useEffect(() => {
    if (!patientData) return;

    const interval = setInterval(() => {
      fetchPatientFromApi(patientData.study_id);
    }, 3000);

    return () => clearInterval(interval);
  }, [patientData]);

  // ============================================================
  // When doctor selects a patient
  // ============================================================
  const loadPatient = (id: string) => {
    const pt = patients.find((p) => p.study_id === id);

    // ===========================
    // DENIED → skip purpose modal
    // ===========================
    if (pt && pt.authorized === false) {
      setStudyId(id);
      setAuthorized(false);
      setPatientData(null);
      setReports([]);
      return;
    }

    // Otherwise → normal flow
    setPendingPatientId(id);
    setShowPurposeModal(true);
  };

  // ============================================================
  // Confirm purpose
  // ============================================================
  const confirmPurpose = async () => {
    if (!pendingPatientId) return;

    console.log("AUDIT LOG:", {
      patient_id: pendingPatientId,
      purpose,
      timestamp: new Date().toISOString(),
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

  return (
    <div className="relative min-h-screen w-full flex p-10 overflow-hidden bg-gradient-to-br from-[#f6faff] via-[#e9f3ff] to-[#d9eaff]">
      
      {/* BG Effects */}
      <div className="absolute -top-32 -left-32 w-[480px] h-[480px] bg-blue-200 rounded-full blur-[130px] opacity-40 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-cyan-200 rounded-full blur-[160px] opacity-35 animate-pulse"></div>

      {/* LEFT PANEL */}
      <div className="relative z-10 w-[300px] mr-10 backdrop-blur-xl bg-white/70 shadow-2xl rounded-3xl p-6 h-fit">
        <h2 className="text-xl font-bold text-blue-700 mb-2">Hospital Panel</h2>

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
          className="w-full mt-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 rounded-xl shadow-md hover:scale-[1.03] transition"
        >
          View
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("hospital_user");
            window.location.href = "/";
          }}
          className="mt-6 w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 rounded-xl shadow-md hover:scale-105 transition"
        >
          Logout
        </button>
      </div>

      {/* RIGHT PANEL */}
      <div className="relative z-10 flex-1 backdrop-blur-xl bg-white/70 shadow-2xl rounded-3xl p-8">

        {/* HOME PAGE */}
        {!patientData && studyId === "" && (
          <div>
            <h2 className="text-2xl font-bold text-blue-700 mb-4">Records</h2>

            <div className="space-y-4">
              {patients.length === 0 && (
                <div className="text-gray-500">No patients found.</div>
              )}

              {patients.map((item, i) => (
                <div
                  key={i}
                  onClick={() => item.authorized && loadPatient(item.study_id)}
                  className={`cursor-pointer bg-white/60 p-5 rounded-xl shadow-sm transition border border-white/40 ${
                    item.authorized
                      ? "hover:bg-white/80 hover:shadow-md"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-800 text-lg">
                      {item.study_id}
                    </span>

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
                      {item.reports} Reports • Updated{" "}
                      {item.last_update?.slice(0, 10)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UNAUTHORIZED PAGE */}
        {studyId !== "" && !patientData && authorized === false && (
          <div className="animate-fadeIn">
            <button
              onClick={handleBack}
              className="mb-6 px-4 py-2 bg-white border border-blue-300 rounded-xl hover:bg-blue-50 transition text-blue-700 flex items-center gap-2"
            >
              ← Back
            </button>

            <div className="p-6 bg-red-50 border border-red-100 rounded-xl shadow-sm">
              <p className="text-red-700 font-semibold text-lg mb-2">
                You do not have permission to view this data.
              </p>
              <p className="text-red-600 text-sm">
                Patient has revoked consent.
              </p>
            </div>
          </div>
        )}

        {/* AUTHORIZED VIEW */}
        {patientData && (
          <>
            <button
              onClick={handleBack}
              className="mb-6 px-4 py-2 bg-white border border-blue-300 rounded-xl hover:bg-blue-50 transition text-blue-700 flex items-center gap-2"
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
                      : "text-gray-500 hover:text-blue-600"
                  }`}
                >
                  {t === "summary" ? "Summary" : "Reports"}
                </button>
              ))}
            </div>

            {/* SUMMARY */}
            {activeTab === "summary" && (
              <div className="space-y-6 animate-fadeIn">
                <h2 className="text-2xl font-bold text-blue-700 mb-4">
                  Patient Summary
                </h2>

                <div className="space-y-2 text-lg">
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
                    <strong>Medical File:</strong>
                    {patientData.initial_record_url ? (
                      <a
                        href={patientData.initial_record_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline truncate max-w-[200px]"
                      >
                        {shortFileName(patientData.initial_record_url)}
                      </a>
                    ) : (
                      "None"
                    )}
                  </p>
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
                  {reports.map((r: any, i: number) => (
                    <tr
                      key={i}
                      className="border-b hover:bg-blue-50/40 transition"
                    >
                      <td className="p-3">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="p-3">{r.symptoms?.length ?? 0} symptoms</td>
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
            Report Detail —{" "}
            {drawerReport.created_at
              ? new Date(drawerReport.created_at).toLocaleString()
              : ""}
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
              {drawerReport.symptoms?.map((s: any, i: number) => (
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

      {/* PURPOSE MODAL */}
      {showPurposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>

          <div className="relative bg-white/80 backdrop-blur-xl shadow-2xl border border-white/50 rounded-3xl p-8 w-[460px]">
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
                className="px-5 py-2 rounded-xl border border-gray-300 bg-white/70 text-gray-600 hover:bg-gray-100"
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
