import { useState } from "react";
import { Building2, Mail, MapPin, Phone, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { useBusinessContext } from "../context/BusinessContext";

const initialBranch = { name: "", code: "", location: "", phone: "" };
const initialUser = { name: "", email: "", role: "Cashier", branchId: "" };

export default function UsersBranches() {
  const {
    branches,
    users,
    currentBranchId,
    currentUserId,
    setCurrentBranchId,
    setCurrentUserId,
    addBranch,
    addUser,
  } = useBusinessContext();
  const [branchForm, setBranchForm] = useState(initialBranch);
  const [userForm, setUserForm] = useState(() => ({ ...initialUser, branchId: currentBranchId || "" }));

  const handleBranchChange = (event) => {
    const { name, value } = event.target;
    setBranchForm((current) => ({ ...current, [name]: value }));
  };

  const handleUserChange = (event) => {
    const { name, value } = event.target;
    setUserForm((current) => ({ ...current, [name]: value }));
  };

  const handleBranchSubmit = async (event) => {
    event.preventDefault();
    if (!branchForm.name.trim() || !branchForm.code.trim()) {
      alert("Branch name and code are required.");
      return;
    }
    try {
      await addBranch({
        ...branchForm,
        code: branchForm.code.trim().toUpperCase(),
        name: branchForm.name.trim(),
      });
      setBranchForm(initialBranch);
    } catch (error) {
      console.error("Branch save failed:", error);
      alert("Unable to save branch.");
    }
  };

  const handleUserSubmit = async (event) => {
    event.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.branchId) {
      alert("User name, email, and branch are required.");
      return;
    }
    try {
      await addUser({
        ...userForm,
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
      });
      setUserForm({ ...initialUser, branchId: currentBranchId || "" });
    } catch (error) {
      console.error("User save failed:", error);
      alert("Unable to save user.");
    }
  };

  const branchName = (branchId) => branches.find((branch) => branch.id === branchId)?.name || "No branch";

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-600/10 px-3 py-1 text-xs font-bold uppercase text-cyan-300">
            Access Control
          </span>
          <h1 className="mt-3 text-3xl font-bold md:text-5xl">Users & Branches</h1>
          <p className="mt-2 text-gray-400">
            Manage business branches, staff roles, and the active operating context.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-gray-400">Active Branch</span>
            <select
              value={currentBranchId || ""}
              onChange={(event) => setCurrentBranchId(event.target.value)}
              className="w-full rounded-2xl border border-blue-900 bg-[#031B34] p-3 text-white outline-none focus:border-cyan-500"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-gray-400">Active User</span>
            <select
              value={currentUserId || ""}
              onChange={(event) => setCurrentUserId(event.target.value)}
              className="w-full rounded-2xl border border-blue-900 bg-[#031B34] p-3 text-white outline-none focus:border-cyan-500"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.role}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <form onSubmit={handleBranchSubmit} className="rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6">
          <h2 className="mb-5 flex items-center gap-2 border-b border-blue-900 pb-4 text-xl font-bold text-cyan-200">
            <Building2 className="h-5 w-5" />
            Add Branch
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input name="name" value={branchForm.name} onChange={handleBranchChange} placeholder="Branch name" className="rounded-xl border border-blue-900 bg-[#031B34] p-3 outline-none focus:border-cyan-500" />
            <input name="code" value={branchForm.code} onChange={handleBranchChange} placeholder="Code e.g. MILL" className="rounded-xl border border-blue-900 bg-[#031B34] p-3 uppercase outline-none focus:border-cyan-500" />
            <input name="location" value={branchForm.location} onChange={handleBranchChange} placeholder="Location" className="rounded-xl border border-blue-900 bg-[#031B34] p-3 outline-none focus:border-cyan-500" />
            <input name="phone" value={branchForm.phone} onChange={handleBranchChange} placeholder="Phone" className="rounded-xl border border-blue-900 bg-[#031B34] p-3 outline-none focus:border-cyan-500" />
          </div>
          <button className="mt-5 w-full rounded-xl bg-cyan-600 py-3 font-bold hover:bg-cyan-500">
            Save Branch
          </button>
        </form>

        <form onSubmit={handleUserSubmit} className="rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6">
          <h2 className="mb-5 flex items-center gap-2 border-b border-blue-900 pb-4 text-xl font-bold text-green-200">
            <UserPlus className="h-5 w-5" />
            Add User
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input name="name" value={userForm.name} onChange={handleUserChange} placeholder="User name" className="rounded-xl border border-blue-900 bg-[#031B34] p-3 outline-none focus:border-green-500" />
            <input name="email" value={userForm.email} onChange={handleUserChange} placeholder="Email" className="rounded-xl border border-blue-900 bg-[#031B34] p-3 outline-none focus:border-green-500" />
            <select name="role" value={userForm.role} onChange={handleUserChange} className="rounded-xl border border-blue-900 bg-[#031B34] p-3 outline-none focus:border-green-500">
              <option>Administrator</option>
              <option>Branch Manager</option>
              <option>Production Manager</option>
              <option>Cashier</option>
              <option>Accountant</option>
            </select>
            <select name="branchId" value={userForm.branchId} onChange={handleUserChange} className="rounded-xl border border-blue-900 bg-[#031B34] p-3 outline-none focus:border-green-500">
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <button className="mt-5 w-full rounded-xl bg-green-600 py-3 font-bold hover:bg-green-500">
            Save User
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6">
          <h2 className="mb-5 flex items-center gap-2 border-b border-blue-900 pb-4 text-xl font-bold">
            <Building2 className="h-5 w-5 text-cyan-300" />
            Branch Directory
          </h2>
          <div className="space-y-3">
            {branches.map((branch) => (
              <button
                key={branch.id}
                type="button"
                onClick={() => setCurrentBranchId(branch.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  currentBranchId === branch.id
                    ? "border-cyan-400 bg-cyan-500/15"
                    : "border-blue-900 bg-[#031B34] hover:border-cyan-500/50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-white">{branch.name}</p>
                    <p className="mt-1 font-mono text-xs text-cyan-300">{branch.code}</p>
                  </div>
                  <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-300">{branch.status}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
                  <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{branch.location || "Location not set"}</span>
                  <span className="flex items-center gap-2"><Phone className="h-4 w-4" />{branch.phone || "Phone not set"}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6">
          <h2 className="mb-5 flex items-center gap-2 border-b border-blue-900 pb-4 text-xl font-bold">
            <UsersRound className="h-5 w-5 text-green-300" />
            User Directory
          </h2>
          <div className="space-y-3">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setCurrentUserId(user.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  currentUserId === user.id
                    ? "border-green-400 bg-green-500/15"
                    : "border-blue-900 bg-[#031B34] hover:border-green-500/50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-white">{user.name}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-gray-300">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-300">{user.status}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
                  <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />{user.role}</span>
                  <span className="flex items-center gap-2"><Building2 className="h-4 w-4" />{branchName(user.branchId)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
