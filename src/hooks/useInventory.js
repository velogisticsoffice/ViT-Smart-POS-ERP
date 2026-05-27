import { useEffect, useState } from "react";
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { demoInventory } from "../data/demoData";
import { useBusinessContext } from "../context/BusinessContext";

export function useInventory() {
  const { currentBranchId, currentUser } = useBusinessContext();
  const [items, setItems] = useState(() =>
    isFirebaseConfigured
      ? []
      : demoInventory.map((item) => ({ ...item, branchId: item.branchId || "main" }))
  );
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined;
    }

    const q = query(
      collection(db, "inventory"),
      where("branchId", "==", currentBranchId || "main"),
      orderBy("product", "asc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setIsLoading(false);
      },
      (err) => {
        setError(err.message || "Unable to load inventory");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentBranchId]);

  const branchItems = items.filter((item) => (item.branchId || "main") === (currentBranchId || "main"));

  const addItem = async (item) => {
    const payload = {
      ...item,
      branchId: currentBranchId || "main",
      createdBy: currentUser?.id || "system",
      createdByName: currentUser?.name || "System",
    };

    if (!isFirebaseConfigured) {
      const nextItem = { ...payload, id: crypto.randomUUID?.() || String(Date.now()) };
      setItems((current) => [...current, nextItem].sort((a, b) => a.product.localeCompare(b.product)));
      return true;
    }

    try {
      await addDoc(collection(db, "inventory"), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      setError(err.message || "Failed to add inventory item");
      return false;
    }
  };

  const deleteItem = async (id) => {
    if (!isFirebaseConfigured) {
      setItems((current) => current.filter((item) => item.id !== id));
      return true;
    }

    try {
      await deleteDoc(doc(db, "inventory", id));
      return true;
    } catch (err) {
      setError(err.message || "Failed to delete inventory item");
      return false;
    }
  };

  const updateItem = async (id, updates) => {
    const payload = {
      ...updates,
      updatedBy: currentUser?.id || "system",
      updatedByName: currentUser?.name || "System",
    };

    if (!isFirebaseConfigured) {
      setItems((current) =>
        current
          .map((item) => (item.id === id ? { ...item, ...payload } : item))
          .sort((a, b) => a.product.localeCompare(b.product))
      );
      return true;
    }

    try {
      const { updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "inventory", id), payload);
      return true;
    } catch (err) {
      setError(err.message || "Failed to update inventory item");
      return false;
    }
  };

  return { items: branchItems, allItems: items, isLoading, error, addItem, deleteItem, updateItem };
}
