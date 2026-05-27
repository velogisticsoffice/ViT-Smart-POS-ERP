import {
  BarChart3,
  Boxes,
  CalendarCheck,
  LayoutDashboard,
  Landmark,
  PackageSearch,
  Settings,
  ShoppingCart,
  WalletCards,
  Warehouse,
} from "lucide-react";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "pos", label: "POS Billing", icon: WalletCards },
  { id: "products", label: "Products", icon: Boxes },
  { id: "inventory", label: "Inventory", icon: Warehouse },
  { id: "purchase", label: "Purchase", icon: ShoppingCart },
  { id: "production", label: "Production", icon: PackageSearch },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "loans", label: "Bank Loans", icon: Landmark },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const Sidebar = ({ activePage, onNavigate }) => {
  return (
    <div className="w-[260px] h-screen bg-[#041c52]/90 backdrop-blur-lg border-r border-blue-500/20 text-white p-5 fixed left-0 top-0">

      {/* Logo */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-cyan-400">
          ViT
        </h1>

        <p className="text-sm text-gray-300">
          Smart POS ERP
        </p>
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

    </div>
  );
};

export default Sidebar;
