import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Download,
  IndianRupee,
  Package,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { db } from "../firebase";
import { isFirebaseConfigured } from "../firebase";
import { useInventory } from "../hooks/useInventory";
import { useSales } from "../hooks/useSales";
import { demoExpenses, demoPurchases } from "../data/demoData";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

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

  if (range === "today") {
    return date.toDateString() === now.toDateString();
  }

  if (range === "week") start.setDate(now.getDate() - 7);
  if (range === "month") start.setMonth(now.getMonth() - 1);
  if (range === "quarter") start.setMonth(now.getMonth() - 3);

  return date >= start && date <= now;
};

const getRecordDate = (record) => record.createdAt || record.timestamp || record.date;

export default function Reports() {
  const { salesHistory, error: salesError } = useSales();
  const { items: inventoryItems, isLoading: inventoryLoading, error: inventoryError } = useInventory();
  const [expenses, setExpenses] = useState(() => (isFirebaseConfigured ? [] : demoExpenses));
  const [purchases, setPurchases] = useState(() => (isFirebaseConfigured ? [] : demoPurchases));
  const [range, setRange] = useState("month");
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined;
    }

    const expenseQuery = query(collection(db, "expenses"));
    const purchaseQuery = query(collection(db, "purchase_bills"));

    const unsubscribeExpenses = onSnapshot(
      expenseQuery,
      (snapshot) => {
        setExpenses(snapshot.docs.map((expenseDoc) => ({ id: expenseDoc.id, ...expenseDoc.data() })));
      },
      (err) => setReportError(err.message || "Unable to load expenses")
    );

    const unsubscribePurchases = onSnapshot(
      purchaseQuery,
      (snapshot) => {
        setPurchases(snapshot.docs.map((purchaseDoc) => ({ id: purchaseDoc.id, ...purchaseDoc.data() })));
      },
      (err) => setReportError(err.message || "Unable to load purchases")
    );

    return () => {
      unsubscribeExpenses();
      unsubscribePurchases();
    };
  }, []);

  const report = useMemo(() => {
    const filteredSales = salesHistory.filter((sale) => isInsideRange(getRecordDate(sale), range));
    const filteredExpenses = expenses.filter((expense) => isInsideRange(getRecordDate(expense), range));
    const filteredPurchases = purchases.filter((purchase) => isInsideRange(getRecordDate(purchase), range));

    const salesTotal = filteredSales.reduce(
      (sum, sale) => sum + Number(sale.amount || sale.total || 0),
      0
    );
    const expenseTotal = filteredExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );
    const purchaseTotal = filteredPurchases.reduce(
      (sum, purchase) => sum + Number(purchase.amount || 0),
      0
    );
    const stockValue = inventoryItems.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.stock || 0),
      0
    );
    const lowStockItems = inventoryItems.filter(
      (item) => Number(item.stock || 0) <= Number(item.reorderLevel || 10)
    );

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
      categoryTotals.set(
        category,
        (categoryTotals.get(category) || 0) + Number(item.price || 0) * Number(item.stock || 0)
      );
    });

    return {
      filteredSales,
      filteredExpenses,
      filteredPurchases,
      salesTotal,
      expenseTotal,
      purchaseTotal,
      stockValue,
      lowStockItems,
      netProfit: salesTotal - expenseTotal - purchaseTotal,
      topProducts: Array.from(productSales.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
      categoryRows: Array.from(categoryTotals.entries())
        .map(([category, value]) => ({ category, value }))
        .sort((a, b) => b.value - a.value),
    };
  }, [expenses, inventoryItems, purchases, range, salesHistory]);

  const exportCsv = () => {
    const rows = [
      ["Metric", "Value"],
      ["Sales", report.salesTotal],
      ["Purchases", report.purchaseTotal],
      ["Expenses", report.expenseTotal],
      ["Net Profit", report.netProfit],
      ["Inventory Value", report.stockValue],
      ["Low Stock Items", report.lowStockItems.length],
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vit-report-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    {
      title: "Sales Revenue",
      value: formatCurrency(report.salesTotal),
      icon: TrendingUp,
      color: "text-green-300",
      border: "border-green-900",
    },
    {
      title: "Purchases",
      value: formatCurrency(report.purchaseTotal),
      icon: Package,
      color: "text-purple-300",
      border: "border-purple-900",
    },
    {
      title: "Expenses",
      value: formatCurrency(report.expenseTotal),
      icon: TrendingDown,
      color: "text-red-300",
      border: "border-red-900",
    },
    {
      title: "Net Profit",
      value: formatCurrency(report.netProfit),
      icon: IndianRupee,
      color: report.netProfit >= 0 ? "text-green-300" : "text-red-300",
      border: report.netProfit >= 0 ? "border-green-900" : "border-red-900",
    },
  ];

  return (
    <div className="page-container">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold md:text-5xl">Reports</h1>
          <p className="mt-2 text-gray-400">
            Business summary for sales, purchase bills, expenses, and inventory value.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
            className="rounded-2xl border border-blue-900 bg-[#031B34] px-4 py-3 text-white outline-none focus:border-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
          >
            <Download className="h-5 w-5" />
            Export CSV
          </button>
        </div>
      </div>

      {(salesError || inventoryError || reportError) && (
        <div className="mb-6 rounded-2xl border border-red-600 bg-red-600/20 p-4 text-red-300">
          {salesError || inventoryError || reportError}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className={`rounded-3xl border ${card.border} bg-[#07294d] p-5`}>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm text-gray-400">{card.title}</p>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <p className={`text-2xl font-extrabold ${card.color}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-blue-900 bg-[#07294d] p-5">
          <p className="flex items-center gap-2 text-sm text-gray-400">
            <ReceiptText className="h-5 w-5 text-blue-300" />
            Sales Bills
          </p>
          <p className="mt-3 text-3xl font-bold text-blue-300">{report.filteredSales.length}</p>
        </div>
        <div className="rounded-3xl border border-orange-900 bg-[#07294d] p-5">
          <p className="flex items-center gap-2 text-sm text-gray-400">
            <Boxes className="h-5 w-5 text-orange-300" />
            Inventory Value
          </p>
          <p className="mt-3 text-3xl font-bold text-orange-300">{formatCurrency(report.stockValue)}</p>
        </div>
        <div className="rounded-3xl border border-yellow-900 bg-[#07294d] p-5">
          <p className="flex items-center gap-2 text-sm text-gray-400">
            <AlertTriangle className="h-5 w-5 text-yellow-300" />
            Low Stock
          </p>
          <p className="mt-3 text-3xl font-bold text-yellow-300">{report.lowStockItems.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section className="rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6">
          <h2 className="mb-5 flex items-center gap-2 border-b border-blue-900 pb-4 text-xl font-bold text-gray-200">
            <BarChart3 className="h-5 w-5 text-green-300" />
            Top Selling Products
          </h2>
          <div className="space-y-3">
            {report.topProducts.map((item, index) => (
              <div key={item.name} className="rounded-2xl border border-blue-900 bg-[#031B34] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500">#{index + 1}</p>
                    <p className="font-bold text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-gray-400">Qty sold: {item.quantity}</p>
                  </div>
                  <p className="font-extrabold text-green-300">{formatCurrency(item.amount)}</p>
                </div>
              </div>
            ))}
            {report.topProducts.length === 0 && (
              <div className="py-10 text-center text-gray-400">No product sales found in this range.</div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6">
          <h2 className="mb-5 flex items-center gap-2 border-b border-blue-900 pb-4 text-xl font-bold text-gray-200">
            <Boxes className="h-5 w-5 text-orange-300" />
            Inventory By Category
          </h2>
          <div className="space-y-3">
            {inventoryLoading ? (
              <div className="py-10 text-center text-gray-400">Loading inventory report...</div>
            ) : (
              report.categoryRows.map((row) => {
                const percent = report.stockValue ? Math.round((row.value / report.stockValue) * 100) : 0;
                return (
                  <div key={row.category} className="rounded-2xl border border-blue-900 bg-[#031B34] p-4">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="font-bold">{row.category}</p>
                      <p className="text-sm font-bold text-orange-300">{formatCurrency(row.value)}</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-blue-950">
                      <div className="h-full bg-orange-400" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">{percent}% of inventory value</p>
                  </div>
                );
              })
            )}
            {!inventoryLoading && report.categoryRows.length === 0 && (
              <div className="py-10 text-center text-gray-400">No inventory categories found.</div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6 xl:col-span-2">
          <h2 className="mb-5 flex items-center gap-2 border-b border-blue-900 pb-4 text-xl font-bold text-gray-200">
            <AlertTriangle className="h-5 w-5 text-yellow-300" />
            Low Stock Watchlist
          </h2>
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
                  <tr key={item.id} className="border-b border-blue-900/40 hover:bg-blue-900/20">
                    <td className="py-4 font-bold">{item.product}</td>
                    <td className="py-4 font-mono text-xs text-yellow-300">{item.sku || "N/A"}</td>
                    <td className="py-4 text-gray-300">{item.category || "General"}</td>
                    <td className="py-4 text-right font-bold text-red-300">
                      {item.stock || 0} {item.unit || "pcs"}
                    </td>
                    <td className="py-4 text-right text-gray-300">{item.reorderLevel || 10}</td>
                  </tr>
                ))}
                {report.lowStockItems.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-gray-400">
                      No low-stock products right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
