import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc as firestoreDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Dispatch() {
  const [orders, setOrders] = useState([]);
  const [customer, setCustomer] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [itemsList, setItemsList] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real-time shipments from Firestore
  useEffect(() => {
    const q = query(collection(db, "dispatch_orders"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() })));
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Dispatch Fetch Error:", err);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // Log dispatch shipment
  const handleLogDispatch = async (e) => {
    e.preventDefault();

    if (!customer || !address || !itemsList || !vehicle || !driver) {
      return alert("Please fill in all mandatory dispatch fields.");
    }

    try {
      await addDoc(collection(db, "dispatch_orders"), {
        customer,
        address,
        contact,
        itemsList,
        vehicle: vehicle.toUpperCase(),
        driver,
        status: "Pending", // Initial status
        date: new Date().toLocaleDateString(),
        timestamp: serverTimestamp()
      });

      // Reset
      setCustomer("");
      setAddress("");
      setContact("");
      setItemsList("");
      setVehicle("");
      setDriver("");
      alert("Shipment dispatch order registered successfully!");
    } catch (err) {
      console.error("Error creating dispatch order:", err);
      alert("Failed to commit shipment dispatch record.");
    }
  };

  // Toggle delivery status cycling: Pending -> Dispatched -> In Transit -> Delivered
  const handleCycleStatus = async (item) => {
    const statusCycle = ["Pending", "Dispatched", "In Transit", "Delivered"];
    const currentIndex = statusCycle.indexOf(item.status);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];

    try {
      await updateDoc(firestoreDoc(db, "dispatch_orders", item.id), {
        status: nextStatus
      });
    } catch (err) {
      console.error("Error updating dispatch status:", err);
    }
  };

  // Delete Dispatch Record
  const handleDeleteDispatch = async (id) => {
    if (!window.confirm("Are you sure you want to delete this dispatch record?")) return;
    try {
      await deleteDoc(firestoreDoc(db, "dispatch_orders", id));
    } catch (err) {
      console.error("Error deleting dispatch order:", err);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) =>
    o.customer?.toLowerCase().includes(search.toLowerCase()) ||
    o.driver?.toLowerCase().includes(search.toLowerCase()) ||
    o.vehicle?.toLowerCase().includes(search.toLowerCase()) ||
    o.status?.toLowerCase().includes(search.toLowerCase())
  );

  // Analytics counts
  const totalShipments = orders.length;
  const pendingCount = orders.filter((o) => o.status === "Pending").length;
  const inTransitCount = orders.filter((o) => o.status === "In Transit" || o.status === "Dispatched").length;
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;

  return (
    <div className="page-container">
      {/* Title */}
      <h1 className="text-3xl md:text-6xl font-bold mb-3">Logistics Dispatch</h1>
      <p className="text-gray-400 mb-10 text-xl">Real-time Delivery tracking, Fleet & Driver Dispatch</p>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-blue-600/20 border border-blue-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-lg text-blue-300">Total Shipments</h2>
          <p className="text-4xl font-bold mt-3">{totalShipments}</p>
        </div>

        <div className="bg-yellow-600/20 border border-yellow-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-lg text-yellow-300">Pending Dispatch</h2>
          <p className="text-4xl font-bold mt-3">{pendingCount}</p>
        </div>

        <div className="bg-purple-600/20 border border-purple-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-lg text-purple-300">On The Road</h2>
          <p className="text-4xl font-bold mt-3">{inTransitCount}</p>
        </div>

        <div className="bg-green-600/20 border border-green-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-lg text-green-300">Delivered</h2>
          <p className="text-4xl font-bold mt-3">{deliveredCount}</p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="card-premium glass rounded-3xl p-4 md:p-8 mb-8">
        <input
          type="text"
          placeholder="Filter by Customer, Driver, Vehicle, or Status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-4 rounded-2xl bg-[#031B34] border border-blue-900 text-white focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <form onSubmit={handleLogDispatch} className="bg-[#07294d] border border-blue-900/50 p-6 md:p-8 rounded-3xl h-fit space-y-5">
          <h3 className="text-xl font-bold border-b border-blue-800 pb-3 text-orange-400">Dispatch Fleet</h3>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Customer / Consignee</label>
            <input
              type="text"
              placeholder="e.g. Reliance Mart, Mangalore"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Delivery Address</label>
            <textarea
              placeholder="Full shipping address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors h-20 resize-none"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Consignee Phone (Optional)</label>
            <input
              type="text"
              placeholder="e.g. +91 9876543210"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Items for Dispatch</label>
            <input
              type="text"
              placeholder="e.g. BLINKER Soda (10 Boxes), BICOJA Water (20 Cases)"
              value={itemsList}
              onChange={(e) => setItemsList(e.target.value)}
              className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300 block mb-1">Vehicle Number</label>
              <input
                type="text"
                placeholder="KA-19-M-1234"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors uppercase"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">Driver Name</label>
              <input
                type="text"
                placeholder="Driver Suresh"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 py-3.5 rounded-xl font-bold transition-all text-base shadow-lg shadow-orange-950/40">
            Dispatch Shipment
          </button>
        </form>

        {/* Dispatch Ledger Board */}
        <div className="lg:col-span-2 bg-[#07294d] border border-blue-900/50 p-6 md:p-8 rounded-3xl">
          <h3 className="text-xl font-bold border-b border-blue-800 pb-3 mb-6 text-gray-300">Logistics Operations Board</h3>

          {isLoading ? (
            <div className="text-center py-10 text-gray-400">Syncing Logistics from Firestore...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-blue-800">
                    <th className="pb-4">Date</th>
                    <th className="pb-4">Consignee / Shipping Address</th>
                    <th className="pb-4">Vehicle & Driver</th>
                    <th className="pb-4">Dispatch Items</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((item) => (
                    <tr key={item.id} className="border-b border-blue-900/30 hover:bg-blue-900/10">
                      <td className="py-4 text-xs text-gray-400 align-top">{item.date}</td>
                      <td className="py-4 align-top">
                        <div className="font-semibold text-white">{item.customer}</div>
                        <div className="text-xs text-gray-400 mt-1 line-clamp-2 max-w-[200px]">{item.address}</div>
                        {item.contact && <div className="text-xs text-blue-300 mt-0.5">{item.contact}</div>}
                      </td>
                      <td className="py-4 align-top">
                        <div className="font-mono text-sm text-yellow-500">{item.vehicle}</div>
                        <div className="text-xs text-gray-300">{item.driver}</div>
                      </td>
                      <td className="py-4 text-gray-300 align-top max-w-[180px] break-words">{item.itemsList}</td>
                      <td className="py-4 align-top">
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold border block w-fit ${
                          item.status === "Delivered"
                            ? "bg-green-600/10 text-green-400 border-green-600/30"
                            : item.status === "In Transit"
                            ? "bg-purple-600/10 text-purple-400 border-purple-600/30"
                            : item.status === "Dispatched"
                            ? "bg-blue-600/10 text-blue-400 border-blue-600/30"
                            : "bg-yellow-600/10 text-yellow-400 border-yellow-600/30"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 text-right align-top space-x-2">
                        <button
                          onClick={() => handleCycleStatus(item)}
                          className="bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-500/20 transition-all"
                          title="Click to cycle status"
                        >
                          Cycle Status
                        </button>
                        <button
                          onClick={() => handleDeleteDispatch(item.id)}
                          className="bg-red-600/25 hover:bg-red-600 text-red-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/20 transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-gray-500">
                        No active dispatch shipments found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
