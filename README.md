# AADL_ON — Algorithmic Housing Allocation Notary & ZK Audit Portal

> **Algorithmic Housing Allocation Notary & Zero-Knowledge Priority Verification Platform for National Programs.**

---

## ✍️ Project Motivation (Written by Author)

<!-- 
[MENTOR NOTE FOR YOU]: Write 2-3 sentences here in your own words explaining your motivation.
Example ideas to include:
- What inspired you to build a blockchain notary for national housing programs like AADL?
- Why is combining privacy (ZK) with public auditability (Ethereum) critical for public trust?
-->
*`[Add your personal introduction here: Explain why you chose to tackle algorithmic transparency and privacy in public housing allocation.]`*

---

## 🏛️ System Architecture

```mermaid
graph TD
    User([Citizen / Admin Client]) -->|Next.js App / REST| API[FastAPI Backend Server]
    API -->|PostgreSQL Engine| DB[(PostgreSQL Database)]
    API -->|Async ZoKrates Execution| ZK[ZoKrates Groth16 Prover]
    ZK -->|proof.json & Public Inputs| User
    API -->|Batch Commitment Notary| Web3[Web3.py Notary Client]
    Web3 -->|Merkle Root & TX Hash| Chain[Ethereum Blockchain - Sepolia / Anvil]
    Chain -->|BatchRegistry & Verifier.sol| Contracts[Smart Contracts]
```

---

## ⚡ Core Technical Features

- **Zero-Knowledge Priority Verification**: Built using ZoKrates Groth16 ZK-SNARK circuit (`priority_validator.zok`) proving `calculated_score == f(age, married, children, income, disabled)` without revealing private inputs.
- **Merkle Tree Batch Notarization**: Aggregates applicant hashes into deterministic Merkle roots and anchors them on-chain via `BatchRegistry.sol`.
- **Role-Based Access Control & Rate Limiting**: OpenZeppelin `AccessControl` for smart contract permissioning and sliding-window rate limiters for API endpoints.
- **Executive Document Minimalist & Dual-Language UI**: High-contrast interface supporting both English (LTR) and Arabic (RTL) layouts.
- **Foundry Test Suite**: Smart contract test coverage for access control, state transitions, custom error reverts, and ZK verifier routing.

---

## ✍️ Key Engineering Challenges & Learnings (Written by Author)

<!-- 
[MENTOR NOTE FOR YOU]: Write 1-2 paragraphs here sharing your technical takeaways.
Example ideas to include:
- What was the most interesting technical challenge you solved? (e.g. non-blocking async ZoKrates worker threads, Merkle proof tree folding in TypeScript, or custom error gas optimization in Solidity).
- How did this project shape your understanding of Web3 architecture?
-->
*`[Add your personal reflections here: Highlight 1 or 2 specific technical hurdles you overcame while building the system.]`*

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Foundry** (`forge`, `anvil`): [https://getfoundry.sh](https://getfoundry.sh)
- **Python 3.10+** & **Docker Compose**
- **Node.js 18+** & **npm**

### 1. Smart Contracts (Foundry)
```bash
# Build smart contracts
forge build

# Run unit test suite
forge test -vvv

# Local Anvil deployment
anvil &
forge script script/DeployBatchRegistry.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### 2. Backend (FastAPI + ZoKrates)
```bash
# Virtual environment & dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start API server
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend (Next.js 14)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔬 ZK-SNARK Circuit Specification (`priority_validator.zok`)

```rust
def main(
    private u32 age,
    private bool is_married,
    private u32 number_of_children,
    private u32 monthly_income,
    private bool is_disabled,
    public u32 public_score
) {
    u32 score = 0;
    score = score + (age >= 30 && age <= 45 ? 20 : 0);
    score = score + (is_married ? 15 : 0);
    score = score + number_of_children * 10;
    score = score + (monthly_income < 50000 ? 30 : 0);
    score = score + (is_disabled ? 40 : 0);

    assert(score == public_score);
    return;
}
```

---

## ⚖️ License

Distributed under the **MIT License**. See `LICENSE` for details.
