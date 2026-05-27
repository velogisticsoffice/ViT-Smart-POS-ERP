import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, addDoc, onSnapshot, query, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useSales } from "../hooks/useSales";
import { useInventory } from "../hooks/useInventory";
import BarcodeScanner from "../components/BarcodeScanner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Sales() {
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get("view") || "invoice";

  // Real-time custom hooks
  const { salesHistory, error: salesError, processSale } = useSales();
  const { items: inventoryItems, isLoading: inventoryLoading } = useInventory();

  // Registry state for other views (payment-in, returns, estimate etc.)
  const [registryRecords, setRegistryRecords] = useState([]);
  const [regCustomer, setRegCustomer] = useState("");
  const [regAmount, setRegAmount] = useState("");
  const [regNotes, setRegNotes] = useState("");

  // POS State
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Clean formatted view titles
  const viewTitles = {
    invoice: "POS Checkout Terminal & Billing Counter",
    "payment-in": "Payment-In Ledger Book",
    return: "Sales Return (Credit Note Ledger)",
    quotation: "Estimate / Quotation Engine",
    order: "Active Sales Orders",
    delivery: "Delivery Challan Desks",
  };

  // Sync general registries
  useEffect(() => {
    if (currentView === "invoice") return;
    const q = query(collection(db, currentView));
    const unsub = onSnapshot(q, (snapshot) => {
      setRegistryRecords(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [currentView]);

  // POS Add to Cart
  const addToCart = (product) => {
    if (product.stock <= 0) {
      return alert(`Product "${product.product}" is out of stock!`);
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Cannot add more. Only ${product.stock} units available in stock.`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  // POS Adjust Quantity
  const updateQuantity = (productId, change) => {
    const product = inventoryItems.find((i) => i.id === productId);
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === productId) {
            const nextQty = item.quantity + change;
            if (nextQty <= 0) return null;
            if (product && nextQty > product.stock) {
              alert(`Only ${product.stock} units available in stock.`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // POS Delete from Cart
  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  // Handle Barcode Scan
  const handleBarcodeScan = (barcode) => {
    const matched = inventoryItems.find(
      (item) => item.sku?.toLowerCase() === barcode.trim().toLowerCase()
    );

    if (matched) {
      addToCart(matched);
      // Soft audio feedback
      try {
        const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==");
        audio.play();
      } catch (e) {}
    }
  };

  // PDF Generator Engine
  const downloadInvoicePDF = (saleRecord) => {
    try {
      const doc = new jsPDF();

      // Brand Identity Logo & Header
      doc.setFillColor(3, 27, 52); // Brand dark #031B34
      doc.rect(0, 0, 210, 45, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("VEERASHAIVA MART ERP", 20, 20);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(190, 210, 230);
      doc.text("Premium Supermarket POS & Business Solutions", 20, 27);
      doc.text("Mangalore, Karnataka | Support: support@veerashaiva.com", 20, 33);

      // Metadata on Header Right
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text(`INVOICE NO: INV-${saleRecord.id?.slice(0, 8).toUpperCase() || "DRAFT"}`, 130, 20);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Date: ${saleRecord.date || new Date().toLocaleDateString()}`, 130, 26);
      doc.text(`Billing Desk: Counter-01 (Admin)`, 130, 32);

      // Customer section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(3, 27, 52);
      doc.text("BILL TO (CONSIGNEE):", 20, 56);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 70, 80);
      doc.text(saleRecord.customer || "General Walk-in Customer", 20, 62);
      if (saleRecord.notes) {
        doc.text(`Remarks: ${saleRecord.notes}`, 20, 68);
      }

      doc.setDrawColor(220, 230, 242);
      doc.line(20, 74, 190, 74);

      // Construct item columns
      const tableHeaders = [["Sl.", "Product Details", "SKU Code", "Unit Price", "Qty", "Total (₹)"]];
      const tableBody = (saleRecord.items || []).map((item, idx) => [
        idx + 1,
        item.productName || "Product Item",
        item.sku || "N/A",
        `₹${Number(item.price).toLocaleString()}`,
        item.quantity,
        `₹${Number(item.total).toLocaleString()}`,
      ]);

      // Draw table
      autoTable(doc, {
        startY: 78,
        head: tableHeaders,
        body: tableBody,
        headStyles: { fillColor: [3, 27, 52], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 250, 255] },
        styles: { fontSize: 10, cellPadding: 3.5 },
        margin: { left: 20, right: 20 },
      });

      // Total Summarization
      const finalY = doc.lastAutoTable.finalY + 12;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(3, 27, 52);
      doc.text(`GRAND TOTAL:`, 120, finalY);
      doc.setFontSize(14);
      doc.setTextColor(22, 163, 74); // Green profit colour
      doc.text(`₹${Number(saleRecord.amount).toLocaleString()}`, 160, finalY);

      // Bottom Footer Terms
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(150, 160, 170);
      doc.text("Thank you for shopping at Veerashaiva Mart! For refunds, keep bill receipt safely.", 20, 280);

      // Trigger download
      doc.save(`Invoice_INV-${saleRecord.id?.slice(0, 8).toUpperCase() || "DRAFT"}.pdf`);
    } catch (e) {
      console.error("PDF download crashed:", e);
      alert("Billing PDF generation failed.");
    }
  };

  // Commit POS Checkout
  const handlePOSCheckout = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      return alert("Your POS shopping cart is currently empty.");
    }

    const billCustomer = customerName.trim() || "Walk-in Customer";
    setCheckoutLoading(true);

    const result = await processSale(cart, billCustomer, remarks);

    if (result.success) {
      // Find the created sale item inside history to compile a perfect PDF download
      // Since history syncs in real-time, construct a fake preview representing current checkout
      const totalCost = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const invoiceData = {
        customer: billCustomer,
        items: cart.map((item) => ({
          productName: item.product,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
        })),
        amount: totalCost,
        notes: remarks,
        date: new Date().toLocaleDateString(),
        id: Math.random().toString(36).substring(2, 10).toUpperCase(),
      };

      // Download billing PDF invoice
      downloadInvoicePDF(invoiceData);

      // Reset POS Panel
      setCart([]);
      setCustomerName("");
      setRemarks("");
      alert("POS Sale complete! Invoice downloaded.");
    } else {
      alert(`POS Transaction Rejected: ${result.message}`);
    }

    setCheckoutLoading(false);
  };

  // Commit General Registries (Return, order, payment-in)
  const handleRegistrySubmit = async (e) => {
    e.preventDefault();
    if (!regCustomer || !regAmount) return alert("Please fill in customer and amount parameters.");

    try {
      await addDoc(collection(db, currentView), {
        customer: regCustomer,
        amount: Number(regAmount),
        notes: regNotes,
        date: new Date().toLocaleDateString(),
        timestamp: serverTimestamp(),
      });
      setRegCustomer("");
      setRegAmount("");
      setRegNotes("");
      alert("Logbook entry processed successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  // Filter items in stock
  const searchedProducts = inventoryItems.filter(
    (i) =>
      i.product?.toLowerCase().includes(productSearch.toLowerCase()) ||
      i.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Cart total computation
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="page-container">
      {/* Title */}
      <div className="mb-6">
        <span className="text-xs uppercase bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full font-bold">
          Sales Operations Panel
        </span>
        <h1 className="text-3xl md:text-5xl font-bold mt-2">
          {viewTitles[currentView] || "Sales Operations"}
        </h1>
      </div>

      {currentView === "invoice" ? (
        /* ==================== UPGRADED POS INTERFACE ==================== */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main POS Product Grid selection */}
          <div className="xl:col-span-2 space-y-6">
            
            <div className="card-premium glass p-6 rounded-3xl space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <h3 className="text-xl font-bold text-gray-200">Inventory Items Directory</h3>
                
                {/* Scanner Toggle */}
                <button
                  type="button"
                  onClick={() => setShowScanner(!showScanner)}
                  className={`px-5 py-2.5 rounded-2xl text-sm font-bold border transition-all ${
                    showScanner
                      ? "bg-red-600/20 text-red-400 border-red-600"
                      : "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/40"
                  }`}
                >
                  {showScanner ? "📷 Close Barcode Scanner" : "📷 Open Barcode Scanner"}
                </button>
              </div>

              {/* Barcode Scanner Element */}
              {showScanner && (
                <div className="mb-4">
                  <BarcodeScanner onScan={handleBarcodeScan} />
                </div>
              )}

              {/* Product search input */}
              <input
                type="text"
                placeholder="Quick search by product name or SKU barcode..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-[#031B34] border border-blue-900 p-4 rounded-2xl outline-none text-white focus:border-blue-500"
              />
            </div>

            {/* Products grid */}
            {inventoryLoading ? (
              <div className="text-center py-10 text-gray-400">Syncing products registry...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {searchedProducts.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className="bg-[#07294d] border border-blue-900/60 p-4 rounded-3xl text-left hover:border-blue-500 transition-all flex flex-col justify-between h-40 group hover:shadow-xl relative overflow-hidden"
                  >
                    {prod.stock < 10 && (
                      <span className="absolute top-2 right-2 bg-red-600/80 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        Stock Alert
                      </span>
                    )}
                    <div>
                      <div className="text-[10px] text-yellow-500 font-mono tracking-wider">
                        {prod.sku || "NO SKU"}
                      </div>
                      <div className="font-bold text-white group-hover:text-blue-400 transition-colors mt-1 line-clamp-2">
                        {prod.product}
                      </div>
                    </div>
                    <div className="flex justify-between items-end mt-4 w-full">
                      <div className="text-lg font-extrabold text-green-400">₹{prod.price}</div>
                      <div className="text-xs text-gray-400">Stock: <span className="font-bold text-white">{prod.stock}</span></div>
                    </div>
                  </button>
                ))}
                {searchedProducts.length === 0 && (
                  <div className="col-span-full text-center py-10 text-gray-500">
                    No products found matching criteria. Add items in inventory first.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* POS Cart Summary counter */}
          <div className="space-y-6">
            <div className="bg-[#07294d] border border-blue-900 p-6 rounded-3xl h-fit flex flex-col justify-between shadow-2xl relative">
              <h3 className="text-lg font-bold border-b border-blue-800 pb-3 text-blue-300">POS Checkout Cart</h3>
              
              {/* Cart List */}
              <div className="mt-4 space-y-3 overflow-y-auto max-h-[300px] pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="bg-[#031B34] border border-blue-900/50 p-3.5 rounded-2xl flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate">{item.product}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">₹{item.price} each</div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="bg-blue-900/40 text-blue-300 w-7 h-7 rounded-lg border border-blue-800/50 font-bold hover:bg-blue-800"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm text-white w-5 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="bg-blue-900/40 text-blue-300 w-7 h-7 rounded-lg border border-blue-800/50 font-bold hover:bg-blue-800"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-500 p-1.5 ml-1"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="text-center py-10 text-gray-500 text-sm">
                    No items in cart. Select products to begin.
                  </div>
                )}
              </div>

              {/* Checkout Form */}
              <form onSubmit={handlePOSCheckout} className="mt-6 border-t border-blue-800/80 pt-6 space-y-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Customer / Client Name</label>
                  <input
                    type="text"
                    placeholder="Walk-in Customer"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-[#031B34] border border-blue-900 p-3 rounded-xl outline-none text-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">POS Billing Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via UPI"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-[#031B34] border border-blue-900 p-3 rounded-xl outline-none text-white focus:border-blue-500"
                  />
                </div>

                <div className="bg-[#031B34] p-4 rounded-2xl border border-blue-900/50 space-y-1.5 mt-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Subtotal</span>
                    <span>₹{cartSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>GST (Included)</span>
                    <span>18%</span>
                  </div>
                  <div className="border-t border-blue-900/50 my-2"></div>
                  <div className="flex justify-between font-extrabold text-base text-green-400">
                    <span>Grand Total</span>
                    <span>₹{cartSubtotal.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={checkoutLoading || cart.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800/40 py-4 rounded-xl font-bold transition-all text-base shadow-lg shadow-green-950/40"
                >
                  {checkoutLoading ? "Processing Checkout..." : "Complete & Print Invoice"}
                </button>
              </form>
            </div>
          </div>

          {/* Historical POS Logs registry - full screen layout below */}
          <div className="xl:col-span-3 bg-[#07294d] border border-blue-900 p-6 md:p-8 rounded-3xl mt-6">
            <h3 className="text-xl font-bold border-b border-blue-800 pb-3 mb-6 text-gray-300">
              Live Sales Billing Ledgers (Transactions History)
            </h3>
            
            {salesError && (
              <div className="bg-red-600/20 border border-red-500 text-red-400 p-4 rounded-2xl mb-4">
                ⚠ {salesError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-blue-800">
                    <th className="pb-4">Date</th>
                    <th className="pb-4">Invoice Id</th>
                    <th className="pb-4">Customer</th>
                    <th className="pb-4">Purchased Items Details</th>
                    <th className="pb-4">Checkout Remarks</th>
                    <th className="pb-4 text-right">Valuation (₹)</th>
                    <th className="pb-4 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map((rec) => (
                    <tr key={rec.id} className="border-b border-blue-900/30 hover:bg-blue-900/10">
                      <td className="py-4 text-xs text-gray-400">{rec.date}</td>
                      <td className="py-4 font-mono text-xs text-yellow-500">
                        {rec.id?.slice(0, 8).toUpperCase() || "N/A"}
                      </td>
                      <td className="py-4 font-semibold text-blue-300">{rec.customer}</td>
                      <td className="py-4 text-gray-300 max-w-xs truncate">
                        {rec.items
                          ? rec.items
                              .map((i) => `${i.productName || "Item"} (x${i.quantity})`)
                              .join(", ")
                          : rec.productName
                          ? `${rec.productName} (x${rec.quantity || 1})`
                          : "Custom Invoiced Entry"}
                      </td>
                      <td className="py-4 text-gray-400 italic text-xs">{rec.notes || "—"}</td>
                      <td className="py-4 text-right font-extrabold text-green-400">
                        ₹{(rec.amount || rec.total || 0).toLocaleString()}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => downloadInvoicePDF(rec)}
                          className="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-500/20 transition-all"
                        >
                          📄 Download PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {salesHistory.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-gray-500">
                        No billing transactions logged inside cloud ledger.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        /* ==================== SYSTEM REGISTRIES (PAYMENT-IN, QUOTATIONS ETC.) ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleRegistrySubmit} className="bg-[#07294d] border border-blue-900 p-6 rounded-2xl h-fit space-y-4">
            <h3 className="text-lg font-bold border-b border-blue-800 pb-2 text-blue-300">Log Entry</h3>
            
            <div>
              <label className="text-xs text-gray-400 block mb-1">Customer / Client Name</label>
              <input
                type="text"
                value={regCustomer}
                onChange={(e) => setRegCustomer(e.target.value)}
                className="w-full bg-[#031B34] border border-blue-800 p-3 rounded-xl outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Valuation (₹)</label>
              <input
                type="number"
                value={regAmount}
                onChange={(e) => setRegAmount(e.target.value)}
                className="w-full bg-[#031B34] border border-blue-800 p-3 rounded-xl outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Remarks / Remarks</label>
              <textarea
                value={regNotes}
                onChange={(e) => setRegNotes(e.target.value)}
                className="w-full bg-[#031B34] border border-blue-800 p-3 rounded-xl h-20 outline-none resize-none"
              />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold transition-all text-sm">
              Commit Record
            </button>
          </form>

          <div className="lg:col-span-2 bg-[#07294d] border border-blue-900 p-6 rounded-2xl">
            <h3 className="text-lg font-bold border-b border-blue-800 pb-2 mb-4 text-gray-300">Ledger Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-blue-800">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Remarks</th>
                    <th className="pb-3 text-right">Value (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {registryRecords.map((rec) => (
                    <tr key={rec.id} className="border-b border-blue-900/40 hover:bg-blue-900/20">
                      <td className="py-3 text-xs text-gray-400">{rec.date}</td>
                      <td className="py-3 font-semibold text-blue-300">{rec.customer}</td>
                      <td className="py-3 text-gray-300">{rec.notes || "—"}</td>
                      <td className="py-3 text-right font-bold text-green-400">
                        ₹{rec.amount?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {registryRecords.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-6 text-gray-500">
                        No active logbook data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}