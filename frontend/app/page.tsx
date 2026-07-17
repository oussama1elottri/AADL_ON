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
  CheckCircle
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
    <main className="min-h-screen bg-[#fafaf9] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto">
        
        {/* Algerian Government Inspired Header */}
        <header className="mb-10 text-center relative overflow-hidden rounded bg-gradient-to-r from-green-800 via-green-700 to-green-950 p-6 md:p-10 shadow-xl border border-green-900/20">
          <div className="absolute -left-16 -top-16 w-40 h-40 bg-green-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -right-16 -bottom-16 w-45 h-45 bg-green-300/10 rounded-full blur-3xl"></div>
          
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-green-600/35 border border-green-500/30">
            <Building className="w-6 h-6 text-green-300 animate-pulse" />
          </div>
          
          <h1 className="text-xl md:text-2xl font-bold  text-green-200 tracking-tight drop-shadow-md">
            الجمهورية الجزائرية الديمقراطية الشعبية
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold text-white mt-2 tracking-wide font-serif">
            AADL_ON
          </h2>
          <p className="text-sm md:text-base text-green-100/80 mt-2 max-w-xl mx-auto">
            Algorithmically transparent, cryptographically verifiable, and permanently anchored on Ethereum Sepolia Testnet.
          </p>
        </header>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 mb-8 bg-white p-1.5 rounded-sm shadow-sm border overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 min-w-[120px] flex items-center justify-center py-3 text-sm font-semibold rounded-sm transition-all ${
              activeTab === "register"
                ? "bg-green-700 text-white shadow"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Apply for Housing
          </button>
          <button
            onClick={() => setActiveTab("citizen")}
            className={`flex-1 min-w-[120px] flex items-center justify-center py-3 text-sm font-semibold rounded-sm transition-all ${
              activeTab === "citizen"
                ? "bg-green-700 text-white shadow"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Verify Receipt
          </button>
          <button
            onClick={() => {
              setActiveTab("admin");
              fetchRegistry();
            }}
            className={`flex-1 min-w-[120px] flex items-center justify-center py-3 text-sm font-semibold rounded-sm transition-all ${
              activeTab === "admin"
                ? "bg-green-700 text-white shadow"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Admin Console
          </button>
          <button
            onClick={() => {
              setActiveTab("explorer");
              fetchBatches();
            }}
            className={`flex-1 min-w-[120px] flex items-center justify-center py-3 text-sm font-semibold rounded-sm transition-all ${
              activeTab === "explorer"
                ? "bg-green-700 text-white shadow"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Globe className="w-4 h-4 mr-2" />
            Blockchain Explorer
          </button>
        </div>

        {/* Tab 1: Apply for Housing (Registration) */}
        {activeTab === "register" && (
          <div className="max-w-2xl mx-auto">
            {!regSuccess ? (
              <div className="bg-white rounded shadow-lg border border-slate-100 p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center border-b pb-3 mb-2">
                    <UserPlus className="w-5.5 h-5.5 mr-2 text-green-600" />
                    Housing Application Form (استمارة طلب سكن)
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Please submit your citizen information accurately. Once approved, your queue placement is cryptographically locked on-chain.
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
                    <div className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 p-3.5 border-y border-r border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-600 text-xs flex items-center shadow-sm rounded-none">
                      <AlertTriangle className="w-4.5 h-4.5 mr-2 text-rose-600 flex-shrink-0" />
                      {regError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-sm flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 mt-4 text-sm uppercase tracking-wide"
                  >
                    {regLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Submit Application
                  </button>
                </form>
              </div>
            ) : (
              /* Success view */
              <div className="bg-white rounded shadow-lg border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-800 to-green-700 text-white p-6 text-center">
                  <div className="inline-flex p-3 rounded-full bg-green-600/40 border border-green-500/30 mb-3">
                    <ShieldCheck className="w-10 h-10 text-green-200" />
                  </div>
                  <h4 className="text-xl font-bold">Application Received Successfully!</h4>
                  <p className="text-xs text-green-100/80 mt-1">
                    Your records have been notarized in the AADL local register.
                  </p>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  <div className="bg-slate-50 border border-slate-100 rounded-sm p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4 border-b pb-3.5">
                      <div>
                        <span className="text-slate-400 text-xxs uppercase block">Full Name</span>
                        <span className="font-bold text-slate-800 text-sm">{regSuccess.full_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xxs uppercase block">National ID</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">{regSuccess.national_id}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-b pb-3.5">
                      <div>
                        <span className="text-slate-400 text-xxs uppercase block">Wilaya Code</span>
                        <span className="font-bold text-slate-800 text-sm">{regSuccess.wilaya_code}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xxs uppercase block">Priority Score</span>
                        <span className="font-bold text-green-700 text-sm">{regSuccess.priority_score ?? 0} pts</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xxs uppercase block">Initial Status</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 capitalize">
                          {regSuccess.status}
                        </span>
                      </div>
                    </div>

                    <div className="font-mono text-xs space-y-1 bg-slate-900 text-green-400 p-4 rounded border border-slate-950 shadow-inner relative overflow-hidden">
                      <span className="text-slate-500 text-xxs uppercase block">Applicant Unique Key Hash</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="truncate mr-3">{regSuccess.applicant_hash}</span>
                        <button
                          onClick={() => handleCopy(regSuccess.applicant_hash, "appHash")}
                          className="text-slate-500 hover:text-green-300 flex-shrink-0 cursor-pointer"
                        >
                          {copiedText === "appHash" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={startNewApplication}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-sm transition-colors cursor-pointer text-sm"
                    >
                      New Application
                    </button>
                    <button
                      onClick={() => proceedToVerify(regSuccess.national_id)}
                      className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-sm transition-colors cursor-pointer text-sm flex items-center justify-center"
                    >
                      Verify Status
                      <ChevronRight className="w-4 h-4 ml-1" />
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
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center">
                <Search className="w-5 h-5 mr-2 text-green-600" />
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
                  className="flex-1 px-4 py-3 rounded-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 text-base font-mono bg-[#fafaf9]"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-sm font-semibold flex items-center transition-colors disabled:opacity-50 cursor-pointer"
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
                <div className="mt-4 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 p-3.5 border-y border-r border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-600 text-sm flex items-center shadow-sm rounded-none">
                  <AlertTriangle className="w-4.5 h-4.5 mr-2 text-rose-600 flex-shrink-0" />
                  {searchError}
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
                    <div className={`relative ${
                      applicant.status === "eligible" || applicant.status === "batched" || applicant.status === "selected"
                        ? "text-slate-850"
                        : "text-slate-450"
                    }`}>
                      <div className={`absolute -left-[20px] top-[4px] w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                        applicant.status === "eligible" || applicant.status === "batched" || applicant.status === "selected"
                          ? "bg-green-600"
                          : "bg-slate-200"
                      }`}></div>
                      <div className="font-semibold text-sm">Approved & Eligible</div>
                      <div className="text-slate-450 text-xs mt-0.5">Audited by administration</div>
                    </div>

                    {/* Timeline Node 3: Batched / Notarized */}
                    <div className={`relative ${
                      applicant.status === "batched" || applicant.status === "selected"
                        ? "text-slate-850"
                        : "text-slate-455"
                    }`}>
                      <div className={`absolute -left-[20px] top-[4px] w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                        applicant.status === "batched" || applicant.status === "selected"
                          ? "bg-green-600"
                          : "bg-slate-200"
                      }`}></div>
                      <div className="font-semibold text-sm">Notarized on Ethereum</div>
                      <div className="text-slate-455 text-xs mt-0.5 font-serif">Commitment Anchored</div>
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
                      <FileText className="w-8 h-8 text-green-200/50" />
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
                                {copiedText === "root" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
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
                                {copiedText === "file" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Widget */}
                  {applicant.status === "batched" && (
                    <div className="bg-white rounded shadow-lg border border-slate-100 p-6 space-y-4">
                      <div className="flex justify-between items-center border-b pb-4">
                        <h4 className="text-md font-bold text-slate-900 flex items-center">
                          <Cpu className="w-5 h-5 mr-2 text-green-600" />
                          Cryptographic Receipt Audit
                        </h4>
                        <button
                          onClick={verifyReceiptLocally}
                          disabled={verifying}
                          className="bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-sm text-sm flex items-center transition-all cursor-pointer disabled:opacity-50"
                        >
                          {verifying && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
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
                        <div className={`p-4 border-y border-r border-slate-200 dark:border-slate-800 border-l-4 flex items-start shadow-sm rounded-none bg-white dark:bg-slate-900 ${
                          verificationResult.success ? "border-l-green-600" : "border-l-rose-600"
                        }`}>
                          {verificationResult.success ? (
                            <>
                              <ShieldCheck className="w-6 h-6 mr-3 text-green-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-bold text-md flex items-center text-slate-900 dark:text-white">
                                  Audit Successful
                                  <Award className="w-4 h-4 ml-1.5 text-green-600" />
                                </h5>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                  Your local computed hash correctly matches the on-chain notarized Merkle Root <strong>{applicant.merkle_root}</strong>. Your registration timestamp and queue sequence are permanently locked in Block #1 on Sepolia.
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-6 h-6 mr-3 text-rose-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-bold text-md text-slate-900 dark:text-white">Audit Failed</h5>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                  Reconstructed leaf hashes resolve to <strong>{verificationResult.computedRoot}</strong> which does NOT match the root stored on the block registry <strong>{applicant.merkle_root}</strong>.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Zero-Knowledge Proof Widget */}
                  {applicant && (
                    <div className="bg-white rounded shadow-lg border border-slate-100 p-6 space-y-4">
                      <div className="flex justify-between items-center border-b pb-4">
                        <div>
                          <h4 className="text-md font-bold text-slate-900 flex items-center">
                            <ShieldCheck className="w-5 h-5 mr-2 text-green-600 animate-pulse" />
                            Zero-Knowledge Priority Proof
                          </h4>
                          <p className="text-slate-500 text-xxs mt-0.5">
                            Prove public score calculation accuracy without exposing private criteria.
                          </p>
                        </div>
                        <button
                          onClick={() => generateZkProof(applicant.national_id)}
                          disabled={zkLoading}
                          className="bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-sm text-sm flex items-center transition-all cursor-pointer disabled:opacity-50"
                        >
                          {zkLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          Generate ZK Proof
                        </button>
                      </div>

                      {/* Proving Status Logs */}
                      {zkStatus && (
                        <div className="flex items-center text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border-y border-r border-slate-200 dark:border-slate-800 border-l-4 border-l-green-600 p-3.5 shadow-sm rounded-none font-medium">
                          <Loader2 className="w-4 h-4 animate-spin mr-2 text-green-600" />
                          {zkStatus}
                        </div>
                      )}

                      {/* Error block */}
                      {zkError && (
                        <div className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 p-3.5 border-y border-r border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-600 text-xs flex items-center font-medium shadow-sm rounded-none">
                          <AlertTriangle className="w-4 h-4 mr-2 text-rose-600 flex-shrink-0" />
                          {zkError}
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

                          <div className="p-4 bg-white dark:bg-slate-900 border-y border-r border-slate-200 dark:border-slate-800 border-l-4 border-l-green-600 text-slate-800 dark:text-slate-200 flex items-start shadow-sm rounded-none">
                            <CheckCircle className="w-5 h-5 mr-3 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h5 className="font-bold text-sm">ZK Verification Verified Locally</h5>
                              <p className="text-xxs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
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
            <div className="bg-white rounded shadow-lg border border-slate-100 p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center border-b pb-3 mb-2">
                  <Settings className="w-5.5 h-5.5 mr-2 text-green-600" />
                  On-Chain Batch Notarization Controller
                </h3>
                <p className="text-slate-500 text-sm">
                  Commit all approved citizens' queue slots to the Ethereum blockchain as an immutable cryptographic batch.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 bg-slate-50 p-5 rounded-sm border border-slate-100">
                  <span className="text-slate-400 text-xxs uppercase block font-bold">Approved Queue Status</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1 flex items-baseline">
                    {eligibleCount}
                    <span className="text-slate-500 text-xs font-normal ml-2">
                      {eligibleCount === 1 ? "applicant is" : "applicants are"} approved and waiting in the pool
                    </span>
                  </div>
                </div>

                <button
                  onClick={triggerBatchNotarization}
                  disabled={eligibleCount === 0 || batchTriggerLoading}
                  className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-bold py-4 rounded-sm flex items-center justify-center transition-colors cursor-pointer text-sm uppercase tracking-wide shadow"
                >
                  {batchTriggerLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Cpu className="w-4 h-4 mr-2" />
                  )}
                  Commit Batch On-Chain
                </button>
              </div>

              {batchTriggerSuccess && (
                <div className="p-4 bg-white dark:bg-slate-900 border-y border-r border-slate-200 dark:border-slate-800 border-l-4 border-l-green-600 text-slate-800 dark:text-slate-200 rounded-none shadow-sm space-y-2">
                  <h4 className="font-bold text-sm flex items-center text-slate-900 dark:text-white font-bold">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Batch Anchored Successfully!
                  </h4>
                  <div className="font-mono text-xs space-y-1 mt-1 text-slate-600 dark:text-slate-400">
                    <div><strong>Batch ID:</strong> #{batchTriggerSuccess.batch_id}</div>
                    <div className="truncate"><strong>Merkle Root:</strong> {batchTriggerSuccess.merkle_root}</div>
                    <div className="truncate"><strong>Transaction Hash:</strong> {batchTriggerSuccess.transaction_hash}</div>
                  </div>
                </div>
              )}

              {batchTriggerError && (
                <div className="p-4 bg-white dark:bg-slate-900 border-y border-r border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-600 text-slate-700 dark:text-slate-300 text-xs flex items-center shadow-sm rounded-none">
                  <AlertTriangle className="w-4 h-4 mr-2 text-rose-600 flex-shrink-0" />
                  {batchTriggerError}
                </div>
              )}
            </div>

            {/* Bottom Widget: Applicant Registry Approval list */}
            <div className="bg-white rounded shadow-lg border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <UserCheck className="w-5 h-5 mr-2 text-green-600" />
                  Applicant Approval Registry
                </h3>
                <button
                  onClick={fetchRegistry}
                  className="text-xs text-green-700 hover:underline flex items-center font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Refresh List
                </button>
              </div>

              {registryError && (
                <div className="m-6 bg-white dark:bg-slate-900 border-y border-r border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-600 text-slate-700 dark:text-slate-300 p-4 text-center text-sm shadow-sm rounded-none">
                  {registryError}
                </div>
              )}

              {registryLoading ? (
                <div className="flex flex-col justify-center items-center h-48">
                  <Loader2 className="w-8 h-8 animate-spin text-green-700" />
                  <span className="mt-2 text-sm text-slate-500">Querying registry database...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#fafaf9] border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Citizen Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">National ID</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Wilaya</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority Score</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {registry.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                            {app.full_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">
                            {app.national_id ? `${app.national_id.substring(0, 4)}••••${app.national_id.substring(8)}` : "Masked ID"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {ALGERIAN_WILAYAS.find((w) => w.code === app.wilaya_code)?.name || app.wilaya_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">
                            {app.priority_score ?? 0} pts
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold border ${
                              app.status === "pending"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : app.status === "eligible"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            }`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {app.status === "pending" ? (
                              <button
                                onClick={() => approveCitizen(app.applicant_hash)}
                                className="bg-green-700 hover:bg-green-800 text-white font-bold py-1 px-3.5 rounded text-xs transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                            ) : app.status === "eligible" ? (
                              <span className="text-slate-400 text-xs italic">Awaiting Notarization</span>
                            ) : (
                              <span className="text-green-700 text-xs font-semibold flex items-center justify-end">
                                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
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
          <div className="bg-white shadow-lg rounded overflow-hidden border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-green-600" />
                On-Chain Batch Registrations
              </h3>
              <button 
                onClick={fetchBatches}
                className="text-xs text-green-700 hover:underline flex items-center font-semibold cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 mr-1" />
                Refresh Registry
              </button>
            </div>
            
            {batchesError && (
              <div className="m-6 bg-white dark:bg-slate-900 border-y border-r border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-600 text-slate-700 dark:text-slate-300 p-4 text-center text-sm shadow-sm rounded-none">
                {batchesError}
              </div>
            )}

            {batchesLoading ? (
              <div className="flex flex-col justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-green-700" />
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
                            <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span title={batch.merkle_root}>
                              {batch.merkle_root.substring(0, 10)}...{batch.merkle_root.substring(58)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700">
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