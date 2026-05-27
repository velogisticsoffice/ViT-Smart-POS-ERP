import {
  BarChart3,
  Boxes,
  CalendarCheck,
  X,
  LayoutDashboard,
  Landmark,
  PackagePlus,
  PackageSearch,
  Settings,
  ShoppingCart,
  UsersRound,
  WalletCards,
  Warehouse,
} from "lucide-react";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "pos", label: "POS Billing", icon: WalletCards },
  { id: "products", label: "Products", icon: Boxes },
  { id: "inventory", label: "Inventory", icon: Warehouse },
  { id: "purchase", label: "Purchase", icon: ShoppingCart },
  { id: "milling", label: "Milling Service", icon: PackagePlus },
  { id: "production", label: "Production", icon: PackageSearch },
  { id: "branches", label: "Users & Branches", icon: UsersRound },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "loans", label: "Bank Loans", icon: Landmark },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const Sidebar = ({ activePage, onNavigate, isOpen = false, onClose }) => {
  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/70 transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-dvh w-[260px] overflow-y-auto border-r border-blue-500/20 bg-[#041c52]/95 p-5 text-white shadow-2xl shadow-blue-950/40 backdrop-blur-lg transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >

      {/* Logo */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">
            ViT
          </h1>

          <p className="text-sm text-gray-300">
            Smart POS ERP
          </p>
        </div>

        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="rounded-xl border border-cyan-500/20 bg-blue-950/80 p-2 text-cyan-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Menu */}
      <ul className="space-y-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-300 ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-white hover:bg-cyan-500/20"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      </aside>
    </>
  );
};

export default Sidebar;
