/**
 * db.js
 * Handles Firebase Realtime Database operations to store portfolio data in the Cloud.
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
    const settingsSnap = await get(ref(db, 'settings'));
    if (!settingsSnap.exists()) {
        await upsert(db, 'settings', { key: 'name', value: 'Muhammad Ali Mehdi', id: 'name' });
        await upsert(db, 'settings', { key: 'role', value: 'Software Developer', id: 'role' });
        await upsert(db, 'settings', { key: 'heroBio', value: 'Crafting elegant digital experiences — one line of code at a time.', id: 'heroBio' });
        await upsert(db, 'settings', { key: 'bio', value: 'I am a passionate software developer dedicated to building elegant, responsive, and robust applications. With a strong foundation in modern web technologies, I strive to create seamless user experiences that leave a lasting impact.', id: 'bio' });
        await upsert(db, 'settings', { key: 'interests', value: 'Web Development, Open Source, UI/UX Design, Problem Solving', id: 'interests' });
        await upsert(db, 'settings', { key: 'careerGoals', value: 'To become a full-stack architect who builds products that impact millions of users, while continuously learning and contributing to the developer community.', id: 'careerGoals' });
        await upsert(db, 'settings', { key: 'email', value: 'contact@example.com', id: 'email' });
        await upsert(db, 'settings', { key: 'adminUser', value: 'Admin', id: 'adminUser' });
        await upsert(db, 'settings', { key: 'adminPass', value: '337778', id: 'adminPass' });
        await upsert(db, 'settings', { key: 'activeTheme', value: 'midnight-teal', id: 'activeTheme' });
    }

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
