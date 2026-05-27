import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, serverTimestamp, runTransaction, doc, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { demoSales } from "../data/demoData";
import { useBusinessContext } from "../context/BusinessContext";

export function useSales() {
  const { currentBranchId, currentBranch, currentUser } = useBusinessContext();
  const [salesHistory, setSalesHistory] = useState(() =>
    isFirebaseConfigured
      ? []
      : demoSales.map((sale) => ({ ...sale, branchId: sale.branchId || "main", branchName: sale.branchName || "Main Branch" }))
  );
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined;
    }

    const q = query(
      collection(db, "sales"),
      where("branchId", "==", currentBranchId || "main"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSalesHistory(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      },
      (err) => {
        setError(err.message || "Unable to load sales history");
      }
    );

    return () => unsubscribe();
  }, [currentBranchId]);

  const branchSalesHistory = salesHistory.filter(
    (sale) => (sale.branchId || "main") === (currentBranchId || "main")
  );

  const processSale = async (cartItems, customer = "Walk-in Customer", notes = "") => {
    if (!isFirebaseConfigured) {
      const items = cartItems.map((item) => ({
        productId: item.id,
        product: item.product,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
        unit: item.unit,
      }));
      const amount = items.reduce((sum, item) => sum + item.total, 0);
      setSalesHistory((current) => [
        {
          id: `INV-${Date.now().toString().slice(-5)}`,
          customer,
          notes,
          items,
          amount,
          date: new Date().toLocaleString(),
          branchId: currentBranchId || "main",
          branchName: currentBranch?.name || "Main Branch",
          createdBy: currentUser?.id || "system",
          createdByName: currentUser?.name || "System",
        },
        ...current,
      ]);
      return { success: true };
    }

    try {
      await runTransaction(db, async (transaction) => {
        const newSaleRef = doc(collection(db, "sales"));
        const items = cartItems.map((item) => ({
          productId: item.id,
          product: item.product,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          unit: item.unit,
        }));
        const amount = items.reduce((sum, item) => sum + item.total, 0);

        transaction.set(newSaleRef, {
          customer,
          notes,
          items,
          amount,
          createdAt: serverTimestamp(),
          date: new Date().toLocaleString(),
          branchId: currentBranchId || "main",
          branchName: currentBranch?.name || "Main Branch",
          createdBy: currentUser?.id || "system",
          createdByName: currentUser?.name || "System",
        });

        for (const cartItem of cartItems) {
          const inventoryRef = doc(db, "inventory", cartItem.id);
          const inventorySnapshot = await transaction.get(inventoryRef);
          if (!inventorySnapshot.exists()) {
            throw new Error(`Inventory item not found: ${cartItem.product}`);
          }
          const currentStock = inventorySnapshot.data().stock || 0;
          if (currentStock < cartItem.quantity) {
            throw new Error(`Insufficient stock for ${cartItem.product}`);
          }
          transaction.update(inventoryRef, {
            stock: currentStock - cartItem.quantity,
          });
        }
      });

      return { success: true };
    } catch (err) {
      setError(err.message || "Sale processing failed");
      return { success: false, message: err.message || "Sale processing failed" };
    }
  };

  return { salesHistory: branchSalesHistory, allSalesHistory: salesHistory, error, processSale };
}
