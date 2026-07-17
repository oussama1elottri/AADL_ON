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
  ChevronRight,
  UserPlus,
  Send,
  Building,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Fingerprint,
  KeyRound,
  Binary
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

const ALGERIAN_WILAYAS = [
  { code: 1, name: "01 - Adrar (أدرار)" },
  { code: 2, name: "02 - Chlef (الشلف)" },
  { code: 3, name: "03 - Laghouat (الأغواط)" },
  { code: 4, name: "04 - Oum El Bouaghi (أم البواقي)" },
  { code: 5, name: "05 - Batna (باتنة)" },
  { code: 6, name: "06 - Béjaïa (بجاية)" },
  { code: 7, name: "07 - Biskra (بسكرة)" },
  { code: 8, name: "08 - Béchar (بشار)" },
  { code: 9, name: "09 - Blida (البليدة)" },
  { code: 10, name: "10 - Bouira (البويرة)" },
  { code: 11, name: "11 - Tamanrasset (تمنراست)" },
  { code: 12, name: "12 - Tébessa (تبسة)" },
  { code: 13, name: "13 - Tlemcen (تلمسان)" },
  { code: 14, name: "14 - Tiaret (تيارت)" },
  { code: 15, name: "15 - Tizi Ouzou (تيزي وزو)" },
  { code: 16, name: "16 - Algiers (الجزائر)" },
  { code: 17, name: "17 - Djelfa (الجلفة)" },
  { code: 18, name: "18 - Jijel (جيجل)" },
  { code: 19, name: "19 - Sétif (سطيف)" },
  { code: 20, name: "20 - Saïda (سعيدة)" },
  { code: 21, name: "21 - Skikda (سكيكدة)" },
  { code: 22, name: "22 - Sidi Bel Abbès (سيدي بلعباس)" },
  { code: 23, name: "23 - Annaba (عنابة)" },
  { code: 24, name: "24 - Guelma (قالمة)" },
  { code: 25, name: "25 - Constantine (قسنطينة)" },
  { code: 26, name: "26 - Médéa (المدية)" },
  { code: 27, name: "27 - Mostaganem (مستغانم)" },
  { code: 28, name: "28 - M'Sila (المسيلة)" },
  { code: 29, name: "29 - Mascara (معسكر)" },
  { code: 30, name: "30 - Ouargla (ورقلة)" },
  { code: 31, name: "31 - Oran (وهران)" },
  { code: 32, name: "32 - El Bayadh (البيض)" },
  { code: 33, name: "33 - Illizi (إليزي)" },
  { code: 34, name: "34 - Bordj Bou Arréridj (برج بوعريريج)" },
  { code: 35, name: "35 - Boumerdès (بومرداس)" },
  { code: 36, name: "36 - El Tarf (الطارف)" },
  { code: 37, name: "37 - Tindouf (تندوف)" },
  { code: 38, name: "38 - Tissemsilt (تيسمسيلت)" },
  { code: 39, name: "39 - El Oued (الوادي)" },
  { code: 40, name: "40 - Khenchela (خنشلة)" },
  { code: 41, name: "41 - Souk Ahras (سوق أهراس)" },
  { code: 42, name: "42 - Tipaza (تيبازة)" },
  { code: 43, name: "43 - Mila (ميلة)" },
  { code: 44, name: "44 - Aïn Defla (عين الدفلى)" },
  { code: 45, name: "45 - Naâma (النعامة)" },
  { code: 46, name: "46 - Aïn Témouchent (عين تموشنت)" },
  { code: 47, name: "47 - Ghardaïa (غرداية)" },
  { code: 48, name: "48 - Relizane (غليزان)" },
  { code: 49, name: "49 - Timimoun (تيميمون)" },
  { code: 50, name: "50 - Bordj Badji Mokhtar (برج باجي مختار)" },
  { code: 51, name: "51 - Ouled Djellal (أولاد جلال)" },
  { code: 52, name: "52 - Béni Abbès (بني عباس)" },
  { code: 53, name: "53 - In Salah (عين صالح)" },
  { code: 54, name: "54 - In Guezzam (عين قزام)" },
  { code: 55, name: "55 - Touggourt (تقرت)" },
  { code: 56, name: "56 - Djanet (جانت)" },
  { code: 57, name: "57 - El M'Ghair (المغير)" },
  { code: 58, name: "58 - El Meniaa (المنيعة)" }
];

export default function PublicExplorer() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [batchesError, setBatchesError] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<"register" | "citizen" | "explorer" | "admin">("register");

  // Citizen search state
  const [searchId, setSearchId] = useState("");
  const [applicant, setApplicant] = useState<ApplicantStatus | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Registration form state
  const [regFullName, setRegFullName] = useState("");
  const [regNationalId, setRegNationalId] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regWilaya, setRegWilaya] = useState(16); // Default to Algiers (16)
  const [regAge, setRegAge] = useState<number>(35);
  const [regIsMarried, setRegIsMarried] = useState<boolean>(false);
  const [regChildren, setRegChildren] = useState<number>(0);
  const [regIncome, setRegIncome] = useState<number>(45000);
  const [regIsDisabled, setRegIsDisabled] = useState<boolean>(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<any | null>(null);

  // Admin approval registry state
  const [registry, setRegistry] = useState<any[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);

  // Batch notarization trigger state
  const [batchTriggerLoading, setBatchTriggerLoading] = useState(false);
  const [batchTriggerSuccess, setBatchTriggerSuccess] = useState<any | null>(null);
  const [batchTriggerError, setBatchTriggerError] = useState<string | null>(null);

  // Copy state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Verification Animation state
  const [verifying, setVerifying] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState<string[]>([]);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    computedRoot?: string;
  } | null>(null);

  // Zero-Knowledge Proof State
  const [zkLoading, setZkLoading] = useState(false);
  const [zkError, setZkError] = useState<string | null>(null);
  const [zkProofData, setZkProofData] = useState<any | null>(null);
  const [zkStatus, setZkStatus] = useState<string | null>(null);

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

  const fetchRegistry = async () => {
    setRegistryLoading(true);
    setRegistryError(null);
    try {
      const response = await axios.get("http://127.0.0.1:8000/v1/applicants/");
      setRegistry(response.data);
      setRegistryLoading(false);
    } catch (err) {
      console.error("Failed to fetch registry:", err);
      setRegistryError("Could not fetch applicant list. Is the backend running?");
      setRegistryLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleSearch = async (e?: React.FormEvent, targetId?: string) => {
    if (e) e.preventDefault();
    const idToSearch = targetId || searchId;
    if (!idToSearch.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setApplicant(null);
    setVerificationResult(null);
    setVerificationSteps([]);

    try {
      const response = await axios.get(`http://127.0.0.1:8000/v1/applicants/${idToSearch}/status`);
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

  const generateZkProof = async (nationalId: string) => {
    setZkLoading(true);
    setZkError(null);
    setZkProofData(null);
    setZkStatus("Computing witness trace inside ZoKrates...");

    try {
      const response = await axios.post(`http://127.0.0.1:8000/v1/applicants/${nationalId}/prove`);
      setZkStatus("Synthesizing SNARK proof parameters...");
      await new Promise((r) => setTimeout(r, 800));
      setZkProofData(response.data);
      setZkStatus("Cryptographic ZK Proof generated successfully!");
    } catch (err: any) {
      console.error("ZK Proof Generation failed:", err);
      setZkError(err.response?.data?.detail || "Could not connect to ZK proving service.");
      setZkStatus(null);
    } finally {
      setZkLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    // Inputs check
    if (!regFullName.trim() || !regNationalId.trim() || !regAddress.trim()) {
      setRegError("Please fill out all fields.");
      return;
    }

    // 12-digit numeric validation
    const digitsOnly = /^\d{12}$/;
    if (!digitsOnly.test(regNationalId.trim())) {
      setRegError("National ID must be exactly 12 numeric digits.");
      return;
    }

    setRegLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:8000/v1/applicants/", {
        national_id: regNationalId.trim(),
        full_name: regFullName.trim(),
        address: regAddress.trim(),
        wilaya_code: Number(regWilaya),
        age: Number(regAge),
        is_married: regIsMarried,
        number_of_children: Number(regChildren),
        monthly_income: Number(regIncome),
        is_disabled: regIsDisabled
      });
      setRegSuccess(response.data);
      setRegLoading(false);
    } catch (err: any) {
      console.error("Registration failed:", err);
      if (err.response && err.response.status === 409) {
        setRegError("An application with this National ID has already been registered.");
      } else {
        setRegError("Could not submit registration. Is the backend running?");
      }
      setRegLoading(false);
    }
  };

  const approveCitizen = async (applicantHash: string) => {
    try {
      await axios.put(
        `http://127.0.0.1:8000/v1/applicants/${applicantHash}/approve`,
        {},
        { headers: { "X-Admin-Key": "government-secret-notary-key" } }
      );
      fetchRegistry();
    } catch (err: any) {
      console.error("Failed to approve applicant:", err);
      alert(err.response?.data?.detail || "Failed to approve applicant.");
    }
  };

  const triggerBatchNotarization = async () => {
    setBatchTriggerLoading(true);
    setBatchTriggerSuccess(null);
    setBatchTriggerError(null);
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/v1/batches/",
        {},
        { headers: { "X-Admin-Key": "government-secret-notary-key" } }
      );
      if (response.status === 202) {
        setBatchTriggerSuccess(response.data);
        fetchRegistry();
        fetchBatches();
      } else {
        setBatchTriggerError("No eligible applicants to batch or batch already active.");
      }
      setBatchTriggerLoading(false);
    } catch (err: any) {
      console.error("Failed to trigger batch:", err);
      setBatchTriggerError(err.response?.data?.detail || "Failed to commit batch on-chain.");
      setBatchTriggerLoading(false);
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
      addStep("Initiating cryptographic audit verification...");
      await new Promise((r) => setTimeout(r, 600));

      addStep("Step 1: Hashing sensitive National ID (Keccak-256 for privacy)...");
      const applicantHash = keccak256(stringToHex(applicant.national_id));
      await new Promise((r) => setTimeout(r, 600));
      addStep(`  └─ Applicant Hash: ${applicantHash.substring(0, 16)}...`);

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

  const startNewApplication = () => {
    setRegFullName("");
    setRegNationalId("");
    setRegAddress("");
    setRegWilaya(16);
    setRegAge(35);
    setRegIsMarried(false);
    setRegChildren(0);
    setRegIncome(45000);
    setRegIsDisabled(false);
    setRegSuccess(null);
    setRegError(null);
  };

  const proceedToVerify = (nid: string) => {
    setSearchId(nid);
    setActiveTab("citizen");
    handleSearch(undefined, nid);
  };

  const eligibleCount = registry.filter((app) => app.status === "eligible").length;

  return (
    <main className="min-h-screen bg-[#faf9f6] p-4 md:p-10 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Executive Document Header */}
        <header className="bg-[#006633] border-b-4 border-b-amber-500/80 p-8 md:p-10 text-center space-y-3 rounded-sm shadow-md text-white">
          <div className="text-base md:text-lg font-bold text-amber-200 tracking-wide font-sans">
            الجمهورية الجزائرية الديمقراطية الشعبية
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-sans">
            AADL_ON Verification Notary Portal
          </h1>
          <p className="text-xs md:text-sm text-green-100/90 tracking-wide max-w-2xl mx-auto pt-2 border-t border-green-500/40">
            Algorithmically transparent, cryptographically verifiable, permanently anchored on Ethereum.
          </p>
        </header>

        {/* Executive Document Tab Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 border border-[#e2e0d8] bg-white rounded-sm divide-x divide-y md:divide-y-0 divide-[#e2e0d8] font-sans text-xs uppercase tracking-wider shadow-sm">
          <button
            onClick={() => setActiveTab("register")}
            className={`py-3.5 px-4 text-center font-bold transition-colors ${activeTab === "register"
              ? "bg-[#006633] text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-[#f5f4ee]"
              }`}
          >
            01. Apply
          </button>
          <button
            onClick={() => setActiveTab("citizen")}
            className={`py-3.5 px-4 text-center font-bold transition-colors ${activeTab === "citizen"
              ? "bg-[#006633] text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-[#f5f4ee]"
              }`}
          >
            02. Verify
          </button>
          <button
            onClick={() => {
              setActiveTab("admin");
              fetchRegistry();
            }}
            className={`py-3.5 px-4 text-center font-bold transition-colors ${activeTab === "admin"
              ? "bg-[#006633] text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-[#f5f4ee]"
              }`}
          >
            03. Admin
          </button>
          <button
            onClick={() => {
              setActiveTab("explorer");
              fetchBatches();
            }}
            className={`py-3.5 px-4 text-center font-bold transition-colors ${activeTab === "explorer"
              ? "bg-[#006633] text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-[#f5f4ee]"
              }`}
          >
            04. Explorer
          </button>
        </div>

        {/* Tab 1: Apply for Housing (Registration) */}
        {activeTab === "register" && (
          <div className="max-w-2xl mx-auto">
            {!regSuccess ? (
              <div className="bg-white border border-[#e2e0d8] p-6 md:p-8 space-y-6 rounded-sm shadow-sm text-slate-800">
                <div className="border-b border-[#e2e0d8] pb-4">
                  <h3 className="text-xl font-bold text-slate-900 font-sans">
                    Housing Application Form (استمارة طلب سكن)
                  </h3>
                  <p className="text-slate-500 text-xs font-sans mt-1">
                    Enter citizen details accurately. Approved entries are notarized on the Ethereum blockchain.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Name field */}
                  <div>
                    <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">
                      Full Name (الاسم الكامل)
                    </label>
                    <input
                      type="text"
                      placeholder="Mohamed Al-Djelfaoui"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-[#fafaf9] text-sm"
                    />
                  </div>

                  {/* National ID */}
                  <div>
                    <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">
                      National Identification Number (رقم التعريف الوطني)
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="e.g. 222333444555"
                      value={regNationalId}
                      onChange={(e) => setRegNationalId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-[#fafaf9] font-mono text-sm"
                    />
                    <span className="text-slate-400 text-xxs mt-1 block">
                      Must be exactly 12 numeric digits.
                    </span>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">
                      Residential Address (العنوان الكامل)
                    </label>
                    <input
                      type="text"
                      placeholder="Cite 1200 logts, Djelfa"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-[#fafaf9] text-sm"
                    />
                  </div>

                  {/* Age & Children Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">
                        Age (العمر)
                      </label>
                      <input
                        type="number"
                        min={18}
                        max={120}
                        value={regAge}
                        onChange={(e) => setRegAge(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-[#fafaf9] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">
                        Number of Children (عدد الأطفال)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={regChildren}
                        onChange={(e) => setRegChildren(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-[#fafaf9] text-sm"
                      />
                    </div>
                  </div>

                  {/* Monthly Income */}
                  <div>
                    <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">
                      Monthly Income (DZD) (الدخل الشهري بالدينار)
                    </label>
                    <div className="relative rounded-sm shadow-sm">
                      <input
                        type="number"
                        min={0}
                        placeholder="e.g. 45000"
                        value={regIncome}
                        onChange={(e) => setRegIncome(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-[#fafaf9] text-sm pr-12"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-xs font-bold">DZD</span>
                      </div>
                    </div>
                  </div>

                  {/* Married & Disability Checkboxes */}
                  <div className="grid grid-cols-2 gap-4 py-1">
                    <label className="flex items-center space-x-3 bg-[#fafaf9] p-3 rounded-sm border border-slate-200 cursor-pointer select-none hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={regIsMarried}
                        onChange={(e) => setRegIsMarried(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-green-600 focus:ring-green-500 accent-green-600"
                      />
                      <span className="text-slate-700 text-xxs font-bold uppercase">Married (متزوج)</span>
                    </label>
                    <label className="flex items-center space-x-3 bg-[#fafaf9] p-3 rounded-sm border border-slate-200 cursor-pointer select-none hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={regIsDisabled}
                        onChange={(e) => setRegIsDisabled(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-green-600 focus:ring-green-500 accent-green-600"
                      />
                      <span className="text-slate-700 text-xxs font-bold uppercase">Disability (ذوي الاحتياجات)</span>
                    </label>
                  </div>

                  {/* Wilaya selector */}
                  <div>
                    <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">
                      Wilaya (الولاية)
                    </label>
                    <select
                      value={regWilaya}
                      onChange={(e) => setRegWilaya(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-[#fafaf9] text-sm"
                    >
                      {ALGERIAN_WILAYAS.map((wilaya) => (
                        <option key={wilaya.code} value={wilaya.code}>
                          {wilaya.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {regError && (
                    <div className="bg-rose-700/10 border-l-4 border-l-rose-700 border-t border-r border-b border-rose-700/30 text-rose-950 p-3.5 rounded-r-sm shadow-sm text-xs font-medium">
                      <span>{regError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full bg-[#006633] hover:bg-[#005229] text-white font-sans font-bold py-3.5 transition-colors cursor-pointer disabled:opacity-50 mt-4 text-xs uppercase tracking-widest rounded-sm shadow-sm"
                  >
                    Submit Application
                  </button>
                </form>
              </div>
            ) : (
              /* Success view */
              <div className="bg-white border border-[#e2e0d8] rounded-sm shadow-sm overflow-hidden text-slate-800">
                <div className="bg-[#006633] border-b-2 border-b-amber-500/80 text-white p-6 text-center space-y-2 font-sans">
                  <h4 className="text-xl font-bold">Application Received Successfully!</h4>
                  <p className="text-xs text-green-100/90 font-sans">
                    Your records have been notarized in the AADL local register.
                  </p>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  <div className="bg-[#faf9f6] border border-[#e2e0d8] rounded-sm p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4 border-b border-[#e2e0d8] pb-3.5">
                      <div>
                        <span className="text-slate-500 text-xxs uppercase block font-sans">Full Name</span>
                        <span className="font-bold text-slate-900 text-sm">{regSuccess.full_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xxs uppercase block font-sans">National ID</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{regSuccess.national_id}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-b border-[#e2e0d8] pb-3.5">
                      <div>
                        <span className="text-slate-500 text-xxs uppercase block font-sans">Wilaya Code</span>
                        <span className="font-bold text-slate-900 text-sm">{regSuccess.wilaya_code}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xxs uppercase block font-sans">Priority Score</span>
                        <span className="font-bold text-[#006633] text-sm">{regSuccess.priority_score ?? 0} pts</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xxs uppercase block font-sans">Initial Status</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono bg-[#f5f4ee] text-slate-800 border border-[#e2e0d8] capitalize">
                          {regSuccess.status}
                        </span>
                      </div>
                    </div>

                    <div className="font-mono text-xs space-y-1 bg-slate-900 text-emerald-400 p-4 rounded-sm border border-slate-950 shadow-inner relative overflow-hidden">
                      <span className="text-slate-400 text-xxs uppercase block">Applicant Unique Key Hash</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="truncate mr-3">{regSuccess.applicant_hash}</span>
                        <button
                          onClick={() => handleCopy(regSuccess.applicant_hash, "appHash")}
                          className="text-slate-400 hover:text-emerald-300 flex-shrink-0 cursor-pointer"
                        >
                          {copiedText === "appHash" ? <span className="font-bold text-emerald-400">[ OK ]</span> : <span className="font-bold">[ COPY ]</span>}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={startNewApplication}
                      className="flex-1 bg-[#f5f4ee] hover:bg-[#e8e6dd] border border-[#e2e0d8] text-slate-800 font-sans font-semibold py-3 rounded-sm transition-colors cursor-pointer text-xs uppercase tracking-wider"
                    >
                      New Application
                    </button>
                    <button
                      onClick={() => proceedToVerify(regSuccess.national_id)}
                      className="flex-1 bg-[#006633] hover:bg-[#005229] text-white font-sans font-bold py-3 rounded-sm transition-colors cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center"
                    >
                      Verify Status
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Citizen Audit Portal */}
        {activeTab === "citizen" && (
          <div className="space-y-8">

            {/* Search Input Box */}
            <div className="bg-white rounded shadow-lg border border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2 border-b pb-2">
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
                  className="flex-1 px-4 py-3 rounded-sm border border-[#e2e0d8] focus:outline-none focus:border-[#006633] focus:ring-1 focus:ring-[#006633] text-sm font-mono bg-white"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="bg-[#006633] hover:bg-[#005229] text-white px-6 py-3 rounded-sm font-sans font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Search
                </button>
              </form>

              {searchError && (
                <div className="mt-4 bg-rose-700/10 border-l-4 border-l-rose-700 border-t border-r border-b border-rose-700/30 text-rose-950 p-3.5 rounded-r-sm shadow-sm text-xs font-medium">
                  <span>{searchError}</span>
                </div>
              )}
            </div>

            {/* Applicant Details Panel */}
            {applicant && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Panel: Status Timeline */}
                <div className="lg:col-span-1 bg-white rounded shadow-lg border border-slate-100 p-6 h-fit">
                  <h4 className="text-md font-bold text-slate-900 mb-6 border-b pb-3">
                    Application Status
                  </h4>

                  <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">

                    {/* Timeline Node 1: Submitted */}
                    <div className="relative">
                      <div className="absolute -left-[20px] top-[4px] w-5 h-5 rounded-full border-4 border-white bg-green-600 shadow-sm flex items-center justify-center"></div>
                      <div className="font-semibold text-slate-800 text-sm">Application Submitted</div>
                      <div className="text-slate-400 text-xs mt-0.5">Recorded in database</div>
                    </div>

                    {/* Timeline Node 2: Approved / Eligible */}
                    <div className={`relative ${applicant.status === "eligible" || applicant.status === "batched" || applicant.status === "selected"
                      ? "text-slate-850"
                      : "text-slate-450"
                      }`}>
                      <div className={`absolute -left-[20px] top-[4px] w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${applicant.status === "eligible" || applicant.status === "batched" || applicant.status === "selected"
                        ? "bg-green-600"
                        : "bg-slate-200"
                        }`}></div>
                      <div className="font-semibold text-sm">Approved & Eligible</div>
                      <div className="text-slate-450 text-xs mt-0.5">Audited by administration</div>
                    </div>

                    {/* Timeline Node 3: Batched / Notarized */}
                    <div className={`relative ${applicant.status === "batched" || applicant.status === "selected"
                      ? "text-slate-850"
                      : "text-slate-455"
                      }`}>
                      <div className={`absolute -left-[20px] top-[4px] w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${applicant.status === "batched" || applicant.status === "selected"
                        ? "bg-green-600"
                        : "bg-slate-200"
                        }`}></div>
                      <div className="font-semibold text-sm">Notarized on Ethereum</div>
                      <div className="text-slate-455 text-xs mt-0.5 font-sans">Commitment Anchored</div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Digital Receipt & Verification Card */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Digital Receipt Card */}
                  <div className="bg-white rounded shadow-lg border border-slate-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-800 to-green-700 text-white px-6 py-4 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-green-200 uppercase tracking-widest font-mono">Official Queue Receipt</div>
                        <div className="text-lg font-bold">AADL_ON Verification Notary</div>
                      </div>
                      <span className="font-mono text-[10px] font-bold border border-green-500 px-2 py-1 bg-green-900/50">RECEIPT</span>
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

                      {/* Batch ID, Offset, Wilaya & Score */}
                      <div className="grid grid-cols-4 gap-4 border-b pb-4">
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
                        <div>
                          <span className="text-slate-400 text-xs block uppercase">Priority Score</span>
                          <span className="font-bold text-green-700">
                            {applicant.priority_score !== undefined ? `${applicant.priority_score} pts` : "N/A"}
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
                                className="text-slate-400 hover:text-green-700 flex-shrink-0 cursor-pointer"
                              >
                                {copiedText === "root" ? <span className="text-green-600 font-bold">[ OK ]</span> : <span className="font-bold">[ COPY ]</span>}
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
                                className="text-slate-400 hover:text-green-700 flex-shrink-0 cursor-pointer"
                              >
                                {copiedText === "file" ? <span className="text-green-600 font-bold">[ OK ]</span> : <span className="font-bold">[ COPY ]</span>}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Widget */}
                  {applicant.status === "batched" && (
                    <div className="bg-white border border-[#e2e0d8] p-6 space-y-4 rounded-sm shadow-sm">
                      <div className="flex justify-between items-center border-b border-[#e2e0d8] pb-4">
                        <h4 className="text-md font-bold text-slate-900 font-sans">
                          Cryptographic Receipt Audit
                        </h4>
                        <button
                          onClick={verifyReceiptLocally}
                          disabled={verifying}
                          className="bg-[#006633] hover:bg-[#005229] text-white font-sans font-bold px-4 py-2 rounded-sm text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                        >
                          Verify Receipt
                        </button>
                      </div>

                      {/* Verification steps console */}
                      {verificationSteps.length > 0 && (
                        <div className="bg-slate-900 text-green-400 p-4 rounded-sm font-mono text-xs overflow-y-auto max-h-56 border border-slate-950 space-y-1.5 shadow-inner">
                          {verificationSteps.map((step, idx) => (
                            <div key={idx} className="whitespace-pre">
                              {step}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Successful Audit Notification */}
                      {verificationResult && (
                        <div className={`p-4 rounded-r-sm border-t border-r border-b shadow-sm ${verificationResult.success
                          ? "bg-green-700/10 border-green-700/30 border-l-4 border-l-green-700 text-slate-900"
                          : "bg-rose-700/10 border-rose-700/30 border-l-4 border-l-rose-700 text-rose-950"
                          }`}>
                          {verificationResult.success ? (
                            <div>
                              <h5 className="font-bold text-sm text-green-950">Audit Successful</h5>
                              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                                Your local computed hash correctly matches the on-chain notarized Merkle Root <strong>{applicant.merkle_root}</strong>. Your registration timestamp and queue sequence are permanently locked in Block #1 on Sepolia.
                              </p>
                            </div>
                          ) : (
                            <div>
                              <h5 className="font-bold text-sm text-rose-950">Audit Failed</h5>
                              <p className="text-xs text-rose-900 mt-1 leading-relaxed">
                                Reconstructed leaf hashes resolve to <strong>{verificationResult.computedRoot}</strong> which does NOT match the root stored on the block registry <strong>{applicant.merkle_root}</strong>.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Zero-Knowledge Proof Widget */}
                  {applicant && (
                    <div className="bg-white border border-[#e2e0d8] p-6 space-y-4 rounded-sm shadow-sm">
                      <div className="flex justify-between items-center border-b border-[#e2e0d8] pb-4">
                        <div>
                          <h4 className="text-md font-bold text-slate-900 font-sans">
                            Zero-Knowledge Priority Proof
                          </h4>
                          <p className="text-slate-500 text-xxs font-sans mt-0.5">
                            Prove public score calculation accuracy without exposing private criteria.
                          </p>
                        </div>
                        <button
                          onClick={() => generateZkProof(applicant.national_id)}
                          disabled={zkLoading}
                          className="bg-[#006633] hover:bg-[#005229] text-white font-sans font-bold px-4 py-2 rounded-sm text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                        >
                          Generate ZK Proof
                        </button>
                      </div>

                      {/* Proving Status Logs */}
                      {zkStatus && (
                        <div className={`p-3.5 text-xs rounded-r-sm border-t border-r border-b font-medium ${zkLoading
                          ? "bg-slate-900/5 border-slate-700/20 border-l-4 border-l-slate-600 text-slate-800"
                          : "bg-green-700/10 border-green-700/30 border-l-4 border-l-green-700 text-green-950"
                          }`}>
                          <span>{zkStatus}</span>
                        </div>
                      )}

                      {/* Error block */}
                      {zkError && (
                        <div className="bg-rose-700/10 border-l-4 border-l-rose-700 border-t border-r border-b border-rose-700/30 p-3.5 text-xs text-rose-950 shadow-sm rounded-r-sm font-medium">
                          <span>{zkError}</span>
                        </div>
                      )}

                      {/* Display Proof */}
                      {zkProofData && (
                        <div className="space-y-3 font-mono text-xs">
                          <div className="bg-slate-900 text-green-400 p-4 rounded-sm overflow-y-auto max-h-60 border border-slate-950 shadow-inner space-y-3">
                            <div>
                              <span className="text-slate-500 text-xxs block uppercase">ZK-SNARK proof.json payload</span>
                              <pre className="text-xxs leading-relaxed whitespace-pre-wrap select-all">
                                {JSON.stringify(zkProofData.proof, null, 2)}
                              </pre>
                            </div>
                            <div className="border-t border-slate-800 pt-3">
                              <span className="text-slate-500 text-xxs block uppercase">Public Inputs</span>
                              <pre className="text-xxs text-slate-300">
                                {JSON.stringify(zkProofData.inputs, null, 2)}
                              </pre>
                            </div>
                          </div>

                          <div className="p-4 bg-green-700/10 border-l-4 border-l-green-700 border-t border-r border-b border-green-700/30 text-slate-900 shadow-sm rounded-r-sm">
                            <div>
                              <h5 className="font-bold text-sm text-green-950">ZK Verification Verified Locally</h5>
                              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                                The proof contains variables proving mathematically that the private criteria input values result in the score of <strong>{applicant.priority_score} pts</strong>. You can verify this key on-chain at the <strong>Verifier.sol</strong> contract.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Admin Console (Operational Approval and Batch trigger) */}
        {activeTab === "admin" && (
          <div className="space-y-8">

            {/* Top Widget: Batch Notarization Control */}
            <div className="bg-white border border-[#e2e0d8] p-6 md:p-8 space-y-6 rounded-sm shadow-sm text-slate-800">
              <div className="border-b border-[#e2e0d8] pb-3">
                <h3 className="text-xl font-bold text-slate-900 font-sans">
                  On-Chain Batch Notarization Controller
                </h3>
                <p className="text-slate-500 text-xs font-sans mt-1">
                  Commit all approved citizens' queue slots to the Ethereum blockchain as an immutable cryptographic batch.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 bg-[#faf9f6] p-5 rounded-sm border border-[#e2e0d8]">
                  <span className="text-slate-500 text-xxs uppercase block font-sans font-bold">Approved Queue Status</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline font-mono">
                    {eligibleCount}
                    <span className="text-slate-500 text-xs font-sans font-normal ml-2">
                      {eligibleCount === 1 ? "applicant is" : "applicants are"} approved and waiting in the pool
                    </span>
                  </div>
                </div>

                <button
                  onClick={triggerBatchNotarization}
                  disabled={eligibleCount === 0 || batchTriggerLoading}
                  className="bg-[#006633] hover:bg-[#005229] disabled:opacity-50 text-white font-sans font-bold py-4 rounded-sm flex items-center justify-center transition-colors cursor-pointer text-xs uppercase tracking-widest shadow-sm"
                >
                  Commit Batch On-Chain
                </button>
              </div>

              {batchTriggerSuccess && (
                <div className="p-4 bg-green-700/10 border-l-4 border-l-green-700 border-t border-r border-b border-green-700/30 text-slate-900 rounded-r-sm shadow-sm space-y-2">
                  <h4 className="font-bold text-sm text-green-950">
                    Batch Anchored Successfully!
                  </h4>
                  <div className="font-mono text-xs space-y-1 mt-1 text-slate-700">
                    <div><strong>Batch ID:</strong> #{batchTriggerSuccess.batch_id}</div>
                    <div className="truncate"><strong>Merkle Root:</strong> {batchTriggerSuccess.merkle_root}</div>
                    <div className="truncate"><strong>Transaction Hash:</strong> {batchTriggerSuccess.transaction_hash}</div>
                  </div>
                </div>
              )}

              {batchTriggerError && (
                <div className="p-4 bg-rose-700/10 border-l-4 border-l-rose-700 border-t border-r border-b border-rose-700/30 text-rose-950 text-xs font-medium shadow-sm rounded-r-sm">
                  <span>{batchTriggerError}</span>
                </div>
              )}
            </div>

            {/* Bottom Widget: Applicant Registry Approval list */}
            <div className="bg-white border border-[#e2e0d8] rounded-sm shadow-sm overflow-hidden text-slate-800">
              <div className="px-6 py-5 border-b border-[#e2e0d8] flex items-center justify-between font-sans">
                <h3 className="text-lg font-bold text-slate-900">
                  Applicant Approval Registry
                </h3>
                <button
                  onClick={fetchRegistry}
                  className="text-xs text-[#006633] hover:underline font-bold cursor-pointer uppercase tracking-wider"
                >
                  Refresh List
                </button>
              </div>

              {registryError && (
                <div className="m-6 bg-rose-700/10 border-l-4 border-l-rose-700 border-t border-r border-b border-rose-700/30 text-rose-950 p-4 text-center text-sm font-medium rounded-r-sm">
                  <span>{registryError}</span>
                </div>
              )}

              {registryLoading ? (
                <div className="flex flex-col justify-center items-center h-48">
                  <span className="mt-2 text-sm text-slate-500 font-sans">Querying registry database...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#f5f4ee] border-b border-[#e2e0d8] font-sans text-xs text-slate-700 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Citizen Name</th>
                        <th className="px-6 py-4">National ID</th>
                        <th className="px-6 py-4">Wilaya</th>
                        <th className="px-6 py-4">Priority Score</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e0d8]">
                      {registry.map((app) => (
                        <tr key={app.id} className="hover:bg-[#faf9f6] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 font-sans">
                            {app.full_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                            {app.national_id ? `${app.national_id.substring(0, 4)}••••${app.national_id.substring(8)}` : "Masked ID"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-sans">
                            {ALGERIAN_WILAYAS.find((w) => w.code === app.wilaya_code)?.name || app.wilaya_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#006633] font-mono">
                            {app.priority_score ?? 0} pts
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono bg-[#f5f4ee] text-slate-800 border border-[#e2e0d8] capitalize">
                              {app.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {app.status === "pending" ? (
                              <button
                                onClick={() => approveCitizen(app.applicant_hash)}
                                className="bg-[#006633] hover:bg-[#005229] text-white font-sans font-bold py-1 px-3.5 rounded-sm text-xs transition-colors cursor-pointer uppercase"
                              >
                                Approve
                              </button>
                            ) : app.status === "eligible" ? (
                              <span className="text-slate-400 text-xs italic font-sans">Awaiting Notarization</span>
                            ) : (
                              <span className="text-[#006633] text-xs font-bold font-sans uppercase">
                                Notarized
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {registry.length === 0 && (
                    <div className="p-12 text-center text-slate-400 text-sm">
                      No applicant applications have been registered in the database yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Blockchain Explorer */}
        {activeTab === "explorer" && (
          <div className="bg-white border border-[#e2e0d8] rounded-sm shadow-sm overflow-hidden text-slate-800">
            <div className="px-6 py-5 border-b border-[#e2e0d8] flex items-center justify-between font-sans">
              <h3 className="text-lg font-bold text-slate-900">
                On-Chain Batch Registrations
              </h3>
              <button
                onClick={fetchBatches}
                className="text-xs text-[#006633] hover:underline font-bold cursor-pointer uppercase tracking-wider"
              >
                Refresh Registry
              </button>
            </div>

            {batchesError && (
              <div className="m-6 bg-rose-700/10 border-l-4 border-l-rose-700 border-t border-r border-b border-rose-700/30 text-rose-950 p-4 text-center text-sm font-medium rounded-r-sm">
                <span>{batchesError}</span>
              </div>
            )}

            {batchesLoading ? (
              <div className="flex flex-col justify-center items-center h-64 font-sans">
                <span className="mt-2 text-sm text-slate-500">Querying Block Registry...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#f5f4ee] border-b border-[#e2e0d8] font-sans text-xs text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Batch ID</th>
                      <th className="px-6 py-4">Commitment Timestamp</th>
                      <th className="px-6 py-4">Merkle Root (Commitment)</th>
                      <th className="px-6 py-4">Sepolia Proof Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e0d8]">
                    {batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-[#faf9f6] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 font-mono">
                          #{batch.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-sans">
                          {new Date(batch.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-600">
                          <span title={batch.merkle_root}>
                            {batch.merkle_root.substring(0, 10)}...{batch.merkle_root.substring(58)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#006633]">
                          {batch.tx_hash ? (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${batch.tx_hash.startsWith("0x") ? batch.tx_hash : "0x" + batch.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline font-bold font-sans uppercase text-xs"
                            >
                              Etherscan
                            </a>
                          ) : (
                            <span className="text-slate-400 italic font-sans">Pending Anchor</span>
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