import { useState, useEffect } from "react";
import {
  collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc,
  query, orderBy, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

const CATEGORIES = [
  { value: "Utilities",    label: "💡 Utilities & Power",    color: "text-yellow-400" },
  { value: "Logistics",    label: "🚚 Transport & Logistics",   color: "text-orange-400" },
  { value: "Salaries",     label: "👥 Personnel Wages",         color: "text-blue-400"   },
  { value: "Maintenance",  label: "🔧 Machine Maintenance",     color: "text-red-400"    },
  { value: "Raw Material", label: "🧴 Raw Material Purchase",   color: "text-purple-400" },
  { value: "Other",        label: "📋 Other Overheads",         color: "text-gray-400"   },
];

const catColor = (cat) =>
  CATEGORIES.find((c) => c.value === cat)?.color || "text-gray-400";

export default function Expenses() {
  const [expenses, setExpenses]   = useState([]);
  const [title, setTitle]         = useState("");
  const [category, setCategory]   = useState("Utilities");
  const [amount, setAmount]       = useState("");
  const [toast, setToast]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "expenses"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount) return showToast("Fill in all required fields.", "error");

    setSaving(true);
    try {
      const payload = {
        title,
        category,
        amount: Number(amount),
      };

      if (editingId) {
        // Update operational flow
        await updateDoc(doc(db, "expenses", editingId), payload);
        showToast("Expense log updated successfully!");
        setEditingId(null);
      } else {
        // Create operational flow
        await addDoc(collection(db, "expenses"), {
          ...payload,
          date: new Date().toISOString(),
          timestamp: serverTimestamp(),
        });
        showToast("Expense logged successfully!");
      }
      
      setTitle("");
      setAmount("");
      setCategory("Utilities");
    } catch (err) {
      console.error(err);
      showToast("Failed to save. Try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEditInit = (exp) => {
    setEditingId(exp.id);
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(String(exp.amount));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setAmount("");
    setCategory("Utilities");
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this expense log?")) return;
    try {
      await deleteDoc(doc(db, "expenses", id));
      showToast("Expense entry deleted.", "success");
      if (editingId === id) handleCancelEdit();
    } catch (err) {
      console.error(err);
      showToast("Failed to delete item.", "error");
    }
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    total: expenses
      .filter((e) => e.category === c.value)
      .reduce((s, e) => s + Number(e.amount || 0), 0),
  }));

  const fmt = (d) => {
    if (!d) return "—";
    const dt = d?.toDate ? d.toDate() : new Date(d);
    return isNaN(dt) ? d : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl font-semibold text-sm shadow-2xl transition-all
          ${toast.type === "error"
            ? "bg-red-600/90 text-white border border-red-500"
            : "bg-emerald-600/90 text-white border border-emerald-500"}`}>
          {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="mb-7">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">Expenses Ledger</h1>
        <p className="text-gray-400 mt-1">Track all business overheads and cash outflows</p>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {byCategory.map((c) => (
          <div key={c.value} className="bg-[#07294d] border border-blue-900/60 rounded-2xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{c.value}</p>
            <p className={`text-lg font-black ${c.color}`}>₹{c.total.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Log Form */}
        <form onSubmit={handleSubmit} className="bg-[#07294d] border border-blue-900/60 p-6 rounded-2xl space-y-4 h-fit">
          <h3 className="text-lg font-bold text-red-400 border-b border-blue-900/50 pb-3">
            {editingId ? "📝 Modify Outflow Log" : "💸 Log Cash Outflow"}
          </h3>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5 font-semibold">Expense Description *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-800 focus:border-blue-500 p-3 rounded-xl outline-none text-white text-sm transition-colors"
              placeholder="e.g., Electricity Bill — May"
              required
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5 font-semibold">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-800 focus:border-blue-500 p-3 rounded-xl outline-none text-white text-sm transition-colors"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5 font-semibold">Amount (₹) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-800 focus:border-blue-500 p-3 rounded-xl outline-none text-white text-sm transition-colors"
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 py-3 rounded-xl font-bold text-sm transition-all"
            >
              {saving ? "Saving…" : editingId ? "Update Entry" : "📌 Log Expense"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-700 hover:bg-gray-600 px-4 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Running total */}
          <div className="bg-red-950/40 border border-red-900/40 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Total Outflows Logged</p>
            <p className="text-2xl font-black text-red-400 mt-0.5">₹{totalExpenses.toLocaleString()}</p>
          </div>
        </form>

        {/* Expenses Table */}
        <div className="lg:col-span-2 bg-[#07294d] border border-blue-900/60 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-gray-200 border-b border-blue-900/50 pb-3 mb-4">
            Expense History ({expenses.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-blue-800 text-xs uppercase tracking-wider">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-right">Amount (₹)</th>
                  <th className="pb-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/30">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-blue-900/20 transition-colors">
                    <td className="py-3 text-xs text-gray-400 whitespace-nowrap">{fmt(exp.date)}</td>
                    <td className="py-3 font-semibold text-white">{exp.title}</td>
                    <td className="py-3">
                      <span className={`text-xs font-bold ${catColor(exp.category)}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 text-right font-black text-red-400 whitespace-nowrap">
                      − ₹{Number(exp.amount).toLocaleString()}
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditInit(exp)}
                          className="px-2 py-1 text-[11px] font-bold rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="px-2 py-1 text-[11px] font-bold rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-gray-500">
                      No expenses recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}