import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, deleteDoc, doc, runTransaction, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function MillingService() {
  const [jobs, setJobs] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  
  // Form input states
  const [farmerName, setFarmerName] = useState("");
  const [farmerPhone, setFarmerPhone] = useState("");
  const [copraWeight, setCopraWeight] = useState("");
  const [processingRate, setProcessingRate] = useState("8"); // ₹8 per kg default
  const [extractionRate, setExtractionRate] = useState("55"); // 55% default oil extraction yield
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch live milling jobs & inventory items
  useEffect(() => {
    const qJobs = query(collection(db, "milling_jobs"), orderBy("timestamp", "desc"));
    const unsubJobs = onSnapshot(qJobs, (snap) => {
      setJobs(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Milling Jobs Fetch Error:", err);
      setIsLoading(false);
    });

    const unsubInventory = onSnapshot(collection(db, "inventory"), (snap) => {
      setInventoryItems(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubJobs();
      unsubInventory();
    };
  }, []);

  // Real-time dynamic calculations
  const weightVal = Number(copraWeight || 0);
  const rateVal = Number(processingRate || 0);
  const yieldPct = Number(extractionRate || 0);

  const expectedOil = weightVal * (yieldPct / 100); // Oil in Liters
  const expectedCake = weightVal * ((100 - yieldPct) / 100); // Wastage Cake in Kg
  const totalServiceFee = weightVal * rateVal; // Service fee in INR

  // PDF Generator for Crushing Slip Receipt
  const downloadMillingSlip = (jobRecord) => {
    try {
      const doc = new jsPDF();

      // Slip Branded Header
      doc.setFillColor(3, 27, 52); // Brand dark #031B34
      doc.rect(0, 0, 210, 40, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text("VEERASHAIVA COCONUT OIL MILL", 20, 18);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(190, 210, 230);
      doc.text("Copra Crushing, Milling & Dynamic Byproduct Extraction Service", 20, 25);
      doc.text("Mangalore, Karnataka | Phone: +91 9876543210", 20, 31);

      // Metadata Right
      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.text(`MILL SLIP: #MIL-${jobRecord.id?.slice(0, 8).toUpperCase() || "TEMP"}`, 135, 18);
      doc.setFont("Helvetica", "normal");
      doc.text(`Date: ${jobRecord.date || new Date().toLocaleDateString()}`, 135, 24);
      doc.text(`Operator Desk: Milling-01`, 135, 30);

      // Farmer customer box
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(3, 27, 52);
      doc.text("FARMER / CUSTOMER PARTICULARS:", 20, 52);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 70, 80);
      doc.text(`Name: ${jobRecord.farmerName}`, 20, 58);
      doc.text(`Phone: ${jobRecord.farmerPhone || "Not Provided"}`, 20, 64);

      doc.setDrawColor(220, 230, 242);
      doc.line(20, 70, 190, 70);

      // Milling Metrics Table
      const headers = [["Crushing Parameter", "Valuation / Specification"]];
      const body = [
        ["Raw Copra Weight Brought", `${Number(jobRecord.copraWeight || 0).toLocaleString()} kg`],
        ["Oil Extraction Rate", `${jobRecord.extractionRate}%`],
        ["Expected Coconut Oil Output", `${Number(jobRecord.expectedOil || 0).toFixed(2)} Liters`],
        ["Retained Copra Cake (Wastage Byproduct)", `${Number(jobRecord.expectedCake || 0).toFixed(2)} kg`],
        ["Processing Service Rate", `₹${jobRecord.processingRate || processingRate} per kg`],
        ["Milling Processing Service Fee", `₹${Number(jobRecord.serviceFee || 0).toLocaleString()}`]
      ];

      autoTable(doc, {
        startY: 75,
        head: headers,
        body: body,
        headStyles: { fillColor: [3, 27, 52], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 10, cellPadding: 4 },
        margin: { left: 20, right: 20 },
      });

      // Retained disclaimer summary
      const finalY = doc.lastAutoTable.finalY + 12;
      doc.setFillColor(245, 250, 255);
      doc.rect(20, finalY, 170, 25, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(3, 27, 52);
      doc.text("Retained Byproduct Audit:", 25, finalY + 7);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(80, 90, 100);
      doc.text(`Retained ${Number(jobRecord.expectedCake || 0).toFixed(2)} kg of Copra Cake (Wastage Byproduct) at the mill warehouse.`, 25, finalY + 13);
      doc.text(`Net Crushing service fee settled: ₹${Number(jobRecord.serviceFee || 0).toLocaleString()}`, 25, finalY + 19);

      // Bottom footer
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(150, 160, 170);
      doc.text("Thank you for using Veerashaiva Coconut Mill crushing services! Support: info@veerashaiva.com", 20, 280);

      doc.save(`Milling_Slip_#MIL-${jobRecord.id?.slice(0, 8).toUpperCase() || "TEMP"}.pdf`);
    } catch (e) {
      console.error("Milling Slip PDF generation crashed:", e);
      alert("Slip PDF generation failed.");
    }
  };

  // Submit Milling Crushing Job
  const handleMillingSubmit = async (e) => {
    e.preventDefault();

    if (!farmerName || !copraWeight) {
      return alert("Farmer name and raw Copra weight are required.");
    }

    setIsSubmitting(true);

    try {
      // Execute a transaction to ensure both milling job creation, stock incrementing, and financial syncing are atomic!
      await runTransaction(db, async (transaction) => {
        // 1. Search for existing Copra Cake byproduct in inventory
        const cakeItem = inventoryItems.find(
          (i) => i.sku?.toUpperCase() === "COPRA-CAKE" || i.product?.toLowerCase().includes("copra cake")
        );

        let cakeRef;
        let finalCakeStock = Number(expectedCake);

        if (cakeItem) {
          cakeRef = doc(db, "inventory", cakeItem.id);
          const currentStock = Number(cakeItem.stock || 0);
          finalCakeStock = currentStock + Number(expectedCake);
          transaction.update(cakeRef, { stock: finalCakeStock });
        } else {
          // If byproduct doesn't exist, create it as a new product in inventory
          const inventoryColRef = collection(db, "inventory");
          const newProductRef = doc(inventoryColRef);
          
          transaction.set(newProductRef, {
            sku: "COPRA-CAKE",
            product: "Copra Cake (Wastage Byproduct)",
            category: "Raw Materials",
            unit: "kg",
            price: 15, // Nominal byproduct cost per kg
            stock: Number(expectedCake),
            created: new Date().toLocaleDateString()
          });
        }

        // 2. Add the milling job record
        const millingColRef = collection(db, "milling_jobs");
        const newJobRef = doc(millingColRef);
        transaction.set(newJobRef, {
          farmerName,
          farmerPhone,
          copraWeight: Number(copraWeight),
          extractionRate: Number(extractionRate),
          processingRate: Number(processingRate),
          expectedOil: Number(expectedOil),
          expectedCake: Number(expectedCake),
          serviceFee: Number(totalServiceFee),
          date: new Date().toLocaleDateString(),
          timestamp: serverTimestamp()
        });

        // 3. Add to standard sales ledger so dashboard revenue aggregates this automatically
        const salesColRef = collection(db, "sales");
        const newSaleRef = doc(salesColRef);
        transaction.set(newSaleRef, {
          customer: `Milling: ${farmerName}`,
          amount: Number(totalServiceFee),
          notes: `Crushed ${copraWeight} kg Copra. Retained ${expectedCake.toFixed(1)} kg Cake byproduct.`,
          date: new Date().toLocaleDateString(),
          timestamp: serverTimestamp()
        });
      });

      // Success Callback preview
      const previewJob = {
        farmerName,
        farmerPhone,
        copraWeight: Number(copraWeight),
        extractionRate: Number(extractionRate),
        processingRate: Number(processingRate),
        expectedOil: expectedOil,
        expectedCake: expectedCake,
        serviceFee: totalServiceFee,
        date: new Date().toLocaleDateString(),
        id: Math.random().toString(36).substring(2, 10).toUpperCase()
      };

      // Download crushing slip receipt
      downloadMillingSlip(previewJob);

      // Reset
      setFarmerName("");
      setFarmerPhone("");
      setCopraWeight("");
      setProcessingRate("8");
      setExtractionRate("55");
      alert("Crushing job submitted! Retained copra cake added to inventory, milling fee registered, and farmer receipt downloaded.");
    } catch (err) {
      console.error("Crushing job transaction crashed:", err);
      alert(`Milling Crushing transaction failed: ${err.message}`);
    }

    setIsSubmitting(false);
  };

  // Delete Job Log
  const handleDeleteJob = async (id) => {
    if (!window.confirm("Are you sure you want to delete this milling job entry?")) return;
    try {
      await deleteDoc(doc(db, "milling_jobs", id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      {/* Title */}
      <div className="mb-6">
        <span className="text-xs uppercase bg-amber-600/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full font-bold">
          Coconut Oil Milling & Job Work
        </span>
        <h1 className="text-3xl md:text-5xl font-bold mt-2">Copra Milling Service</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-amber-600/20 border border-amber-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">Total Copra Crushed</h2>
          <p className="text-4xl font-bold mt-3 text-white">
            {jobs.reduce((sum, j) => sum + Number(j.copraWeight || 0), 0).toLocaleString()} kg
          </p>
        </div>

        <div className="bg-green-600/20 border border-green-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-green-300 uppercase tracking-wider">Total Oil Yielded</h2>
          <p className="text-4xl font-bold mt-3 text-white">
            {jobs.reduce((sum, j) => sum + Number(j.expectedOil || 0), 0).toFixed(1).toLocaleString()} Ltrs
          </p>
        </div>

        <div className="bg-blue-600/20 border border-blue-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">Retained Byproduct (Cake)</h2>
          <p className="text-4xl font-bold mt-3 text-white">
            {jobs.reduce((sum, j) => sum + Number(j.expectedCake || 0), 0).toFixed(1).toLocaleString()} kg
          </p>
        </div>

        <div className="bg-purple-600/20 border border-purple-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-purple-300 uppercase tracking-wider">Milling Service Income</h2>
          <p className="text-4xl font-bold mt-3 text-white">
            ₹{jobs.reduce((sum, j) => sum + Number(j.serviceFee || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Crushing Logger Form */}
        <form onSubmit={handleMillingSubmit} className="bg-[#07294d] border border-blue-900/50 p-6 md:p-8 rounded-3xl h-fit space-y-5 shadow-xl">
          <h3 className="text-xl font-bold border-b border-blue-800 pb-3 text-amber-500 flex items-center gap-2">
            <span>🥥</span> Log Crushing Job
          </h3>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Farmer Name *</label>
            <input
              type="text"
              placeholder="e.g. Ramesh Gowda"
              value={farmerName}
              onChange={(e) => setFarmerName(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Farmer Phone Number</label>
            <input
              type="text"
              placeholder="e.g. +91 9876543210"
              value={farmerPhone}
              onChange={(e) => setFarmerPhone(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300 block mb-1">Copra Brought (kg) *</label>
              <input
                type="number"
                placeholder="0"
                value={copraWeight}
                onChange={(e) => setCopraWeight(e.target.value)}
                className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors font-semibold"
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-1">Milling Charge (₹/kg) *</label>
              <input
                type="number"
                placeholder="8"
                value={processingRate}
                onChange={(e) => setProcessingRate(e.target.value)}
                className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Expected Oil Extraction Rate (%) *</label>
            <input
              type="number"
              placeholder="55"
              value={extractionRate}
              onChange={(e) => setExtractionRate(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors font-semibold"
              required
            />
          </div>

          {/* Calculator Output summary panel */}
          <div className="bg-[#031B34] p-4 rounded-2xl border border-blue-900/50 space-y-2 mt-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Milling Yield Calculations</h4>
            <div className="border-t border-blue-900/50 my-1"></div>
            <div className="flex justify-between text-xs text-gray-300">
              <span>Expected Oil Output</span>
              <span className="font-semibold text-white">{expectedOil.toFixed(2)} Ltrs</span>
            </div>
            <div className="flex justify-between text-xs text-gray-300">
              <span>Retained Cake (Wastage Byproduct)</span>
              <span className="font-semibold text-white">{expectedCake.toFixed(2)} kg</span>
            </div>
            <div className="flex justify-between text-xs text-gray-300">
              <span>Wastage Policy</span>
              <span className="font-semibold text-yellow-400">Retained by Mill</span>
            </div>
            <div className="border-t border-blue-900/50 my-1"></div>
            <div className="flex justify-between font-extrabold text-base text-green-400">
              <span>Processing Service Fee</span>
              <span>₹{totalServiceFee.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !copraWeight}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800/40 py-4 rounded-xl font-bold transition-all text-base shadow-lg shadow-amber-950/40 text-white"
          >
            {isSubmitting ? "Syncing Milling Ledger..." : "Register Job & Crushing Slip"}
          </button>
        </form>

        {/* Live Milling job registry board */}
        <div className="lg:col-span-2 bg-[#07294d] border border-blue-900/50 p-6 md:p-8 rounded-3xl shadow-xl">
          <h3 className="text-xl font-bold border-b border-blue-800 pb-3 mb-6 text-gray-300">
            Crushing Ledger Logs
          </h3>

          {isLoading ? (
            <div className="text-center py-10 text-gray-400">Syncing Milling jobs with Firestore...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-blue-800">
                    <th className="pb-4">Date</th>
                    <th className="pb-4">Farmer</th>
                    <th className="pb-4">Copra (kg)</th>
                    <th className="pb-4">Oil Out (L)</th>
                    <th className="pb-4">Retained Cake (kg)</th>
                    <th className="pb-4 text-right">Fee (₹)</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((item) => (
                    <tr key={item.id} className="border-b border-blue-900/30 hover:bg-blue-900/10">
                      <td className="py-4 text-xs text-gray-400 align-middle">{item.date}</td>
                      <td className="py-4 align-middle">
                        <div className="font-semibold text-white">{item.farmerName}</div>
                        {item.farmerPhone && <div className="text-xs text-gray-400 mt-0.5">{item.farmerPhone}</div>}
                      </td>
                      <td className="py-4 font-semibold text-gray-300 align-middle">{item.copraWeight} kg</td>
                      <td className="py-4 font-bold text-yellow-400 align-middle">{item.expectedOil?.toFixed(1)} L</td>
                      <td className="py-4 font-mono text-gray-300 align-middle">{item.expectedCake?.toFixed(1)} kg</td>
                      <td className="py-4 text-right font-extrabold text-green-400 align-middle">
                        ₹{item.serviceFee?.toLocaleString()}
                      </td>
                      <td className="py-4 text-right align-middle space-x-2">
                        <button
                          onClick={() => downloadMillingSlip(item)}
                          className="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-500/20 transition-all"
                        >
                          📄 Slip
                        </button>
                        <button
                          onClick={() => handleDeleteJob(item.id)}
                          className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/20 transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-gray-500">
                        No crushing service jobs registered in cloud database.
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
