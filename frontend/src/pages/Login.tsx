import React from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const HOSPITAL_ADDRESS = import.meta.env.VITE_HOSPITAL_ADDRESS?.toLowerCase();

  const handleMetaMaskLogin = async (role: "patient" | "hospital") => {
    if (!window.ethereum) {
      alert("MetaMask is not installed.");
      return;
    }

    try {
      // Ask for permission
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });

      // Get accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No MetaMask accounts found.");
      }

      const userAddress = accounts[0].toLowerCase();
      console.log(`Connected wallet: ${userAddress}`);

      /* -----------------------------
         PATIENT LOGIN
      ------------------------------ */
      if (role === "patient") {
        if (HOSPITAL_ADDRESS && userAddress === HOSPITAL_ADDRESS) {
          alert("The hospital wallet cannot log in as a patient.");
          return;
        }

        // ★★★ Save wallet for patient
        localStorage.setItem("patient_wallet", userAddress);

        navigate("/patient");
        return;
      }

      /* -----------------------------
         HOSPITAL LOGIN
      ------------------------------ */
      if (role === "hospital") {
        if (!HOSPITAL_ADDRESS) {
          alert("Hospital address not configured in .env");
          return;
        }

        if (userAddress !== HOSPITAL_ADDRESS) {
          alert("You are not the authorized hospital wallet.");
          return;
        }

        localStorage.setItem("hospital_wallet", userAddress);

        navigate("/hospital");
        return;
      }
    } catch (err) {
      console.error("MetaMask login failed:", err);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-[#f6faff] via-[#e9f3ff] to-[#d9eaff]">

      {/* LEFT SIDE – Intro */}
      <div className="flex-1 flex flex-col justify-center px-20 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px]
          bg-gradient-to-br from-blue-300 via-cyan-200 to-blue-100
          rounded-full blur-[120px] opacity-60 animate-floating"></div>

        <div className="absolute bottom-10 left-32 w-[350px] h-[350px]
          bg-gradient-to-br from-cyan-200 via-blue-100 to-white
          rounded-full blur-[150px] opacity-40 animate-floating-delayed"></div>

        <h1 className="text-5xl font-bold text-blue-700 z-10">
          Clinical Trial Registry
        </h1>

        <p className="text-xl mt-4 text-gray-600 z-10">
          A secure, blockchain-powered system enabling transparent,
          auditable, and patient-controlled clinical trial data sharing.
        </p>

        <ul className="mt-8 text-gray-700 text-lg space-y-3 z-10">
          <li>• Patient-owned medical data</li>
          <li>• On-chain consent & access control</li>
          <li>• Immutable audit logs</li>
          <li>• Privacy-preserving architecture</li>
        </ul>
      </div>

      {/* RIGHT SIDE – LOGIN CARD */}
      <div className="w-[420px] flex items-center justify-center bg-white/40 backdrop-blur-lg border-l border-white/50">
        <div className="bg-white/75 backdrop-blur-xl shadow-xl rounded-3xl p-10 w-[360px] border border-white/40">

          <h2 className="text-2xl font-bold text-center text-blue-700">
            Login
          </h2>
          <p className="text-center text-gray-500 mt-1 mb-8 text-sm">
            Select your role
          </p>

          {/* Patient Login */}
          <button
            onClick={() => handleMetaMaskLogin("patient")}
            className="w-full mb-6 py-3 rounded-xl text-white font-semibold shadow-md
                     bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-[1.04]
                     transition-transform"
          >
            Login as Patient
          </button>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/80 text-gray-500 font-medium">
                OR
              </span>
            </div>
          </div>

          {/* Hospital Login */}
          <button
            onClick={() => handleMetaMaskLogin("hospital")}
            className="w-full py-3 rounded-xl text-white font-semibold shadow-md
                       bg-blue-700 hover:scale-[1.03] transition"
          >
            Login as Hospital
          </button>
        </div>
      </div>

      {/* Keyframes */}
      <style>
        {`
          @keyframes floating {
            0% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(25px) scale(1.05); }
            100% { transform: translateY(0px) scale(1); }
          }
          .animate-floating {
            animation: floating 6s ease-in-out infinite;
          }
          .animate-floating-delayed {
            animation: floating 7s ease-in-out infinite;
            animation-delay: 1.5s;
          }
        `}
      </style>
    </div>
  );
}
