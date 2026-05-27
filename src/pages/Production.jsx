import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, deleteDoc, doc, runTransaction, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { demoInventory } from "../data/demoData";
import { useBusinessContext } from "../context/BusinessContext";

export default function Production() {
  const { currentBranchId, currentBranch, currentUser } = useBusinessContext();
  const [recipes, setRecipes] = useState([]); // Loaded BOM Recipes
  const [batches, setBatches] = useState([]); // Loaded Batch Production logs
  const [inventoryItems, setInventoryItems] = useState(() =>
    isFirebaseConfigured
      ? []
      : demoInventory.map((item) => ({ ...item, branchId: item.branchId || "main" }))
  );

  // BOM Form States
  const [finishedProductId, setFinishedProductId] = useState("");
  const [recipeName, setRecipeName] = useState("");
  const [ingredients, setIngredients] = useState([]); // List of current packaging/raw materials added to BOM
  
  // Ingredient addition temporary states
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [requiredQty, setRequiredQty] = useState("");

  // Batch Form States
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [batchSize, setBatchSize] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);

  // Fetch real-time data from Firestore
  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined;
    }

    // 1. Fetch live BOM Recipes
    const unsubRecipes = onSnapshot(
      query(collection(db, "bom_recipes"), where("branchId", "==", currentBranchId || "main")),
      (snap) => {
      setRecipes(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );

    // 2. Fetch live Completed Production Batches
    const qBatches = query(
      collection(db, "production_batches"),
      where("branchId", "==", currentBranchId || "main"),
      orderBy("timestamp", "desc")
    );
    const unsubBatches = onSnapshot(qBatches, (snap) => {
      setBatches(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Fetch live Inventory items
    const unsubInventory = onSnapshot(
      query(collection(db, "inventory"), where("branchId", "==", currentBranchId || "main")),
      (snap) => {
      setInventoryItems(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );

    return () => {
      unsubRecipes();
      unsubBatches();
      unsubInventory();
    };
  }, [currentBranchId]);

  const branchInventoryItems = inventoryItems.filter(
    (item) => (item.branchId || "main") === (currentBranchId || "main")
  );

  // Add temporary ingredient to BOM list
  const handleAddIngredientToBOM = (e) => {
    e.preventDefault();
    if (!selectedIngredientId || !requiredQty) return;

    const matched = branchInventoryItems.find((i) => i.id === selectedIngredientId);
    if (!matched) return;

    if (ingredients.some((i) => i.id === selectedIngredientId)) {
      return alert("This ingredient is already in the Bill of Materials.");
    }

    setIngredients((prev) => [
      ...prev,
      {
        id: matched.id,
        product: matched.product,
        sku: matched.sku,
        unit: matched.unit || "pcs",
        qtyPerUnit: Number(requiredQty),
      },
    ]);

    setSelectedIngredientId("");
    setRequiredQty("");
  };

  // Remove ingredient from BOM list
  const handleRemoveIngredientFromBOM = (id) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  // Save BOM Recipe to Firestore
  const handleSaveBOMRecipe = async (e) => {
    e.preventDefault();
    if (!finishedProductId || !recipeName || ingredients.length === 0) {
      return alert("Please fill out recipe name, select finished product, and add at least one BOM ingredient.");
    }

    const matchedProduct = branchInventoryItems.find((i) => i.id === finishedProductId);
    if (!matchedProduct) return;

    try {
      if (!isFirebaseConfigured) {
        setRecipes((current) => [
          {
            id: String(Date.now()),
            recipeName,
            finishedProductId: matchedProduct.id,
            finishedProductName: matchedProduct.product,
            finishedProductSku: matchedProduct.sku,
            ingredients,
            branchId: currentBranchId || "main",
            branchName: currentBranch?.name || "Main Branch",
            createdBy: currentUser?.id || "system",
            createdByName: currentUser?.name || "System",
            created: new Date().toLocaleDateString(),
          },
          ...current,
        ]);
        setFinishedProductId("");
        setRecipeName("");
        setIngredients([]);
        return;
      }

      await addDoc(collection(db, "bom_recipes"), {
        recipeName,
        finishedProductId: matchedProduct.id,
        finishedProductName: matchedProduct.product,
        finishedProductSku: matchedProduct.sku,
        ingredients: ingredients.map((i) => ({
          id: i.id,
          product: i.product,
          sku: i.sku,
          unit: i.unit,
          qtyPerUnit: Number(i.qtyPerUnit),
        })),
        branchId: currentBranchId || "main",
        branchName: currentBranch?.name || "Main Branch",
        createdBy: currentUser?.id || "system",
        createdByName: currentUser?.name || "System",
        created: new Date().toLocaleDateString(),
        timestamp: serverTimestamp(),
      });

      // Reset
      setFinishedProductId("");
      setRecipeName("");
      setIngredients([]);
      alert("Bill of Materials (BOM) Recipe created successfully!");
    } catch (err) {
      console.error("Error creating BOM recipe:", err);
      alert("Failed to save BOM recipe.");
    }
  };

  // Execute Batch Production Crushing & Bottling (Atomic Stock Audit & Deduction)
  const handleManufactureBatch = async (e) => {
    e.preventDefault();
    if (!selectedRecipeId || !batchSize) return alert("Select a recipe and target batch size.");

    const size = Number(batchSize);
    if (size <= 0) return alert("Batch size must be greater than zero.");

    const recipe = recipes.find((r) => r.id === selectedRecipeId);
    if (!recipe) return alert("Recipe not found.");

    setBatchLoading(true);

    try {
      if (!isFirebaseConfigured) {
        const missingItems = recipe.ingredients
          .map((ing) => {
            const item = branchInventoryItems.find((inventoryItem) => inventoryItem.id === ing.id);
            const available = Number(item?.stock || 0);
            const required = Number(ing.qtyPerUnit) * size;
            return available < required
              ? `${ing.product}: required ${required} ${ing.unit}, available ${available} ${ing.unit}`
              : null;
          })
          .filter(Boolean);

        if (missingItems.length > 0) {
          alert(`Manufacturing Aborted. Missing stock:\n${missingItems.join("\n")}`);
          setBatchLoading(false);
          return;
        }

        setInventoryItems((current) =>
          current.map((item) => {
            if (item.id === recipe.finishedProductId) {
              return { ...item, stock: Number(item.stock || 0) + size };
            }

            const ingredient = recipe.ingredients.find((ing) => ing.id === item.id);
            if (!ingredient) return item;

            return {
              ...item,
              stock: Number(item.stock || 0) - Number(ingredient.qtyPerUnit) * size,
            };
          })
        );

        setBatches((current) => [
          {
            id: String(Date.now()),
            recipeName: recipe.recipeName,
            finishedProductName: recipe.finishedProductName,
            batchSize: size,
            ingredientsConsumed: recipe.ingredients.map((i) => ({
              product: i.product,
              qtyConsumed: Number(i.qtyPerUnit) * size,
              unit: i.unit,
            })),
            date: new Date().toLocaleDateString(),
            branchId: currentBranchId || "main",
            branchName: currentBranch?.name || "Main Branch",
            createdBy: currentUser?.id || "system",
            createdByName: currentUser?.name || "System",
          },
          ...current,
        ]);
        setBatchSize("");
        setSelectedRecipeId("");
        setBatchLoading(false);
        return;
      }

      await runTransaction(db, async (transaction) => {
        const stockUpdates = [];

        // 1. Audit stock level availability for all raw/packaging materials
        for (const ing of recipe.ingredients) {
          const ingRef = doc(db, "inventory", ing.id);
          const ingDoc = await transaction.get(ingRef);

          if (!ingDoc.exists()) {
            throw new Error(`Raw material "${ing.product}" not found in inventory.`);
          }

          const currentStock = Number(ingDoc.data().stock || 0);
          const totalRequired = Number(ing.qtyPerUnit) * size;
          const remainingStock = currentStock - totalRequired;

          if (remainingStock < 0) {
            throw new Error(
              `Insufficient stock for "${ing.product}". Required: ${totalRequired} ${ing.unit}, Available: ${currentStock} ${ing.unit}.`
            );
          }

          stockUpdates.push({ ref: ingRef, nextStock: remainingStock });
        }

        // 2. Fetch the Finished Good document to increment stock
        const finishedGoodRef = doc(db, "inventory", recipe.finishedProductId);
        const finishedGoodDoc = await transaction.get(finishedGoodRef);

        let finalFinishedStock = size;
        if (finishedGoodDoc.exists()) {
          finalFinishedStock = Number(finishedGoodDoc.data().stock || 0) + size;
        }

        // 3. Apply atomic modifications to Firestore
        // Deduct raw items
        for (const update of stockUpdates) {
          transaction.update(update.ref, { stock: update.nextStock });
        }

        // Increment finished good stock
        if (finishedGoodDoc.exists()) {
          transaction.update(finishedGoodRef, { stock: finalFinishedStock });
        } else {
          // Fallback if not found (should exist in inventory setup)
          transaction.set(finishedGoodRef, {
            sku: recipe.finishedProductSku || "FINISHED-OIL",
            product: recipe.finishedProductName,
            category: "Finished Goods",
            unit: "pcs",
            price: 180,
            stock: size,
            branchId: currentBranchId || "main",
            created: new Date().toLocaleDateString(),
          });
        }

        // 4. Log the completed Batch details
        const batchColRef = collection(db, "production_batches");
        const newBatchRef = doc(batchColRef);
        transaction.set(newBatchRef, {
          recipeId: recipe.id,
          recipeName: recipe.recipeName,
          finishedProductName: recipe.finishedProductName,
          batchSize: size,
          ingredientsConsumed: recipe.ingredients.map((i) => ({
            product: i.product,
            qtyConsumed: Number(i.qtyPerUnit) * size,
            unit: i.unit,
          })),
          date: new Date().toLocaleDateString(),
          branchId: currentBranchId || "main",
          branchName: currentBranch?.name || "Main Branch",
          createdBy: currentUser?.id || "system",
          createdByName: currentUser?.name || "System",
          timestamp: serverTimestamp(),
        });
      });

      setBatchSize("");
      setSelectedRecipeId("");
      alert(`Production Complete! Manufactured ${size} units of "${recipe.finishedProductName}". Ingredients decremented from stock.`);
    } catch (err) {
      console.error("Batch Production crashed:", err);
      alert(`Manufacturing Aborted: ${err.message}`);
    }

    setBatchLoading(false);
  };

  // Delete BOM Recipe
  const handleDeleteRecipe = async (id) => {
    if (!window.confirm("Are you sure you want to delete this BOM recipe?")) return;
    try {
      await deleteDoc(doc(db, "bom_recipes", id));
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Batch Log
  const handleDeleteBatch = async (id) => {
    if (!window.confirm("Are you sure you want to delete this batch log?")) return;
    try {
      await deleteDoc(doc(db, "production_batches", id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      {/* Title */}
      <div className="mb-6">
        <span className="text-xs uppercase bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full font-bold">
          Manufacturing & Bottling
        </span>
        <h1 className="text-3xl md:text-5xl font-bold mt-2">Bill of Materials (BOM) Production</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-yellow-600/20 border border-yellow-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-yellow-300 uppercase tracking-wider">Active BOM Recipes</h2>
          <p className="text-4xl font-bold mt-3 text-white">{recipes.length}</p>
        </div>

        <div className="bg-blue-600/20 border border-blue-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">Batches Completed</h2>
          <p className="text-4xl font-bold mt-3 text-white">{batches.length}</p>
        </div>

        <div className="bg-green-600/20 border border-green-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-green-300 uppercase tracking-wider">Units Manufactured</h2>
          <p className="text-4xl font-bold mt-3 text-white">
            {batches.reduce((sum, b) => sum + Number(b.batchSize || 0), 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-purple-600/20 border border-purple-500/50 p-6 rounded-3xl backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-purple-300 uppercase tracking-wider">BOM Ingredients Tracked</h2>
          <p className="text-4xl font-bold mt-3 text-white">
            {recipes.reduce((sum, r) => sum + (r.ingredients ? r.ingredients.length : 0), 0)}
          </p>
        </div>
      </div>

      {/* Main work layout split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: BOM Recipe Builder Form */}
        <div className="xl:col-span-2 space-y-8">
          
          <form onSubmit={handleSaveBOMRecipe} className="bg-[#07294d] border border-blue-900/50 p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold border-b border-blue-800 pb-3 text-yellow-500 flex items-center gap-2">
              <span>🧪</span> Define Bill of Materials (BOM) Recipe
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Recipe Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Bottled Coconut Oil 1L"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-1">Finished Product (Stock Target) *</label>
                <select
                  value={finishedProductId}
                  onChange={(e) => setFinishedProductId(e.target.value)}
                  className="w-full bg-[#031B34] border border-blue-900 p-3.5 rounded-xl outline-none text-white focus:border-blue-500 transition-colors text-base"
                  required
                >
                  <option value="">Select Finished Goods Product</option>
                  {branchInventoryItems
                    .filter((i) => i.category === "Finished Goods")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        📦 {item.product} ({item.sku})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Sub Form to add ingredients to the local BOM list */}
            <div className="bg-[#031B34] p-4 rounded-2xl border border-blue-900/50 space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Add Recipe Ingredients & Packaging</h4>
              
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-300 block mb-1">Raw Material / Packaging Case</label>
                  <select
                    value={selectedIngredientId}
                    onChange={(e) => setSelectedIngredientId(e.target.value)}
                    className="w-full bg-[#07294d] border border-blue-900 p-3 rounded-xl outline-none text-white focus:border-blue-500 text-sm"
                  >
                    <option value="">Select Ingredient</option>
                    {branchInventoryItems
                      .filter((i) => i.id !== finishedProductId) // Cannot consume target product
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          🧪 {item.product} ({item.sku}) [{item.unit || "pcs"}]
                        </option>
                      ))}
                  </select>
                </div>

                <div className="w-full sm:w-40">
                  <label className="text-xs text-gray-300 block mb-1">Qty Required per 1 Unit</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="e.g. 0.95 or 1"
                    value={requiredQty}
                    onChange={(e) => setRequiredQty(e.target.value)}
                    className="w-full bg-[#07294d] border border-blue-900 p-3 rounded-xl outline-none text-white focus:border-blue-500 text-sm font-semibold"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddIngredientToBOM}
                  className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-md shadow-blue-900/30"
                >
                  + Add Item
                </button>
              </div>

              {/* Current temporary BOM lists */}
              <div className="mt-3">
                <h5 className="text-xs text-gray-400 font-bold mb-2">BOM Component Structure:</h5>
                <div className="space-y-2">
                  {ingredients.map((ing) => (
                    <div key={ing.id} className="bg-[#07294d] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-sm border border-blue-900/30">
                      <div>
                        <span className="font-bold text-white">{ing.product}</span>{" "}
                        <span className="text-xs text-yellow-500 font-mono">({ing.sku})</span>
                      </div>
                      <div className="flex items-center gap-3 font-semibold text-gray-200">
                        <span>{ing.qtyPerUnit} {ing.unit}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientFromBOM(ing.id)}
                          className="text-red-400 hover:text-red-500 font-bold text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {ingredients.length === 0 && (
                    <div className="text-center py-6 text-gray-500 text-xs italic">
                      No components added to the recipe list yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={ingredients.length === 0 || !recipeName}
              className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800/40 py-3.5 rounded-xl font-bold transition-all text-base text-white shadow-lg shadow-yellow-950/40"
            >
              Save BOM Recipe
            </button>
          </form>

          {/* Active BOM Recipe Directory Table */}
          <div className="bg-[#07294d] border border-blue-900/50 p-6 md:p-8 rounded-3xl shadow-xl">
            <h3 className="text-xl font-bold border-b border-blue-800 pb-3 mb-6 text-gray-300">
              Active BOM Recipes
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-blue-800">
                    <th className="pb-4">Recipe Name</th>
                    <th className="pb-4">Finished Target Product</th>
                    <th className="pb-4">BOM Component Materials</th>
                    <th className="pb-4 text-right">Created</th>
                    <th className="pb-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.map((recipe) => (
                    <tr key={recipe.id} className="border-b border-blue-900/30 hover:bg-blue-900/10">
                      <td className="py-4 font-bold text-white">{recipe.recipeName}</td>
                      <td className="py-4">
                        <span className="font-semibold text-blue-300">{recipe.finishedProductName}</span>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{recipe.finishedProductSku}</div>
                      </td>
                      <td className="py-4 max-w-xs text-gray-300 break-words leading-relaxed">
                        {recipe.ingredients
                          ?.map((i) => `${i.product} (${i.qtyPerUnit}${i.unit})`)
                          .join(", ")}
                      </td>
                      <td className="py-4 text-right text-gray-400 text-xs">{recipe.created}</td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/20 transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recipes.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-gray-500">
                        No BOM recipes defined yet. Select items above and save.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Batch Manufacturing Panel */}
        <div className="space-y-6">
          <form onSubmit={handleManufactureBatch} className="bg-[#07294d] border border-blue-900/50 p-6 rounded-3xl shadow-xl space-y-5">
            <h3 className="text-lg font-bold border-b border-blue-800 pb-3 text-blue-300 flex items-center gap-2">
              <span>⚙</span> Launch Batch Production
            </h3>

            <div>
              <label className="text-xs text-gray-300 block mb-1">Select BOM Recipe *</label>
              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full bg-[#031B34] border border-blue-900 p-3 rounded-xl outline-none text-white focus:border-blue-500 text-sm"
                required
              >
                <option value="">Choose Recipe...</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    🏭 {r.recipeName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-300 block mb-1">Batch Manufacturing Size (Units) *</label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                className="w-full bg-[#031B34] border border-blue-900 p-3 rounded-xl outline-none text-white focus:border-blue-500 font-semibold"
                required
              />
            </div>

            {/* Expected requirements list panel */}
            {selectedRecipeId && batchSize && (
              <div className="bg-[#031B34] p-3.5 rounded-2xl border border-blue-900/50 space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Required Inventory Check</h4>
                <div className="border-t border-blue-900/40 my-1"></div>
                
                {recipes
                  .find((r) => r.id === selectedRecipeId)
                  ?.ingredients?.map((ing) => {
                    const matchedInv = branchInventoryItems.find((i) => i.id === ing.id);
                    const currentStock = matchedInv ? Number(matchedInv.stock || 0) : 0;
                    const requiredTotal = Number(ing.qtyPerUnit) * Number(batchSize);
                    const hasStock = currentStock >= requiredTotal;

                    return (
                      <div key={ing.id} className="flex justify-between text-xs items-center">
                        <span className="text-gray-300 truncate max-w-[140px]">{ing.product}</span>
                        <span className={`font-mono ${hasStock ? 'text-green-400' : 'text-red-400 font-bold'}`}>
                          {requiredTotal} {ing.unit} (In Stock: {currentStock})
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}

            <button
              type="submit"
              disabled={batchLoading || !selectedRecipeId || !batchSize}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/40 py-3.5 rounded-xl font-bold transition-all text-base text-white shadow-lg shadow-blue-950/40"
            >
              {batchLoading ? "Processing Batch Crushing..." : "Manufacture & Increment Stock"}
            </button>
          </form>

          {/* Batch Logs ledger book */}
          <div className="bg-[#07294d] border border-blue-900/50 p-6 rounded-3xl shadow-xl">
            <h3 className="text-lg font-bold border-b border-blue-800 pb-3 mb-4 text-gray-300">
              Completed Batches Log
            </h3>
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {batches.map((batch) => (
                <div key={batch.id} className="bg-[#031B34] border border-blue-900/50 p-3.5 rounded-2xl space-y-1 relative">
                  <button
                    onClick={() => handleDeleteBatch(batch.id)}
                    className="absolute top-3 right-3 text-red-400 hover:text-red-500 text-[10px]"
                    title="Delete log entry"
                  >
                    ✕
                  </button>
                  
                  <div className="text-[10px] text-gray-400 font-semibold">{batch.date}</div>
                  <div className="font-bold text-sm text-white">{batch.recipeName}</div>
                  <div className="text-xs text-green-400 font-bold">
                    Qty: +{batch.batchSize} manufactured
                  </div>
                  
                  <div className="border-t border-blue-900/40 my-1.5 pt-1.5">
                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Consumed:</div>
                    <div className="text-[11px] text-gray-300 mt-0.5">
                      {batch.ingredientsConsumed
                        ?.map((c) => `${c.product} (-${c.qtyConsumed}${c.unit})`)
                        .join(", ")}
                    </div>
                  </div>
                </div>
              ))}
              {batches.length === 0 && (
                <div className="text-center py-10 text-gray-500 text-xs italic">
                  No batch production logs registered inside cloud.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
