### 1. The Core Mission
**Goal:** Restore public trust in the Algerian housing allocation process.
**Mechanism:** Radical Transparency via "Proof of Inclusion."
**Motto:** "Verify, Don't Trust."
**Technical Strategy:** We do not build the entire system *on* the blockchain. Instead, we use a standard, efficient web application and use the blockchain strictly as an **Immutable Public Notary**.

---

### 2. The Architecture: "Web 2.5" (Hybrid)

We rejected a fully decentralized architecture (too expensive, privacy issues) and a private blockchain (too centralized, low trust). We chose the **Hybrid Model**.

*   **Off-Chain (Centralized):** Handles PII, heavy data storage, user interface, and business logic. Fast and cheap.
*   **On-Chain (Decentralized):** Stores only cryptographic commitments (Merkle Roots). Permanent and tamper-proof.

---

### 3. The Component Map

Here is the system we have designed and partially built, broken down by responsibility.

#### **A. The Database (The Private Ledger)**
*   **Tech:** PostgreSQL (running in Docker).
*   **Role:** The single source of truth for the application state.
*   **Key Tables:**
    *   `applicants`: Stores PII (`full_name`), system data (`applicant_hash`, `status`), and Merkle data (`file_hash`, `wilaya`).
    *   `batches`: Stores the mirror of on-chain events (`merkle_root`, `tx_hash`).
    *   `leaves`: Links applicants to batches (`applicant_hash` -> `batch_id` + `offset`).

#### **B. The Backend API (The Gatekeeper)**
*   **Tech:** Python, FastAPI, Pydantic, SQLAlchemy.
*   **Role:** The secure entry point for data.
*   **Key Functions:**
    *   **Ingestion (`POST /v1/applicants`):** Validates inputs, hashes the National ID (privacy), and saves to the DB.
    *   **Batching (`POST /v1/batches`):** The "Admin" button. It triggers the logic to bundle eligible applicants into a Merkle Tree.

#### **C. The Blockchain Service (The Bridge)**
*   **Tech:** `web3.py`, `merkle_utils.py` (custom module).
*   **Role:** Performs the cryptography and interacts with the Ethereum network.
*   **Workflow:**
    1.  Fetch eligible applicants from DB.
    2.  Build Merkle Tree locally.
    3.  Sign transaction with Operator Private Key.
    4.  Call `commitBatch()` on the smart contract.

#### **D. The Smart Contract (The Anchor)**
*   **Tech:** Solidity, Foundry (for testing), Sepolia Testnet (L2 simulation).
*   **Name:** `BatchRegistry.sol`.
*   **Role:** A dumb, immutable storage locker. It stores the `Merkle Root` and emits an event. It doesn't know *who* is in the batch, only the *fingerprint* of the batch.

#### **E. The Indexer (The Scribe)**
*   **Tech:** Python, `web3.py` (Async), `asyncio`.
*   **Role:** The synchronization engine.
*   **Workflow:**
    1.  Listens for `BatchCommitted` events on-chain.
    2.  "Reconciles" the event with the local database (matches the Batch ID to the eligible applicants).
    3.  Writes the proof data into the `batches` and `leaves` tables.
    4.  Updates applicant status to `BATCHED`.

---

### 4. Key Design Decisions & "Why"

| Decision | Alternative | Why we chose this way |
| :--- | :--- | :--- |
| **Public Testnet (Sepolia)** | Private Blockchain (Hyperledger) | **Trust.** A private chain controlled by the government is just a slow database. A public chain cannot be edited by the government, ensuring true auditability. |
| **Merkle Trees** | Storing names on-chain | **Privacy & Cost.** Putting PII on-chain is illegal/unethical. Putting millions of rows on-chain costs a fortune. A Merkle Root creates a proof for millions of people in a single, cheap transaction. |
| **Indexer Pattern** | Querying chain directly from UI | **Performance.** Blockchains are terrible for queries like "Find my status." We need a SQL database (the Indexer's output) to make the User Interface fast. |
| **Separation of Concerns** | One giant script | **Reliability.** By splitting the API (write), the Batcher (commit), and the Indexer (read/sync), we ensure that if one part fails, the data integrity isn't corrupted. |

---

### 5. The Data Flow (Fatima's Journey)

1.  **Submission:** Fatima submits data -> **API** hashes ID -> Saves to **`applicants` Table**.
2.  **Commitment:** Admin triggers Batch -> **Blockchain Service** builds Tree -> Sends Root to **Sepolia**.
3.  **Notarization:** **Smart Contract** stores Root -> Emits `BatchCommitted` Event.
4.  **Syncing:** **Indexer** hears Event -> Reads `applicants` DB -> Writes to **`leaves` Table**.
5.  **Verification:** Fatima checks status -> **API** reads `leaves` Table -> Returns **Merkle Proof**.
