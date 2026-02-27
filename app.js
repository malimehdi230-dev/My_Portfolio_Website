/* app.js 
   Handles the frontend display, scroll animations, and dynamic data binding from IndexedDB.
*/

// Polling loader because db.js is a module now and loads asynchronously
document.addEventListener('DOMContentLoaded', () => {
    const checkDB = setInterval(async () => {
        if (window.portfolioDB) {
            clearInterval(checkDB);
            // 1. Initialize Cloud Database
            try {
                const db = await window.portfolioDB.initDB();
                await loadPortfolioData(db);
            } catch (error) {
                console.error("Failed to load local database:", error);
            }
        }
    }, 50);

    // 2. Setup Scroll Animations
    setupScrollAnimations();

    // 3. Setup Navbar & Mobile Menu
    setupNavbar();

    // 4. Contact Form Handler
    setupContactForm();
});

// Load Data from IndexedDB into DOM
async function loadPortfolioData(db) {
    // ---- Load Settings ----
    const settings = await portfolioDB.getAll(db, 'settings');
    const config = {};
    settings.forEach(s => config[s.key] = s.value);

    // Populate Text
    document.getElementById('nav-name').innerText = config.name + '.';
    document.getElementById('hero-name').innerText = "I'm " + config.name;
    document.getElementById('hero-role').innerText = config.role;
    document.getElementById('about-role').innerText = config.role;
    document.getElementById('hero-bio').innerText = config.bio;
    document.getElementById('about-bio').innerText = config.bio;
    document.getElementById('footer-name').innerText = config.name;

    // Config Contact Email Target for the mailto action later
    window.portfolioEmail = config.email;
    window.web3formsKey = config.web3Key; // Loaded from DB

    // Social Links
    const socialLinksContainer = document.getElementById('social-links');
    socialLinksContainer.innerHTML = '';
    if (config.github) {
        socialLinksContainer.innerHTML += `<a href="${config.github}" target="_blank"><i class='bx bxl-github'></i></a>`;
    }
    if (config.linkedin) {
        socialLinksContainer.innerHTML += `<a href="${config.linkedin}" target="_blank"><i class='bx bxl-linkedin'></i></a>`;
    }

    // Profile Images
    const defaultImg = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop";
    const heroPic = document.getElementById('hero-pic');
    const aboutPic = document.getElementById('about-pic');

    if (config.profilePic && config.profilePic.startsWith('data:image')) {
        heroPic.src = config.profilePic;
        aboutPic.src = config.profilePic;
    } else {
        heroPic.src = defaultImg;
        aboutPic.src = defaultImg;
    }
    heroPic.style.display = 'block';
    aboutPic.style.display = 'block';

    // ---- Load Skills ----
    const skills = await portfolioDB.getAll(db, 'skills');
    const skillsContainer = document.getElementById('skills-container');
    skillsContainer.innerHTML = '';
    skills.forEach(skill => {
        skillsContainer.innerHTML += `
            <div class="skill-box animate-item hidden">
                <h3>${skill.name}</h3>
                <div class="skill-bar">
                    <div class="skill-progress" data-level="${skill.level}%" style="width: 0;"></div>
                </div>
                <p style="text-align: right; margin-top: 5px; font-weight: bold; color: var(--main-color);">${skill.level}%</p>
            </div>
        `;
    });

    // ---- Load Projects ----
    const projects = await portfolioDB.getAll(db, 'projects');
    const projectsContainer = document.getElementById('projects-container');
    projectsContainer.innerHTML = '';

    projects.forEach(proj => {
        const coverImg = proj.imageUrl && proj.imageUrl.startsWith('data:image')
            ? proj.imageUrl
            : "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400&auto=format&fit=crop";

        let tagsHtml = '';
        if (proj.tags && proj.tags.length > 0) {
            tagsHtml = proj.tags.map(t => `<span>${t}</span>`).join('');
        }

        let downloadBtnHtml = '';
        if (proj.fileUrl && proj.fileUrl.startsWith('data:')) {
            downloadBtnHtml = `<a href="${proj.fileUrl}" download="${proj.title.replace(/\s+/g, '_')}_file" title="Download Project File"><i class='bx bx-download'></i></a>`;
        } else {
            downloadBtnHtml = `<a href="#" onclick="alert('No project file uploaded.')" title="No file attached"><i class='bx bx-file-blank'></i></a>`;
        }

        let demoBtnHtml = '';
        if (proj.demoLink) {
            demoBtnHtml = `<a href="${proj.demoLink}" target="_blank" title="Live Demo / Web Link"><i class='bx bx-globe'></i></a>`;
        }

        projectsContainer.innerHTML += `
            <div class="portfolio-box animate-item hidden">
                <img src="${coverImg}" alt="${proj.title}">
                <div class="portfolio-layer">
                    <h4>${proj.title}</h4>
                    <p>${proj.description}</p>
                    <div class="tags">${tagsHtml}</div>
                    <div class="project-actions">
                        ${demoBtnHtml}
                        ${downloadBtnHtml}
                    </div>
                </div>
            </div>
        `;
    });

    // Re-trigger observer for dynamic items
    setupScrollAnimations();
}

// Setup Intersection Observer for scroll animations
function setupScrollAnimations() {
    const hiddenElements = document.querySelectorAll('.hidden');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');

                // Animate skill bars if it's a skill box
                if (entry.target.classList.contains('skill-box')) {
                    const progressBar = entry.target.querySelector('.skill-progress');
                    if (progressBar) {
                        progressBar.style.width = progressBar.getAttribute('data-level');
                    }
                }
            }
        });
    }, { threshold: 0.1 });

    hiddenElements.forEach((el) => observer.observe(el));

    // Initially hide big sections for entrance effects
    document.querySelectorAll('section').forEach(sec => {
        sec.classList.add('hidden');
        observer.observe(sec);
    });
}

// Navbar Highlights and Mobile Menu
function setupNavbar() {
    const menuIcon = document.querySelector('#menu-icon');
    const navbar = document.querySelector('.navbar');

    menuIcon.onclick = () => {
        menuIcon.classList.toggle('bx-x');
        navbar.classList.toggle('active');
    };

    let sections = document.querySelectorAll('section');
    let navLinks = document.querySelectorAll('header nav a');

    window.onscroll = () => {
        sections.forEach(sec => {
            let top = window.scrollY;
            let offset = sec.offsetTop - 150;
            let height = sec.offsetHeight;
            let id = sec.getAttribute('id');

            if (top >= offset && top < offset + height) {
                navLinks.forEach(links => {
                    links.classList.remove('active');
                    document.querySelector('header nav a[href*=' + id + ']').classList.add('active');
                });
            }
        });

        // Hide mobile menu on scroll
        menuIcon.classList.remove('bx-x');
        navbar.classList.remove('active');
    };
}

// Contact Form - Web3Forms Integration
function setupContactForm() {
    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('contact-submit-btn');
    const formMessage = document.getElementById('form-message');

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const originalText = submitBtn.value;
        submitBtn.value = "Sending...";
        submitBtn.disabled = true;

        const formData = new FormData(contactForm);

        // Use custom DB key if exists, else fallback to user's provided test key
        let finalKey = window.web3formsKey ? window.web3formsKey.trim() : "";
        if (!finalKey) {
            finalKey = "320ee3e6-470b-41b1-8a74-5d8e3a8cd197";
        }

        formData.append("access_key", finalKey);

        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                formMessage.innerText = "Success! Your message has been sent.";
                formMessage.style.color = "#00ffcc";
                contactForm.reset();
            } else {
                formMessage.innerText = "Error: " + result.message;
                formMessage.style.color = "#ff3333";
            }
        } catch (error) {
            formMessage.innerText = "Something went wrong. Please try again.";
            formMessage.style.color = "#ff3333";
            console.error(error);
        } finally {
            submitBtn.value = originalText;
            submitBtn.disabled = false;
            formMessage.style.display = "block";
            setTimeout(() => { formMessage.style.display = "none"; }, 5000);
        }
    });
}
