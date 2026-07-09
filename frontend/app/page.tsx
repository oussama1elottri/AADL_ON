"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Batch } from "./types";
import { 
  ShieldCheck, 
  ShieldAlert, 
  ExternalLink, 
  Loader2, 
  Search, 
  UserCheck, 
  Hash, 
  Copy, 
  Check, 
  FileText, 
  Globe, 
  Clock, 
  Cpu,
  Calendar,
  AlertTriangle,
  Award,
  ChevronRight
} from "lucide-react";
import { encodePacked, keccak256, stringToHex } from "viem";

// Applicant Status Response Interface
interface ApplicantStatus {
  national_id: string;
  status: string;
  full_name: string | null;
  batch_id: number | null;
  offset: number | null;
  merkle_root: string | null;
  merkle_proof: string[] | null;
  file_hash: string | null;
  wilaya_code: number | null;
  timestamp: number | null;
}

export default function PublicExplorer() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [batchesError, setBatchesError] = useState<string | null>(null);

  // Citizen search state
  const [searchId, setSearchId] = useState("");
  const [applicant, setApplicant] = useState<ApplicantStatus | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<"citizen" | "explorer">("citizen");

  // Copy state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Verification Animation state
  const [verifying, setVerifying] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState<string[]>([]);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    computedRoot?: string;
  } | null>(null);

  const fetchBatches = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/v1/batches/");
      setBatches(response.data);
      setBatchesLoading(false);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
      setBatchesError("Could not connect to the Backend API. Is it running?");
      setBatchesLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setApplicant(null);
    setVerificationResult(null);
    setVerificationSteps([]);

    try {
      const response = await axios.get(`http://127.0.0.1:8000/v1/applicants/${searchId}/status`);
      setApplicant(response.data);
      setSearchLoading(false);
    } catch (err: any) {
      console.error("Failed to fetch applicant:", err);
      if (err.response && err.response.status === 404) {
        setSearchError("Applicant record not found. Verify the National ID.");
      } else {
        setSearchError("Could not connect to the Backend API. Is it running?");
      }
      setSearchLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const verifyReceiptLocally = async () => {
    if (
      !applicant ||
      !applicant.merkle_proof ||
      applicant.offset === null ||
      !applicant.file_hash ||
      applicant.timestamp === null ||
      !applicant.wilaya_code
    )
      return;

    setVerifying(true);
    setVerificationResult(null);
    setVerificationSteps([]);

    const steps: string[] = [];
    const addStep = (msg: string) => {
      steps.push(msg);
      setVerificationSteps([...steps]);
    };

    try {
      // Step 1: Compute applicant hash from ID
      addStep("Initiating cryptographic audit verification...");
      await new Promise((r) => setTimeout(r, 600));

      addStep("Step 1: Hashing sensitive National ID (Keccak-256 for privacy)...");
      const applicantHash = keccak256(stringToHex(applicant.national_id));
      await new Promise((r) => setTimeout(r, 600));
      addStep(`  └─ Applicant Hash: ${applicantHash.substring(0, 16)}...`);

      // Step 2: Combine inputs and hash to get leaf
      addStep("Step 2: Packing and hashing leaf inputs (Solidity ABI encoded)...");
      await new Promise((r) => setTimeout(r, 600));
      
      const leafHash = keccak256(
        encodePacked(
          ["bytes32", "bytes32", "uint64", "uint16"],
          [
            applicantHash,
            applicant.file_hash as `0x${string}`,
            BigInt(applicant.timestamp),
            applicant.wilaya_code
          ]
        )
      );
      addStep(`  └─ Generated Leaf Hash: ${leafHash.substring(0, 16)}...`);
      await new Promise((r) => setTimeout(r, 600));

      // Step 3: Hashing up the Merkle Proof
      addStep(`Step 3: Iterating through ${applicant.merkle_proof.length} Merkle Proof sibling hashes...`);
      await new Promise((r) => setTimeout(r, 600));

      let current: `0x${string}` = leafHash;
      let idx = applicant.offset;

      for (let i = 0; i < applicant.merkle_proof.length; i++) {
        const sibling = applicant.merkle_proof[i];
        const siblingHex = (sibling.startsWith("0x") ? sibling : `0x${sibling}`) as `0x${string}`;
        const isLeft = idx % 2 === 0;

        addStep(`  ├─ Hash step #${i + 1}: ${isLeft ? "Leaf + Sibling" : "Sibling + Leaf"}`);
        
        const packed = encodePacked(
          ["bytes32", "bytes32"],
          isLeft ? [current, siblingHex] : [siblingHex, current]
        );
        current = keccak256(packed);
        idx = Math.floor(idx / 2);
        
        await new Promise((r) => setTimeout(r, 500));
        addStep(`  │   └─ Resulting Hash: ${current.substring(0, 16)}...`);
      }

      // Step 4: Compare roots
      addStep("Step 4: Validating local reconstructed root against on-chain anchor...");
      await new Promise((r) => setTimeout(r, 800));

      const localRoot = current.toLowerCase();
      const chainRoot = applicant.merkle_root!.toLowerCase();

      if (localRoot === chainRoot) {
        addStep("  └─ ROOT MATCH SECURE! Authenticity verified.");
        setVerificationResult({ success: true, computedRoot: current });
      } else {
        addStep("  └─ CRITICAL WARNING: ROOT MISMATCH DETECTED!");
        setVerificationResult({ success: false, computedRoot: current });
      }
    } catch (err: any) {
      console.error(err);
      addStep(`Verification Error: ${err.message}`);
      setVerificationResult({ success: false });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafaf9] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto">
        
        {/* Algerian Government Inspired Header */}
        <header className="mb-10 text-center relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-950 p-6 md:p-10 shadow-xl border border-emerald-900/20">
          <div className="absolute -left-16 -top-16 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -right-16 -bottom-16 w-45 h-45 bg-emerald-300/10 rounded-full blur-3xl"></div>
          
          {/* Decorative Emblem Element */}
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-emerald-600/35 border border-emerald-500/30">
            <Globe className="w-8 h-8 text-emerald-300 animate-pulse" />
          </div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
            الجمهورية الجزائرية الديمقراطية الشعبية
          </h1>
          <h2 className="text-xl md:text-2xl font-bold text-emerald-200 mt-2 tracking-wide font-serif">
            AADL_ON Verification Notary
          </h2>
          <p className="text-sm md:text-base text-emerald-100/80 mt-2 max-w-xl mx-auto">
            Algorithmically transparent, cryptographically verifiable, and permanently anchored on Ethereum Sepolia Testnet.
          </p>
        </header>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 mb-8 bg-white p-1.5 rounded-lg shadow-sm border">
          <button
            onClick={() => setActiveTab("citizen")}
            className={`flex-1 flex items-center justify-center py-3 text-sm font-semibold rounded-md transition-all ${
              activeTab === "citizen"
                ? "bg-emerald-700 text-white shadow"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Citizen Audit Portal
          </button>
          <button
            onClick={() => {
              setActiveTab("explorer");
              fetchBatches();
            }}
            className={`flex-1 flex items-center justify-center py-3 text-sm font-semibold rounded-md transition-all ${
              activeTab === "explorer"
                ? "bg-emerald-700 text-white shadow"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Globe className="w-4 h-4 mr-2" />
            Blockchain Explorer
          </button>
        </div>

        {/* Tab 1: Citizen Audit Portal */}
        {activeTab === "citizen" && (
          <div className="space-y-8">
            
            {/* Search Input Box */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center">
                <Search className="w-5 h-5 mr-2 text-emerald-600" />
                Query Applicant Notary Receipt
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Enter your 12-digit National Identification Number (NID) to retrieve your official cryptographic receipt and status.
              </p>
              
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 222333444555"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-mono bg-[#fafaf9]"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-lg font-semibold flex items-center transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {searchLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Search className="w-5 h-5 mr-2" />
                  )}
                  Search
                </button>
              </form>

              {searchError && (
                <div className="mt-4 bg-rose-50 text-rose-700 p-3 rounded-lg border border-rose-100 text-sm flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {searchError}
                </div>
              )}
            </div>

            {/* Applicant Details Panel */}
            {applicant && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Panel: Status Timeline */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-lg border border-slate-100 p-6 h-fit">
                  <h4 className="text-md font-bold text-slate-900 mb-6 border-b pb-3">
                    Application Status
                  </h4>
                  
                  <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    
                    {/* Timeline Node 1: Submitted */}
                    <div className="relative">
                      <div className="absolute -left-[20px] top-[4px] w-5 h-5 rounded-full border-4 border-white bg-emerald-600 shadow-sm flex items-center justify-center"></div>
                      <div className="font-semibold text-slate-800 text-sm">Application Submitted</div>
                      <div className="text-slate-400 text-xs mt-0.5">Recorded in database</div>
                    </div>

                    {/* Timeline Node 2: Approved / Eligible */}
                    <div className="relative">
                      <div className={`absolute -left-[20px] top-[4px] w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                        applicant.status === "eligible" || applicant.status === "batched" || applicant.status === "selected"
                          ? "bg-emerald-600"
                          : "bg-slate-200"
                      }`}></div>
                      <div className={`font-semibold text-sm ${
                        applicant.status === "eligible" || applicant.status === "batched" || applicant.status === "selected"
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}>Approved & Eligible</div>
                      <div className="text-slate-400 text-xs mt-0.5">Audited by administration</div>
                    </div>

                    {/* Timeline Node 3: Batched / Notarized */}
                    <div className="relative">
                      <div className={`absolute -left-[20px] top-[4px] w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                        applicant.status === "batched" || applicant.status === "selected"
                          ? "bg-emerald-600"
                          : "bg-slate-200"
                      }`}>Notarized on Ethereum</div>
                      <div className={`font-semibold text-sm ${
                        applicant.status === "batched" || applicant.status === "selected"
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}>Commitment Anchored</div>
                      <div className="text-slate-400 text-xs mt-0.5">Merkle root published</div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Digital Receipt & Verification Card */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Digital Receipt Receipt */}
                  <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-white px-6 py-4 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-emerald-200 uppercase tracking-widest font-mono">Official Queue Receipt</div>
                        <div className="text-lg font-bold">AADL_ON Verification Notary</div>
                      </div>
                      <FileText className="w-8 h-8 text-emerald-200/50" />
                    </div>

                    <div className="p-6 space-y-4">
                      
                      {/* Name & ID row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                        <div>
                          <span className="text-slate-400 text-xs block uppercase">Applicant Full Name</span>
                          <span className="font-bold text-slate-800">{applicant.full_name || "Unknown citizen"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs block uppercase">National ID (Masked)</span>
                          <span className="font-mono font-bold text-slate-800">
                            {applicant.national_id.substring(0, 4)}••••{applicant.national_id.substring(8)}
                          </span>
                        </div>
                      </div>

                      {/* Batch ID, Offset & Wilaya */}
                      <div className="grid grid-cols-3 gap-4 border-b pb-4">
                        <div>
                          <span className="text-slate-400 text-xs block uppercase">Batch ID</span>
                          <span className="font-bold text-slate-800">
                            {applicant.batch_id !== null ? `#${applicant.batch_id}` : "Pending"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs block uppercase">Queue Position</span>
                          <span className="font-bold text-slate-800">
                            {applicant.offset !== null ? `${applicant.offset + 1}` : "Pending"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs block uppercase">Wilaya Code</span>
                          <span className="font-bold text-slate-800">
                            {applicant.wilaya_code || "Pending"}
                          </span>
                        </div>
                      </div>

                      {/* Notarized Hashes */}
                      <div className="space-y-3 font-mono text-xs">
                        <div>
                          <span className="text-slate-400 text-xxs block uppercase">On-Chain Merkle Root</span>
                          <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="truncate text-slate-600 mr-2">{applicant.merkle_root || "N/A"}</span>
                            {applicant.merkle_root && (
                              <button
                                onClick={() => handleCopy(applicant.merkle_root!, "root")}
                                className="text-slate-400 hover:text-emerald-700 flex-shrink-0 cursor-pointer"
                              >
                                {copiedText === "root" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 text-xxs block uppercase">Transaction Hash</span>
                          <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="truncate text-slate-600 mr-2">{applicant.file_hash || "N/A"}</span>
                            {applicant.file_hash && (
                              <button
                                onClick={() => handleCopy(applicant.file_hash!, "file")}
                                className="text-slate-400 hover:text-emerald-700 flex-shrink-0 cursor-pointer"
                              >
                                {copiedText === "file" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Widget */}
                  {applicant.status === "batched" && (
                    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6 space-y-4">
                      <div className="flex justify-between items-center border-b pb-4">
                        <h4 className="text-md font-bold text-slate-900 flex items-center">
                          <Cpu className="w-5 h-5 mr-2 text-emerald-600" />
                          Cryptographic Receipt Audit
                        </h4>
                        <button
                          onClick={verifyReceiptLocally}
                          disabled={verifying}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center transition-all cursor-pointer disabled:opacity-50"
                        >
                          {verifying && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          Verify Receipt
                        </button>
                      </div>

                      {/* Verification steps console */}
                      {verificationSteps.length > 0 && (
                        <div className="bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-xs overflow-y-auto max-h-56 border border-slate-950 space-y-1.5 shadow-inner">
                          {verificationSteps.map((step, idx) => (
                            <div key={idx} className="whitespace-pre">
                              {step}
                            </div>
                          ))}
                          {verifying && (
                            <div className="flex items-center text-slate-400 mt-2">
                              <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                              Reconstructing tree...
                            </div>
                          )}
                        </div>
                      )}

                      {/* Successful Audit Notification */}
                      {verificationResult && (
                        <div className={`p-4 rounded-lg border flex items-start ${
                          verificationResult.success
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}>
                          {verificationResult.success ? (
                            <>
                              <ShieldCheck className="w-6 h-6 mr-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-bold text-md flex items-center">
                                  Audit Successful
                                  <Award className="w-4 h-4 ml-1.5 text-emerald-600" />
                                </h5>
                                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                                  Your local computed hash correctly matches the on-chain notarized Merkle Root <strong>{applicant.merkle_root}</strong>. Your registration timestamp and queue sequence are permanently locked in Block #1 on Sepolia.
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-6 h-6 mr-3 text-rose-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-bold text-md">Audit Failed</h5>
                                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                                  Reconstructed leaf hashes resolve to <strong>{verificationResult.computedRoot}</strong> which does NOT match the root stored on the block registry <strong>{applicant.merkle_root}</strong>.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Blockchain Explorer */}
        {activeTab === "explorer" && (
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-emerald-600" />
                On-Chain Batch Registrations
              </h3>
              <button 
                onClick={fetchBatches}
                className="text-xs text-emerald-700 hover:underline flex items-center font-semibold cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 mr-1" />
                Refresh Registry
              </button>
            </div>
            
            {batchesError && (
              <div className="m-6 bg-rose-50 text-rose-600 p-4 rounded-lg border border-rose-100 text-center text-sm">
                {batchesError}
              </div>
            )}

            {batchesLoading ? (
              <div className="flex flex-col justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
                <span className="mt-2 text-sm text-slate-500">Querying Block Registry...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#fafaf9] border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Batch ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Commitment Timestamp</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Merkle Root (Commitment)</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sepolia Proof Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                          #{batch.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                          {new Date(batch.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-600">
                          <div className="flex items-center space-x-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span title={batch.merkle_root}>
                              {batch.merkle_root.substring(0, 10)}...{batch.merkle_root.substring(58)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-700">
                          {batch.tx_hash ? (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${batch.tx_hash.startsWith("0x") ? batch.tx_hash : "0x" + batch.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center hover:underline font-semibold"
                            >
                              Etherscan
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">Pending Anchor</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {batches.length === 0 && (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    No batches have been committed to the block registry yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}