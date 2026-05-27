import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Navbar() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showInventoryMenu, setShowInventoryMenu] = useState(false);
  const [showSalesMenu, setShowSalesMenu] = useState(false);

  // Retrieve live user info from session
  const userEmail = localStorage.getItem("userEmail") || "user@veerashaiva.com";
  const userRole  = localStorage.getItem("userRole")  || "User";
  const userInitial = userEmail.charAt(0).toUpperCase();

  // Role accent colors
  const roleColors = {
    Admin:   "bg-blue-600",
    Manager: "bg-emerald-600",
    Staff:   "bg-orange-600",
    User:    "bg-gray-600",
  };
  const avatarColor = roleColors[userRole] || "bg-gray-600";

  const closeAll = () => {
    setShowMenu(false);
    setShowInventoryMenu(false);
    setShowSalesMenu(false);
  };

  const handleLogout = async () => {
    try {
      if (auth) await signOut(auth);
    } catch (err) {
      console.warn("Firebase signOut error:", err.message);
    } finally {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userUID");
      navigate("/");
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">

      {/* Left: Brand heading */}
      <div className="flex items-center gap-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-none">
            VEERASHAIVA <span className="text-blue-400">ERP</span>
          </h1>
          <p className="text-gray-500 text-xs mt-0.5 tracking-wider">
            Coconut Oil Mill · Manufacturing · POS
          </p>
        </div>

        {/* Quick nav dropdowns (desktop only) */}
        <div className="hidden lg:flex items-center gap-3">

          {/* Inventory dropdown */}
          <div className="relative">
            <button
              id="nav-inventory-btn"
              onClick={() => { setShowInventoryMenu(!showInventoryMenu); setShowSalesMenu(false); setShowMenu(false); }}
              className="flex items-center gap-2 bg-[#07294d]/80 hover:bg-blue-900/60 px-4 py-2.5 rounded-xl border border-blue-900/60 font-semibold text-sm text-white transition-all"
            >
              📦 Inventory <span className="text-xs opacity-60">▼</span>
            </button>
            {showInventoryMenu && (
              <div className="absolute left-0 top-full mt-2 w-52 bg-[#07294d] border border-blue-900 rounded-2xl shadow-2xl overflow-hidden z-50">
                <button
                  onClick={() => { navigate("/inventory"); closeAll(); }}
                  className="w-full text-left px-5 py-3.5 hover:bg-blue-900/60 text-white text-sm transition-colors"
                >
                  📁 Manage Inventory
                </button>
                <div className="border-t border-blue-900/40" />
                <button
                  onClick={() => { navigate("/milling"); closeAll(); }}
                  className="w-full text-left px-5 py-3.5 hover:bg-blue-900/60 text-white text-sm transition-colors"
                >
                  🥥 Copra Milling
                </button>
              </div>
            )}
          </div>

          {/* Sales dropdown */}
          <div className="relative">
            <button
              id="nav-sales-btn"
              onClick={() => { setShowSalesMenu(!showSalesMenu); setShowInventoryMenu(false); setShowMenu(false); }}
              className="flex items-center gap-2 bg-[#07294d]/80 hover:bg-blue-900/60 px-4 py-2.5 rounded-xl border border-blue-900/60 font-semibold text-sm text-white transition-all"
            >
              💰 Sales <span className="text-xs opacity-60">▼</span>
            </button>
            {showSalesMenu && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-[#07294d] border border-blue-900 rounded-2xl shadow-2xl overflow-hidden z-50">
                {[
                  { label: "🧾 Sale Invoice",       path: "/sales?view=invoice"    },
                  { label: "💰 Payment-In",          path: "/sales?view=payment-in" },
                  { label: "🔄 Sale Return",         path: "/sales?view=return"     },
                  { label: "📋 Estimate / Quotation",path: "/sales?view=quotation"  },
                  { label: "🛒 Sale Order",          path: "/sales?view=order"      },
                  { label: "📦 Delivery Challan",    path: "/sales?view=delivery"   },
                ].map(({ label, path }, i, arr) => (
                  <span key={path}>
                    <button
                      onClick={() => { navigate(path); closeAll(); }}
                      className="w-full text-left px-5 py-3 hover:bg-blue-900/60 text-white text-sm transition-colors"
                    >
                      {label}
                    </button>
                    {i < arr.length - 1 && <div className="border-t border-blue-900/30" />}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Production dropdown */}
          <button
            onClick={() => { navigate("/production"); closeAll(); }}
            className="flex items-center gap-2 bg-[#07294d]/80 hover:bg-blue-900/60 px-4 py-2.5 rounded-xl border border-blue-900/60 font-semibold text-sm text-white transition-all"
          >
            🧪 BOM Production
          </button>
        </div>
      </div>

      {/* Right: User profile card */}
      <div className="relative">
        <button
          id="nav-profile-btn"
          onClick={() => { setShowMenu(!showMenu); setShowInventoryMenu(false); setShowSalesMenu(false); }}
          className="flex items-center gap-3 bg-[#07294d]/80 hover:bg-blue-900/60 px-4 py-2.5 rounded-2xl border border-blue-900/60 transition-all"
        >
          {/* Avatar circle */}
          <div className={`w-9 h-9 rounded-xl ${avatarColor} flex items-center justify-center font-black text-white text-base shrink-0`}>
            {userInitial}
          </div>

          <div className="text-left hidden sm:block">
            <p className="font-bold text-white text-sm leading-tight">{userEmail.split("@")[0]}</p>
            <p className="text-xs text-gray-400">{userRole}</p>
          </div>

          <span className="text-gray-500 text-xs hidden sm:block">▼</span>
        </button>

        {/* Profile dropdown */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-[#07294d] border border-blue-900 rounded-2xl shadow-2xl overflow-hidden z-50">
            {/* User info header */}
            <div className="px-5 py-4 border-b border-blue-900/50">
              <p className="font-bold text-white text-sm">{userEmail}</p>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-white ${avatarColor}`}>
                {userRole}
              </span>
            </div>

            {/* Quick links */}
            <button
              onClick={() => { navigate("/dashboard"); closeAll(); }}
              className="w-full text-left px-5 py-3 hover:bg-blue-900/50 text-white text-sm transition-colors"
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => { navigate("/payroll"); closeAll(); }}
              className="w-full text-left px-5 py-3 hover:bg-blue-900/50 text-white text-sm transition-colors"
            >
              👥 HR & Payroll
            </button>

            {/* Logout */}
            <div className="border-t border-blue-900/50">
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="w-full text-left px-5 py-3.5 hover:bg-red-600/80 text-red-400 hover:text-white text-sm transition-colors font-semibold"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}