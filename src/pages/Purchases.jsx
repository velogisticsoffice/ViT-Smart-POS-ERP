import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { demoPurchases } from "../data/demoData";
import { useBusinessContext } from "../context/BusinessContext";

export default function Purchases() {
  const { currentBranchId, currentBranch, currentUser } = useBusinessContext();
  const [currentView, setCurrentView] = useState("bills");

  const [records, setRecords] = useState(() =>
    isFirebaseConfigured
      ? []
      : demoPurchases.map((record) => ({ ...record, branchId: record.branchId || "main", branchName: record.branchName || "Main Branch" }))
  );
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const viewTitles = {
    "bills": "Inward Purchase Bills",
    "payment-out": "Payment - Out Book Ledger",
    "return": "Purchase Return (Debit Note)",
    "order": "Outbound Purchase Orders"
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined;
    }

    const q = query(collection(db, `purchase_${currentView}`), where("branchId", "==", currentBranchId || "main"));
    const unsub = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [currentView, currentBranchId]);

  const branchRecords = records.filter((record) => (record.branchId || "main") === (currentBranchId || "main"));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendor || !amount) return alert("All fundamental values required");

    try {
      if (!isFirebaseConfigured) {
        setRecords((current) => [
          {
            id: String(Date.now()),
            vendor,
            amount: Number(amount),
            notes,
            date: new Date().toLocaleDateString(),
            branchId: currentBranchId || "main",
            branchName: currentBranch?.name || "Main Branch",
            createdBy: currentUser?.id || "system",
            createdByName: currentUser?.name || "System",
          },
          ...current,
        ]);
        setVendor("");
        setAmount("");
        setNotes("");
        return;
      }

      await addDoc(collection(db, `purchase_${currentView}`), {
        vendor,
        amount: Number(amount),
        notes,
        date: new Date().toLocaleDateString(),
        branchId: currentBranchId || "main",
        branchName: currentBranch?.name || "Main Branch",
        createdBy: currentUser?.id || "system",
        createdByName: currentUser?.name || "System",
        timestamp: serverTimestamp()
      });
      setVendor("");
      setAmount("");
      setNotes("");
      alert("Inward processing ledger successfully calculated!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <span className="text-xs uppercase bg-purple-600/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full font-bold">
          Procurement & Purchase
        </span>
        <h1 className="text-3xl font-bold mt-2">{viewTitles[currentView] || "Purchases Operations"}</h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries(viewTitles).map(([view, title]) => (
          <button
            key={view}
            type="button"
            onClick={() => setCurrentView(view)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              currentView === view
                ? "bg-purple-600 text-white border-purple-500"
                : "bg-purple-600/10 text-purple-300 border-purple-500/30 hover:bg-purple-600/20"
            }`}
          >
            {title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="bg-[#07294d] border border-blue-900 p-6 rounded-2xl h-fit space-y-4">
          <h3 className="text-lg font-bold border-b border-blue-800 pb-2 text-purple-400">Log Procurement</h3>
          
          <div>
            <label className="text-xs text-gray-400 block mb-1">Vendor / Supplier Name</label>
            <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} className="w-full bg-[#031B34] border border-blue-800 p-3 rounded-xl outline-none" required />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Bill Total Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-[#031B34] border border-blue-800 p-3 rounded-xl outline-none" required />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Item Description Summary</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-[#031B34] border border-blue-800 p-3 rounded-xl h-20 outline-none resize-none" />
          </div>

          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-xl font-bold transition-all text-sm">
            Save Procurement Records
          </button>
        </form>

        <div className="lg:col-span-2 bg-[#07294d] border border-blue-900 p-6 rounded-2xl">
          <h3 className="text-lg font-bold border-b border-blue-800 pb-2 mb-4 text-gray-300">Procurement History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-blue-800">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Supplier / Vendor</th>
                  <th className="pb-3">Inward Items Summary</th>
                  <th className="pb-3 text-right">Value (₹)</th>
                </tr>
              </thead>
              <tbody>
                {branchRecords.map(rec => (
                  <tr key={rec.id} className="border-b border-blue-900/40 hover:bg-blue-900/20">
                    <td className="py-3 text-xs text-gray-400">{rec.date}</td>
                    <td className="py-3 font-semibold text-purple-300">{rec.vendor}</td>
                    <td className="py-3 text-gray-300">{rec.notes || "—"}</td>
                    <td className="py-3 text-right font-bold text-red-400">₹{rec.amount}</td>
                  </tr>
                ))}
                {branchRecords.length === 0 && (
                  <tr><td colSpan="4" className="text-center py-6 text-gray-500">No active procurement data recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
