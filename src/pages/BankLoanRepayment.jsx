import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, onSnapshot, query, serverTimestamp } from "firebase/firestore";
import { Banknote, CalendarClock, Landmark, ReceiptIndianRupee } from "lucide-react";
import { db, isFirebaseConfigured } from "../firebase";
import { demoLoans } from "../data/demoData";

const initialForm = {
  bank: "",
  loanType: "",
  principal: "",
  emi: "",
  paidAmount: "",
  dueDate: "",
  notes: "",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function BankLoanRepayment() {
  const [loans, setLoans] = useState(() => (isFirebaseConfigured ? [] : demoLoans));
  const [formData, setFormData] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    const q = query(collection(db, "bank_loan_repayments"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLoans(snapshot.docs.map((loanDoc) => ({ id: loanDoc.id, ...loanDoc.data() })));
    });

    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const principal = loans.reduce((sum, loan) => sum + Number(loan.principal || 0), 0);
    const paid = loans.reduce((sum, loan) => sum + Number(loan.paidAmount || 0), 0);
    const emi = loans.reduce((sum, loan) => sum + Number(loan.emi || 0), 0);
    return { principal, paid, balance: principal - paid, emi };
  }, [loans]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.bank || !formData.loanType || !formData.principal || !formData.emi) {
      alert("Please fill bank, loan type, principal, and EMI.");
      return;
    }

    const payload = {
      ...formData,
      principal: Number(formData.principal || 0),
      emi: Number(formData.emi || 0),
      paidAmount: Number(formData.paidAmount || 0),
      status: "Active",
    };

    setIsSaving(true);
    try {
      if (isFirebaseConfigured) {
        await addDoc(collection(db, "bank_loan_repayments"), {
          ...payload,
          timestamp: serverTimestamp(),
        });
      } else {
        setLoans((current) => [{ ...payload, id: String(Date.now()) }, ...current]);
      }
      setFormData(initialForm);
    } catch (error) {
      console.error("Loan save failed:", error);
      alert("Unable to save loan repayment record.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Bank Loan Repayment</h1>
        <p className="mt-1 text-cyan-100">Track machinery loans, working capital, EMI dues, and paid balance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ["Total Principal", formatCurrency(stats.principal), Landmark, "text-blue-300"],
          ["Paid Amount", formatCurrency(stats.paid), ReceiptIndianRupee, "text-green-300"],
          ["Balance", formatCurrency(stats.balance), Banknote, "text-orange-300"],
          ["Monthly EMI", formatCurrency(stats.emi), CalendarClock, "text-cyan-300"],
        ].map(([label, value, Icon, color]) => (
          <div key={label} className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-300">{label}</p>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <p className={`mt-4 text-2xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-5">
          <h2 className="mb-5 border-b border-cyan-400/20 pb-4 text-xl font-bold">Add Loan / EMI</h2>
          <div className="space-y-4">
            <input name="bank" value={formData.bank} onChange={handleChange} placeholder="Bank name" className="w-full rounded-xl border border-cyan-500/30 bg-blue-900/60 p-3 outline-none" />
            <input name="loanType" value={formData.loanType} onChange={handleChange} placeholder="Loan type e.g. Machinery Loan" className="w-full rounded-xl border border-cyan-500/30 bg-blue-900/60 p-3 outline-none" />
            <input type="number" name="principal" value={formData.principal} onChange={handleChange} placeholder="Principal amount" className="w-full rounded-xl border border-cyan-500/30 bg-blue-900/60 p-3 outline-none" />
            <input type="number" name="emi" value={formData.emi} onChange={handleChange} placeholder="Monthly EMI" className="w-full rounded-xl border border-cyan-500/30 bg-blue-900/60 p-3 outline-none" />
            <input type="number" name="paidAmount" value={formData.paidAmount} onChange={handleChange} placeholder="Already paid amount" className="w-full rounded-xl border border-cyan-500/30 bg-blue-900/60 p-3 outline-none" />
            <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full rounded-xl border border-cyan-500/30 bg-blue-900/60 p-3 outline-none" />
            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes" className="h-20 w-full resize-none rounded-xl border border-cyan-500/30 bg-blue-900/60 p-3 outline-none" />
          </div>
          <button disabled={isSaving} className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-bold hover:bg-blue-500 disabled:opacity-50">
            {isSaving ? "Saving..." : "Save Loan Record"}
          </button>
        </form>

        <div className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-5">
          <h2 className="mb-5 border-b border-cyan-400/20 pb-4 text-xl font-bold">Loan Repayment Ledger</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-400">
                <tr className="border-b border-cyan-400/20">
                  <th className="pb-3">Bank</th>
                  <th className="pb-3">Loan</th>
                  <th className="pb-3">Principal</th>
                  <th className="pb-3">Paid</th>
                  <th className="pb-3">Balance</th>
                  <th className="pb-3">EMI</th>
                  <th className="pb-3">Due</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => {
                  const balance = Number(loan.principal || 0) - Number(loan.paidAmount || 0);
                  return (
                    <tr key={loan.id} className="border-b border-cyan-400/10">
                      <td className="py-3 font-bold">{loan.bank}</td>
                      <td className="py-3 text-gray-300">{loan.loanType}</td>
                      <td className="py-3">{formatCurrency(loan.principal)}</td>
                      <td className="py-3 text-green-300">{formatCurrency(loan.paidAmount)}</td>
                      <td className="py-3 text-orange-300">{formatCurrency(balance)}</td>
                      <td className="py-3 font-bold">{formatCurrency(loan.emi)}</td>
                      <td className="py-3 text-gray-300">{loan.dueDate || "Not set"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
