/* admin.js
   Handles Admin Login, Dashboard tabs, and all CRUD operations.
   Features: Edit projects, Split bio settings, Custom Sections CRUD, Theme Switcher.
*/

document.addEventListener('DOMContentLoaded', () => {
    const checkDB = setInterval(() => {
        if (window.portfolioDB) {
            clearInterval(checkDB);
            setupAdminLogin();
            setupAdminDashboard();
        }
    }, 50);
});

// ─── Admin Login ─────────────────────────────────────────────────────────────
async function setupAdminLogin() {
    const adminTrigger = document.getElementById('admin-trigger');
    const adminModal = document.getElementById('admin-modal');
    const closeLogin = document.getElementById('close-login');
    const loginBtn = document.getElementById('admin-login-btn');
    const errorMsg = document.getElementById('admin-error');
    const userInput = document.getElementById('admin-user');
    const passInput = document.getElementById('admin-pass');

    const db = await portfolioDB.initDB();

    // Seed credentials if missing
    let storedUser = await portfolioDB.getById(db, 'settings', 'adminUser');
    let storedPass = await portfolioDB.getById(db, 'settings', 'adminPass');
    if (!storedUser) await portfolioDB.upsert(db, 'settings', { key: 'adminUser', value: 'Admin', id: 'adminUser' });
    if (!storedPass) await portfolioDB.upsert(db, 'settings', { key: 'adminPass', value: '337778', id: 'adminPass' });

    adminTrigger.addEventListener('click', () => {
        adminModal.style.display = 'flex';
        setTimeout(() => userInput.focus(), 300);
    });

    closeLogin.addEventListener('click', () => closeAdminModal());
    adminModal.addEventListener('click', (e) => { if (e.target === adminModal) closeAdminModal(); });

    function closeAdminModal() {
        adminModal.style.display = 'none';
        errorMsg.style.display = 'none';
        userInput.value = '';
        passInput.value = '';
    }

    const attemptLogin = async () => {
        const userVal = userInput.value;
        const passVal = passInput.value;
        const currentUser = await portfolioDB.getById(db, 'settings', 'adminUser');
        const currentPass = await portfolioDB.getById(db, 'settings', 'adminPass');

        if (userVal === currentUser.value && passVal === currentPass.value) {
            adminModal.style.display = 'none';
            const dashboard = document.getElementById('admin-dashboard');
            dashboard.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            populateAdminDashboard();
        } else {
            errorMsg.style.display = 'block';
            errorMsg.style.animation = 'none';
            requestAnimationFrame(() => { errorMsg.style.animation = ''; });
        }
    };

    loginBtn.addEventListener('click', attemptLogin);
    passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); });
}

// ─── Dashboard Setup ─────────────────────────────────────────────────────────
function setupAdminDashboard() {
    // Tab switching
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

    // Logout
    document.getElementById('admin-logout').addEventListener('click', () => {
        document.getElementById('admin-dashboard').style.display = 'none';
        document.body.style.overflow = 'auto';
        window.location.reload();
    });

    // Settings
    document.getElementById('save-settings').addEventListener('click', saveSettings);

    // Skills
    document.getElementById('add-skill-btn').addEventListener('click', addSkill);

    // Projects
    document.getElementById('add-proj-btn').addEventListener('click', addProject);

    // Project Edit Modal
    document.getElementById('close-edit-project').addEventListener('click', () => closeEditModal('edit-project-modal'));
    document.getElementById('cancel-edit-project-btn').addEventListener('click', () => closeEditModal('edit-project-modal'));
    document.getElementById('edit-project-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-project-modal') closeEditModal('edit-project-modal');
    });
    document.getElementById('save-edit-project-btn').addEventListener('click', saveEditProject);

    // Sections
    document.getElementById('add-section-btn').addEventListener('click', addSection);

    // Section Item Edit Modal
    document.getElementById('close-edit-item').addEventListener('click', () => closeEditModal('edit-item-modal'));
    document.getElementById('cancel-edit-item-btn').addEventListener('click', () => closeEditModal('edit-item-modal'));
    document.getElementById('edit-item-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-item-modal') closeEditModal('edit-item-modal');
    });
    document.getElementById('save-edit-item-btn').addEventListener('click', saveEditItem);

    // Themes
    document.querySelectorAll('.theme-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => selectTheme(swatch.getAttribute('data-theme')));
    });
}

// ─── Populate Dashboard ───────────────────────────────────────────────────────
async function populateAdminDashboard() {
    const db = await portfolioDB.initDB();
    const settings = await portfolioDB.getAll(db, 'settings');
    const config = {};
    settings.forEach(s => config[s.key] = s.value);

    document.getElementById('edit-name').value = config.name || '';
    document.getElementById('edit-role').value = config.role || '';
    document.getElementById('edit-hero-bio').value = config.heroBio || '';
    document.getElementById('edit-bio').value = config.bio || '';
    document.getElementById('edit-interests').value = config.interests || '';
    document.getElementById('edit-career-goals').value = config.careerGoals || '';
    document.getElementById('edit-email').value = config.email || '';
    document.getElementById('edit-github').value = config.github || '';
    document.getElementById('edit-linkedin').value = config.linkedin || '';
    document.getElementById('edit-admin-user').value = config.adminUser || '';
    document.getElementById('edit-admin-pass').value = config.adminPass || '';

    const web3Input = document.getElementById('edit-web3key');
    if (web3Input) web3Input.value = config.web3Key || '';

    if (config.profilePic && config.profilePic.startsWith('data:image')) {
        const preview = document.getElementById('edit-pic-preview');
        preview.src = config.profilePic;
        preview.style.display = 'block';
    }

    // Active theme swatch
    const activeTheme = config.activeTheme || 'midnight-teal';
    document.querySelectorAll('.theme-swatch').forEach(s => {
        s.classList.toggle('active-theme', s.getAttribute('data-theme') === activeTheme);
    });

    refreshSkillsList(db);
    refreshProjectsList(db);
    refreshSectionsList(db);
}

// ─── Save Settings ────────────────────────────────────────────────────────────
async function saveSettings() {
    const db = await portfolioDB.initDB();
    const btn = document.getElementById('save-settings');
    const msg = document.getElementById('settings-success');

    btn.textContent = 'Saving...';
    btn.disabled = true;

    const fields = [
        { key: 'name', id: 'edit-name' },
        { key: 'role', id: 'edit-role' },
        { key: 'heroBio', id: 'edit-hero-bio' },
        { key: 'bio', id: 'edit-bio' },
        { key: 'interests', id: 'edit-interests' },
        { key: 'careerGoals', id: 'edit-career-goals' },
        { key: 'email', id: 'edit-email' },
        { key: 'github', id: 'edit-github' },
        { key: 'linkedin', id: 'edit-linkedin' },
        { key: 'adminUser', id: 'edit-admin-user' },
        { key: 'adminPass', id: 'edit-admin-pass' },
    ];

    for (const f of fields) {
        const el = document.getElementById(f.id);
        if (el) await portfolioDB.upsert(db, 'settings', { key: f.key, value: el.value, id: f.key });
    }

    const web3Input = document.getElementById('edit-web3key');
    if (web3Input) await portfolioDB.upsert(db, 'settings', { key: 'web3Key', value: web3Input.value, id: 'web3Key' });

    // Profile picture
    const picInput = document.getElementById('edit-pic');
    if (picInput.files && picInput.files[0]) {
        try {
            const base64 = await portfolioDB.fileToBase64(picInput.files[0]);
            await portfolioDB.upsert(db, 'settings', { key: 'profilePic', value: base64, id: 'profilePic' });
            const preview = document.getElementById('edit-pic-preview');
            preview.src = base64;
            preview.style.display = 'block';
        } catch (e) { console.error("Image error:", e); }
    }

    btn.textContent = 'Save All Settings';
    btn.disabled = false;
    showSuccess(msg, '✓ Settings saved successfully!');
}

// ─── Skills ───────────────────────────────────────────────────────────────────
async function addSkill() {
    const name = document.getElementById('new-skill-name').value.trim();
    const level = document.getElementById('new-skill-level').value;
    if (!name || !level) { alert("Please fill both skill fields"); return; }
    const lvl = parseInt(level);
    if (lvl < 0 || lvl > 100) { alert("Proficiency must be 0-100"); return; }

    const db = await portfolioDB.initDB();
    const btn = document.getElementById('add-skill-btn');
    btn.textContent = 'Adding...'; btn.disabled = true;
    await portfolioDB.addData(db, 'skills', { name, level: lvl });
    document.getElementById('new-skill-name').value = '';
    document.getElementById('new-skill-level').value = '';
    btn.textContent = 'Add Skill'; btn.disabled = false;
    refreshSkillsList(db);
}

async function refreshSkillsList(db) {
    const skills = await portfolioDB.getAll(db, 'skills');
    const ul = document.getElementById('admin-skills-list');
    ul.innerHTML = '';
    if (skills.length === 0) {
        ul.innerHTML = '<li style="color:var(--text-muted); font-size:1.5rem; padding:1rem 0;">No skills added yet.</li>';
        return;
    }
    skills.forEach(s => {
        const li = document.createElement('li');
        li.className = 'admin-list-item';
        li.innerHTML = `
            <div class="item-info">
                <strong>${escAdminHtml(s.name)}</strong>
                <small>Proficiency: ${s.level}%</small>
            </div>
            <div class="item-actions">
                <button class="btn-delete" onclick="adminDeleteRow('skills','${s.id}')">Delete</button>
            </div>
        `;
        ul.appendChild(li);
    });
}

// ─── Projects ─────────────────────────────────────────────────────────────────
async function addProject() {
    const title = document.getElementById('new-proj-title').value.trim();
    const desc = document.getElementById('new-proj-desc').value.trim();
    const tagsStr = document.getElementById('new-proj-tags').value;
    const demoLink = document.getElementById('new-proj-link').value.trim();
    if (!title || !desc) { alert("Title and Description are required"); return; }

    const db = await portfolioDB.initDB();
    const btn = document.getElementById('add-proj-btn');
    btn.textContent = 'Processing...'; btn.disabled = true;

    let imageUrl = '';
    const imgFile = document.getElementById('new-proj-img').files[0];
    if (imgFile) imageUrl = await portfolioDB.fileToBase64(imgFile);

    let fileUrl = '';
    const downloadableFile = document.getElementById('new-proj-file').files[0];
    if (downloadableFile) fileUrl = await portfolioDB.fileToBase64(downloadableFile);

    const tags = tagsStr.split(',').map(s => s.trim()).filter(Boolean);
    await portfolioDB.addData(db, 'projects', { title, description: desc, tags, demoLink, imageUrl, fileUrl });

    ['new-proj-title', 'new-proj-desc', 'new-proj-tags', 'new-proj-link'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('new-proj-img').value = '';
    document.getElementById('new-proj-file').value = '';

    btn.textContent = 'Add Project'; btn.disabled = false;
    refreshProjectsList(db);
}

async function refreshProjectsList(db) {
    const projects = await portfolioDB.getAll(db, 'projects');
    const ul = document.getElementById('admin-projects-list');
    ul.innerHTML = '';
    if (projects.length === 0) {
        ul.innerHTML = '<li style="color:var(--text-muted); font-size:1.5rem; padding:1rem 0;">No projects added yet.</li>';
        return;
    }
    projects.forEach(p => {
        const li = document.createElement('li');
        li.className = 'admin-list-item';
        li.innerHTML = `
            <div class="item-info">
                <strong>${escAdminHtml(p.title)}</strong>
                <small>${p.demoLink ? '🔗 ' + escAdminHtml(p.demoLink.substring(0, 40)) + '...' : 'No link'} | ${(p.tags || []).join(', ') || 'No tags'}</small>
            </div>
            <div class="item-actions">
                <button class="btn-edit" onclick="openEditProject('${p.id}')">Edit</button>
                <button class="btn-delete" onclick="adminDeleteRow('projects','${p.id}')">Delete</button>
            </div>
        `;
        ul.appendChild(li);
    });
}

// ─── Project Edit ─────────────────────────────────────────────────────────────
window.openEditProject = async (id) => {
    const db = await portfolioDB.initDB();
    const proj = await portfolioDB.getById(db, 'projects', id);
    if (!proj) return;

    document.getElementById('edit-proj-id').value = id;
    document.getElementById('edit-proj-title').value = proj.title || '';
    document.getElementById('edit-proj-desc').value = proj.description || '';
    document.getElementById('edit-proj-tags').value = (proj.tags || []).join(', ');
    document.getElementById('edit-proj-link').value = proj.demoLink || '';
    document.getElementById('edit-proj-img').value = '';
    document.getElementById('edit-proj-file').value = '';

    // Store original data for unchanged fields
    window._editingProject = proj;

    document.getElementById('edit-project-modal').classList.add('open');
    document.getElementById('edit-project-modal').style.display = 'flex';
};

async function saveEditProject() {
    const id = document.getElementById('edit-proj-id').value;
    if (!id) return;

    const btn = document.getElementById('save-edit-project-btn');
    btn.textContent = 'Saving...'; btn.disabled = true;

    const db = await portfolioDB.initDB();
    const existing = window._editingProject || {};

    let imageUrl = existing.imageUrl || '';
    const imgFile = document.getElementById('edit-proj-img').files[0];
    if (imgFile) imageUrl = await portfolioDB.fileToBase64(imgFile);

    let fileUrl = existing.fileUrl || '';
    const dlFile = document.getElementById('edit-proj-file').files[0];
    if (dlFile) fileUrl = await portfolioDB.fileToBase64(dlFile);

    const tagsStr = document.getElementById('edit-proj-tags').value;
    const tags = tagsStr.split(',').map(s => s.trim()).filter(Boolean);

    const updated = {
        title: document.getElementById('edit-proj-title').value.trim(),
        description: document.getElementById('edit-proj-desc').value.trim(),
        tags,
        demoLink: document.getElementById('edit-proj-link').value.trim(),
        imageUrl,
        fileUrl
    };

    // Use Firebase set on specific path (update not replace entire list)
    await portfolioDB.upsert(db, 'projects', { id, ...updated });

    btn.textContent = 'Save Changes'; btn.disabled = false;
    closeEditModal('edit-project-modal');
    refreshProjectsList(db);
}

// ─── Custom Sections ─────────────────────────────────────────────────────────
async function addSection() {
    const title = document.getElementById('new-section-title').value.trim();
    const style = document.getElementById('new-section-style').value;
    if (!title) { alert("Please enter a section title"); return; }

    const db = await portfolioDB.initDB();
    const btn = document.getElementById('add-section-btn');
    btn.textContent = 'Adding...'; btn.disabled = true;

    await portfolioDB.addData(db, 'customSections', { title, style, items: {} });

    document.getElementById('new-section-title').value = '';
    btn.textContent = 'Add Section'; btn.disabled = false;
    refreshSectionsList(db);
}

async function refreshSectionsList(db) {
    const sections = await portfolioDB.getAll(db, 'customSections');
    const container = document.getElementById('admin-sections-list');
    container.innerHTML = '';

    if (sections.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:1.5rem; margin-bottom:2rem;">No custom sections yet. Add one below!</p>';
        return;
    }

    sections.forEach(sec => {
        const items = sec.items ? Object.entries(sec.items).map(([k, v]) => ({ id: k, ...v })) : [];

        const secDiv = document.createElement('div');
        secDiv.style.cssText = 'border:1px solid var(--glass-border); border-radius:1rem; padding:1.5rem 2rem; margin-bottom:2rem; max-width:700px; background:var(--card-bg);';
        secDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <div>
                    <strong style="font-size:2rem; color:#fff;">${escAdminHtml(sec.title)}</strong>
                    <span style="font-size:1.3rem; color:var(--main-color); margin-left:1rem;">[${sec.style || 'timeline'}]</span>
                </div>
                <div style="display:flex; gap:0.8rem;">
                    <button class="btn-edit" onclick="editSectionTitle('${sec.id}', '${escAdminHtml(sec.title).replace(/'/g, "\\'")}')">Rename</button>
                    <button class="btn-delete" onclick="adminDeleteSection('${sec.id}')">Delete Section</button>
                </div>
            </div>
            <div id="section-items-${sec.id}">
                ${items.length === 0
                ? '<p style="color:var(--text-muted);font-size:1.4rem;margin-bottom:1rem;">No items yet.</p>'
                : items.map(item => `
                        <div class="admin-list-item" style="max-width:100%;">
                            <div class="item-info">
                                <strong>${escAdminHtml(item.title || 'Untitled')}</strong>
                                <small>${escAdminHtml(item.subtitle || '')} ${item.period ? `| ${escAdminHtml(item.period)}` : ''}</small>
                            </div>
                            <div class="item-actions">
                                <button class="btn-edit" onclick="openEditItem('${sec.id}','${item.id}')">Edit</button>
                                <button class="btn-delete" onclick="adminDeleteItem('${sec.id}','${item.id}')">Delete</button>
                            </div>
                        </div>
                    `).join('')}
            </div>
            <button class="btn" style="font-size:1.4rem; padding:0.8rem 1.8rem; margin-top:1rem;"
                    onclick="openAddItem('${sec.id}')">+ Add Item</button>
        `;
        container.appendChild(secDiv);
    });
}

window.editSectionTitle = async (id, currentTitle) => {
    const newTitle = prompt("New section title:", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    const db = await portfolioDB.initDB();
    const sec = await portfolioDB.getById(db, 'customSections', id);
    if (!sec) return;
    sec.title = newTitle;
    await portfolioDB.upsert(db, 'customSections', { id, ...sec });
    refreshSectionsList(db);
};

window.adminDeleteSection = async (id) => {
    if (!confirm("Delete this entire section and all its items?")) return;
    const db = await portfolioDB.initDB();
    await portfolioDB.deleteData(db, 'customSections', id);
    refreshSectionsList(db);
};

// ─── Section Items ────────────────────────────────────────────────────────────
window.openAddItem = (sectionId) => {
    document.getElementById('edit-item-section-id').value = sectionId;
    document.getElementById('edit-item-id').value = '';
    document.getElementById('edit-item-title').value = '';
    document.getElementById('edit-item-subtitle').value = '';
    document.getElementById('edit-item-period').value = '';
    document.getElementById('edit-item-desc').value = '';
    document.querySelector('#edit-item-modal h3').textContent = 'Add Item';
    document.getElementById('edit-item-modal').style.display = 'flex';
};

window.openEditItem = async (sectionId, itemId) => {
    const db = await portfolioDB.initDB();
    const sec = await portfolioDB.getById(db, 'customSections', sectionId);
    if (!sec || !sec.items || !sec.items[itemId]) return;
    const item = sec.items[itemId];

    document.getElementById('edit-item-section-id').value = sectionId;
    document.getElementById('edit-item-id').value = itemId;
    document.getElementById('edit-item-title').value = item.title || '';
    document.getElementById('edit-item-subtitle').value = item.subtitle || '';
    document.getElementById('edit-item-period').value = item.period || '';
    document.getElementById('edit-item-desc').value = item.description || '';
    document.querySelector('#edit-item-modal h3').textContent = 'Edit Item';
    document.getElementById('edit-item-modal').style.display = 'flex';
};

async function saveEditItem() {
    const sectionId = document.getElementById('edit-item-section-id').value;
    const itemId = document.getElementById('edit-item-id').value;
    const db = await portfolioDB.initDB();

    const btn = document.getElementById('save-edit-item-btn');
    btn.textContent = 'Saving...'; btn.disabled = true;

    const sec = await portfolioDB.getById(db, 'customSections', sectionId);
    if (!sec) { btn.textContent = 'Save Changes'; btn.disabled = false; return; }

    const itemData = {
        title: document.getElementById('edit-item-title').value.trim(),
        subtitle: document.getElementById('edit-item-subtitle').value.trim(),
        period: document.getElementById('edit-item-period').value.trim(),
        description: document.getElementById('edit-item-desc').value.trim()
    };

    if (!sec.items) sec.items = {};

    if (itemId) {
        // Edit existing
        sec.items[itemId] = itemData;
    } else {
        // Add new (generate a key)
        const newKey = 'item_' + Date.now();
        sec.items[newKey] = itemData;
    }

    await portfolioDB.upsert(db, 'customSections', { id: sectionId, title: sec.title, style: sec.style, items: sec.items });

    btn.textContent = 'Save Changes'; btn.disabled = false;
    closeEditModal('edit-item-modal');
    refreshSectionsList(db);
}

window.adminDeleteItem = async (sectionId, itemId) => {
    if (!confirm("Delete this item?")) return;
    const db = await portfolioDB.initDB();
    const sec = await portfolioDB.getById(db, 'customSections', sectionId);
    if (!sec || !sec.items) return;
    delete sec.items[itemId];
    await portfolioDB.upsert(db, 'customSections', { id: sectionId, title: sec.title, style: sec.style, items: sec.items });
    refreshSectionsList(db);
};

// ─── Theme Switcher ───────────────────────────────────────────────────────────
async function selectTheme(themeKey) {
    // Apply visually immediately
    document.documentElement.setAttribute('data-theme', themeKey);
    localStorage.setItem('portfolioTheme', themeKey);

    // Update swatch active state
    document.querySelectorAll('.theme-swatch').forEach(s => {
        s.classList.toggle('active-theme', s.getAttribute('data-theme') === themeKey);
    });

    // Persist to DB
    const db = await portfolioDB.initDB();
    await portfolioDB.upsert(db, 'settings', { key: 'activeTheme', value: themeKey, id: 'activeTheme' });

    const msg = document.getElementById('theme-success');
    showSuccess(msg, `✓ Theme "${themeKey.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}" applied!`);
}

// ─── Generic Delete Row ───────────────────────────────────────────────────────
window.adminDeleteRow = async (storeName, id) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    const db = await portfolioDB.initDB();
    await portfolioDB.deleteData(db, storeName, id);
    if (storeName === 'skills') refreshSkillsList(db);
    if (storeName === 'projects') refreshProjectsList(db);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function closeEditModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    modal.classList.remove('open');
}

function showSuccess(el, msg) {
    el.textContent = msg;
    el.style.color = 'var(--main-color)';
    setTimeout(() => { el.textContent = ''; }, 4000);
}

function escAdminHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
