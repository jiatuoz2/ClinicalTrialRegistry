# 🧱 Clinical Trial Data Registry (FastAPI + Solidity + React)

This repository implements a **blockchain-powered clinical trial data registry**, deployed on the **Sepolia Test Network**.  
It demonstrates how decentralized verification ensures **transparent, auditable, and consent-driven** clinical data management between **patients**, **researchers**, and **hospitals**.

---

## 🌍 Project Overview

Traditional clinical trial data systems rely on centralized databases and manual audits, leading to issues such as:

- Lost or unverifiable patient consent records  
- Inconsistent or opaque access logs  
- Delays in detecting unauthorized data usage  

This system replaces institutional trust with **cryptographic trust** — every consent, data upload, and access event is verified and stored immutably on the blockchain.

---

## ⚙️ Core Features

### 🧬 1. Patient Consent Management
- Patients can **grant** or **revoke** consent on-chain.  
- Revoking consent **instantly blocks hospital or researcher access**.  
- Blockchain events: `ConsentGranted`, `ConsentRevoked`.

### 🏥 2. Secure Data Upload
- Patients upload clinical data (or a **hash** of it) on-chain using `uploadData`.  
- Guarantees data integrity and traceability.  
- Event: `DataUploaded`.

### 🔍 3. Access Authorization & Auditing
- Hospitals and researchers can access patient data **only when consent is active**.  
- Every access attempt triggers both:
  - On-chain event `DataAccess`
  - Off-chain database log (synchronized via FastAPI)

### 🧾 4. Real-Time Audit Trail
- Backend maintains an off-chain audit log (`AccessLog` table).  
- Patients and admins can review all access histories in real-time.

---

## 🧩 Tech Stack

| Layer | Technology |
|--------|-------------|
| **Smart Contract** | Solidity (`Hardhat`, `Ethers v6`) |
| **Backend** | Python `FastAPI` + `web3.py` + `SQLAlchemy` + `SQLite` |
| **Frontend** | React + Vite + Tailwind CSS |
| **Blockchain Network** | Sepolia Testnet (via Alchemy RPC) |

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[Patient / Hospital UI (React) 🧬] -->|HTTP Requests| B[FastAPI Backend ⚙️]
    B -->|JSON-RPC| C[Ethereum (Sepolia Testnet) 🪐]
    C -->|Events| D[(Smart Contract: ClinicalTrialRegistry 🧱)]
    B -->|Sync Logs| E[(SQLite Database 🧾)]
    E -->|Audit Queries| A
```

**Explanation:**
- The **React frontend** allows patients and hospitals to interact with the system through a clean UI.  
- The **FastAPI backend** connects to the blockchain via `web3.py` and mirrors all blockchain events into a local SQL database.  
- The **Smart Contract (ClinicalTrialRegistry)** ensures that all consent and access operations are transparent, auditable, and immutable.

---

## 🚀 Deployment (Sepolia Testnet)

### 1️⃣ Prerequisites
- Node.js **v18+**
- Python **3.10+**
- Alchemy account (for RPC)
- MetaMask wallet (connected to Sepolia)

---

### 2️⃣ Environment Setup

In `chain/.env`:

```bash
PRIVATE_KEY=your_metamask_private_key
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/your_alchemy_key
ETHERSCAN_API_KEY=your_etherscan_key
```

---

### 3️⃣ Deploy Smart Contract

```bash
cd chain
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

Deployment output example:

```
✅ ClinicalTrialRegistry deployed to: 0xb6A0DdaC049479A8564034a02C890ac9de535db6
✅ Contract verified successfully!
```

Etherscan link:  
🔗 [https://sepolia.etherscan.io/address/0xb6A0DdaC049479A8564034a02C890ac9de535db6](https://sepolia.etherscan.io/address/0xb6A0DdaC049479A8564034a02C890ac9de535db6)

---

### 4️⃣ Start FastAPI Backend

```bash
cd backend
pip install -r requirements.txt
python -m app.db_init
uvicorn app.main:app --reload --port 8000
```

---

### 5️⃣ Start React Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open 👉 [http://localhost:5173](http://localhost:5173)

If the backend uses a different port:

```bash
export VITE_API_BASE="http://localhost:8000"
```

---

## 🧪 Demo Workflow (Deployed on Sepolia)

### 👩‍⚕️ Patient Actions
1. **Grant Consent** → On-chain `grantConsent()` transaction  
2. **Upload Data** → `uploadData(bytes32)` with a Keccak-256 hash  
3. **Revoke Consent** → On-chain `revokeConsent()` transaction  

### 🧑‍🔬 Researcher / Hospital Actions
1. **View Data** → `viewData(address, string)` (requires active consent)  
2. Each access triggers both:
   - On-chain event `DataAccess`  
   - Off-chain audit record via backend  

### 🔍 Audit Access History
```
GET /audit/patient/{address}
```
Returns the patient’s access log synchronized from blockchain events.

---

## 📁 Project Structure

| Path | Description |
|------|--------------|
| `chain/contracts/ClinicalTrialRegistry.sol` | Solidity smart contract implementing consent and access control |
| `chain/scripts/deploy.ts` | Hardhat script for contract deployment and verification |
| `backend/app/main.py` | FastAPI backend handling blockchain + database logic |
| `backend/app/models/models.py` | SQLAlchemy models for `Patient` and `AccessLog` |
| `frontend/src/` | React-based dashboard UI |
| `backend/.env` | Auto-generated during deployment (contains RPC & contract info) |

---

## 🔐 Smart Contract Summary

| Function | Description |
|-----------|-------------|
| `grantConsent()` / `revokeConsent()` | Manage patient consent |
| `uploadData(bytes32)` | Upload patient data hash |
| `viewData(address, string)` | Hospital/researcher data access (requires active consent) |

---

## 💎 Highlights

- **Deployed on Sepolia Testnet** — fully verifiable via [Etherscan](https://sepolia.etherscan.io/address/0xb6A0DdaC049479A8564034a02C890ac9de535db6#code)  
- **Consent-driven access** — data access strictly depends on on-chain approval  
- **Immutable audit logs** — every access event is stored and verifiable  
- **Backend synchronization** — ensures off-chain querying and analysis  
- **End-to-end system** — smart contract + backend + frontend integration  

---

## 🧪 How to Test on Etherscan

You can interact with the verified smart contract directly at:  
👉 [ClinicalTrialRegistry on Sepolia](https://sepolia.etherscan.io/address/0xb6A0DdaC049479A8564034a02C890ac9de535db6#writeContract)

1. Click **“Write Contract”**  
2. Click **“Connect to Web3”** to connect MetaMask  
3. Test functions:
   - `grantConsent()` → authorize access  
   - `uploadData(bytes32)` → upload a data hash (e.g. `0x5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8`)  
   - `viewData(address,string)` → simulate hospital access  
   - `revokeConsent()` → withdraw access  
4. Check the **Events** tab to confirm blockchain logs (`ConsentGranted`, `DataAccess`, etc.)

---

## ⚠️ Notes
- All data and keys used here are **for testing only**.  
- No real medical or patient information is stored.  
- For production deployment:
  - Add authentication (OAuth / JWT)  
  - Encrypt off-chain data  
  - Use secure key management  
  - Implement role-based access controls  

---

✅ **Clinical Trial Data Registry is successfully deployed on Sepolia Testnet — explore the verified smart contract [here](https://sepolia.etherscan.io/address/0x38790F8BAeFEa54bcb9A86763a94852ECed466Fb#code).**
