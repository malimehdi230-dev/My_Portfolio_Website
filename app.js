/* app.js
   Handles frontend display, animations, theme loading, and dynamic data binding from Firebase.
*/

// ─── Theme Application (runs immediately to prevent flash) ─────────────────
(function applyThemeEarly() {
    const saved = localStorage.getItem('portfolioTheme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

// ─── Main Entry ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const checkDB = setInterval(async () => {
        if (window.portfolioDB) {
            clearInterval(checkDB);
            try {
                const db = await window.portfolioDB.initDB();
                await loadPortfolioData(db);
            } catch (error) {
                console.error("Failed to load database:", error);
            }
        }
    }, 50);

    setupScrollAnimations();
    setupNavbar();
    setupContactForm();
    setupScrollProgress();
});

// ─── Load All Portfolio Data ─────────────────────────────────────────────────
async function loadPortfolioData(db) {
    // ---- Settings ----
    const settings = await portfolioDB.getAll(db, 'settings');
    const config = {};
    settings.forEach(s => config[s.key] = s.value);

    // Apply Theme
    const theme = config.activeTheme || 'midnight-teal';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portfolioTheme', theme);

    // Populate Text
    document.getElementById('nav-name').innerText = (config.name || 'Portfolio') + '.';
    document.getElementById('hero-name').innerText = "I'm " + (config.name || '');
    document.getElementById('hero-role').innerText = config.role || '';
    document.getElementById('about-role').innerText = config.role || '';

    // Separate bios
    document.getElementById('hero-bio').innerText = config.heroBio || config.bio || '';
    document.getElementById('about-bio').innerText = config.bio || '';

    // Interests (comma-separated → tags)
    const interestsEl = document.getElementById('about-interests');
    interestsEl.innerHTML = '';
    if (config.interests) {
        config.interests.split(',').map(s => s.trim()).filter(Boolean).forEach(tag => {
            const span = document.createElement('span');
            span.className = 'interest-tag';
            span.textContent = tag;
            interestsEl.appendChild(span);
        });
    } else {
        document.getElementById('about-interests-section').style.display = 'none';
    }

    // Career Goals
    const goalsEl = document.getElementById('about-career-goals');
    if (config.careerGoals) {
        goalsEl.innerText = config.careerGoals;
    } else {
        document.getElementById('about-goals-section').style.display = 'none';
    }

    document.getElementById('footer-name').innerText = config.name || '';
    window.portfolioEmail = config.email;
    window.web3formsKey = config.web3Key;

    // Social Links
    const socialLinksContainer = document.getElementById('social-links');
    socialLinksContainer.innerHTML = '';
    if (config.github) {
        socialLinksContainer.innerHTML += `<a href="${config.github}" target="_blank" rel="noopener" title="GitHub"><i class='bx bxl-github'></i></a>`;
    }
    if (config.linkedin) {
        socialLinksContainer.innerHTML += `<a href="${config.linkedin}" target="_blank" rel="noopener" title="LinkedIn"><i class='bx bxl-linkedin'></i></a>`;
    }

    // Profile Images
    const defaultImg = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop";
    const heroPic = document.getElementById('hero-pic');
    const aboutPic = document.getElementById('about-pic');
    const picSrc = (config.profilePic && config.profilePic.startsWith('data:image')) ? config.profilePic : defaultImg;
    heroPic.src = picSrc;
    aboutPic.src = picSrc;
    heroPic.style.display = 'block';
    aboutPic.style.display = 'block';

    // ---- Skills ----
    const skills = await portfolioDB.getAll(db, 'skills');
    const skillsContainer = document.getElementById('skills-container');
    skillsContainer.innerHTML = '';
    skills.forEach(skill => {
        skillsContainer.innerHTML += `
            <div class="skill-box animate-item hidden">
                <h3>${escHtml(skill.name)}</h3>
                <div class="skill-bar">
                    <div class="skill-progress" data-level="${skill.level}%" style="width:0;"></div>
                </div>
                <p class="skill-percent">${skill.level}%</p>
            </div>
        `;
    });

    // ---- Projects ----
    const projects = await portfolioDB.getAll(db, 'projects');
    const projectsContainer = document.getElementById('projects-container');
    projectsContainer.innerHTML = '';
    projects.forEach(proj => {
        const coverImg = (proj.imageUrl && proj.imageUrl.startsWith('data:image'))
            ? proj.imageUrl
            : "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400&auto=format&fit=crop";

        let tagsHtml = '';
        if (proj.tags && proj.tags.length > 0) {
            tagsHtml = proj.tags.map(t => `<span>${escHtml(t)}</span>`).join('');
        }

        let downloadBtnHtml = '';
        if (proj.fileUrl && proj.fileUrl.startsWith('data:')) {
            downloadBtnHtml = `<a href="${proj.fileUrl}" download="${proj.title.replace(/\s+/g, '_')}_file" title="Download File"><i class='bx bx-download'></i></a>`;
        }

        let demoBtnHtml = '';
        if (proj.demoLink) {
            demoBtnHtml = `<a href="${escHtml(proj.demoLink)}" target="_blank" rel="noopener noreferrer" title="View Live"><i class='bx bx-link-external'></i></a>`;
        }

        projectsContainer.innerHTML += `
            <div class="portfolio-box animate-item hidden">
                <img src="${coverImg}" alt="${escHtml(proj.title)}" loading="lazy">
                <div class="portfolio-layer">
                    <h4>${escHtml(proj.title)}</h4>
                    <p>${escHtml(proj.description)}</p>
                    <div class="tags">${tagsHtml}</div>
                    <div class="project-actions">
                        ${demoBtnHtml}
                        ${downloadBtnHtml}
                    </div>
                </div>
            </div>
        `;
    });

    // ---- Custom Sections ----
    await loadCustomSections(db);

    // Re-trigger scroll observer for dynamically added items
    setupScrollAnimations();
}

// ─── Custom Sections Rendering ───────────────────────────────────────────────
async function loadCustomSections(db) {
    const container = document.getElementById('custom-sections-container');
    container.innerHTML = '';

    const sections = await portfolioDB.getAll(db, 'customSections');
    if (!sections || sections.length === 0) return;

    // Build nav links for custom sections
    const mainNavbar = document.getElementById('main-navbar');
    const contactLink = mainNavbar.querySelector('a[href="#contact"]');

    // Remove existing injected nav links
    mainNavbar.querySelectorAll('.dynamic-nav-link').forEach(el => el.remove());

    sections.forEach((section, i) => {
        const sectionId = `custom-sec-${section.id}`;
        const bgClass = i % 2 === 0 ? 'var(--bg-color)' : 'var(--second-bg-color)';
        const items = section.items ? Object.entries(section.items).map(([k, v]) => ({ id: k, ...v })) : [];
        const style = section.style || 'timeline';

        // Build items HTML
        let itemsHtml = '';
        if (style === 'timeline') {
            itemsHtml = `<div class="timeline">` + items.map(item => `
                <div class="timeline-item hidden">
                    <div class="item-title">${escHtml(item.title || '')}</div>
                    ${item.subtitle ? `<div class="item-subtitle">${escHtml(item.subtitle)}</div>` : ''}
                    ${item.period ? `<div class="item-period"><i class='bx bx-calendar'></i>${escHtml(item.period)}</div>` : ''}
                    ${item.description ? `<div class="item-description">${escHtml(item.description)}</div>` : ''}
                </div>
            `).join('') + `</div>`;
        } else {
            itemsHtml = `<div class="cards-grid">` + items.map(item => `
                <div class="certificate-card hidden">
                    <div class="item-title">${escHtml(item.title || '')}</div>
                    ${item.subtitle ? `<div class="item-subtitle">${escHtml(item.subtitle)}</div>` : ''}
                    ${item.period ? `<div class="item-period">${escHtml(item.period)}</div>` : ''}
                    ${item.description ? `<div class="item-description">${escHtml(item.description)}</div>` : ''}
                </div>
            `).join('') + `</div>`;
        }

        // Section HTML
        const sectionEl = document.createElement('section');
        sectionEl.className = 'custom-section hidden';
        sectionEl.id = sectionId;
        sectionEl.style.background = bgClass;
        sectionEl.innerHTML = `
            <h2 class="heading">${escHtml(section.title || 'Section')} <span></span></h2>
            ${itemsHtml}
        `;
        container.appendChild(sectionEl);

        // Nav link
        const link = document.createElement('a');
        link.href = `#${sectionId}`;
        link.className = 'dynamic-nav-link';
        link.textContent = section.title || 'Section';
        mainNavbar.insertBefore(link, contactLink);
    });
}

// ─── Scroll Progress ─────────────────────────────────────────────────────────
function setupScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
    }, { passive: true });
}

// ─── Intersection Observer & Scroll Animations ───────────────────────────────
function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');

                // Skill bar fill
                if (entry.target.classList.contains('skill-box')) {
                    const bar = entry.target.querySelector('.skill-progress');
                    if (bar) bar.style.width = bar.getAttribute('data-level');
                }

                // Stagger children
                if (entry.target.classList.contains('stagger-children')) {
                    entry.target.classList.add('in-view');
                }
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.hidden').forEach(el => observer.observe(el));
    document.querySelectorAll('section').forEach(sec => {
        sec.classList.add('hidden');
        observer.observe(sec);
    });
    document.querySelectorAll('.stagger-children').forEach(el => observer.observe(el));
}

// ─── Navbar Highlight & Mobile Menu ──────────────────────────────────────────
function setupNavbar() {
    const menuIcon = document.querySelector('#menu-icon');
    const navbar = document.querySelector('.navbar');
    const header = document.getElementById('main-header');

    if (menuIcon) {
        menuIcon.onclick = () => {
            menuIcon.classList.toggle('bx-x');
            navbar.classList.toggle('active');
        };
    }

    window.addEventListener('scroll', () => {
        // Active section highlight
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('header nav a');
        const top = window.scrollY;

        sections.forEach(sec => {
            const offset = sec.offsetTop - 160;
            const height = sec.offsetHeight;
            const id = sec.getAttribute('id');
            if (top >= offset && top < offset + height) {
                navLinks.forEach(link => link.classList.remove('active'));
                const match = document.querySelector(`header nav a[href="#${id}"]`);
                if (match) match.classList.add('active');
            }
        });

        // Header shadow on scroll
        if (header) header.classList.toggle('scrolled', top > 60);

        // Close mobile menu on scroll
        if (menuIcon) menuIcon.classList.remove('bx-x');
        if (navbar) navbar.classList.remove('active');
    }, { passive: true });
}

// ─── Contact Form — Email Validation + Submission ────────────────────────────
function setupContactForm() {
    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('contact-submit-btn');
    const formMessage = document.getElementById('form-message');
    const emailInput = document.getElementById('contact-email');
    const emailError = document.getElementById('email-error');

    // Real-time email validation
    emailInput.addEventListener('input', () => validateEmail(emailInput, emailError));
    emailInput.addEventListener('blur', () => validateEmail(emailInput, emailError));

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Run validation before submit
        const emailOk = validateEmail(emailInput, emailError);
        if (!emailOk) {
            emailInput.focus();
            return;
        }

        const originalText = submitBtn.value;
        submitBtn.value = "Sending...";
        submitBtn.disabled = true;

        const formData = new FormData(contactForm);
        let finalKey = window.web3formsKey ? window.web3formsKey.trim() : "";
        if (!finalKey) finalKey = "320ee3e6-470b-41b1-8a74-5d8e3a8cd197";
        formData.append("access_key", finalKey);

        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData
            });
            const result = await response.json();

            if (response.ok) {
                formMessage.innerText = "✓ Your message has been sent successfully!";
                formMessage.style.color = "#00e676";
                contactForm.reset();
                emailInput.classList.remove('valid', 'invalid');
            } else {
                formMessage.innerText = "Error: " + result.message;
                formMessage.style.color = "#ff5252";
            }
        } catch (error) {
            formMessage.innerText = "Something went wrong. Please try again.";
            formMessage.style.color = "#ff5252";
            console.error(error);
        } finally {
            submitBtn.value = originalText;
            submitBtn.disabled = false;
            formMessage.style.display = "block";
            setTimeout(() => { formMessage.style.display = "none"; }, 6000);
        }
    });
}

// ─── Email Validation Helper ─────────────────────────────────────────────────
function validateEmail(input, errorEl) {
    const val = input.value.trim();
    // RFC 5322 simplified pattern — proper email format check
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

    if (!val) {
        input.classList.remove('valid', 'invalid');
        if (errorEl) errorEl.classList.remove('visible');
        return false;
    }

    if (!emailRegex.test(val)) {
        input.classList.add('invalid');
        input.classList.remove('valid');
        if (errorEl) {
            errorEl.textContent = 'Please enter a valid email address (e.g. name@domain.com)';
            errorEl.classList.add('visible');
        }
        return false;
    }

    // Check for common typos in popular domains
    const domain = val.split('@')[1].toLowerCase();
    const suspiciousDomains = {
        'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gnail.com': 'gmail.com',
        'hotmial.com': 'hotmail.com', 'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com'
    };
    if (suspiciousDomains[domain]) {
        input.classList.add('invalid');
        input.classList.remove('valid');
        if (errorEl) {
            errorEl.textContent = `Did you mean @${suspiciousDomains[domain]}?`;
            errorEl.classList.add('visible');
        }
        return false;
    }

    input.classList.add('valid');
    input.classList.remove('invalid');
    if (errorEl) errorEl.classList.remove('visible');
    return true;
}

// ─── Utility: Escape HTML ────────────────────────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
