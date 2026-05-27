import { useMemo, useState } from "react";
import {
  Boxes,
  Edit3,
  PackagePlus,
  Save,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useInventory } from "../hooks/useInventory";

const initialForm = {
  product: "",
  sku: "",
  category: "",
  brand: "",
  price: "",
  mrp: "",
  stock: "",
  reorderLevel: "10",
  unit: "pcs",
};

const categories = [
  "Beverages",
  "Grocery",
  "Dairy",
  "Snacks",
  "Personal Care",
  "Household",
  "Raw Materials",
  "Packaging",
  "Finished Goods",
];

const units = ["pcs", "boxes", "kg", "liters", "packs", "bottles"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function Products() {
  const { items, isLoading, error, addItem, deleteItem, updateItem } = useInventory();
  const [formData, setFormData] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const productStats = useMemo(() => {
    const totalValue = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.stock || 0),
      0
    );
    const lowStock = items.filter(
      (item) => Number(item.stock || 0) <= Number(item.reorderLevel || 10)
    ).length;
    const uniqueCategories = new Set(items.map((item) => item.category).filter(Boolean)).size;

    return { totalValue, lowStock, uniqueCategories };
  }, [items]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !term ||
        [item.product, item.sku, item.category, item.brand]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const normalizeProduct = () => ({
    product: formData.product.trim(),
    sku: formData.sku.trim().toUpperCase(),
    category: formData.category,
    brand: formData.brand.trim(),
    price: Number(formData.price || 0),
    mrp: Number(formData.mrp || formData.price || 0),
    stock: Number(formData.stock || 0),
    reorderLevel: Number(formData.reorderLevel || 10),
    unit: formData.unit,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.product.trim() || !formData.sku.trim() || !formData.category || !formData.price) {
      alert("Please fill product name, SKU, category, and price.");
      return;
    }

    setIsSaving(true);
    const payload = normalizeProduct();

    try {
      if (editingId) {
        const success = await updateItem(editingId, payload);
        if (!success) throw new Error("Unable to update product.");
      } else {
        const duplicateSku = items.some(
          (item) => item.sku?.toLowerCase() === payload.sku.toLowerCase()
        );
        if (duplicateSku) {
          alert("SKU already exists. Use a unique SKU code.");
          setIsSaving(false);
          return;
        }
        await addItem(payload);
      }
      resetForm();
    } catch (err) {
      console.error("Product save failed:", err);
      alert("Unable to save product.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      product: item.product || "",
      sku: item.sku || "",
      category: item.category || "",
      brand: item.brand || "",
      price: item.price ?? "",
      mrp: item.mrp ?? "",
      stock: item.stock ?? "",
      reorderLevel: item.reorderLevel ?? "10",
      unit: item.unit || "pcs",
    });
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.product}?`)) return;

    try {
      const success = await deleteItem(item.id);
      if (!success) throw new Error("Unable to delete product.");
    } catch (err) {
      console.error("Product delete failed:", err);
      alert("Unable to delete product.");
    }
  };

  return (
    <div className="page-container">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold md:text-5xl">Products</h1>
          <p className="mt-2 text-gray-400">
            Manage product catalog, SKU codes, pricing, and reorder stock levels.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-blue-900 bg-[#07294d] p-4">
            <p className="text-xs text-gray-400">Total Products</p>
            <p className="text-2xl font-bold text-blue-300">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-yellow-900 bg-[#07294d] p-4">
            <p className="text-xs text-gray-400">Low Stock</p>
            <p className="text-2xl font-bold text-yellow-300">{productStats.lowStock}</p>
          </div>
          <div className="rounded-2xl border border-green-900 bg-[#07294d] p-4">
            <p className="text-xs text-gray-400">Stock Value</p>
            <p className="text-2xl font-bold text-green-300">
              {formatCurrency(productStats.totalValue)}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-600 bg-red-600/20 p-4 text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6"
        >
          <h2 className="mb-5 flex items-center gap-2 border-b border-blue-900 pb-4 text-xl font-bold text-blue-200">
            <PackagePlus className="h-5 w-5" />
            {editingId ? "Edit Product" : "Add Product"}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Product Name *</label>
              <input
                name="product"
                value={formData.product}
                onChange={handleChange}
                placeholder="e.g. BLINKER Soda 500ml"
                className="w-full rounded-xl border border-blue-900 bg-[#031B34] p-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-300">SKU *</label>
                <input
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="BLK-SDA-500"
                  className="w-full rounded-xl border border-blue-900 bg-[#031B34] p-3 uppercase text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-300">Brand</label>
                <input
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="Brand name"
                  className="w-full rounded-xl border border-blue-900 bg-[#031B34] p-3 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-300">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-blue-900 bg-[#031B34] p-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-300">Unit</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-blue-900 bg-[#031B34] p-3 text-white outline-none focus:border-blue-500"
                >
                  {units.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-300">Selling Price *</label>
                <input
                  type="number"
                  min="0"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-blue-900 bg-[#031B34] p-3 text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-300">MRP</label>
                <input
                  type="number"
                  min="0"
                  name="mrp"
                  value={formData.mrp}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-blue-900 bg-[#031B34] p-3 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-300">Current Stock</label>
                <input
                  type="number"
                  min="0"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full rounded-xl border border-blue-900 bg-[#031B34] p-3 text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-300">Reorder Level</label>
                <input
                  type="number"
                  min="0"
                  name="reorderLevel"
                  value={formData.reorderLevel}
                  onChange={handleChange}
                  placeholder="10"
                  className="w-full rounded-xl border border-blue-900 bg-[#031B34] p-3 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSaving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition-colors hover:bg-green-700 disabled:bg-green-900/50"
            >
              <Save className="h-5 w-5" />
              {isSaving ? "Saving..." : editingId ? "Update Product" : "Save Product"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center justify-center gap-2 rounded-xl border border-blue-700 bg-blue-900/30 px-5 py-3 font-bold text-blue-200 hover:bg-blue-800"
              >
                <X className="h-5 w-5" />
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="xl:col-span-2">
          <div className="mb-5 rounded-3xl border border-blue-900 bg-[#07294d] p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
              <label className="relative block">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product, SKU, brand, or category"
                  className="w-full rounded-2xl border border-blue-900 bg-[#031B34] py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500"
                />
              </label>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-2xl border border-blue-900 bg-[#031B34] p-4 text-white outline-none focus:border-blue-500"
              >
                <option value="All">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-900 bg-[#07294d] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-blue-900 pb-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-200">
                <Boxes className="h-5 w-5 text-blue-300" />
                Product Catalog
              </h2>
              <span className="flex items-center gap-2 rounded-full bg-blue-600/20 px-3 py-1 text-sm font-bold text-blue-200">
                <Tags className="h-4 w-4" />
                {productStats.uniqueCategories} Categories
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-gray-400">Loading products...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-blue-900 text-gray-400">
                      <th className="pb-4">Product</th>
                      <th className="pb-4">Category</th>
                      <th className="pb-4">Price</th>
                      <th className="pb-4">Stock</th>
                      <th className="pb-4">Status</th>
                      <th className="pb-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((item) => {
                      const isLowStock =
                        Number(item.stock || 0) <= Number(item.reorderLevel || 10);

                      return (
                        <tr key={item.id} className="border-b border-blue-900/40 hover:bg-blue-900/20">
                          <td className="py-4">
                            <p className="font-bold text-white">{item.product}</p>
                            <p className="mt-1 font-mono text-xs text-yellow-300">
                              {item.sku || "NO-SKU"}
                            </p>
                            {item.brand && <p className="mt-1 text-xs text-gray-400">{item.brand}</p>}
                          </td>
                          <td className="py-4 text-gray-300">{item.category || "General"}</td>
                          <td className="py-4">
                            <p className="font-bold text-green-300">{formatCurrency(item.price)}</p>
                            <p className="text-xs text-gray-500">MRP {formatCurrency(item.mrp || item.price)}</p>
                          </td>
                          <td className="py-4 font-bold">
                            {item.stock || 0}{" "}
                            <span className="font-normal text-gray-400">{item.unit || "pcs"}</span>
                          </td>
                          <td className="py-4">
                            <span
                              className={`rounded-xl border px-3 py-1 text-xs font-bold ${
                                isLowStock
                                  ? "border-red-600/40 bg-red-600/20 text-red-300"
                                  : "border-green-600/40 bg-green-600/20 text-green-300"
                              }`}
                            >
                              {isLowStock ? "Low Stock" : "Active"}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="rounded-lg border border-blue-500/30 bg-blue-600/20 p-2 text-blue-200 hover:bg-blue-600 hover:text-white"
                                title="Edit product"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="rounded-lg border border-red-500/30 bg-red-600/20 p-2 text-red-300 hover:bg-red-600 hover:text-white"
                                title="Delete product"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredProducts.length === 0 && (
                  <div className="py-12 text-center text-gray-400">
                    No products found for the selected filter.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
