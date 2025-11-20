import React, { useState, useEffect } from "react";

export default function Patient() {
  const backend = "http://127.0.0.1:8000";

  const [hasBasicInfo, setHasBasicInfo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Basic Info
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [medicalFile, setMedicalFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  // New Self Report form
  const [symptoms, setSymptoms] = useState([{ symptom: "", severity: "" }]);
  const [medicationCompliance, setMedicationCompliance] = useState(false);

  // Past Reports
  const [pastReports, setPastReports] = useState<any[]>([
    {
      date: "2025-02-10",
      medication_compliance: true,
      symptoms: [
        { symptom: "Headache", severity: "moderate" },
        { symptom: "Fatigue", severity: "mild" },
      ],
    },
    {
      date: "2025-02-05",
      medication_compliance: false,
      symptoms: [{ symptom: "Nausea", severity: "mild" }],
    },
  ]);

  const [drawerReport, setDrawerReport] = useState<any | null>(null);
  const [consentActive, setConsentActive] = useState(false);

  const [logs, setLogs] = useState<string[]>([]);
  const appendLog = (msg: string) =>
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const [activeTab, setActiveTab] = useState("selfReport");

  useEffect(() => {
    const wallet = localStorage.getItem("patient_wallet") || "0xFAKE123";

    fetch(`${backend}/patient/basic-info/${wallet}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) {
          setHasBasicInfo(true);
          setAge(data.age);
          setGender(data.gender);
          setFileName(data.initial_record_url);
        }
      })
      .catch(() => {
        setHasBasicInfo(true);
        setAge("32");
        setGender("male");
        setFileName("mock_medical_record.pdf");
        setConsentActive(true);
        setLogs([
          "[10:23:12] Patient registered.",
          "[10:24:01] Consent granted.",
          "[10:25:44] Uploaded medical record hash: 0xABCD1234",
        ]);
      });
  }, []);

  const addSymptom = () => {
    setSymptoms([...symptoms, { symptom: "", severity: "" }]);
  };

  const handleSaveBasicInfo = () => {
    if (!age || !gender || !medicalFile) {
      appendLog("Basic info incomplete.");
      return;
    }
    appendLog("Basic info saved.");
    setHasBasicInfo(true);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen w-full flex p-10 relative bg-gradient-to-br from-[#f6faff] via-[#e9f3ff] to-[#d9eaff] overflow-hidden">

      {/* Background visuals */}
      <div className="absolute -top-32 -left-32 w-[480px] h-[480px] bg-blue-200 rounded-full blur-[130px] opacity-40 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-cyan-200 rounded-full blur-[160px] opacity-35 animate-pulse"></div>
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.10) 1px, transparent 1px)",
          backgroundSize: "55px 55px",
        }}
      ></div>

      {/* LEFT PROFILE */}
      <div className="relative z-10 w-[320px] mr-10 backdrop-blur-xl bg-white/70 shadow-2xl rounded-3xl p-6 h-fit animate-fadeIn">

        <h2 className="text-xl font-bold text-blue-700 mb-4">Patient Profile</h2>

        {hasBasicInfo && !isEditing && (
          <div className="space-y-2">
            <p><strong>Age:</strong> {age}</p>
            <p><strong>Gender:</strong> {gender}</p>
            <p><strong>Medical File:</strong> {fileName}</p>

            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 rounded-xl shadow-md hover:scale-105 transition"
            >
              Edit Info
            </button>
          </div>
        )}

        {(!hasBasicInfo || isEditing) && (
          <div className="mt-4 space-y-3 animate-fadeIn">
            <input
              className="w-full p-3 border rounded-xl focus:ring-4 focus:ring-blue-200/50 transition"
              type="number"
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />

            <select
              className="w-full p-3 border rounded-xl focus:ring-4 focus:ring-blue-200/50 transition"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            <div
              className="
                border-2 border-dashed border-blue-300 rounded-2xl p-6 text-center cursor-pointer
                bg-white/60 hover:bg-blue-50/40 hover:border-blue-500 transition
              "
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
                onChange={(e) =>
                  setMedicalFile(e.target.files ? e.target.files[0] : null)
                }
              />
            </div>

            <button
              onClick={handleSaveBasicInfo}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 rounded-xl shadow-md hover:scale-105 transition"
            >
              Save Info
            </button>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="relative z-10 flex-1 backdrop-blur-xl bg-white/70 shadow-2xl rounded-3xl p-8 animate-fadeIn">

        {!hasBasicInfo && (
          <div className="text-center text-gray-700 text-lg font-semibold py-20">
            Please complete your basic information first.
          </div>
        )}

        {hasBasicInfo && (
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
                  className={`pb-2 text-lg font-medium transition 
                    ${activeTab === tab.id
                      ? "text-blue-700 border-b-4 border-blue-500"
                      : "text-gray-600 hover:text-blue-600"}`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* TAB: Self Report */}
            {activeTab === "selfReport" && (
              <div className="animate-fadeIn">

                <h2 className="text-xl font-bold mb-4 text-blue-700">
                  Submit New Report
                </h2>

                {symptoms.map((row, i) => (
                  <div key={i} className="grid grid-cols-2 gap-4 mb-3">
                    <input
                      className="p-3 border rounded-xl focus:ring-blue-200 transition"
                      placeholder="Symptom"
                      value={row.symptom}
                      onChange={(e) => {
                        const s = [...symptoms];
                        s[i].symptom = e.target.value;
                        setSymptoms(s);
                      }}
                    />

                    <select
                      className="p-3 border rounded-xl focus:ring-blue-200 transition text-gray-700"
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

                <button
                  onClick={addSymptom}
                  className="text-blue-700 font-medium mb-4 hover:text-blue-900 transition cursor-pointer"
                >
                  + Add Symptom
                </button>

                <div className="mb-6">
                  <p className="mb-2 font-medium text-gray-700">
                    Medication compliance
                  </p>

                  <div className="inline-flex rounded-full bg-gray-100 p-1">
                    <button
                      type="button"
                      onClick={() => setMedicationCompliance(true)}
                      className={
                        "px-4 py-1 rounded-full text-sm font-medium transition " +
                        (medicationCompliance
                          ? "bg-blue-600 text-white shadow"
                          : "text-gray-600 hover:text-blue-700")
                      }
                    >
                      Yes
                    </button>

                    <button
                      type="button"
                      onClick={() => setMedicationCompliance(false)}
                      className={
                        "px-4 py-1 rounded-full text-sm font-medium transition " +
                        (!medicationCompliance
                          ? "bg-red-100 text-red-700"
                          : "text-gray-600 hover:text-red-700")
                      }
                    >
                      No
                    </button>
                  </div>
                </div>

                <button className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 px-6 rounded-xl shadow-md hover:scale-105 transition mb-8">
                  Submit Report
                </button>
              </div>
            )}

            {/* TAB: My Reports */}
            {activeTab === "myReports" && (
              <div className="animate-fadeIn">
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
                    {pastReports.map((r, i) => (
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
              </div>
            )}

            {/* TAB: Consent */}
            {activeTab === "consent" && (
              <div className="animate-fadeIn">
                <p className="mb-3">
                  Status:{" "}
                  <strong>{consentActive ? "Active" : "Not Granted"}</strong>
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => setConsentActive(true)}
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 px-6 rounded-xl shadow-md hover:scale-105 transition"
                  >
                    Grant Consent
                  </button>

                  <button
                    onClick={() => setConsentActive(false)}
                    className="bg-red-500 text-white py-2 px-6 rounded-xl shadow-md"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            )}

            {/* TAB: Logs */}
            {activeTab === "logs" && (
              <div className="animate-fadeIn">
                <div className="bg-white/50 p-4 rounded-xl h-64 overflow-auto text-sm">
                  {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer View Detail */}
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
    </div>
  );
}
