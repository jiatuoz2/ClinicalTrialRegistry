import React from "react";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const HOSPITAL_ADDRESS = import.meta.env.VITE_HOSPITAL_ADDRESS?.toLowerCase();

  // MetaMask authentication
  const handleMetaMaskLogin = async (role: "patient" | "hospital") => {
    if (!window.ethereum) {
      alert("MetaMask is not installed.");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No MetaMask accounts found.");
      }

      const userAddress = accounts[0].toLowerCase();

      // Patient login logic
      if (role === "patient") {
        if (HOSPITAL_ADDRESS && userAddress === HOSPITAL_ADDRESS) {
          alert("The hospital wallet cannot log in as a patient.");
          return;
        }

        localStorage.setItem("patient_wallet", userAddress);
        navigate("/patient");
        return;
      }

      // Hospital login logic
      if (role === "hospital") {
        if (!HOSPITAL_ADDRESS) {
          alert("Hospital wallet is not configured. Please set VITE_HOSPITAL_ADDRESS in your .env.");
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
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#f6f8ff] via-[#ecf1ff] to-[#dde7ff] text-slate-900">

      {/* Background visuals */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_top,_rgba(151,196,255,0.75),transparent_60%)] blur-2xl opacity-70" />
        <div className="absolute -bottom-40 -right-40 h-[580px] w-[580px] rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(125,211,252,0.8),transparent_55%)] blur-3xl opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.72),transparent_55%)] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.4)_0,rgba(255,255,255,0)_40%,rgba(255,255,255,0.35)_70%,rgba(255,255,255,0)_100%)] opacity-70" />
      </div>

      {/* Main layout */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-between gap-16 px-8 py-16 lg:px-10">

        {/* Left section */}
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]" />
            Web3-powered Clinical Data Registry
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              Clinical Trial Registry
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              A secure, blockchain-powered system enabling transparent,
              auditable, and patient-controlled clinical trial data sharing.
            </p>
          </div>

          {/* Feature cards */}
          <div className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
            <FeatureCard title="Ownership" text="Patient-owned medical records." />
            <FeatureCard title="On-chain Consent" text="Immutable access and consent logs." />
            <FeatureCard title="Auditability" text="Transparent access history." />
            <FeatureCard title="Privacy" text="On-chain permissions, off-chain data." />
          </div>
        </div>

        {/* Right section */}
        <div className="flex w-full max-w-sm flex-col items-stretch">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-9 shadow-[0_18px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl">

            {/* Title */}
            <div className="mb-7 space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-slate-900">Login</h2>
              <p className="text-xs text-slate-500">Choose your access role</p>
            </div>

            {/* Patient */}
            <LoginButton
              label="Login as Patient"
              onClick={() => handleMetaMaskLogin("patient")}
            />

            {/* Divider */}
            <Divider />

            {/* Hospital */}
            <button
              onClick={() => handleMetaMaskLogin("hospital")}
              className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-[1px]"
            >
              Login as Hospital
            </button>
          </div>

          {/* Footer note */}
          <p className="mt-4 text-xs text-slate-400">
            MetaMask is used for authentication and on-chain consent only.
          </p>
        </div>
      </div>
    </div>
  );
}

/* Auxiliary UI components */
function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">{title}</p>
      <p className="mt-1 text-sm text-slate-700">{text}</p>
    </div>
  );
}

function LoginButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative mb-6 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(37,99,235,0.45)] transition-transform hover:-translate-y-[1px]"
    >
      <span className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.6),transparent)] opacity-0 transition-all duration-700 group-hover:translate-x-[120%] group-hover:opacity-100" />
      <span className="relative z-10">{label}</span>
    </button>
  );
}

function Divider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white/80 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
          or
        </span>
      </div>
    </div>
  );
}
