import { useEffect, useMemo, useState } from "react";
import { addDoc, doc, updateDoc, deleteDoc, collection, onSnapshot, query, serverTimestamp } from "firebase/firestore";
import { CalendarCheck, Clock, UserCheck, UserMinus, Users, DollarSign, Wallet, Share2, Download, Pencil, Trash2, UserPlus } from "lucide-react";
import { db, isFirebaseConfigured } from "../firebase";
import { demoAttendance } from "../data/demoData";

// Starting with a completely empty, admin-configured directory
const defaultStaffList = [];

const initialForm = {
  employeeId: "", 
  status: "Present",
  shift: "Morning",
  hours: "8",
  paymentModel: "Monthly",
  rateStructure: "15000",
  advanceTaken: "0",
};

export default function EmployeeAttendance() {
  // Safe initial loading map that avoids dependency on legacy static profiles
  const [records, setRecords] = useState(() => {
    if (isFirebaseConfigured) return [];
    return demoAttendance.map(item => {
      const isDailyMode = item.hours < 8 || item.status === "Half Day";
      return {
        ...item,
        rateStructure: item.rateStructure || (isDailyMode ? 600 : 15000),
        paymentModel: item.paymentModel || (isDailyMode ? "Daily" : "Monthly"),
        advanceTaken: item.advanceTaken || 0,
        hours: item.hours !== undefined ? item.hours : 8
      };
    });
  });

  const [staffList, setStaffList] = useState(defaultStaffList);
  const [formData, setFormData] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Directory addition state variables (with payment controls added)
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("");
  const [newStaffModel, setNewStaffModel] = useState("Monthly");
  const [newStaffRate, setNewStaffRate] = useState("15000");
  const [editingStaffId, setEditingStaffId] = useState(null);

  // Date filters
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    const q = query(collection(db, "employee_attendance"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map((doc) => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          rateStructure: data.rateStructure || 0,
          paymentModel: data.paymentModel || "Monthly",
          advanceTaken: data.advanceTaken || 0
        };
      }));
    });

    return () => unsubscribe();
  }, []);

  // Sync pricing matrices instantly when an admin assigns a worker to a shift card
  useEffect(() => {
    if (formData.employeeId && !editingId) {
      const selectedPerson = staffList.find(s => s.id === formData.employeeId);
      if (selectedPerson) {
        setFormData(prev => ({ 
          ...prev, 
          paymentModel: selectedPerson.model || "Monthly",
          rateStructure: selectedPerson.defaultRate || "15000"
        }));
      }
    }
  }, [formData.employeeId, staffList, editingId]);

  const calculateEarnings = (paymentModel = "Monthly", rateStructure = 0, hoursWorked = 0, advance = 0) => {
    const rate = Number(rateStructure || 0);
    const hours = Number(hoursWorked || 0);
    const adv = Number(advance || 0);
    let grossEarned = 0;

    if (paymentModel === "Daily") {
      grossEarned = (rate / 8) * hours;
    } else {
      grossEarned = hours * (rate / (26 * 8));
    }

    if (isNaN(grossEarned)) grossEarned = 0;

    return {
      gross: Math.max(0, grossEarned).toFixed(2),
      net: Math.max(0, grossEarned - adv).toFixed(2)
    };
  };

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      if (!item.date) return true;
      const recordTime = new Date(item.date).getTime();
      if (startDateFilter) {
        const start = new Date(startDateFilter).setHours(0, 0, 0, 0);
        if (recordTime < start) return false;
      }
      if (endDateFilter) {
        const end = new Date(endDateFilter).setHours(23, 59, 59, 999);
        if (recordTime > end) return false;
      }
      return true;
    });
  }, [records, startDateFilter, endDateFilter]);

  const stats = useMemo(() => {
    const present = filteredRecords.filter((item) => item.status === "Present").length;
    const absent = filteredRecords.filter((item) => item.status === "Absent").length;
    const halfDay = filteredRecords.filter((item) => item.status === "Half Day").length;
    const totalHours = filteredRecords.reduce((sum, item) => sum + Number(item.hours || 0), 0);
    const totalAdvances = filteredRecords.reduce((sum, item) => sum + Number(item.advanceTaken || 0), 0);
    return { present, absent, halfDay, totalHours, totalAdvances };
  }, [filteredRecords]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  // --- STAFF DIRECTORY LOGIC ---
  const handleSaveStaffProfile = (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffRole) return alert("Please enter both staff name and role.");

    if (editingStaffId) {
      setStaffList(prev => prev.map(s => s.id === editingStaffId ? { 
        ...s, 
        name: newStaffName, 
        role: newStaffRole,
        model: newStaffModel,
        defaultRate: newStaffRate
      } : s));
      setEditingStaffId(null);
    } else {
      setStaffList(prev => [...prev, { 
        id: String(Date.now()), 
        name: newStaffName, 
        role: newStaffRole,
        defaultRate: newStaffRate,
        model: newStaffModel
      }]);
    }
    setNewStaffName("");
    setNewStaffRole("");
    setNewStaffRate("15000");
    setNewStaffModel("Monthly");
  };

  const handleEditStaffInit = (staff) => {
    setEditingStaffId(staff.id);
    setNewStaffName(staff.name);
    setNewStaffRole(staff.role);
    setNewStaffModel(staff.model || "Monthly");
    setNewStaffRate(staff.defaultRate || "15000");
  };

  const handleDeleteStaffProfile = (staffId) => {
    if (window.confirm("Are you sure you want to completely delete this employee from the system directory?")) {
      setStaffList(prev => prev.filter(s => s.id !== staffId));
      if (formData.employeeId === staffId) {
        setFormData(initialForm);
      }
    }
  };

  // --- REGISTRY TRANSACTION ENGINE ---
  const handleSubmitAttendance = async (event) => {
    event.preventDefault();
    if (!formData.employeeId) return alert("Please select a personnel from the drop-down.");

    const chosenStaff = staffList.find(s => s.id === formData.employeeId);
    const payload = {
      ...formData,
      employee: chosenStaff ? chosenStaff.name : "Unknown Staff",
      role: chosenStaff ? chosenStaff.role : "Unassigned Staff",
      hours: Number(formData.hours || 0),
      rateStructure: Number(formData.rateStructure || 0),
      advanceTaken: Number(formData.advanceTaken || 0),
    };

    setIsSaving(true);
    try {
      if (editingId) {
        if (isFirebaseConfigured) {
          await updateDoc(doc(db, "employee_attendance", editingId), payload);
        } else {
          setRecords((current) => current.map((item) => (item.id === editingId ? { ...item, ...payload } : item)));
        }
        setEditingId(null);
      } else {
        const createPayload = {
          ...payload,
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        };
        if (isFirebaseConfigured) {
          await addDoc(collection(db, "employee_attendance"), { ...createPayload, timestamp: serverTimestamp() });
        } else {
          setRecords((current) => [{ ...createPayload, id: String(Date.now()) }, ...current]);
        }
      }
      setFormData(initialForm);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditLogInit = (item) => {
    setEditingId(item.id);
    const matchedStaff = staffList.find(s => s.name === item.employee) || { id: "" };
    setFormData({
      employeeId: matchedStaff.id,
      status: item.status,
      shift: item.shift,
      hours: String(item.hours),
      paymentModel: item.paymentModel || "Monthly",
      rateStructure: String(item.rateStructure),
      advanceTaken: String(item.advanceTaken || 0),
    });
  };

  const handleDeleteLogEntry = async (id) => {
    if (!window.confirm("Permanently delete this entry?")) return;
    if (isFirebaseConfigured) {
      await deleteDoc(doc(db, "employee_attendance", id));
    } else {
      setRecords((current) => current.filter((item) => item.id !== id));
    }
  };

  const downloadLedgerReport = () => {
    if (filteredRecords.length === 0) return alert("No active records.");
    const csvHeaders = ["Date", "Employee", "Role", "Shift", "Hours Logged", "Status", "Payment Model", "Base Rate", "Gross Pay", "Advance", "Net Payable"];
    const csvRows = filteredRecords.map((item) => {
      const calc = calculateEarnings(item.paymentModel, item.rateStructure, item.hours, item.advanceTaken);
      return [item.date, item.employee, item.role, item.shift, item.hours, item.status, item.paymentModel, item.rateStructure, calc.gross, item.advanceTaken, calc.net].join(",");
    });
    const blobContent = "data:text/csv;charset=utf-8,\uFEFF" + [csvHeaders.join(","), ...csvRows].join("\n");
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", encodeURI(blobContent));
    linkElement.setAttribute("download", "Payroll_Ledger_Report.csv");
    linkElement.click();
  };

  return (
    <div className="space-y-6 text-white p-4">
      <div>
        <h1 className="text-3xl font-bold">Employee Ledger & Payroll Matrix</h1>
        <p className="mt-1 text-cyan-100/70 font-light">Assign custom admin personnel, resolve salary/wages matrix indices, and manage logs.</p>
      </div>

      {/* KPI Overviews */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
        {[
          ["Present Counts", stats.present, UserCheck, "text-green-400"],
          ["Absent Counts", stats.absent, UserMinus, "text-red-400"],
          ["Half Day Units", stats.halfDay, Clock, "text-yellow-400"],
          ["Accumulated Hours", stats.totalHours, CalendarCheck, "text-cyan-400"],
          ["Total Advance Paid", `₹${stats.totalAdvances}`, Wallet, "text-rose-400"],
        ].map(([label, value, Icon, color]) => (
          <div key={label} className="rounded-2xl border border-cyan-500/20 bg-blue-950/40 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400 font-medium">{label}</p>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className={`mt-4 text-3xl font-black tracking-tight ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        {/* Registry Form */}
        <form onSubmit={handleSubmitAttendance} className="rounded-2xl border border-cyan-500/20 bg-blue-950/40 p-5 h-fit space-y-4 shadow-2xl">
          <h2 className="mb-2 flex items-center gap-2 border-b border-cyan-500/10 pb-4 text-xl font-bold text-amber-500">
            <Users className="h-5 w-5" />
            {editingId ? "Modify Shift Entry" : "Assign Staff Attendance"}
          </h2>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Select Admin Person *</label>
            <select
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              className="w-full rounded-xl border border-cyan-500/20 bg-blue-900/40 p-3 text-white outline-none focus:border-cyan-400 text-sm [&>option]:bg-blue-950"
              required
            >
              <option value="">-- Choose Staff Personnel --</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>{staff.name} ({staff.role})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Status Model</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full rounded-xl border border-cyan-500/20 bg-blue-900/40 p-3 text-sm outline-none [&>option]:bg-blue-950">
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Half Day">Half Day</option>
                <option value="Leave">Leave</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Shift Type</label>
              <select name="shift" value={formData.shift} onChange={handleChange} className="w-full rounded-xl border border-cyan-500/20 bg-blue-900/40 p-3 text-sm outline-none [&>option]:bg-blue-950">
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div className="border-t border-cyan-500/10 pt-3 space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" /> Financial Configuration Matrices
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Payment Model Selectable</label>
              <select 
                name="paymentModel" 
                value={formData.paymentModel} 
                onChange={(e) => {
                  handleChange(e);
                  setFormData(current => ({ ...current, rateStructure: e.target.value === "Daily" ? "600" : "15000" }));
                }} 
                className="w-full rounded-xl border border-amber-500/30 bg-blue-900/40 p-3 text-amber-300 font-bold text-sm outline-none [&>option]:bg-blue-950"
              >
                <option value="Monthly">💵 Monthly Salary Pay Metric</option>
                <option value="Daily">🔨 Daily Wages Remittance Basis</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  {formData.paymentModel === "Daily" ? "Daily Rate (₹)" : "Monthly Base (₹)"}
                </label>
                <input type="number" name="rateStructure" value={formData.rateStructure} onChange={handleChange} className="w-full rounded-xl border border-cyan-500/20 bg-blue-900/40 p-3 text-sm outline-none text-white"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Shift Hours Logged</label>
                <input type="number" name="hours" value={formData.hours} onChange={handleChange} className="w-full rounded-xl border border-cyan-500/20 bg-blue-900/40 p-3 text-sm outline-none text-white"/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-400 mb-1.5">Advance Handout Deduct (₹)</label>
              <input type="number" name="advanceTaken" value={formData.advanceTaken} onChange={handleChange} className="w-full rounded-xl border border-rose-500/20 bg-blue-900/40 p-3 text-rose-300 text-sm outline-none"/>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-blue-600 py-3 font-bold hover:bg-blue-500 transition text-xs uppercase shadow-md">
              {isSaving ? "Syncing..." : editingId ? "Update Registry Log" : "Save Shift Entry"}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} className="rounded-xl bg-gray-700 px-4 py-3 text-xs font-bold hover:bg-gray-600">Cancel</button>
            )}
          </div>
        </form>

        {/* Attendance Ledger Panel */}
        <div className="rounded-2xl border border-cyan-500/20 bg-blue-950/40 p-5 flex flex-col space-y-4">
          <div className="bg-[#031B34]/60 p-4 rounded-xl border border-cyan-500/10 flex flex-col sm:flex-row justify-between gap-4 items-center">
            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto flex-1">
              <input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} className="bg-blue-950 border border-cyan-500/20 p-2 rounded-lg text-xs outline-none scheme-dark text-white"/>
              <input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} className="bg-blue-950 border border-cyan-500/20 p-2 rounded-lg text-xs outline-none scheme-dark text-white"/>
            </div>
            <button onClick={downloadLedgerReport} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md shrink-0 w-full sm:w-auto justify-center">
              <Download className="h-4 w-4" /> Download Sheet Report
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-cyan-500/20 text-gray-400 uppercase font-semibold bg-[#031B34]/40">
                  <th className="p-3">Date/Employee</th>
                  <th className="p-3">Shift Info</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Model Pay Structure</th>
                  <th className="p-3 text-right">Gross Pay</th>
                  <th className="p-3 text-right text-rose-400">Advance Deduct</th>
                  <th className="p-3 text-right text-green-400">Net Balance</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/5">
                {filteredRecords.map((item) => {
                  const calculations = calculateEarnings(item.paymentModel, item.rateStructure, item.hours, item.advanceTaken);
                  return (
                    <tr key={item.id} className="hover:bg-blue-900/20 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-gray-100 text-sm">{item.employee}</div>
                        <div className="text-gray-400 text-[10px] mt-0.5">{item.date} • {item.role}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold">{item.shift}</div>
                        <div className="text-cyan-400">{item.hours} hours logged</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block rounded-lg px-2 py-0.5 font-bold text-[10px] ${item.status === 'Present' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-gray-300">
                        ₹{Number(item.rateStructure || 0).toLocaleString()}
                        <span className="block text-[9px] text-gray-500">{item.paymentModel === "Daily" ? "/day" : "/mo"}</span>
                      </td>
                      <td className="p-3 text-right text-gray-100 font-medium">₹{Number(calculations.gross).toLocaleString()}</td>
                      <td className="p-3 text-right text-rose-400 font-semibold">₹{Number(item.advanceTaken || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-green-400 font-bold text-sm">₹{Number(calculations.net).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button onClick={() => {
                            const finances = calculateEarnings(item.paymentModel, item.rateStructure, item.hours, item.advanceTaken);
                            window.open(`https://api.whatsapp.com/send?text=*PAYSLIP*%0A*Staff:* ${item.employee}%0A*Net Total:* ₹${finances.net}`, '_blank');
                          }} className="p-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40"><Share2 className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => handleEditLogInit(item)} className="p-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-400 hover:bg-amber-600/40"><Pencil className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => handleDeleteLogEntry(item.id)} className="p-1.5 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600/40"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- STAFF DIRECTORY SETTINGS MANAGEMENT INTERFACE --- */}
      <div className="rounded-2xl border border-cyan-500/20 bg-blue-950/40 p-5 mt-6">
        <h2 className="mb-4 text-xl font-bold text-cyan-400 flex items-center gap-2">
          <UserPlus className="h-5 w-5" /> Admin Staff Directory & Personnel Controls
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          <form onSubmit={handleSaveStaffProfile} className="bg-blue-900/20 p-4 rounded-xl border border-cyan-500/10 space-y-3 h-fit">
            <h3 className="text-sm font-semibold text-amber-400">{editingStaffId ? "Edit Profile" : "Register New Staff Profile"}</h3>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Full Staff Name</label>
              <input type="text" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="E.g. Shivraj Kumar" className="w-full bg-blue-950 border border-cyan-500/20 rounded-lg p-2.5 text-xs text-white outline-none focus:border-cyan-400" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Operational Role Designation</label>
              <input type="text" value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)} placeholder="E.g. Mill Operator" className="w-full bg-blue-950 border border-cyan-500/20 rounded-lg p-2.5 text-xs text-white outline-none focus:border-cyan-400" />
            </div>
            
            {/* Payment Model Customizer Selection Panel */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Pay Basis</label>
                <select value={newStaffModel} onChange={e => {
                  setNewStaffModel(e.target.value);
                  setNewStaffRate(e.target.value === "Daily" ? "600" : "15000");
                }} className="w-full bg-blue-950 border border-cyan-500/20 rounded-lg p-2 text-xs text-white outline-none [&>option]:bg-blue-950">
                  <option value="Monthly">Monthly</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Base Rate (₹)</label>
                <input type="number" value={newStaffRate} onChange={e => setNewStaffRate(e.target.value)} className="w-full bg-blue-950 border border-cyan-500/20 rounded-lg p-2 text-xs text-white outline-none" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2 rounded-lg transition uppercase">{editingStaffId ? "Update Info" : "Register Staff"}</button>
              {editingStaffId && <button type="button" onClick={() => { setEditingStaffId(null); setNewStaffName(""); setNewStaffRole(""); setNewStaffRate("15000"); setNewStaffModel("Monthly"); }} className="bg-gray-700 text-xs px-3 rounded-lg">Cancel</button>}
            </div>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {staffList.map(staff => (
              <div key={staff.id} className="bg-[#031B34]/60 p-4 rounded-xl border border-cyan-500/10 flex justify-between items-center shadow-md">
                <div>
                  <h4 className="font-bold text-gray-100 text-sm">{staff.name}</h4>
                  <p className="text-gray-400 text-xs">{staff.role}</p>
                  <span className="inline-block mt-1 text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded">
                    ₹{Number(staff.defaultRate).toLocaleString()}/{staff.model === "Daily" ? "day" : "mo"}
                  </span>
                </div>
                <div className="flex gap-1.5 ml-2">
                  <button type="button" onClick={() => handleEditStaffInit(staff)} className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/30"><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => handleDeleteStaffProfile(staff.id)} className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/30" title="Delete Staff Profile"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {staffList.length === 0 && (
              <div className="col-span-full border border-dashed border-cyan-500/10 rounded-xl p-8 text-center text-gray-500 text-xs">
                No staff profiles active. Register profiles inside the management side-dock to populate your admin options.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}