"use client"; 

import { useEffect, useState } from "react";
import axios from "axios";
import { Batch } from "./types"; // Import our type definition
import { ShieldCheck, ExternalLink, Loader2 } from "lucide-react";

export default function PublicExplorer() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The function to fetch data from your FastAPI Backend
  const fetchBatches = async () => {
    try {
      // Connect to your local backend
      const response = await axios.get("http://127.0.0.1:8000/v1/batches/");
      setBatches(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
      setError("Could not connect to the Backend API. Is it running?");
      setLoading(false);
    }
  };

  // Run this once when the page loads
  useEffect(() => {
    fetchBatches();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AADL_ON Public Explorer
          </h1>
          <p className="text-gray-600">
            Immutable. Transparent. Verifiable on Sepolia Testnet.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200 text-center">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-500">Syncing with Blockchain...</span>
          </div>
        ) : (
          /* Data Table */
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Batch ID</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Merkle Root (Commitment)</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{batch.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(batch.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck className="w-4 h-4 text-green-500" />
                          <span title={batch.merkle_root}>
                            {batch.merkle_root.substring(0, 10)}...{batch.merkle_root.substring(58)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {batch.tx_hash ? (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${batch.tx_hash.startsWith("0x") ? batch.tx_hash : "0x" + batch.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center hover:underline"
                          >
                            View on Etherscan
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        ) : (
                          <span className="text-gray-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {batches.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  No batches committed to the blockchain yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}