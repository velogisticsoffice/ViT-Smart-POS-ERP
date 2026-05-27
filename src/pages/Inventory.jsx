import { useState } from "react";
import { useInventory } from "../hooks/useInventory";

export default function Inventory() {
  // Bring in our custom Firebase logic
  const { items, isLoading, error, addItem, deleteItem } = useInventory();

  // Combine form states into one object (Industry Standard)
  const initialFormState = {
    product: "",
    sku: "",
    category: "",
    price: "",
    stock: "",
    unit: "pcs",
  };
  const [formData, setFormData] = useState(initialFormState);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ADD PRODUCT
  const handleAddProduct = async (e) => {
    e.preventDefault();

    if (!formData.product || !formData.stock || !formData.sku || !formData.price) {
      return alert("Please fill all required fields");
    }

    setIsSubmitting(true);
    
    // Format data before sending to Firebase
    const dataToSave = {
      ...formData,
      sku: formData.sku.toUpperCase(),
      price: Number(formData.price),
      stock: Number(formData.stock),
    };

    const success = await addItem(dataToSave);

    if (success) {
      setFormData(initialFormState); // Reset form on success
    }
    
    setIsSubmitting(false);
  };

  // FILTER
  const filtered = items.filter(
    (item) =>
      item.product?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* TITLE */}
      <h1 className="text-3xl md:text-6xl font-bold mb-3">Inventory Management</h1>
      <p className="text-gray-400 mb-10 text-xl">Real-time Enterprise Inventory System</p>

      {/* ERROR DISPLAY */}
      {error && (
        <div className="bg-red-600/20 border border-red-600 text-red-400 p-4 rounded-2xl mb-8">
          ⚠ {error}
        </div>
      )}

      {/* SEARCH */}
      <div className="card-premium glass rounded-3xl p-4 md:p-8 mb-8">
        <input
          type="text"
          placeholder="Search by Product, SKU, or Category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-4 rounded-2xl bg-[#031B34] border border-blue-900 text-white focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* ADD FORM */}
      <form onSubmit={handleAddProduct} className="card-premium glass rounded-3xl p-4 md:p-8 mb-10">
        <h2 className="text-2xl font-bold mb-6">Add New Item</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block mb-2 text-lg text-gray-300">Product Name *</label>
            <input
              type="text"
              name="product"
              placeholder="e.g. BLINKER Soda 500ml"
              value={formData.product}
              onChange={handleChange}
              className="w-full p-4 rounded-2xl bg-[#031B34] border border-blue-900 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 text-lg text-gray-300">SKU Code *</label>
            <input
              type="text"
              name="sku"
              placeholder="e.g. BLK-SDA-500"
              value={formData.sku}
              onChange={handleChange}
              className="w-full p-4 rounded-2xl bg-[#031B34] border border-blue-900 text-white focus:outline-none focus:border-blue-500 uppercase"
            />
          </div>

          <div>
            <label className="block mb-2 text-lg text-gray-300">Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full p-4 rounded-2xl bg-[#031B34] border border-blue-900 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select Category</option>
              <option value="Beverages">Beverages</option>
              <option value="Raw Materials">Raw Materials</option>
              <option value="Packaging">Packaging</option>
              <option value="Finished Goods">Finished Goods</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-lg text-gray-300">Unit Type</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full p-4 rounded-2xl bg-[#031B34] border border-blue-900 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="pcs">Pieces (pcs)</option>
              <option value="boxes">Boxes</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="liters">Liters (L)</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-lg text-gray-300">Unit Price (₹) *</label>
            <input
              type="number"
              name="price"
              placeholder="0.00"
              value={formData.price}
              onChange={handleChange}
              className="w-full p-4 rounded-2xl bg-[#031B34] border border-blue-900 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 text-lg text-gray-300">Opening Stock *</label>
            <input
              type="number"
              name="stock"
              placeholder="0"
              value={formData.stock}
              onChange={handleChange}
              className="w-full p-4 rounded-2xl bg-[#031B34] border border-blue-900 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 px-8 py-4 rounded-2xl text-xl font-bold transition-all w-full md:w-auto"
        >
          {isSubmitting ? "Adding..." : "+ Add Inventory Item"}
        </button>
      </form>

      {/* TABLE */}
      <div className="card-premium glass rounded-3xl p-4 md:p-8">
        <h2 className="text-3xl font-bold mb-8">Inventory Directory</h2>
        
        {isLoading ? (
          <div className="text-center p-10 text-xl text-gray-400">Loading Database...</div>
        ) : (
          <div className="table-wrapper overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-900">
                  <th className="p-4 text-left text-gray-400">SKU</th>
                  <th className="p-4 text-left text-gray-400">Product</th>
                  <th className="p-4 text-left text-gray-400">Category</th>
                  <th className="p-4 text-left text-gray-400">Price</th>
                  <th className="p-4 text-left text-gray-400">Stock</th>
                  <th className="p-4 text-left text-gray-400">Status</th>
                  <th className="p-4 text-left text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-blue-900/50 hover:bg-blue-900/20">
                    <td className="p-4 font-mono text-sm text-gray-300">{item.sku || "N/A"}</td>
                    <td className="p-4 font-bold">{item.product}</td>
                    <td className="p-4 text-gray-300">{item.category || "N/A"}</td>
                    <td className="p-4">₹{item.price || 0}</td>
                    <td className="p-4 font-bold">
                      {item.stock} <span className="text-sm text-gray-400 font-normal">{item.unit}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-4 py-1.5 rounded-xl text-sm font-bold ${
                          item.stock < 100
                            ? "bg-red-600/20 text-red-400 border border-red-600"
                            : "bg-green-600/20 text-green-400 border border-green-600"
                        }`}
                      >
                        {item.stock < 100 ? "Low Stock" : "In Stock"}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
               <div className="text-center p-10 text-gray-400">
                 No inventory items found.
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}