/**
 * db.js
 * Handles Firebase Realtime Database operations to store portfolio data in the Cloud.
 * Switched from Firestore to avoid billing requirements on new Google Cloud accounts.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import {
    getDatabase,
    ref,
    get,
    set,
    push,
    remove,
    child
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

// TODO: Replace with your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDpEj7JgzXXsaDJwTBxxb9DAcvNmj47EHw",
    authDomain: "my-portfolio-website-226cd.firebaseapp.com",
    databaseURL: "https://my-portfolio-website-226cd-default-rtdb.firebaseio.com",
    projectId: "my-portfolio-website-226cd",
    storageBucket: "my-portfolio-website-226cd.firebasestorage.app",
    messagingSenderId: "114202684962",
    appId: "1:114202684962:web:5a23dc4ab1f92e86bbe47b",
    measurementId: "G-3WB328XC9J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Setup function to verify/seed default data if DB is empty
const initDB = async () => {
    try {
        await seedDefaultData();
        return db;
    } catch (e) {
        console.error("Firebase init failed: ", e);
        throw e;
    }
};

const seedDefaultData = async () => {
    // Check Settings
    const settingsSnap = await get(ref(db, 'settings'));
    if (!settingsSnap.exists()) {
        await upsert(db, 'settings', { key: 'name', value: 'Muhammad Ali Mehdi', id: 'name' });
        await upsert(db, 'settings', { key: 'role', value: 'Software Developer', id: 'role' });
        await upsert(db, 'settings', { key: 'bio', value: 'Passionate software developer dedicated to building elegant, responsive, and robust applications.', id: 'bio' });
        await upsert(db, 'settings', { key: 'email', value: 'contact@example.com', id: 'email' });
        await upsert(db, 'settings', { key: 'adminUser', value: 'Admin', id: 'adminUser' });
        await upsert(db, 'settings', { key: 'adminPass', value: '337778', id: 'adminPass' });
    }

    // Check Projects
    const projectsSnap = await get(ref(db, 'projects'));
    if (!projectsSnap.exists()) {
        await addData(db, 'projects', {
            title: 'Constraint Web Game',
            description: 'A turn-based strategy puzzle web game where each move adds a new restriction.',
            imageUrl: '',
            fileUrl: '',
            demoLink: '',
            tags: ['HTML', 'CSS', 'JavaScript']
        });
    }

    // Check Skills
    const skillsSnap = await get(ref(db, 'skills'));
    if (!skillsSnap.exists()) {
        await addData(db, 'skills', { name: 'JavaScript', level: 90 });
        await addData(db, 'skills', { name: 'HTML/CSS', level: 95 });
    }
};

// --- Realtime DB Wrapper Functions ---

const getAll = async (db, storeName) => {
    const snapshot = await get(ref(db, storeName));
    const items = [];
    if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            items.push({ id: childSnapshot.key, ...data });
        });
    }
    return items;
};

const getById = async (db, storeName, id) => {
    const snapshot = await get(child(ref(db, storeName), id.toString()));
    if (snapshot.exists()) {
        return { id: snapshot.key, ...snapshot.val() };
    }
    return null;
};

// Auto-generate ID (Push)
const addData = async (db, storeName, data) => {
    try {
        const listRef = ref(db, storeName);
        const newRef = push(listRef);
        await set(newRef, data);
        return { id: newRef.key, ...data };
    } catch (e) {
        console.error("Error adding document: ", e);
        throw e;
    }
};

// Set with specific ID (like 'email' or 'name')
const upsert = async (db, storeName, data) => {
    try {
        const docId = data.key || data.id;
        if (!docId) throw new Error("Upsert requires a unique key property");

        await set(ref(db, `${storeName}/${docId}`), data);
        return data;
    } catch (e) {
        console.error("Error upserting document: ", e);
        throw e;
    }
};

const deleteData = async (db, storeName, id) => {
    try {
        await remove(ref(db, `${storeName}/${id}`));
        return true;
    } catch (e) {
        console.error("Error deleting document: ", e);
        throw e;
    }
};

const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

// Export to Global window object
window.portfolioDB = {
    initDB,
    getAll,
    getById,
    addData,
    upsert,
    deleteData,
    fileToBase64,
    instance: db
};
