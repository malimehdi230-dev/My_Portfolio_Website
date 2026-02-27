/* admin.js 
   Handles the logic for the Admin Login and Dashboard editing features.
*/

document.addEventListener('DOMContentLoaded', () => {
    // Wait for the db.js module to attach to window
    const checkDB = setInterval(() => {
        if (window.portfolioDB) {
            clearInterval(checkDB);
            setupAdminLogin();
            setupAdminDashboard();
        }
    }, 50);
});

async function setupAdminLogin() {
    const adminTrigger = document.getElementById('admin-trigger');
    const adminModal = document.getElementById('admin-modal');
    const closeLogin = document.getElementById('close-login');
    const loginBtn = document.getElementById('admin-login-btn');
    const errorMsg = document.getElementById('admin-error');

    // Make sure we have credentials in DB for future changing
    const db = await portfolioDB.initDB();
    let storedUser = await portfolioDB.getById(db, 'settings', 'adminUser');
    let storedPass = await portfolioDB.getById(db, 'settings', 'adminPass');

    if (!storedUser) {
        await portfolioDB.upsert(db, 'settings', { key: 'adminUser', value: 'Admin' });
        storedUser = { value: 'Admin' };
    }
    if (!storedPass) {
        await portfolioDB.upsert(db, 'settings', { key: 'adminPass', value: '337778' });
        storedPass = { value: '337778' };
    }

    adminTrigger.addEventListener('click', () => {
        adminModal.style.display = 'flex';
    });

    closeLogin.addEventListener('click', () => {
        adminModal.style.display = 'none';
        errorMsg.style.display = 'none';
    });

    loginBtn.addEventListener('click', async () => {
        const userVal = document.getElementById('admin-user').value;
        const passVal = document.getElementById('admin-pass').value;

        // Fetch fresh just in case it changed in the session
        const currentUser = await portfolioDB.getById(db, 'settings', 'adminUser');
        const currentPass = await portfolioDB.getById(db, 'settings', 'adminPass');

        if (userVal === currentUser.value && passVal === currentPass.value) {
            // Success
            adminModal.style.display = 'none';
            document.getElementById('admin-dashboard').style.display = 'block';
            document.body.style.overflow = 'hidden'; // prevent scrolling behind dashboard
            populateAdminDashboard();
        } else {
            errorMsg.style.display = 'block';
        }
    });
}

function setupAdminDashboard() {
    // Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.admin-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.getAttribute('data-target')).classList.add('active');
        });
    });

    // Close Dashboard
    document.getElementById('admin-logout').addEventListener('click', () => {
        document.getElementById('admin-dashboard').style.display = 'none';
        document.body.style.overflow = 'auto';
        // Reload page to reflect changes!
        window.location.reload();
    });

    // Save Settings Event
    document.getElementById('save-settings').addEventListener('click', saveSettings);

    // Add Skill Event
    document.getElementById('add-skill-btn').addEventListener('click', addSkill);

    // Add Project Event
    document.getElementById('add-proj-btn').addEventListener('click', addProject);
}

async function populateAdminDashboard() {
    const db = await portfolioDB.initDB();

    // settings
    const name = await portfolioDB.getById(db, 'settings', 'name');
    const role = await portfolioDB.getById(db, 'settings', 'role');
    const bio = await portfolioDB.getById(db, 'settings', 'bio');
    const email = await portfolioDB.getById(db, 'settings', 'email');
    const github = await portfolioDB.getById(db, 'settings', 'github');
    const linkedin = await portfolioDB.getById(db, 'settings', 'linkedin');
    const profilePic = await portfolioDB.getById(db, 'settings', 'profilePic');
    const web3Key = await portfolioDB.getById(db, 'settings', 'web3Key');

    document.getElementById('edit-name').value = name ? name.value : '';
    document.getElementById('edit-role').value = role ? role.value : '';
    document.getElementById('edit-bio').value = bio ? bio.value : '';
    document.getElementById('edit-email').value = email ? email.value : '';
    document.getElementById('edit-github').value = github ? github.value : '';
    document.getElementById('edit-linkedin').value = linkedin ? linkedin.value : '';

    const web3Input = document.getElementById('edit-web3key');
    if (web3Input) {
        web3Input.value = web3Key ? web3Key.value : '';
    }

    if (profilePic && profilePic.value && profilePic.value.length > 50) {
        const preview = document.getElementById('edit-pic-preview');
        preview.src = profilePic.value;
        preview.style.display = 'block';
    }

    // Load skills list
    refreshSkillsList(db);

    // Load projects list
    refreshProjectsList(db);
}

async function saveSettings() {
    const db = await portfolioDB.initDB();
    const btn = document.getElementById('save-settings');
    const msg = document.getElementById('settings-success');

    btn.textContent = 'Saving...';

    await portfolioDB.upsert(db, 'settings', { key: 'name', value: document.getElementById('edit-name').value });
    await portfolioDB.upsert(db, 'settings', { key: 'role', value: document.getElementById('edit-role').value });
    await portfolioDB.upsert(db, 'settings', { key: 'bio', value: document.getElementById('edit-bio').value });
    await portfolioDB.upsert(db, 'settings', { key: 'email', value: document.getElementById('edit-email').value });
    await portfolioDB.upsert(db, 'settings', { key: 'github', value: document.getElementById('edit-github').value });
    await portfolioDB.upsert(db, 'settings', { key: 'linkedin', value: document.getElementById('edit-linkedin').value });

    const web3Input = document.getElementById('edit-web3key');
    if (web3Input) {
        await portfolioDB.upsert(db, 'settings', { key: 'web3Key', value: web3Input.value });
    }

    // Handle Image file
    const picInput = document.getElementById('edit-pic');
    if (picInput.files && picInput.files[0]) {
        try {
            const base64 = await portfolioDB.fileToBase64(picInput.files[0]);
            await portfolioDB.upsert(db, 'settings', { key: 'profilePic', value: base64 });
            document.getElementById('edit-pic-preview').src = base64;
            document.getElementById('edit-pic-preview').style.display = 'block';
        } catch (e) {
            console.error("Error processing image file:", e);
        }
    }

    btn.textContent = 'Save Settings';
    msg.textContent = 'Settings saved locally!';
    msg.style.color = '#00ffcc';
    setTimeout(() => { msg.textContent = ''; }, 3000);
}

async function addSkill() {
    const name = document.getElementById('new-skill-name').value;
    const level = document.getElementById('new-skill-level').value;
    if (!name || !level) { alert("Please fill both skill fields"); return; }

    const db = await portfolioDB.initDB();
    await portfolioDB.addData(db, 'skills', { name, level: parseInt(level) });

    // Clear & Refresh
    document.getElementById('new-skill-name').value = '';
    document.getElementById('new-skill-level').value = '';
    refreshSkillsList(db);
}

async function addProject() {
    const title = document.getElementById('new-proj-title').value;
    const desc = document.getElementById('new-proj-desc').value;
    const tagsStr = document.getElementById('new-proj-tags').value;
    const demoLink = document.getElementById('new-proj-link').value;
    if (!title || !desc) { alert("Title and Description are required"); return; }

    const db = await portfolioDB.initDB();
    const btn = document.getElementById('add-proj-btn');
    btn.textContent = 'Processing...';

    let imageUrl = '';
    const imgFile = document.getElementById('new-proj-img').files[0];
    if (imgFile) imageUrl = await portfolioDB.fileToBase64(imgFile);

    let fileUrl = '';
    const downloadableFile = document.getElementById('new-proj-file').files[0];
    if (downloadableFile) fileUrl = await portfolioDB.fileToBase64(downloadableFile);

    const tags = tagsStr.split(',').map(s => s.trim()).filter(Boolean);

    await portfolioDB.addData(db, 'projects', {
        title,
        description: desc,
        tags,
        demoLink,
        imageUrl,
        fileUrl
    });

    // Clear
    document.getElementById('new-proj-title').value = '';
    document.getElementById('new-proj-desc').value = '';
    document.getElementById('new-proj-tags').value = '';
    document.getElementById('new-proj-link').value = '';
    document.getElementById('new-proj-img').value = '';
    document.getElementById('new-proj-file').value = '';

    btn.textContent = 'Add Project';
    refreshProjectsList(db);
}

async function refreshSkillsList(db) {
    const skills = await portfolioDB.getAll(db, 'skills');
    const ul = document.getElementById('admin-skills-list');
    ul.innerHTML = '';
    skills.forEach(s => {
        const li = document.createElement('li');
        li.className = 'admin-list-item';
        li.innerHTML = `<span>${s.name} (${s.level}%)</span> <button onclick="deleteRow('skills', '${s.id}')">Delete</button>`;
        ul.appendChild(li);
    });
}

async function refreshProjectsList(db) {
    const proj = await portfolioDB.getAll(db, 'projects');
    const ul = document.getElementById('admin-projects-list');
    ul.innerHTML = '';
    proj.forEach(p => {
        const li = document.createElement('li');
        li.className = 'admin-list-item';
        li.innerHTML = `<span>${p.title}</span> <button onclick="deleteRow('projects', '${p.id}')">Delete</button>`;
        ul.appendChild(li);
    });
}

window.deleteRow = async (storeName, id) => {
    if (confirm("Are you sure?")) {
        const db = await portfolioDB.initDB();
        await portfolioDB.deleteData(db, storeName, id);
        if (storeName === 'skills') refreshSkillsList(db);
        if (storeName === 'projects') refreshProjectsList(db);
    }
};
