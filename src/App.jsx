import { useState } from "react";
import {
  Bell,
  CalendarDays,
  Mail,
  Menu,
  PackagePlus,
  Search,
  Settings,
  ShoppingCart,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import Sidebar from "./components/Sidebar";

function DashboardHome() {
  const recentOrders = [
    ["INV-10025", "18 May 2025", "₹1,250"],
    ["INV-10024", "18 May 2025", "₹890"],
    ["INV-10023", "17 May 2025", "₹2,450"],
    ["INV-10022", "17 May 2025", "₹1,150"],
  ];
  const lowStock = [
    ["🥤", "BLINKER Cola 250ml", "SKU: BC250", "12"],
    ["🍾", "BICOJA Soda 500ml", "SKU: BS500", "18"],
    ["🌶", "Red Chilli Powder 500g", "SKU: RCP500", "8"],
    ["🛢", "Cooking Oil 1L", "SKU: CO1L", "15"],
  ];
  const topProducts = [
    ["🥤", "BLINKER Cola 250ml", "1,250 Pcs", "↑"],
    ["🍾", "BICOJA Soda 500ml", "980 Pcs", "↑"],
    ["💧", "BLINKER Mineral Water 1L", "850 Pcs", "↓"],
    ["📦", "Masala Mix 100g", "620 Pcs", "↑"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5 border-b border-cyan-400/20 pb-4">
        <button className="rounded-xl border border-cyan-500/30 bg-blue-600/20 p-3 text-cyan-100">
          <Menu className="h-5 w-5" />
        </button>
        <label className="relative max-w-xl flex-1">
          <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-100" />
          <input
            placeholder="Search products, invoices, customers..."
            className="w-full rounded-xl border border-cyan-500/40 bg-blue-950/60 px-5 py-3 pr-12 text-white outline-none shadow-[0_0_24px_rgba(0,194,255,0.12)]"
          />
        </label>
        <button className="rounded-xl border border-cyan-500/30 bg-blue-950/70 px-5 py-3">Main Branch</button>
        <Bell className="h-6 w-6 text-white" />
        <Mail className="h-6 w-6 text-white" />
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-white/85 text-blue-950 font-bold">A</div>
          <div>
            <p className="font-bold">Admin User</p>
            <p className="text-xs text-gray-300">Administrator</p>
          </div>
        </div>
        <Settings className="h-6 w-6" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-cyan-100 mt-1">Home / Dashboard</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-cyan-400/40 bg-blue-950/70 px-4 py-3">
          <CalendarDays className="h-5 w-5" />
          <span>18 May 2025</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          ["Today's Sales", "₹ 2,45,000", "▲ 12.5% from yesterday", "from-blue-700 to-blue-950", ShoppingCart],
          ["Total Orders", "1,245", "▲ 8.4% from yesterday", "from-teal-700 to-blue-950", CalendarDays],
          ["Total Profit", "₹ 58,420", "▲ 15.3% from yesterday", "from-orange-600 to-yellow-950", WalletCards],
          ["Low Stock Items", "24", "View all alerts", "from-pink-700 to-purple-950", TriangleAlert],
        ].map(([label, value, sub, colors, Icon]) => (
          <div key={label} className={`rounded-2xl border border-cyan-300/40 bg-gradient-to-br ${colors} p-5 shadow-[0_0_28px_rgba(0,194,255,0.22)]`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-cyan-50">{label}</p>
                <p className="mt-4 text-3xl font-extrabold text-white">{value}</p>
              </div>
              <div className="rounded-full border border-white/20 bg-white/10 p-3">
                <Icon className="h-7 w-7" />
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold text-white">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr_0.8fr] gap-4">
        <div className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-5 shadow-[inset_0_0_30px_rgba(0,194,255,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Sales Overview</h2>
            <div className="rounded-lg border border-cyan-500/30 bg-blue-900/80 px-3 py-2 text-sm">Weekly</div>
          </div>
          <div className="relative h-64 rounded-xl border border-blue-700/40 bg-[linear-gradient(rgba(56,189,248,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.12)_1px,transparent_1px)] bg-[size:80px_44px]">
            <svg viewBox="0 0 700 240" className="h-full w-full">
              <polyline fill="none" stroke="#39d5ff" strokeWidth="4" points="0,220 90,130 180,95 270,120 360,85 450,140 540,115 620,55 700,35" />
              {[90, 180, 270, 360, 450, 540, 620, 700].map((x, index) => (
                <circle key={x} cx={x} cy={[130, 95, 120, 85, 140, 115, 55, 35][index]} r="5" fill="#031b4e" stroke="#fff" strokeWidth="3" />
              ))}
            </svg>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-5">
          <h2 className="mb-4 text-xl font-bold">Sales by Category</h2>
          <div className="grid place-items-center">
            <div className="grid h-44 w-44 place-items-center rounded-full bg-[conic-gradient(#1d6fff_0_45%,#18d48f_45%_70%,#ff9a2f_70%_85%,#7d45ff_85%_95%,#ff4378_95%)]">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-blue-950 text-center text-sm font-bold">Total<br />₹2,45,000</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-5">
          <div className="mb-4 flex justify-between">
            <h2 className="text-xl font-bold">Recent Orders</h2>
            <button className="text-sm text-blue-300">View All</button>
          </div>
          <div className="space-y-4">
            {recentOrders.map(([invoice, date, amount]) => (
              <div key={invoice} className="flex items-center justify-between border-b border-cyan-400/10 pb-3">
                <div>
                  <p className="font-semibold">{invoice}</p>
                  <p className="text-xs text-gray-300">{date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{amount}</p>
                  <span className="rounded-md bg-green-500/20 px-2 py-1 text-xs text-green-300">Paid</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-5">
          <h2 className="mb-4 text-xl font-bold">Low Stock Alerts</h2>
          {lowStock.map(([icon, name, sku, count]) => (
            <div key={name} className="flex items-center justify-between border-b border-cyan-400/10 py-3">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-xs text-gray-300">{sku}</p>
                </div>
              </div>
              <p className="text-right font-bold text-red-300">{count}<br /><span className="text-xs font-normal">In Stock</span></p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-5">
          <h2 className="mb-4 text-xl font-bold">Expiry Alerts</h2>
          {["BICOJA Juice 200ml", "BLINKER Mineral Water 1L", "Masala Mix 100g", "Pickle 500g"].map((name, index) => (
            <div key={name} className="flex items-center justify-between border-b border-cyan-400/10 py-3">
              <div>
                <p className="font-semibold">{name}</p>
                <p className="text-xs text-gray-300">Expiry: {25 + index} May 2025</p>
              </div>
              <p className="font-bold text-orange-300">{7 + index * 3}<br /><span className="text-xs">Days Left</span></p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-5">
          <h2 className="mb-4 text-xl font-bold">Top Selling Products</h2>
          {topProducts.map(([icon, name, qty, trend]) => (
            <div key={name} className="flex items-center justify-between border-b border-cyan-400/10 py-3">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{icon}</span>
                <p className="font-semibold">{name}</p>
              </div>
              <p className="font-bold">{qty} <span className={trend === "↑" ? "text-green-300" : "text-red-300"}>{trend}</span></p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-400/30 bg-blue-950/60 p-4">
        <h2 className="mb-3 font-bold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {["New Billing", "Add Product", "Stock Transfer", "Purchase Entry", "Expense Entry"].map((action) => (
            <button key={action} className="flex items-center justify-center gap-3 rounded-xl border border-cyan-400/30 bg-blue-900/70 p-3 font-semibold hover:bg-blue-700">
              <PackagePlus className="h-5 w-5 text-cyan-300" />
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="rounded-3xl border border-blue-900 bg-[#07294d] p-8">
      <h1 className="text-3xl font-bold text-cyan-300">Settings</h1>
      <p className="mt-3 text-gray-300">Settings module can be added here.</p>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [PageComponent, setPageComponent] = useState(null);
  const [pageError, setPageError] = useState("");

  const handleNavigate = async (page) => {
    setActivePage(page);
    setPageError("");

    if (page === "dashboard" || page === "settings") {
      setPageComponent(null);
      return;
    }

    const pageImports = {
      pos: () => import("./pages/POSBilling"),
      products: () => import("./pages/Products"),
      inventory: () => import("./pages/Inventory"),
      purchase: () => import("./pages/Purchases"),
      production: () => import("./pages/Production"),
      attendance: () => import("./pages/EmployeeAttendance"),
      loans: () => import("./pages/BankLoanRepayment"),
      reports: () => import("./pages/Reports"),
    };

    try {
      const module = await pageImports[page]();
      setPageComponent(() => module.default);
    } catch (error) {
      setPageComponent(null);
      setPageError(error.message || "Unable to load page.");
    }
  };

  const renderPage = () => {
    if (activePage === "dashboard") return <DashboardHome />;
    if (activePage === "settings") return <SettingsPage />;
    if (pageError) {
      return (
        <div className="rounded-3xl border border-red-500 bg-red-950/40 p-8 text-red-100">
          <h1 className="text-2xl font-bold text-red-300">Page load error</h1>
          <p className="mt-3">{pageError}</p>
        </div>
      );
    }
    if (!PageComponent) {
      return <div className="text-gray-300">Loading page...</div>;
    }
    return <PageComponent />;
  };

  return (
    <div className="flex min-h-screen bg-[#031b4e]">
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      <main className="ml-[260px] min-h-screen flex-1 p-8">
        {renderPage()}
      </main>
    </div>
  );
}
