import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, onSnapshot, query, serverTimestamp } from "firebase/firestore";
import { CalendarCheck, Clock, UserCheck, UserMinus, Users } from "lucide-react";
import { db, isFirebaseConfigured } from "../firebase";
import { demoAttendance } from "../data/demoData";

const initialForm = {
  employee: "",
  role: "",
  status: "Present",
  shift: "Morning",
  hours: "8",
};

export default function EmployeeAttendance() {
  const [records, setRecords] = useState(() => (isFirebaseConfigured ? [] : demoAttendance));
  const [formData, setFormData] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    const q = query(collection(db, "employee_attendance"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map((attendanceDoc) => ({ id: attendanceDoc.id, ...attendanceDoc.data() })));
    });

    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const present = records.filter((item) => item.status === "Present").length;
    const absent = records.filter((item) => item.status === "Absent").length;
    const halfDay = records.filter((item) => item.status === "Half Day").length;
    const totalHours = records.reduce((sum, item) => sum + Number(item.hours || 0), 0);
    return { present, absent, halfDay, totalHours };
  }, [records]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.employee || !formData.role) {
      alert("Please enter employee name and role.");
      return;
    }

    const payload = {
      ...formData,
      hours: Number(formData.hours || 0),
      date: new Date().toLocaleDateString(),
    };

    setIsSaving(true);
    try {
      if (isFirebaseConfigured) {
        await addDoc(collection(db, "employee_attendance"), {
          ...payload,
          timestamp: serverTimestamp(),
        });
      } else {
        setRecords((current) => [{ ...payload, id: String(Date.now()) }, ...current]);
      }
      setFormData(initialForm);
    } catch (error) {
      console.error("Attendance save failed:", error);
      alert("Unable to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Employee Attendance</h1>
        <p className="mt-1 text-cyan-100">Track mill operators, packing staff, helpers, and billing attendance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ["Present", stats.present, UserCheck, "text-green-300"],
          ["Absent", stats.absent, UserMinus, "text-red-300"],
          ["Half Day", stats.halfDay, Clock, "text-yellow-300"],
          ["Total Hours", stats.totalHours, CalendarCheck, "text-cyan-300"],
        ].map(([label, value, Icon, color]) => (
          <div key={label} className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-300">{label}</p>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <p className={`mt-4 text-3xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-5">
          <h2 className="mb-5 flex items-center gap-2 border-b border-cyan-400/20 pb-4 text-xl font-bold">
            <Users className="h-5 w-5 text-cyan-300" />
            Mark Attendance
          </h2>

          <div className="space-y-4">
            <input
              name="employee"
              value={formData.employee}
              onChange={handleChange}
              placeholder="Employee name"
              className="w-full rounded-xl border border-cyan-500/30 bg-blue-900/60 p-3 outline-none"
            />
            <input
              name="role"
              value={formData.role}
              onChange={handleChange}
              placeholder="Role e.g. Mill Operator"
              className="w-full rounded-xl border border-cyan-500/30 bg-blue-900/60 p-3 outline-none"
            />
            <select name="status" value={formData.status} onChange={handleChange} className="w-full rounded-xl border border-cyan-500/30 bg-blue-900/60 p-3 outline-none">
              <option>Present</option>
              <option>Absent</option>
              <option>Half Day</option>
              <option>Leave</option>
            </select>
            <select name="shift" value={formData.shift} onChange={handleChange} className="w-full rounded-xl border border-cyan-500/30 bg-blue-900/60 p-3 outline-none">
              <option>Morning</option>
              <option>Evening</option>
              <option>Night</option>
              <option>General</option>
            </select>
            <input
              type="number"
              name="hours"
              value={formData.hours}
              onChange={handleChange}
              placeholder="Working hours"
              className="w-full rounded-xl border border-cyan-500/30 bg-blue-900/60 p-3 outline-none"
            />
          </div>

          <button disabled={isSaving} className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-bold hover:bg-blue-500 disabled:opacity-50">
            {isSaving ? "Saving..." : "Save Attendance"}
          </button>
        </form>

        <div className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-5">
          <h2 className="mb-5 border-b border-cyan-400/20 pb-4 text-xl font-bold">Attendance Ledger</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-400">
                <tr className="border-b border-cyan-400/20">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Employee</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Shift</th>
                  <th className="pb-3">Hours</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((item) => (
                  <tr key={item.id} className="border-b border-cyan-400/10">
                    <td className="py-3 text-gray-300">{item.date}</td>
                    <td className="py-3 font-bold">{item.employee}</td>
                    <td className="py-3 text-gray-300">{item.role}</td>
                    <td className="py-3 text-gray-300">{item.shift}</td>
                    <td className="py-3 font-bold">{item.hours}</td>
                    <td className="py-3">
                      <span className="rounded-lg bg-blue-600/30 px-3 py-1 text-xs font-bold">{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
