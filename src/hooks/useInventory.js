import { useEffect, useState } from "react";
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { demoInventory } from "../data/demoData";

export function useInventory() {
  const [items, setItems] = useState(() => (isFirebaseConfigured ? [] : demoInventory));
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined;
    }

    const q = query(collection(db, "inventory"), orderBy("product", "asc"));
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
  }, []);

  const addItem = async (item) => {
    if (!isFirebaseConfigured) {
      const nextItem = { ...item, id: crypto.randomUUID?.() || String(Date.now()) };
      setItems((current) => [...current, nextItem].sort((a, b) => a.product.localeCompare(b.product)));
      return true;
    }

    try {
      await addDoc(collection(db, "inventory"), {
        ...item,
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

  return { items, isLoading, error, addItem, deleteItem };
}
