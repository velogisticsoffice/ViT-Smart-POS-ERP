import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Download,
  IndianRupee,
  Package,
  TrendingDown,
  TrendingUp,
  Scale,
} from "lucide-react";
import { db, isFirebaseConfigured } from "../firebase";
import { useInventory } from "../hooks/useInventory";
import { useSales } from "../hooks/useSales";
import { demoExpenses, demoPurchases } from "../data/demoData";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

// Utility for CSV Download
const downloadCSV = (rows, filename) => {
  const csv = rows.map((row) => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isInsideRange = (value, range) => {
  if (range === "all") return true;
  const date = toDate(value);
  if (!date) return false;
  const now = new Date();
  const start = new Date(now);
  if (range === "today") return date.toDateString() === now.toDateString();
  if (range === "week") start.setDate(now.getDate() - 7);
  if (range === "month") start.setMonth(now.getMonth() - 1);
  if (range === "quarter") start.setMonth(now.getMonth() - 3);
  return date >= start && date <= now;
};

const getRecordDate = (record) => record.createdAt || record.timestamp || record.date;

export default function Reports() {
  const { salesHistory } = useSales();
  const { items: inventoryItems, isLoading: inventoryLoading } = useInventory();
  const [expenses, setExpenses] = useState(() => (isFirebaseConfigured ? [] : demoExpenses));
  const [purchases, setPurchases] = useState(() => (isFirebaseConfigured ? [] : demoPurchases));
  const [range, setRange] = useState("month");
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    const expenseQuery = query(collection(db, "expenses"));
    const purchaseQuery = query(collection(db, "purchase_bills"));

    const unsubscribeExpenses = onSnapshot(expenseQuery, (snapshot) => {
      setExpenses(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (err) => setReportError(err.message));

    const unsubscribePurchases = onSnapshot(purchaseQuery, (snapshot) => {
      setPurchases(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (err) => setReportError(err.message));

    return () => { unsubscribeExpenses(); unsubscribePurchases(); };
  }, []);

  const report = useMemo(() => {
    const filteredSales = salesHistory.filter((sale) => isInsideRange(getRecordDate(sale), range));
    const filteredExpenses = expenses.filter((expense) => isInsideRange(getRecordDate(expense), range));
    const filteredPurchases = purchases.filter((purchase) => isInsideRange(getRecordDate(purchase), range));

    const salesTotal = filteredSales.reduce((sum, item) => sum + Number(item.amount || item.total || 0), 0);
    const expenseTotal = filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const purchaseTotal = filteredPurchases.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const stockValue = inventoryItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.stock || 0), 0);
    const netProfit = salesTotal - expenseTotal - purchaseTotal;

    const productSales = new Map();
    filteredSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const name = item.product || item.productName || "Product";
        const current = productSales.get(name) || { name, quantity: 0, amount: 0 };
        productSales.set(name, {
          name,
          quantity: current.quantity + Number(item.quantity || 0),
          amount: current.amount + Number(item.total || Number(item.price || 0) * Number(item.quantity || 0)),
        });
      });
    });

    const categoryTotals = new Map();
    inventoryItems.forEach((item) => {
      const category = item.category || "General";
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + Number(item.price || 0) * Number(item.stock || 0));
    });

    return {
      salesTotal, expenseTotal, purchaseTotal, stockValue,
      assets: stockValue, liabilities: purchaseTotal, equity: netProfit, netProfit,
      lowStockItems: inventoryItems.filter((i) => Number(i.stock || 0) <= Number(i.reorderLevel || 10)),
      topProducts: Array.from(productSales.values()).sort((a, b) => b.amount - a.amount).slice(0, 5),
      categoryRows: Array.from(categoryTotals.entries()).map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value),
    };
  }, [expenses, inventoryItems, purchases, range, salesHistory]);

  // Download Handlers
  const exportTopProducts = () => downloadCSV([["Product", "Quantity", "Amount"], ...report.topProducts.map(p => [p.name, p.quantity, p.amount])], `top-products-${range}.csv`);
  const exportCategory = () => downloadCSV([["Category", "Value"], ...report.categoryRows.map(r => [r.category, r.value])], `inventory-category-${range}.csv`);
  const exportLowStock = () => downloadCSV([["Product", "SKU", "Category", "Stock", "Reorder Level"], ...report.lowStockItems.map(i => [i.product, i.sku, i.category, i.stock, i.reorderLevel])], `low-stock-${range}.csv`);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold md:text-5xl">Reports</h1>
          <p className="mt-2 text-gray-400">Business summary, financial position, and inventory analytics.</p>
        </div>
        <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-2xl border border-blue-900 bg-[#031B34] px-4 py-3 text-white outline-none">
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="quarter">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Financial Summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Sales Revenue", value: report.salesTotal, icon: TrendingUp, color: "text-green-300", border: "border-green-900" },
          { title: "Purchases", value: report.purchaseTotal, icon: Package, color: "text-purple-300", border: "border-purple-900" },
          { title: "Expenses", value: report.expenseTotal, icon: TrendingDown, color: "text-red-300", border: "border-red-900" },
          { title: "Net Profit", value: report.netProfit, icon: IndianRupee, color: report.netProfit >= 0 ? "text-green-300" : "text-red-300", border: report.netProfit >= 0 ? "border-green-900" : "border-red-900" },
        ].map((card) => (
          <div key={card.title} className={`rounded-3xl border ${card.border} bg-[#07294d] p-5`}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-gray-400">{card.title}</p>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <p className={`text-2xl font-extrabold ${card.color}`}>{formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Balance Sheet */}
      <section className="mb-8 rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6">
        <h2 className="mb-5 flex items-center gap-2 border-b border-blue-900 pb-4 text-xl font-bold text-gray-200">
          <Scale className="h-5 w-5 text-cyan-300" /> Balance Sheet Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-[#031B34] p-4 border border-blue-900">
            <p className="text-sm text-gray-400">Total Assets</p>
            <p className="text-2xl font-bold text-cyan-300">{formatCurrency(report.assets)}</p>
          </div>
          <div className="rounded-2xl bg-[#031B34] p-4 border border-blue-900">
            <p className="text-sm text-gray-400">Total Liabilities</p>
            <p className="text-2xl font-bold text-red-300">{formatCurrency(report.liabilities)}</p>
          </div>
          <div className="rounded-2xl bg-[#031B34] p-4 border border-blue-900">
            <p className="text-sm text-gray-400">Owner's Equity</p>
            <p className="text-2xl font-bold text-green-300">{formatCurrency(report.equity)}</p>
          </div>
        </div>
      </section>

      {/* Grids */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {/* Top Selling Products */}
        <section className="rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between border-b border-blue-900 pb-4">
             <h2 className="text-xl font-bold text-gray-200">Top Selling Products</h2>
             <button onClick={exportTopProducts} className="text-gray-400 hover:text-white"><Download className="h-5 w-5" /></button>
          </div>
          {report.topProducts.map((item) => (
            <div key={item.name} className="flex justify-between p-4 mb-2 rounded-2xl border border-blue-900 bg-[#031B34]">
               <p className="font-bold">{item.name} <span className="text-xs block text-gray-500">Qty: {item.quantity}</span></p>
               <p className="font-bold text-green-300">{formatCurrency(item.amount)}</p>
            </div>
          ))}
        </section>
        
        {/* Inventory Category */}
        <section className="rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-blue-900 pb-4">
                <h2 className="text-xl font-bold text-gray-200">Inventory By Category</h2>
                <button onClick={exportCategory} className="text-gray-400 hover:text-white"><Download className="h-5 w-5" /></button>
            </div>
            {report.categoryRows.map((row) => (
                <div key={row.category} className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span>{row.category}</span>
                        <span>{formatCurrency(row.value)}</span>
                    </div>
                    <div className="h-2 bg-blue-950 rounded-full"><div className="h-full bg-orange-400" style={{width: `${(row.value / (report.assets || 1)) * 100}%`}}></div></div>
                </div>
            ))}
        </section>

        {/* Low Stock Watchlist (Expanded) */}
        <section className="xl:col-span-2 rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-blue-900 pb-4">
                <h2 className="text-xl font-bold text-gray-200">Low Stock Watchlist</h2>
                <button onClick={exportLowStock} className="text-gray-400 hover:text-white"><Download className="h-5 w-5" /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-blue-900 text-gray-400">
                    <th className="pb-4">Product</th>
                    <th className="pb-4">SKU</th>
                    <th className="pb-4">Category</th>
                    <th className="pb-4 text-right">Stock</th>
                    <th className="pb-4 text-right">Reorder Level</th>
                  </tr>
                </thead>
                <tbody>
                  {report.lowStockItems.map((item) => (
                    <tr key={item.id} className="border-b border-blue-900/40">
                      <td className="py-4 font-bold">{item.product}</td>
                      <td className="py-4 font-mono text-xs">{item.sku || "N/A"}</td>
                      <td className="py-4 text-gray-300">{item.category || "General"}</td>
                      <td className="py-4 text-right text-red-300 font-bold">{item.stock}</td>
                      <td className="py-4 text-right text-gray-300">{item.reorderLevel || 10}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </section>
      </div>
    </div>
  );
}