import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function Payroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [employee, setEmployee] = useState("");
  const [department, setDepartment] = useState("");
  const [salary, setSalary] = useState("");
  const [bonus, setBonus] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch live payroll from Firestore
  useEffect(() => {
    const q = query(collection(db, "payrolls"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPayrolls(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Payroll Fetch Error:", err);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // Process and commit payroll
  const handleAddPayroll = async (e) => {
    e.preventDefault();

    if (!employee || !department || !salary || !bonus) {
      return alert("Please fill in all standard payroll metrics.");
    }

    const totalSalary = Number(salary) + Number(bonus);

    try {
      await addDoc(collection(db, "payrolls"), {
        employee,
        department,
        basicSalary: Number(salary),
        bonus: Number(bonus),
        totalSalary,
        status: "Paid",
        paymentDate: new Date().toLocaleDateString(),
        timestamp: serverTimestamp()
      });

      // Reset
      setEmployee("");
      setDepartment("");
      setSalary("");
      setBonus("");
    } catch (err) {
      console.error("Error creating payroll record:", err);
      alert("Failed to commit payroll record to database.");
    }
  };

  // Delete Payroll record
  const handleDeletePayroll = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payroll record?")) return;
    try {
      await deleteDoc(doc(db, "payrolls", id));
    } catch (err) {
      console.error("Error deleting payroll:", err);
    }
  };

  // Toggle paid status
  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === "Paid" ? "Pending" : "Paid";
    try {
      await updateDoc(doc(db, "payrolls", item.id), {
        status: nextStatus
      });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Analytics
  const totalPayroll = payrolls.reduce((sum, item) => sum + Number(item.totalSalary || 0), 0);
  const paidEmployees = payrolls.filter((item) => item.status === "Paid").length;
  const pendingEmployees = payrolls.filter((item) => item.status === "Pending").length;

  return (
    <div className="page-container">
      {/* Heading */}
      <h1 className="text-3xl md:text-6xl font-bold mb-3">Employee Payroll</h1>
      <p className="text-gray-400 mb-10 text-xl">Enterprise Payroll & HR Salary Ledger</p>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-green-600/20 border border-green-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-lg text-green-300">Total Outflow</h2>
          <p className="text-4xl font-bold mt-3">₹{totalPayroll.toLocaleString()}</p>
        </div>

        <div className="bg-blue-600/20 border border-blue-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-lg text-blue-300">Total Employees</h2>
          <p className="text-4xl font-bold mt-3">{payrolls.length}</p>
        </div>

        <div className="bg-purple-600/20 border border-purple-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-lg text-purple-300">Paid Enrolled</h2>
          <p className="text-4xl font-bold mt-3">{paidEmployees}</p>
        </div>

        <div className="bg-red-600/20 border border-red-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-lg text-red-300">Pending Outlay</h2>
          <p className="text-4xl font-bold mt-3">{pendingEmployees}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <form onSubmit={handleAddPayroll} className="bg-[#07294d] border border-blue-900/50 p-6 md:p-8 rounded-3xl h-fit space-y-5">
          <h3 className="text-xl font-bold border-b border-blue-800 pb-3 text-emerald-400">Process Payroll</h3>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Employee Name</label>
            <input
              type="text"
              placeholder="e.g. Rajesh Kumar"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Department</label>
            <input
              type="text"
              placeholder="e.g. Sales / Warehousing"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Basic Salary (₹)</label>
            <input
              type="number"
              placeholder="0"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Incentive / Bonus (₹)</label>
            <input
              type="number"
              placeholder="0"
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-xl font-bold transition-all text-base shadow-lg shadow-emerald-950/40">
            Commit Payroll Record
          </button>
        </form>

        {/* Board */}
        <div className="lg:col-span-2 bg-[#07294d] border border-blue-900/50 p-6 md:p-8 rounded-3xl">
          <h3 className="text-xl font-bold border-b border-blue-800 pb-3 mb-6 text-gray-300">Employee Payroll Registry</h3>
          
          {isLoading ? (
            <div className="text-center py-10 text-gray-400">Syncing with Firestore...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-blue-800">
                    <th className="pb-4">Employee</th>
                    <th className="pb-4">Department</th>
                    <th className="pb-4">Basic</th>
                    <th className="pb-4">Bonus</th>
                    <th className="pb-4">Total</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((item) => (
                    <tr key={item.id} className="border-b border-blue-900/30 hover:bg-blue-900/10">
                      <td className="py-4 font-semibold text-white">{item.employee}</td>
                      <td className="py-4 text-gray-300">{item.department}</td>
                      <td className="py-4 text-gray-300">₹{item.basicSalary?.toLocaleString()}</td>
                      <td className="py-4 text-yellow-400">₹{item.bonus?.toLocaleString()}</td>
                      <td className="py-4 font-bold text-green-400">₹{item.totalSalary?.toLocaleString()}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                          item.status === "Paid"
                            ? "bg-green-600/10 text-green-400 border-green-600/30"
                            : "bg-red-600/10 text-red-400 border-red-600/30"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className="bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-500/20 transition-all"
                        >
                          Toggle Status
                        </button>
                        <button
                          onClick={() => handleDeletePayroll(item.id)}
                          className="bg-red-600/25 hover:bg-red-600 text-red-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/20 transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payrolls.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-gray-500">
                        No active employee payroll records found.
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
