# Clinical Trial Data Registry

A **Blockchain-Powered, Consent-Driven Clinical Trial Data Management System**

This repository implements a decentralized clinical trial data registry deployed on the Ethereum Sepolia Test Network. The project demonstrates how blockchain guarantees transparent, auditable, and consent-controlled interactions between patients and the hospital, eliminating the need for trust in centralized data custodians.

---

## 1. Background and Motivation

Traditional clinical trial data infrastructure relies on centralized records, manual approvals, and human-dependent auditing. This leads to several unavoidable issues:

- Missing or unverifiable patient consent history  
- Difficulty proving whether the hospital accessed data legitimately  
- Risk of accidental or unauthorized data access  
- Inconsistent audit trails across institutions  
- Weak guarantees of data integrity  

Blockchain technology—via immutable logs and cryptographic signatures—addresses these problems by ensuring that:

- Patients own and control their data.  
- Hospitals cannot view patient data without on-chain consent.  
- Every read action, write action, and consent change is permanently recorded on-chain.  

---

## 2. System Architecture

### Multi-Patient, Single-Hospital Model

This project adopts a **multi-patient, single-hospital** permission design:

- Each patient has full on-chain control over their data.  
- Each patient can independently grant or revoke consent.  
- Only one hospital wallet is permitted to request access to patient data.  
- The hospital’s data access is strictly controlled by each patient's on-chain consent flag.

This architecture ensures:

- **Centralized care** (hospital)  
- **Decentralized sovereignty** (each patient independently controls access)  
- **Full traceability** across all interactions  

At a high level:

- The **smart contract** enforces consent and records immutable events.  
- The **frontend** (Patient Portal + Hospital Portal) performs all on-chain interactions via Ethers.js.  
- The **backend** (FastAPI + PostgreSQL) persists clinical metadata, self-reports, and audit logs, and can optionally use Web3.py for read-only verification and event inspection.

Web3.py is integrated into the backend codebase as a **future-facing capability** for on-chain validation and analytics, while the current prototype keeps all transaction submission and consent toggling on the frontend for clarity and simplicity.

---

## 3. Core Features

### 3.1 Patient Consent Management (On-Chain)

Patients manage their own consent via smart contract functions:

- `grantConsent()` — Enables hospital access  
- `revokeConsent()` — Immediately blocks access  

The smart contract emits:

- `ConsentGranted`  
- `ConsentRevoked`  

Consent remains authoritative because the hospital UI always checks the current blockchain state through direct contract calls from the frontend.

---

### 3.2 Data Upload & Integrity Verification

Patients upload a PDF medical record to the backend.

The SHA-3/Keccak-256 hash of the file is computed in the frontend and stored on-chain using:

- `uploadData(bytes32 contentHash)`  

This creates an immutable linkage between:

- The hash on-chain  
- The off-chain PDF stored in PostgreSQL / object storage  

The smart contract emits:

- `DataUploaded(patient, contentHash)`  

---

### 3.3 Access Authorization & On-Chain Logging

The hospital can request access via:

- `viewData(address patient, string purpose)`  

This function:

1. Verifies the patient's consent flag on-chain.  
2. Emits a `DataAccess` event.  
3. Returns success only if the patient has granted consent.

The hospital frontend receives the transaction hash and sends it to the backend, where it is recorded in PostgreSQL as an audit entry.

This provides:

- An immutable **blockchain-level proof** of access.  
- A structured **backend audit log** for querying and visualization.

Currently, all interactions with `viewData` are performed from the frontend via Ethers.js. Web3.py can be used in future extensions to independently verify access events or to build background indexers.

---

### 3.4 Dual-Layer Audit Trail

**Blockchain Layer**  
Records immutable events for:

- Consent changes (`ConsentGranted`, `ConsentRevoked`)  
- Data uploads (`DataUploaded`)  
- Access attempts (`DataAccess`)  

**Backend Layer (PostgreSQL)**  
Stores:

- Patient profiles  
- Self-reports (daily check-ins)  
- Consent status (mirroring on-chain state based on confirmed frontend interactions)  
- Access logs sent from the frontend, each tied to a transaction hash  

The backend includes Web3.py integration that can be used for **read-only verification** of on-chain consent flags and events. In the current prototype, this capability is optional and not part of the main REST API flow; the system operates correctly even if Web3.py is not actively used, since the frontend already validates transactions and sends the resulting hashes to the backend.

Patients and the hospital can review complete access history at any time, combining on-chain proofs with off-chain structured logs.

---

## 4. System Components & Tech Stack

### Smart Contract (`chain/`)

- Solidity (0.8.x)  
- Hardhat  
- Ethers v6  
- Sepolia Testnet  
- Verified on Etherscan  

Core responsibilities:

- Manage consent flags per patient.  
- Store hashes of medical PDFs.  
- Emit events for all critical actions.  

---

### Backend (`backend/`)

- **FastAPI** — REST API server  
- **SQLAlchemy ORM** — Database mapping  
- **PostgreSQL** — Persistent storage  
- **Web3.py (optional, integrated)**  
  - Can load the deployed smart contract  
  - Can query on-chain consent state and historical events  
  - Currently used as an optional utility layer

In the **current implementation**:

- All on-chain transactions (consent changes, uploads, access requests) are initiated from the frontend.  
- The backend focuses on:
  - Storing patient profiles and study IDs  
  - Persisting self-reports and metadata  
  - Recording tx hashes and access logs for auditing  
  - Mirroring consent status based on trusted frontend updates  

Web3.py is available for future enhancements, such as:

- Backend-side verification of consent flags before serving sensitive data  
- Periodic indexing of blockchain events into PostgreSQL for analytics  
- Cross-checking stored audit logs against on-chain history

---

### Frontend (`frontend/`)

- React + Vite  
- Tailwind CSS  
- Ethers.js (`BrowserProvider`)  

Provides two portals:

#### Patient Portal

- Connects with MetaMask  
- Consent management (`grantConsent`, `revokeConsent`)  
- Medical PDF upload (hash computed and stored on-chain)  
- Daily self-report submission (symptoms, medication adherence)  
- Review of personal history and consent activity

#### Hospital Portal

- Search patients by Study ID  
- Request controlled data access via `viewData()`  
- Sends the resulting transaction hash to the backend as an access log  
- Visualizes:
  - Medical PDFs  
  - Daily self-reports  
  - Combined blockchain + backend audit history  

---

## 5. Environment Setup

### `chain/.env`

```bash
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_KEY>
PRIVATE_KEY=<YOUR_WALLET_PRIVATE_KEY>
ETHERSCAN_API_KEY=<YOUR_API_KEY>
HOSPITAL_WALLET_ADDRESS=<YOUR_HOSPITAL_WALLET_ADDRESS>
```

### `backend/.env`

```bash
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_KEY>
CONTRACT_ADDRESS=0xYourDeployedContract
NETWORK=sepolia

DATABASE_URL=postgresql+psycopg2://postgres:<YOUR_PASSWORD>@localhost:5432/clinical
```

### `frontend/.env`

```bash
VITE_HOSPITAL_ADDRESS=<YOUR_HOSPITAL_WALLET_ADDRESS>
VITE_REGISTRY_ADDRESS=<YOUR_REGISTRY_WALLET_ADDRESS>
```

---

## 6. PostgreSQL Setup

1. Install PostgreSQL  
2. Create database:

```sql
CREATE DATABASE clinical;
```

3. Configure `backend/.env`  
4. Initialize tables:

```bash
cd backend
python -m app.db_init
```

---

## 7. Deployment

### 7.1 Deploy Smart Contract

```bash
cd chain
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

---

### 7.2 Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

### 7.3 Start Frontend

```bash
cd frontend
npm install
npm run dev
```

If the backend uses a different port, set:

```bash
export VITE_API_BASE="http://localhost:8000"
```

---

## 8. End-to-End Workflow

### Patient Workflow

1. Connect MetaMask.  
2. Upload medical PDF (hash is computed and stored on-chain).  
3. Grant or revoke consent at any time via `grantConsent` / `revokeConsent`.  
4. Submit daily self-reports (symptoms + medication adherence).  
5. Review personal history and consent activity in the Patient Portal.

### Hospital Workflow

1. Search patient by Study ID.  
2. Enter an access purpose; execute `viewData()` on-chain.  
3. Frontend receives the transaction hash and sends it to the backend as an access log.  
4. Hospital views:
   - The patient's medical PDF  
   - Daily health reports  
   - Access history 

---

## 9. Smart Contract API Summary

### Functions

| Function                       | Description                         |
| ------------------------------ | ----------------------------------- |
| `grantConsent()`               | Patient enables hospital access     |
| `revokeConsent()`             | Patient blocks hospital access      |
| `uploadData(bytes32)`         | Upload hash of medical PDF          |
| `viewData(address,string)`    | Hospital requests data access       |

### Events

- `ConsentGranted(address patient)`  
- `ConsentRevoked(address patient)`  
- `DataUploaded(address patient, bytes32 contentHash)`  
- `DataAccess(address patient, address hospital, string purpose)`  

---

## 10. Additional Notes

- All data in this demo is test-only.  
- No real medical information or PHI is stored.  
- Smart contract (Sepolia):  
  `https://sepolia.etherscan.io/address/0x38790F8BAeFEa54bcb9A86763a94852ECed466Fb#code`

---

## 11. Conclusion

This project demonstrates how blockchain can modernize clinical trial data systems by providing:

- Cryptographic proof of patient consent  
- Immutable access logs  
- Strict permission control  
- Dual-layer auditability (on-chain + backend)  

The result is a transparent, tamper-resistant, patient-centric registry aligned with the future of digital healthcare systems.
