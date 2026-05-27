import { useMemo, useState } from "react";
import {
  Barcode,
  CreditCard,
  Grid2X2,
  List,
  Minus,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useInventory } from "../hooks/useInventory";
import { useSales } from "../hooks/useSales";
import { demoInventory } from "../data/demoData";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const productIcons = ["🥤", "🍾", "🍹", "🧃", "📦", "🍟", "💧", "🛢", "🥛"];
const categories = ["All Categories", "Beverages", "Water", "Juices", "Snacks", "Dairy Products", "Groceries", "Personal Care", "Household", "Others"];

export default function POSBilling() {
  const { items: inventoryItems, isLoading, error: inventoryError } = useInventory();
  const { error: salesError, processSale } = useSales();
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [search, setSearch] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [discount] = useState(5);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [cart, setCart] = useState(
    demoInventory.slice(0, 4).map((item, index) => ({ ...item, quantity: [2, 1, 2, 1][index] }))
  );

  const products = inventoryItems.length ? inventoryItems : demoInventory;

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((item) => {
      const matchesCategory = activeCategory === "All Categories" || item.category === activeCategory;
      const matchesSearch =
        !term ||
        [item.product, item.sku, item.category]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, search]);

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);
  const taxableAmount = Math.max(subtotal - Number(discount || 0), 0);
  const gst = taxableAmount * 0.05;
  const total = taxableAmount + gst;

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, nextQuantity) => {
    if (nextQuantity <= 0) {
      setCart((current) => current.filter((item) => item.id !== id));
      return;
    }
    setCart((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity: nextQuantity } : item))
    );
  };

  const handleCheckout = async () => {
    if (!cart.length) return alert("Cart is empty.");
    setIsCheckingOut(true);
    const result = await processSale(cart, "Walk-in Customer", `Payment: ${paymentMode} | ${orderNote}`);
    setIsCheckingOut(false);
    if (!result.success) return alert(result.message || "Unable to complete bill.");
    alert(`Bill paid successfully: ${currency.format(total)}`);
    setCart([]);
    setOrderNote("");
  };

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-center gap-5">
        <label className="relative max-w-xl flex-1">
          <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-100" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products by name, SKU or scan barcode..."
            className="w-full rounded-xl border border-cyan-500/40 bg-blue-950/70 px-5 py-3 pr-12 outline-none shadow-[0_0_24px_rgba(0,194,255,0.12)]"
          />
        </label>
        <button className="rounded-xl border border-cyan-500/30 bg-blue-950/70 px-5 py-3">Main Branch</button>
        <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-blue-950 font-bold">A</div>
        <div>
          <p className="font-bold">Admin User</p>
          <p className="text-xs text-gray-300">Administrator</p>
        </div>
      </div>

      {(inventoryError || salesError) && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-yellow-100">
          Demo mode active: {inventoryError || salesError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_470px]">
        <section className="rounded-2xl border border-cyan-400/20 bg-blue-950/50 p-4">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">POS Billing</h1>
              <p className="mt-1 text-cyan-100">Home / POS Billing</p>
            </div>
            <div className="flex gap-3">
              <button className="rounded-xl border border-cyan-500/30 bg-blue-900/70 px-5 py-3 font-semibold">Hold Bill</button>
              <button className="rounded-xl border border-cyan-500/30 bg-blue-900/70 px-5 py-3 font-semibold">Recent Bills</button>
            </div>
          </div>

          <div className="mb-5 flex border-b border-cyan-400/20">
            {["Billing", "Return", "Orders"].map((tab) => (
              <button key={tab} className={`px-8 py-3 font-semibold ${tab === "Billing" ? "rounded-t-xl bg-blue-600 text-white" : "text-cyan-100"}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_32px_1fr]">
            <div className="rounded-xl border border-cyan-500/30 bg-blue-900/40 p-4">
              <p className="mb-2 text-sm text-cyan-100">Scan Barcode</p>
              <div className="flex overflow-hidden rounded-lg border border-cyan-500/30">
                <input className="min-w-0 flex-1 bg-blue-950/70 px-4 py-3 outline-none" placeholder="Scan barcode or enter product code" />
                <button className="px-4"><Barcode className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="grid place-items-center font-bold">OR</div>
            <div className="rounded-xl border border-cyan-500/30 bg-blue-900/40 p-4">
              <p className="mb-2 text-sm text-cyan-100">Search Customer (Optional)</p>
              <div className="flex overflow-hidden rounded-lg border border-cyan-500/30">
                <input className="min-w-0 flex-1 bg-blue-950/70 px-4 py-3 outline-none" placeholder="Search by name or mobile number" />
                <button className="px-4"><Plus className="h-5 w-5" /></button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[170px_1fr]">
            <aside>
              <h2 className="mb-3 text-lg font-bold">Categories</h2>
              <div className="overflow-hidden rounded-xl border border-cyan-500/20 bg-blue-950/60">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`block w-full border-b border-cyan-400/10 px-4 py-3 text-left text-sm font-semibold ${
                      activeCategory === category ? "bg-blue-600" : "hover:bg-blue-900/80"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </aside>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">All Products</h2>
                <div className="flex gap-2">
                  <button className="rounded-lg bg-blue-600 p-2"><Grid2X2 className="h-5 w-5" /></button>
                  <button className="rounded-lg bg-blue-900 p-2"><List className="h-5 w-5" /></button>
                </div>
              </div>

              {isLoading ? (
                <div className="rounded-xl border border-cyan-500/20 p-10 text-center text-gray-300">Loading products...</div>
              ) : (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {filteredProducts.map((product, index) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="min-h-40 rounded-xl border border-cyan-500/30 bg-blue-900/40 p-4 text-left transition hover:border-cyan-300 hover:bg-blue-800/60"
                    >
                      <div className="mb-4 text-center text-5xl">{productIcons[index % productIcons.length]}</div>
                      <p className="font-bold">{product.product}</p>
                      <p className="mt-2 font-bold">{currency.format(product.price)}</p>
                      <p className="mt-1 text-sm text-gray-300">Stock: {product.stock}</p>
                    </button>
                  ))}
                  <button className="grid min-h-40 place-items-center rounded-xl border border-dashed border-cyan-400/60 bg-blue-900/20 p-4 text-center">
                    <div>
                      <Plus className="mx-auto h-10 w-10" />
                      <p className="mt-3 font-bold">Add Product</p>
                      <p className="text-xs text-gray-300">Quick add new product</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-cyan-500/20 bg-blue-950/60 p-4">
            <h2 className="mb-3 font-bold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                ["Add Discount", Wallet],
                ["Add Customer", UserPlus],
                ["Print Last Bill", Printer],
                ["Open Cash Drawer", CreditCard],
                ["More Actions", MoreHorizontal],
              ].map(([label, Icon]) => (
                <button key={label} className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-blue-900/70 p-3 font-semibold hover:bg-blue-700">
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-cyan-400/20 bg-blue-950/70">
          <div className="flex items-center justify-between border-b border-cyan-400/20 p-5">
            <h2 className="text-xl font-bold">Cart ({cart.length} Items)</h2>
            <button onClick={() => setCart([])} className="font-semibold text-red-400">Clear Cart</button>
          </div>

          <div className="grid grid-cols-[1fr_90px_100px_100px_36px] border-b border-cyan-400/20 px-5 py-3 text-sm text-cyan-100">
            <span>Product</span>
            <span>Price</span>
            <span>Qty</span>
            <span>Total</span>
            <span />
          </div>

          <div className="max-h-[350px] overflow-y-auto px-5">
            {cart.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[1fr_90px_100px_100px_36px] items-center border-b border-cyan-400/10 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{productIcons[index % productIcons.length]}</span>
                  <p className="font-semibold">{item.product}</p>
                </div>
                <p className="font-bold">{currency.format(item.price)}</p>
                <div className="flex items-center">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="rounded-l-lg bg-blue-800 px-3 py-2"><Minus className="h-4 w-4" /></button>
                  <span className="bg-blue-900 px-4 py-2 font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="rounded-r-lg bg-blue-800 px-3 py-2"><Plus className="h-4 w-4" /></button>
                </div>
                <p className="font-bold">{currency.format(Number(item.price) * item.quantity)}</p>
                <button onClick={() => updateQuantity(item.id, 0)} className="text-red-400"><Trash2 className="h-5 w-5" /></button>
              </div>
            ))}
          </div>

          <div className="p-5">
            <label className="mb-2 block text-cyan-100">Add Order Note</label>
            <textarea
              value={orderNote}
              onChange={(event) => setOrderNote(event.target.value)}
              placeholder="Write order note here..."
              className="h-12 w-full resize-none rounded-xl border border-cyan-500/30 bg-blue-900/50 p-3 outline-none"
            />

            <div className="mt-4 rounded-xl border border-cyan-500/30 bg-blue-900/50 p-4">
              <div className="flex justify-between py-1"><span>Subtotal</span><strong>{currency.format(subtotal)}</strong></div>
              <div className="flex justify-between py-1"><span>Discount</span><strong>- {currency.format(discount)}</strong></div>
              <div className="flex justify-between py-1"><span>Taxable Amount</span><strong>{currency.format(taxableAmount)}</strong></div>
              <div className="flex justify-between py-1"><span>GST (5%)</span><strong>{currency.format(gst)}</strong></div>
              <div className="mt-3 border-t border-dashed border-cyan-400/30 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">Total Amount</span>
                  <strong className="text-3xl text-cyan-300">{currency.format(total)}</strong>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {["Cash", "UPI", "Card", "Wallet", "Split"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`rounded-xl border p-3 font-semibold ${
                    paymentMode === mode ? "border-green-400 bg-green-500/20" : "border-cyan-500/30 bg-blue-900/60"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut || !cart.length}
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 py-4 text-2xl font-bold shadow-[0_0_28px_rgba(0,119,255,0.45)] hover:bg-blue-500 disabled:opacity-50"
            >
              <ShoppingCart className="h-6 w-6" />
              {isCheckingOut ? "Processing..." : `Pay ${currency.format(total)}`}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
