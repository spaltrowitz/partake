import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyAJ83Ls8QO4fDRVE8tJOsyS6KFiJIN-Gdg",
  authDomain: "partake-bill-split.firebaseapp.com",
  projectId: "partake-bill-split",
});

const db = getFirestore(app);

async function main() {
  const q = query(collection(db, "bills"), where("shareCode", "==", "6v3djs"));
  const snap = await getDocs(q);
  if (!snap.empty) {
    console.log("FOUND:", JSON.stringify(snap.docs[0].data(), null, 2));
  } else {
    console.log("NOT FOUND");
  }
  process.exit(0);
}

main();
