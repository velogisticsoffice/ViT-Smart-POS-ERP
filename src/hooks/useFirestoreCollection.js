import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query as firestoreQuery, orderBy } from "firebase/firestore";

export function useFirestoreCollection(collectionName, options = {}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const collRef = collection(db, collectionName);
    let q = collRef;

    if (options.filters) {
      const filters = Array.isArray(options.filters) ? options.filters : [options.filters];
      q = firestoreQuery(q, ...filters);
    }
    if (options.orderBy) {
      q = firestoreQuery(q, orderBy(options.orderBy, options.order || "asc"));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setIsLoading(false);
      },
      (err) => {
        setError(err.message || "Failed to load collection");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, options.orderBy, options.order]);

  return { items, isLoading, error };
}
