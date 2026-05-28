import { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc, runTransaction, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { demoInventory } from "../data/demoData";
import { useBusinessContext } from "../context/BusinessContext";

// Placeholder fallback functions if jsPDF isn't initialized yet
const jsPDF = null;
const autoTable = () => {};

export default function MillingService() {
  const { currentBranchId, currentBranch, currentUser } = useBusinessContext();
  const [jobs, setJobs] = useState([]);
  const [inventoryItems, setInventoryItems] = useState(() =>
    isFirebaseConfigured
      ? []
      : demoInventory.map((item) => ({ ...item, branchId: item.branchId || "main" }))
  );

  // Verification checks for admin authorization status
  const isAdmin = currentUser?.role === "admin" || currentUser?.isAdmin || false;

  // Ledger Filter & Sorting States
  const [selectedBranchId, setSelectedBranchId] = useState(currentBranchId || "main");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Form Basic Input States
  const [farmerName, setFarmerName] = useState("");
  const [farmerPhone, setFarmerPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [copraWeight, setCopraWeight] = useState("");
  const [moisturePct, setMoisturePct] = useState("0");
  const [extractionRate, setExtractionRate] = useState("62"); // 62% industry standard default

  // Advanced Dropdown States
  const [processingType, setProcessingType] = useState("service_only"); 
  const [chargeType, setChargeType] = useState("per_kg");

  // Dynamic Financial/Value Rates
  const [processingRate, setProcessingRate] = useState("3"); // ₹3/kg standard milling service fee
  const [oilBuyRate, setOilBuyRate] = useState("140"); // Factory purchase price for oil per Ltr/KG
  const [cakeBuyRate, setCakeBuyRate] = useState("15"); // Factory purchase/retention value for cake per KG
  const [copraPurchaseRate, setCopraPurchaseRate] = useState("90"); // Factory direct copra buy rate per KG

  // Additional Surcharges
  const [filteringCharge, setFilteringCharge] = useState("0");
  const [loadingCharge, setLoadingCharge] = useState("0");
  const [dryingCharge, setDryingCharge] = useState("0");

  // System UI States
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if context changes loaded branch configuration properties 
  useEffect(() => {
    if (currentBranchId && !isAdmin) {
      setSelectedBranchId(currentBranchId);
    }
  }, [currentBranchId, isAdmin]);

  // Live Subscription Fetching bound to Admin Selectable Branch State Engine
  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    setIsLoading(true);
    let qJobs;

    if (selectedBranchId === "all" && isAdmin) {
      qJobs = query(
        collection(db, "milling_jobs"),
        orderBy("timestamp", "desc")
      );
    } else {
      qJobs = query(
        collection(db, "milling_jobs"),
        where("branchId", "==", selectedBranchId || "main"),
        orderBy("timestamp", "desc")
      );
    }

    const unsubJobs = onSnapshot(qJobs, (snap) => {
      setJobs(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Milling Fetch Error:", err);
      setIsLoading(false);
    });

    const unsubInventory = onSnapshot(
      query(collection(db, "inventory"), where("branchId", "==", selectedBranchId || "main")),
      (snap) => {
        setInventoryItems(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );

    return () => {
      unsubJobs();
      unsubInventory();
    };
  }, [selectedBranchId, isAdmin]);

  // Comprehensive Multi-Parametric Filter Logic (Date / Month Evaluation)
  const filteredJobs = jobs.filter((item) => {
    if (startDateFilter || endDateFilter) {
      const itemDate = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.date);
      
      if (startDateFilter) {
        const start = new Date(startDateFilter);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }
      
      if (endDateFilter) {
        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }
    }
    return true;
  });

  // Native CSV Document Generation Engine
  const downloadLedgerCSV = () => {
    if (filteredJobs.length === 0) return alert("No ledger records available to export for this selection matrix.");

    const headers = [
      "Slip ID", "Date", "Customer Name", "Phone", "Vehicle ID", 
      "Copra Weight (KG)", "Moisture %", "Oil Yield %", "Expected Oil (L)", 
      "Expected Cake (KG)", "Loss (KG)", "Processing Model", "Settlement Due (₹)", 
      "Direction", "Branch Node"
    ];

    const rows = filteredJobs.map(item => [
      item.serviceNo || "N/A",
      item.date || "N/A",
      item.farmerName || "N/A",
      item.farmerPhone || "N/A",
      item.vehicleNumber || "N/A",
      item.copraWeight || 0,
      item.moisturePct || 0,
      item.extractionRate || 0,
      Number(item.expectedOil || 0).toFixed(2),
      Number(item.expectedCake || 0).toFixed(2),
      Number(item.wasteLoss || 0).toFixed(2),
      item.processingType || "N/A",
      Math.round(item.finalSettlementAmount || 0),
      item.settlementDirection === "factory_pays" ? "Factory Outflow" : "Customer Owed",
      item.branchName || "Main System"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Copra_Processing_Ledger_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Real-Time Dynamic ERP Yield Math
  const weightVal = Number(copraWeight || 0);
  const yieldPct = Number(extractionRate || 0);
  const rateVal = Number(processingRate || 0);

  // 1. Output Yield Volumes
  const expectedOil = weightVal * (yieldPct / 100);
  const expectedCake = weightVal * ((100 - yieldPct) / 100) * 0.95; // Assuming 5% absolute waste/shell loss
  const wasteLoss = weightVal * ((100 - yieldPct) / 100) * 0.05;

  // 2. Base Crushing Charges Structure
  let baseCrushingFee = 0;
  if (chargeType === "per_kg") {
    baseCrushingFee = weightVal * rateVal;
  } else if (chargeType === "per_bag") {
    baseCrushingFee = Math.ceil(weightVal / 50) * rateVal; // 50kg bags
  } else if (chargeType === "flat") {
    baseCrushingFee = rateVal;
  } else if (chargeType === "percentage") {
    baseCrushingFee = expectedOil * Number(oilBuyRate) * (rateVal / 100);
  }

  // Surcharges summation
  const totalSurcharges = Number(filteringCharge) + Number(loadingCharge) + Number(dryingCharge);
  const aggregateCharges = baseCrushingFee + totalSurcharges;

  // 3. Financial Valuations based on Processing Types
  const totalOilValue = expectedOil * Number(oilBuyRate);
  const totalCakeValue = expectedCake * Number(cakeBuyRate);
  const totalCopraValue = weightVal * Number(copraPurchaseRate);

  let finalSettlementAmount = 0; 
  let settlementDirection = "customer_pays"; // customer_pays OR factory_pays

  switch (processingType) {
    case "service_only": 
      finalSettlementAmount = aggregateCharges;
      settlementDirection = "customer_pays";
      break;

    case "oil_purchase": 
      finalSettlementAmount = totalOilValue - aggregateCharges;
      settlementDirection = finalSettlementAmount >= 0 ? "factory_pays" : "customer_pays";
      finalSettlementAmount = Math.abs(finalSettlementAmount);
      break;

    case "copra_purchase": 
      finalSettlementAmount = totalCopraValue;
      settlementDirection = "factory_pays";
      break;

    case "service_cake_deduction": 
      finalSettlementAmount = aggregateCharges - totalCakeValue;
      settlementDirection = finalSettlementAmount >= 0 ? "customer_pays" : "factory_pays";
      finalSettlementAmount = Math.abs(finalSettlementAmount);
      break;

    case "net_settlement": 
      finalSettlementAmount = (totalOilValue + totalCakeValue) - aggregateCharges;
      settlementDirection = finalSettlementAmount >= 0 ? "factory_pays" : "customer_pays";
      finalSettlementAmount = Math.abs(finalSettlementAmount);
      break;

    default:
      finalSettlementAmount = aggregateCharges;
  }

  // HTML / Blob Receipt Generator Fallback
  const downloadMillingSlip = (jobRecord) => {
    try {
      const slipNo = jobRecord.serviceNo || `MIL-${jobRecord.id?.slice(0, 6) || "TEMP"}`;
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Milling Slip - ${slipNo}</title>
            <style>
              body { font-family: Arial, sans-serif; color: #1f2937; margin: 30px; }
              header { background: #07294d; color: white; padding: 20px; border-radius: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #dbe4ef; padding: 10px; text-align: left; }
              th { background: #f0f7ff; }
              .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #e2e8f0; }
            </style>
          </head>
          <body>
            <header>
              <h2>ViT SMART POS ERP - MILLING TRANSACTION LOG</h2>
              <div>Slip No: ${slipNo} | Date: ${jobRecord.date}</div>
            </header>
            <p><strong>Customer Name:</strong> ${jobRecord.farmerName} ${jobRecord.farmerPhone ? `(${jobRecord.farmerPhone})` : ""}</p>
            <p><strong>Vehicle Number:</strong> ${jobRecord.vehicleNumber || "N/A"} | <strong>Moisture Level:</strong> ${jobRecord.moisturePct}%</p>
            <table>
              <thead><tr><th>Parametric Data Segment</th><th>Quantifiable Output</th></tr></thead>
              <tbody>
                <tr><td>Raw Copra Weight Brought</td><td>${jobRecord.copraWeight} KG</td></tr>
                <tr><td>Configured Oil Yield Rate</td><td>${jobRecord.extractionRate}%</td></tr>
                <tr><td>Extracted Oil Output Volume</td><td>${Number(jobRecord.expectedOil).toFixed(2)} Ltrs/KG</td></tr>
                <tr><td>Retained/Extracted Cake Weight</td><td>${Number(jobRecord.expectedCake).toFixed(2)} KG</td></tr>
                <tr><td>Waste/Shell Loss Calc</td><td>${Number(jobRecord.wasteLoss).toFixed(2)} KG</td></tr>
                <tr><td>Operational Service Processing Fee</td><td>₹${jobRecord.aggregateCharges}</td></tr>
              </tbody>
            </table>
            <div class="summary">
              <h3>Settlement Mode: ${jobRecord.processingType?.toUpperCase().replace("_", " ")}</h3>
              <strong>Final Net Settlement Balance: </strong> 
              ₹${Number(jobRecord.finalSettlementAmount).toLocaleString()} (${jobRecord.settlementDirection === "factory_pays" ? "Payable to Customer" : "Collect from Customer"})
            </div>
          </body>
        </html>`;

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Milling_Slip_${slipNo}.html`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  // Cloud Atomic Multi-Ledger Submit
  const handleMillingSubmit = async (e) => {
    e.preventDefault();
    if (!farmerName || weightVal <= 0) return alert("Please fill standard input criteria.");

    setIsSubmitting(true);
    const slipIdentifier = `MIL-${Date.now().toString().slice(-6)}`;

    const currentJobPayload = {
      serviceNo: slipIdentifier,
      farmerName,
      farmerPhone,
      vehicleNumber,
      copraWeight: weightVal,
      moisturePct: Number(moisturePct),
      extractionRate: yieldPct,
      processingType,
      chargeType,
      processingRate: rateVal,
      oilBuyRate: Number(oilBuyRate),
      cakeBuyRate: Number(cakeBuyRate),
      copraPurchaseRate: Number(copraPurchaseRate),
      filteringCharge: Number(filteringCharge),
      loadingCharge: Number(loadingCharge),
      dryingCharge: Number(dryingCharge),
      expectedOil,
      expectedCake,
      wasteLoss,
      aggregateCharges,
      finalSettlementAmount,
      settlementDirection,
      date: new Date().toLocaleDateString(),
      branchId: currentBranchId || "main",
      branchName: currentBranch?.name || "Main Branch",
      createdBy: currentUser?.id || "system",
      createdByName: currentUser?.name || "System Master",
    };

    if (!isFirebaseConfigured) {
      setJobs((prev) => [ { id: String(Date.now()), ...currentJobPayload }, ...prev ]);
      downloadMillingSlip(currentJobPayload);
      setIsSubmitting(false);
      alert("Local session update saved successfully.");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const millingRef = doc(collection(db, "milling_jobs"));
        transaction.set(millingRef, { ...currentJobPayload, timestamp: serverTimestamp() });

        const generalLedgerRef = doc(collection(db, "sales"));
        let narrative = `Milling Log ${slipIdentifier} via style: ${processingType}. Total Processed Weight: ${weightVal}KG.`;
        
        transaction.set(generalLedgerRef, {
          customer: `ERP Customer: ${farmerName}`,
          amount: settlementDirection === "customer_pays" ? finalSettlementAmount : -finalSettlementAmount,
          notes: narrative,
          date: new Date().toLocaleDateString(),
          branchId: currentBranchId || "main",
          timestamp: serverTimestamp()
        });
      });

      downloadMillingSlip(currentJobPayload);
      setFarmerName("");
      setFarmerPhone("");
      setVehicleNumber("");
      setCopraWeight("");
      alert("ERP Milling Transaction completely logged & accounted for across registers.");
    } catch (err) {
      console.error(err);
      alert(`ERP Ledger Write Mutation Error: ${err.message}`);
    }
    setIsSubmitting(false);
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm("Purge milling transaction records?")) return;
    if (!isFirebaseConfigured) {
      setJobs((prev) => prev.filter((j) => j.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, "milling_jobs", id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 p-4 md:p-8" style={{ backgroundColor: "#031B34" }}>
      
      {/* Top Identity Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-blue-900 pb-5">
        <div>
          <span className="text-xs font-bold tracking-widest uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-md">
            ViT Smart POS ERP Core Systems
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-1 text-white tracking-tight">
            Copra Service Processing Management
          </h1>
        </div>
        <div className="bg-[#07294d] border border-blue-900 px-4 py-2.5 rounded-xl shadow-inner text-sm text-slate-300 flex items-center gap-2">
          <span>📍</span> Core Operating Hub: <span className="font-bold text-amber-400">{currentBranch?.name || "Main Terminal"}</span>
        </div>
      </div>

      {/* Dynamic KPI Analytics Matrix Boards (Changes based on current active filters) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-[#07294d] border border-blue-900/80 p-5 rounded-2xl shadow-lg">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aggregate Processing Log</p>
          <p className="text-2xl md:text-3xl font-black mt-2 text-white">
            {filteredJobs.reduce((sum, j) => sum + Number(j.copraWeight || 0), 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">KG</span>
          </p>
        </div>
        <div className="bg-[#07294d] border border-blue-900/80 p-5 rounded-2xl shadow-lg">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dynamic Estimated Oil</p>
          <p className="text-2xl md:text-3xl font-black mt-2 text-yellow-400">
            {filteredJobs.reduce((sum, j) => sum + Number(j.expectedOil || 0), 0).toFixed(1)} <span className="text-xs font-normal text-slate-400">Ltrs</span>
          </p>
        </div>
        <div className="bg-[#07294d] border border-blue-900/80 p-5 rounded-2xl shadow-lg">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Retained Byproduct Cake</p>
          <p className="text-2xl md:text-3xl font-black mt-2 text-emerald-400">
            {filteredJobs.reduce((sum, j) => sum + Number(j.expectedCake || 0), 0).toFixed(1)} <span className="text-xs font-normal text-slate-400">KG</span>
          </p>
        </div>
        <div className="bg-[#07294d] border border-blue-900/80 p-5 rounded-2xl shadow-lg">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Operation Charges</p>
          <p className="text-2xl md:text-3xl font-black mt-2 text-blue-400">
            ₹{filteredJobs.reduce((sum, j) => sum + Number(j.aggregateCharges || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="grid grid-cols-1 col-span-2 lg:col-span-1 bg-gradient-to-br from-amber-600/20 to-blue-600/10 border border-amber-500/30 p-5 rounded-2xl shadow-lg">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Live Active Batches</p>
          <p className="text-3xl font-black mt-1 text-white">{filteredJobs.length}</p>
        </div>
      </div>

      {/* Main Structural ERP Input Screen & Ledger Viewport */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Core Screen Process entry Form container */}
        <form onSubmit={handleMillingSubmit} className="xl:col-span-1 bg-[#07294d] border border-blue-900/70 p-6 rounded-2xl space-y-5 shadow-2xl">
          <h3 className="text-lg font-bold border-b border-blue-900/80 pb-3 text-amber-500 flex items-center gap-2">
            <span>⚙️</span> Primary Main Transaction Entry
          </h3>

          {/* Customer Metadata inputs */}
          <div className="space-y-3.5">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Customer / Farmer Name *</label>
              <input
                type="text"
                placeholder="Ramesh Gowda"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                className="w-full bg-[#031B34] border border-blue-900 p-3 rounded-xl outline-none text-white focus:border-blue-500 text-sm transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91..."
                  value={farmerPhone}
                  onChange={(e) => setFarmerPhone(e.target.value)}
                  className="w-full bg-[#031B34] border border-blue-900 p-3 rounded-xl outline-none text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Vehicle Number</label>
                <input
                  type="text"
                  placeholder="KA-19-E-2026"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full bg-[#031B34] border border-blue-900 p-3 rounded-xl outline-none text-white text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Copra (KG) *</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={copraWeight}
                  onChange={(e) => setCopraWeight(e.target.value)}
                  className="w-full bg-[#031B34] border border-blue-900 p-3 rounded-xl outline-none text-white text-sm font-bold text-amber-400"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Moisture %</label>
                <input
                  type="number"
                  value={moisturePct}
                  onChange={(e) => setMoisturePct(e.target.value)}
                  className="w-full bg-[#031B34] border border-blue-900 p-3 rounded-xl outline-none text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Oil Recovery %</label>
                <input
                  type="number"
                  value={extractionRate}
                  onChange={(e) => setExtractionRate(e.target.value)}
                  className="w-full bg-[#031B34] border border-blue-900 p-3 rounded-xl outline-none text-white text-sm font-bold text-yellow-400"
                />
              </div>
            </div>
          </div>

          {/* Processing Type Selector Dropdowns */}
          <div className="border-t border-blue-900/60 pt-4 space-y-3.5">
            <div>
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1.5">
                Processing Type Model Selection
              </label>
              <select
                value={processingType}
                onChange={(e) => setProcessingType(e.target.value)}
                className="w-full bg-[#031B34] border border-blue-900 p-3 rounded-xl outline-none text-white text-sm font-semibold focus:border-blue-500"
              >
                <option value="service_only">1. Milling Service Only (Returns Oil + Cake)</option>
                <option value="oil_purchase">2. Oil Purchase Model (Factory Buys Extracted Oil)</option>
                <option value="copra_purchase">3. Copra Purchase + Processing (Internal Control)</option>
                <option value="service_cake_deduction">4. Service + Cake Sale Deduction (Factory Retains Cake)</option>
                <option value="net_settlement">6. Full Dynamic Net Settlement Model</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Charge Matrix Basis</label>
                <select
                  value={chargeType}
                  onChange={(e) => setChargeType(e.target.value)}
                  className="w-full bg-[#031B34] border border-blue-900 p-2.5 rounded-xl text-white text-xs"
                >
                  <option value="per_kg">Per KG Weight Basis</option>
                  <option value="per_bag">Per Bag Valuation</option>
                  <option value="flat">Flat Fixed Rate</option>
                  <option value="percentage">Percentage Value Basis</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Base Rate Config (₹)</label>
                <input
                  type="number"
                  value={processingRate}
                  onChange={(e) => setProcessingRate(e.target.value)}
                  className="w-full bg-[#031B34] border border-blue-900 p-2.5 rounded-xl text-white text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Value Engine Settings Adjustments */}
          <div className="bg-[#031B34]/60 p-3 rounded-xl border border-blue-900/40 grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Factory Oil Buy Rate</label>
              <input type="number" value={oilBuyRate} onChange={e => setOilBuyRate(e.target.value)} className="w-full bg-[#031B34] border border-blue-900 p-1.5 rounded text-white text-xs font-semibold" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Factory Cake Value</label>
              <input type="number" value={cakeBuyRate} onChange={e => setCakeBuyRate(e.target.value)} className="w-full bg-[#031B34] border border-blue-900 p-1.5 rounded text-white text-xs font-semibold" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Raw Copra Rate</label>
              <input type="number" value={copraPurchaseRate} onChange={e => setCopraPurchaseRate(e.target.value)} className="w-full bg-[#031B34] border border-blue-900 p-1.5 rounded text-white text-xs font-semibold" />
            </div>
          </div>

          {/* Additional Factory Surcharges Section */}
          <div className="border-t border-blue-900/60 pt-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-tight mb-2">Additional Surcharges Panel</h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block">Filtering (₹)</label>
                <input type="number" value={filteringCharge} onChange={e => setFilteringCharge(e.target.value)} className="w-full bg-[#031B34] border border-blue-900 p-2 rounded text-white text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">Loading (₹)</label>
                <input type="number" value={loadingCharge} onChange={e => setLoadingCharge(e.target.value)} className="w-full bg-[#031B34] border border-blue-900 p-2 rounded text-white text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">Drying (₹)</label>
                <input type="number" value={dryingCharge} onChange={e => setDryingCharge(e.target.value)} className="w-full bg-[#031B34] border border-blue-900 p-2 rounded text-white text-xs" />
              </div>
            </div>
          </div>

          {/* Live System Calculation Output Summary Box */}
          <div className="bg-[#031B34] p-4 rounded-xl border border-blue-900/80 space-y-2.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Expected Oil Output Yield</span>
              <span className="font-bold text-yellow-400">{expectedOil.toFixed(2)} Ltrs</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Cake Recovery / Waste Breakdown</span>
              <span className="font-medium text-slate-200">{expectedCake.toFixed(1)} KG / Loss: {wasteLoss.toFixed(1)} KG</span>
            </div>
            
            <div className="border-t border-blue-900/60 my-1"></div>
            
            <div className="flex justify-between items-center bg-[#07294d] p-2.5 rounded-lg border border-blue-900">
              <span className="text-xs font-bold text-slate-300 uppercase">
                {settlementDirection === "factory_pays" ? "💰 Factory Net Payable" : "📥 Customer Balance Due"}
              </span>
              <span className={`text-lg font-black ${settlementDirection === "factory_pays" ? "text-emerald-400" : "text-amber-500"}`}>
                ₹{Math.round(finalSettlementAmount).toLocaleString()}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !copraWeight}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/40 py-3.5 rounded-xl font-bold transition-all text-sm tracking-wide text-white uppercase shadow-lg"
          >
            {isSubmitting ? "Syncing ERP Multi-Ledger..." : "Execute Post & Download Slip"}
          </button>
        </form>

        {/* Live System Logs Ledger Tracking Data Tables */}
        <div className="xl:col-span-2 bg-[#07294d] border border-blue-900/70 p-6 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          
          {/* Header & Controls Matrix Block */}
          <div className="border-b border-blue-900 pb-4 mb-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-200">
                  Copra Processing Audit Logs Ledger
                </h3>
                <p className="text-xs text-slate-400">Real-time parametric cloud accounting engine log</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={downloadLedgerCSV}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow flex items-center gap-1.5"
                >
                  📥 Export CSV Ledger
                </button>
                <span className="text-xs font-mono px-2.5 py-1.5 bg-[#031B34] text-slate-400 border border-blue-900 rounded-xl">
                  Records: {filteredJobs.length}
                </span>
              </div>
            </div>

            {/* Filter controls row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#031B34]/50 p-3 rounded-xl border border-blue-900/60">
              {/* Plant / Hub controller segment */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Plant Processing Node</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-[#031B34] border border-blue-900 p-2 rounded-lg text-xs text-white font-medium outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {!isAdmin && <option value={currentBranchId || "main"}>{currentBranch?.name || "Current Plant Location"}</option>}
                  {isAdmin && (
                    <>
                      <option value="all">🌐 All Enterprise Plants</option>
                      <option value="main">Main Core Branch</option>
                      <option value="plant_b">Plant Unit B (South)</option>
                      <option value="plant_c">Plant Unit C (North)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Start Date picker component */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Start Date Range</label>
                <input 
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full bg-[#031B34] border border-blue-900 p-2 rounded-lg text-xs text-white outline-none focus:border-blue-500 scheme-dark"
                />
              </div>

              {/* End Date picker component */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">End Date Range</label>
                <input 
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full bg-[#031B34] border border-blue-900 p-2 rounded-lg text-xs text-white outline-none focus:border-blue-500 scheme-dark"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-slate-400 font-medium animate-pulse">Syncing Registers with Cloud Database Engine...</div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-blue-900 bg-[#031B34]/40">
                    <th className="p-3">Slip ID / Date</th>
                    <th className="p-3">Customer / Particulars</th>
                    <th className="p-3">Input Copra</th>
                    <th className="p-3">Production Yield</th>
                    <th className="p-3">Model Type</th>
                    <th className="p-3 text-right">Settlement Balance</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/30">
                  {filteredJobs.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-900/20 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-amber-400">{item.serviceNo || "MIL-LEGACY"}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.date}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{item.farmerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.vehicleNumber || "No Vehicle ID"}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-slate-200">{item.copraWeight?.toLocaleString()} KG</span>
                        <div className="text-[10px] text-slate-400">Moisture: {item.moisturePct || 0}%</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-yellow-400">{Number(item.expectedOil || 0).toFixed(1)} L</div>
                        <div className="text-[10px] text-emerald-400">{Number(item.expectedCake || 0).toFixed(1)} KG Cake</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-900 rounded text-[10px] font-mono">
                          {item.processingType?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className={`font-black ${item.settlementDirection === "factory_pays" ? "text-emerald-400" : "text-amber-500"}`}>
                          ₹{Math.round(item.finalSettlementAmount || 0).toLocaleString()}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-tighter">
                          {item.settlementDirection === "factory_pays" ? "Factory Outflow" : "Customer Owed"}
                        </div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => downloadMillingSlip(item)}
                          className="bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white px-2.5 py-1 rounded font-semibold border border-blue-500/30 transition-all text-[11px]"
                        >
                          📄 Slip
                        </button>
                        <button
                          onClick={() => handleDeleteJob(item.id)}
                          className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-2.5 py-1 rounded text-[11px] font-medium border border-red-500/20 transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredJobs.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-16 text-slate-500 font-medium">
                        No active processing records found matching the configured search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}