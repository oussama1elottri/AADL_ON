#!/bin/bash
set -e

# Make sure we are in the root directory
if [ ! -f "backend/zk/priority_validator.zok" ]; then
    echo "Error: Please run this script from the project root directory."
    exit 1
fi

echo "🚀 [1/3] Compiling ZoKrates circuit..."
docker run --rm -v "$(pwd)/backend/zk:/home/zokrates/code" zokrates/zokrates zokrates compile -i code/priority_validator.zok -o code/out

echo "🔑 [2/3] Performing ZK Trusted Setup (Generating keys)..."
docker run --rm -v "$(pwd)/backend/zk:/home/zokrates/code" zokrates/zokrates zokrates setup -i code/out -p code/proving.key -v code/verification.key

echo "📜 [3/3] Exporting Solidity Verifier contract..."
docker run --rm -v "$(pwd)/backend/zk:/home/zokrates/code" zokrates/zokrates zokrates export-verifier -i code/verification.key -o code/verifier.sol

# Copy verifier contract to Solidity source directory
echo "🚚 Copying verifier contract to src/Verifier.sol..."
cp backend/zk/verifier.sol src/Verifier.sol

echo "🟢 ZK Setup Complete! verifier.sol is ready at src/Verifier.sol"
