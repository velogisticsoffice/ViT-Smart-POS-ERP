export const demoInventory = [
  { id: "p1", product: "BLINKER Cola 250ml", sku: "BC250", category: "Beverages", price: 20, stock: 120, unit: "pcs", reorderLevel: 20 },
  { id: "p2", product: "BICOJA Soda 500ml", sku: "BS500", category: "Beverages", price: 25, stock: 85, unit: "pcs", reorderLevel: 20 },
  { id: "p3", product: "BLINKER Cola 500ml", sku: "BC500", category: "Beverages", price: 35, stock: 60, unit: "pcs", reorderLevel: 20 },
  { id: "p4", product: "BICOJA Juice 200ml", sku: "BJ200", category: "Juices", price: 30, stock: 90, unit: "pcs", reorderLevel: 20 },
  { id: "p5", product: "BICOJA Juice 1L", sku: "BJ1L", category: "Juices", price: 120, stock: 40, unit: "pcs", reorderLevel: 20 },
  { id: "p6", product: "Bliss Apple Juice 1L", sku: "BAJ1L", category: "Juices", price: 110, stock: 35, unit: "pcs", reorderLevel: 20 },
  { id: "p7", product: "Masala Mix 100g", sku: "MM100", category: "Snacks", price: 15, stock: 100, unit: "pcs", reorderLevel: 20 },
  { id: "p8", product: "Red Chilli Powder 500g", sku: "RCP500", category: "Grocery", price: 55, stock: 70, unit: "pcs", reorderLevel: 20 },
  { id: "p9", product: "Mineral Water 1L", sku: "MW1L", category: "Water", price: 20, stock: 150, unit: "pcs", reorderLevel: 20 },
  { id: "p10", product: "Cooking Oil 1L", sku: "CO1L", category: "Grocery", price: 140, stock: 30, unit: "pcs", reorderLevel: 20 },
  { id: "p11", product: "Milk 500ml", sku: "MLK500", category: "Dairy Products", price: 28, stock: 80, unit: "pcs", reorderLevel: 20 },
];

export const demoSales = [
  {
    id: "INV-10025",
    customer: "Walk-in Customer",
    amount: 1250,
    date: "18 May 2025",
    items: [{ product: "BLINKER Cola 250ml", quantity: 12, price: 20, total: 240 }],
  },
  {
    id: "INV-10024",
    customer: "Walk-in Customer",
    amount: 890,
    date: "18 May 2025",
    items: [{ product: "BICOJA Soda 500ml", quantity: 8, price: 25, total: 200 }],
  },
  {
    id: "INV-10023",
    customer: "Walk-in Customer",
    amount: 2450,
    date: "17 May 2025",
    items: [{ product: "Mineral Water 1L", quantity: 20, price: 20, total: 400 }],
  },
];

export const demoExpenses = [
  { id: "e1", title: "Electricity Bill", category: "Utilities", amount: 7200, date: "18 May 2025" },
  { id: "e2", title: "Transport", category: "Logistics", amount: 4500, date: "17 May 2025" },
];

export const demoPurchases = [
  { id: "pb1", vendor: "Main Supplier", amount: 56000, notes: "Beverages inward stock", date: "18 May 2025" },
  { id: "pb2", vendor: "Grocery Supplier", amount: 32000, notes: "Grocery stock refill", date: "17 May 2025" },
];

export const demoAttendance = [
  { id: "a1", employee: "Ramesh", role: "Mill Operator", status: "Present", shift: "Morning", date: "18 May 2025", hours: 8 },
  { id: "a2", employee: "Suresh", role: "Packing Staff", status: "Present", shift: "Morning", date: "18 May 2025", hours: 8 },
  { id: "a3", employee: "Anitha", role: "Billing", status: "Half Day", shift: "General", date: "18 May 2025", hours: 4 },
  { id: "a4", employee: "Kiran", role: "Helper", status: "Absent", shift: "Morning", date: "18 May 2025", hours: 0 },
];

export const demoLoans = [
  {
    id: "l1",
    bank: "Canara Bank",
    loanType: "Machinery Loan",
    principal: 450000,
    emi: 18500,
    paidAmount: 74000,
    dueDate: "05 Jun 2025",
    status: "Active",
    notes: "Oil expeller machine loan",
  },
  {
    id: "l2",
    bank: "SBI",
    loanType: "Working Capital",
    principal: 250000,
    emi: 12000,
    paidAmount: 36000,
    dueDate: "10 Jun 2025",
    status: "Active",
    notes: "Copra purchase cash credit",
  },
];
