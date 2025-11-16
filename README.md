# Clinical Trial Data Registry (FastAPI + Solidity + React)

This repository implements a blockchain-powered clinical trial data
registry, deployed on the Sepolia Test Network. It demonstrates how
decentralized verification ensures transparent, auditable, and
consent-driven clinical data management between patients and the
hospital.

------------------------------------------------------------------------

## Project Overview

Traditional clinical trial data systems rely on centralized databases
and manual audits, leading to challenges such as:

-   Lost or unverifiable patient consent records\
-   Inconsistent or opaque access logs\
-   Delays in detecting unauthorized data usage

This system replaces institutional trust with cryptographic trust.\
Every consent, data upload, and access event is verified and stored
immutably on the blockchain.

------------------------------------------------------------------------

## System Design: Multi-Patient, Single-Hospital Model

This project follows a **multi-patient, single-hospital architecture**.\
Each patient independently manages their own consent and data on-chain,
while **the hospital** is the only authorized entity permitted to
request access to patient records.\
This streamlined permission model ensures that all patient consent
directly controls whether the hospital can view their data.

------------------------------------------------------------------------

## Core Features

### 1. Patient Consent Management

-   Patients can grant or revoke consent on-chain.\
-   Revoking consent instantly blocks hospital access.\
-   Blockchain events include `ConsentGranted` and `ConsentRevoked`.

### 2. Secure Data Upload

-   Patients upload clinical data or a hash of it on-chain using
    `uploadData`.\
-   Ensures integrity, traceability, and immutability via blockchain.\
-   Event: `DataUploaded`.

### 3. Access Authorization and Auditing

-   The hospital can access patient data only when consent is active.\
-   Every access attempt generates:
    -   An on-chain `DataAccess` event\
    -   A synchronized PostgreSQL audit log entry

### 4. Real-Time Audit Trail

-   Backend maintains a PostgreSQL-based audit log (AccessLog table).\
-   Patients and administrators can review access histories in real
    time.

------------------------------------------------------------------------

## Tech Stack

-   **Smart Contract:** Solidity (Hardhat, Ethers v6)\
-   **Backend:** FastAPI, web3.py, SQLAlchemy, PostgreSQL\
-   **Frontend:** React, Vite, Tailwind CSS\
-   **Blockchain Network:** Sepolia Testnet (Alchemy RPC)

------------------------------------------------------------------------

## Environment Setup

### chain/.env

    PRIVATE_KEY=your_metamask_private_key
    ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/your_alchemy_key
    ETHERSCAN_API_KEY=your_etherscan_key

### backend/.env

    DATABASE_URL=postgresql+psycopg2://username:password@host:port/database_name
    CONTRACT_ADDRESS=0xYourDeployedContract
    ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/your_alchemy_key

------------------------------------------------------------------------

## Deploy Smart Contract

    cd chain
    npm install
    npx hardhat compile
    npx hardhat run scripts/deploy.ts --network sepolia

Example:

    ClinicalTrialRegistry deployed to: 0x1234...
    Contract verified successfully

------------------------------------------------------------------------

## Start FastAPI Backend

    cd backend
    pip install -r requirements.txt
    python -m app.db_init
    uvicorn app.main:app --reload --port 8000

Backend tasks:

-   Connects to PostgreSQL\
-   Listens for blockchain events\
-   Synchronizes on-chain events into the database

------------------------------------------------------------------------

## Start React Frontend

    cd frontend
    npm install
    npm run dev

If backend uses a different port:

    export VITE_API_BASE="http://localhost:8000"

------------------------------------------------------------------------

## Demo Workflow

### Patient Actions

-   Grant consent: `grantConsent()`\
-   Upload data: `uploadData(bytes32)`\
-   Revoke consent: `revokeConsent()`

### Hospital Actions

-   Access patient data: `viewData(address,string)`\
-   Every access produces:
    -   On-chain `DataAccess`
    -   PostgreSQL audit log entry

### View Audit History

    GET /audit/patient/{address}

------------------------------------------------------------------------

## Project Structure

-   `chain/contracts/ClinicalTrialRegistry.sol` --- Smart contract\
-   `chain/scripts/deploy.ts` --- Deployment and verification\
-   `backend/app/main.py` --- FastAPI backend\
-   `backend/app/models/models.py` --- PostgreSQL SQLAlchemy models\
-   `frontend/src/` --- React UI\
-   `backend/.env` --- Backend configuration

------------------------------------------------------------------------

## Smart Contract Summary

-   `grantConsent()` / `revokeConsent()`\
-   `uploadData(bytes32)`\
-   `viewData(address, string)`

------------------------------------------------------------------------

## Notes

-   All keys and data are for testing only.\
-   No real medical information is stored.\
