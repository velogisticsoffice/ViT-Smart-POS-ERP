import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addDoc, collection, onSnapshot, serverTimestamp } from "firebase/firestore";
import { demoBranches, demoUsers } from "../data/demoData";
import { db, isFirebaseConfigured } from "../firebase";

const BusinessContext = createContext(null);

const storage = {
  get(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Local storage may be unavailable in private or embedded contexts.
    }
  },
};

export function BusinessProvider({ children }) {
  const [branches, setBranches] = useState(demoBranches);
  const [users, setUsers] = useState(demoUsers);
  const [currentBranchId, setCurrentBranchIdState] = useState(() =>
    storage.get("vit.currentBranchId", demoBranches[0]?.id || "")
  );
  const [currentUserId, setCurrentUserIdState] = useState(() =>
    storage.get("vit.currentUserId", demoUsers[0]?.id || "")
  );

  const currentBranch = useMemo(
    () => branches.find((branch) => branch.id === currentBranchId) || branches[0],
    [branches, currentBranchId]
  );
  const currentUser = useMemo(
    () => users.find((user) => user.id === currentUserId) || users[0],
    [users, currentUserId]
  );

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined;
    }

    const unsubscribeBranches = onSnapshot(collection(db, "branches"), (snapshot) => {
      const nextBranches = snapshot.docs.map((branchDoc) => ({ id: branchDoc.id, ...branchDoc.data() }));
      setBranches(nextBranches.length ? nextBranches : demoBranches);
    });

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const nextUsers = snapshot.docs.map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }));
      setUsers(nextUsers.length ? nextUsers : demoUsers);
    });

    return () => {
      unsubscribeBranches();
      unsubscribeUsers();
    };
  }, []);

  const setCurrentBranchId = (branchId) => {
    setCurrentBranchIdState(branchId);
    storage.set("vit.currentBranchId", branchId);
  };

  const setCurrentUserId = (userId) => {
    setCurrentUserIdState(userId);
    storage.set("vit.currentUserId", userId);
  };

  const addBranch = async (branch) => {
    if (isFirebaseConfigured) {
      await addDoc(collection(db, "branches"), {
        ...branch,
        status: "Active",
        createdAt: serverTimestamp(),
      });
      return;
    }

    setBranches((current) => [{ ...branch, id: `branch-${Date.now()}`, status: "Active" }, ...current]);
  };

  const addUser = async (user) => {
    if (isFirebaseConfigured) {
      await addDoc(collection(db, "users"), {
        ...user,
        status: "Active",
        createdAt: serverTimestamp(),
      });
      return;
    }

    setUsers((current) => [{ ...user, id: `user-${Date.now()}`, status: "Active" }, ...current]);
  };

  const value = {
    branches,
    users,
    currentBranch,
    currentUser,
    currentBranchId: currentBranch?.id,
    currentUserId: currentUser?.id,
    setCurrentBranchId,
    setCurrentUserId,
    addBranch,
    addUser,
  };

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error("useBusinessContext must be used inside BusinessProvider");
  }
  return context;
}
