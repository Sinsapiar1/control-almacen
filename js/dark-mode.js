function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
}

document.addEventListener('DOMContentLoaded', () => {
    const existingToggle = document.getElementById('dark-mode-toggle');
    if (existingToggle) {
        existingToggle.remove();
    }

    const darkModeToggle = document.createElement('li');
    darkModeToggle.className = 'nav-item';
    darkModeToggle.innerHTML = `
        <a href="#" id="dark-mode-toggle" class="nav-link">
            <i class="bi bi-moon-fill dark-mode-icon"></i>
            <i class="bi bi-sun-fill light-mode-icon"></i>
        </a>
    `;

    const navbarNav = document.querySelector('.navbar-nav.ms-auto');
    if (navbarNav) {
        navbarNav.appendChild(darkModeToggle);
        
        darkModeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleDarkMode();
        });
    }

    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
    }
});