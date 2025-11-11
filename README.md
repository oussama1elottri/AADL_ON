<<<<<<< HEAD
# AADL_ON — Auditable Housing Application Queue (MVP)

**One-line description:**  
AADL_ON, a transparent, verifiable, and tamper-proof system for fair housing allocation.

---

## Overview

aadl_on is a minimal, production-oriented proof-of-concept that implements an auditable single FIFO queue per *wilaya* (province) for Algeria’s national housing program (AADL). The repository demonstrates how verified applicant records can be anchored on-chain as immutable commitments, how a deterministic queue can be managed in a gas-efficient manner, and how citizens can obtain verifiable receipts.

This project contains:
- Smart contracts (Solidity) and tests (Foundry).
- A minimal backend (Node.js) that stores off-chain metadata and indexes on-chain events.
- A lightweight React frontend for admin verification and citizen receipts.
- Scripts and documentation to run a local development environment.

---

## Core features

- Gas-efficient FIFO queue per wilaya using head/tail mapping (O(1) enqueue/dequeue).
- On-chain commitments for applicant records (`fileHash`, `submissionTimestamp`, `wilayaCode`).
- Event-driven indexer for fast portal views and receipts.
- Admin workflow for off-chain verification → on-chain registration.
- Batchable selection flow supporting cursored execution for large selections.
- Unit, property and integration tests using Foundry (forge).

---

## Quick start (developer)

### Prerequisites
- Node.js (16+), npm or yarn
- Foundry (forge, anvil) — https://getfoundry.sh
- Git
- (Optional) MetaMask for local UI testing

### Local development (minimal commands)

1. Clone the repo
```bash
git clone https://github.com/oussama1elottri/AADL_ON
cd aadl_on
```
2. Install frontend dependencies

```bash
Copy code
cd frontend
npm install
cd ..
```
3. Start a local blockchain (Anvil)

```bash
Copy code
anvil --mnemonic 'test test test test test test test test test test test junk' -s 1
# (Anvil runs at http://127.0.0.1:8545 by default)
```
4. Run smart contract tests

```bash
Copy code
forge test
```
5. Deploy locally (example script)

```bash
Copy code
forge script script/Deploy.s.sol --fork-url http://127.0.0.1:8545 --broadcast
```
6. Start frontend (connect MetaMask to Anvil)

```bash
Copy code
cd frontend
npm start
```
7. Start backend indexer / worker (see backend/README.md for details)

```bash
Copy code
cd backend
npm install
npm run start
```
Detailed configuration and environment variables are in docs/deployment.md.
=======
## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
>>>>>>> dfca1ab (Initial commit: BatchRegistry contract with tests and scripts)
