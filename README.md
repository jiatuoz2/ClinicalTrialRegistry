# Clinical Trial Data Registry
*A Blockchain-Powered, Consent-Driven Clinical Trial Data Management System*

This repository implements a decentralized clinical trial data registry deployed on the Ethereum Sepolia Test Network.
The project demonstrates how blockchain guarantees transparent, auditable, and consent-controlled interactions between patients and the hospital, eliminating the need for trust in centralized data custodians.

---

## 1. Background and Motivation

Traditional clinical trial data infrastructure relies on centralized records, manual approvals, and human-dependent auditing. This leads to several unavoidable issues:

- Missing or unverifiable patient consent history  
- Difficulty proving whether the hospital accessed data legitimately  
- Risk of accidental or unauthorized data access  
- Inconsistent audit trails across institutions  
- Weak guarantees of data integrity  

Blockchain technology—via immutable logs and cryptographic signatures—solves these problems by ensuring that:

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

- Centralized care (hospital)  
- Decentralized sovereignty (each patient independently controls access)  
- Full traceability across all interactions  

---

## 3. Core Features

### 3.1 Patient Consent Management (On-Chain)

Patients manage their own consent via smart contract functions:

- `grantConsent()` — Enables hospital access  
- `revokeConsent()` — Immediately blocks access  

Smart contract emits:

- `ConsentGranted`  
- `ConsentRevoked`  

Consent stays authoritative because the hospital UI always checks the current blockchain state through direct contract calls.

---

### 3.2 Data Upload & Integrity Verification

Patients upload a **PDF medical record** to the backend.

The SHA-3/Keccak-256 hash of the file is stored on-chain using:

```
uploadData(bytes32 contentHash)
```

This creates immutable linkage between:

- The hash on-chain  
- The off-chain PDF stored in PostgreSQL  

Smart contract emits:

- `DataUploaded(patient, contentHash)`

---

### 3.3 Access Authorization & On-Chain Logging

The hospital can request access via:

```
viewData(address patient, string purpose)
```

This function:

- Verifies consent on-chain  
- Emits a `DataAccess` event  
- Returns success only if the patient has granted consent  

The **frontend** receives the transaction hash and sends it to the backend, where it is recorded in PostgreSQL as an audit entry.

This provides:

- An immutable blockchain-level proof of access  
- A structured backend audit log  

---

### 3.4 Dual-Layer Audit Trail

#### Blockchain Layer  
Records immutable events for:

- Consent changes  
- Data uploads  
- Access attempts  

#### Backend Layer (PostgreSQL)  
Stores:

- Patient profiles  
- Self-reports  
- Consent status (mirroring on-chain state through frontend calls)  
- Access logs sent from the frontend  

Patients and the hospital can review complete access history at any time.

---

## 4. System Components & Tech Stack

### Smart Contract (chain/)
- Solidity (0.8.x)  
- Hardhat  
- Ethers v6  
- Sepolia Testnet  
- Verified on Etherscan  

### Backend (backend/)
- FastAPI  
- SQLAlchemy ORM  
- PostgreSQL  
- REST API for:  
  - Self-report submissions  
  - Patient profile management  
  - Access log recording  
  - Consent state mirroring (via frontend queries)  
- Web3.py — Used for loading the deployed smart contract, reading on-chain consent state,
  and querying historical blockchain events through event filters.

### Frontend (frontend/)
- React + Vite  
- Tailwind CSS  
- Ethers.js (BrowserProvider)  

Two portals:

1. **Patient Portal**  
   - Consent management  
   - Daily check-ins  
   - PDF upload  

2. **Hospital Portal**  
   - Registry search  
   - Permissioned access via `viewData()`  
   - Dashboards & audit logs  

---

## 5. Environment Setup

### chain/.env

```
PRIVATE_KEY=your_metamask_private_key
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
ETHERSCAN_API_KEY=your_etherscan_key
```

### backend/.env

```
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/clinical
CONTRACT_ADDRESS=0xYourDeployedContract
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
```

---

## 6. PostgreSQL Setup

1. Install PostgreSQL  
2. Create database: `clinical`  
3. Configure backend `.env`  
4. Initialize tables:

```
python -m app.db_init
```

---

## 7. Deployment

### 7.1 Deploy Smart Contract

```
cd chain
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

### 7.2 Start Backend

```
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 7.3 Start Frontend

```
cd frontend
npm install
npm run dev
```

If backend uses a different port:

```
export VITE_API_BASE="http://localhost:8000"
```

---

## 8. End-to-End Workflow

### Patient Workflow
- Connect MetaMask  
- Upload medical PDF  
- Hash stored on-chain  
- Grant or revoke consent  
- Submit daily self-reports  

### Hospital Workflow
- Search patient by Study ID  
- Enter purpose → execute `viewData()` on-chain  
- Frontend sends access log to backend  
- Hospital views:  
  - Medical PDF  
  - Daily health reports  
  - Access history  

---

## 9. Smart Contract API Summary

| Function | Description |
|---------|-------------|
| `grantConsent()` | Patient enables hospital access |
| `revokeConsent()` | Patient blocks hospital access |
| `uploadData(bytes32)` | Upload hash of medical PDF |
| `viewData(address,string)` | Hospital requests data access |

Events emitted:

- `ConsentGranted`  
- `ConsentRevoked`  
- `DataUploaded`  
- `DataAccess`  

---

## 10. Additional Notes

- All data in this demo is test-only.  
- No real medical information or PHI is stored.   

Smart contract on Sepolia:  
https://sepolia.etherscan.io/address/0x38790F8BAeFEa54bcb9A86763a94852ECed466Fb#code

---

## 11. Conclusion

This project demonstrates how blockchain can modernize clinical trial data systems by providing:

- Cryptographic proof of patient consent  
- Immutable access logs  
- Strict permission control  
- Dual-layer auditability  

The result is a transparent, tamper-resistant, patient-centric registry aligned with the future of digital healthcare systems.
