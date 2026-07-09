#!/bin/bash

# Clean up background processes on exit (Ctrl+C)
trap "echo 'Shutting down all services...'; kill 0" EXIT

echo "🚀 [1/5] Starting local Anvil blockchain node..."
anvil --port 8545 --mnemonic 'test test test test test test test test test test test junk' -s 1 > anvil.log 2>&1 &
sleep 2 # Wait for Anvil to boot

echo "📜 [2/5] Deploying smart contract..."
forge script script/DeployBatchRegistry.s.sol:DeployBatchRegistry --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

echo "💾 [3/5] Initializing local database schemas..."
.venv/bin/python3 backend/init_db.py

echo "🔌 [4/5] Starting FastAPI Backend (http://127.0.0.1:8000)..."
.venv/bin/uvicorn backend.main:app --port 8000 > backend.log 2>&1 &

echo "🔍 [5/5] Starting Indexer Event Listener..."
.venv/bin/python3 indexer/listener.py > indexer.log 2>&1 &

echo "💻 [Bonus] Starting Next.js Frontend (http://localhost:3000)..."
cd frontend && npm run dev &

# Keep the script running to maintain child processes
echo "🟢 All services started successfully. Logs are directed to anvil.log, backend.log, and indexer.log."
echo "Press Ctrl+C to stop all services simultaneously."
wait
