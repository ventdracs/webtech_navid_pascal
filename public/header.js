async function loadHeader() {
    try {
        const response = await fetch('header.html');
        const headerHTML = await response.text();
        document.getElementById('global-header').innerHTML = headerHTML;

        setupHeader(); // Initialisiert die Header-Funktionen
    } catch (error) {
        console.error('Fehler beim Laden des Headers:', error);
    }
}

function setupHeader() {
    const token = localStorage.getItem('token');

    // Login-Status prüfen
    if (token) {
        const username = localStorage.getItem('username');
        document.getElementById('loggedInUser').textContent = `Hallo, ${username}`;
        document.getElementById('logoutButton').style.display = 'block';
        document.getElementById('loginButton').style.display = 'none';
        document.getElementById('registerButton').style.display = 'none';
        document.querySelector('.add-category-button').style.display = 'inline-block';
    } else {
        document.getElementById('loginButton').style.display = 'block';
        document.getElementById('registerButton').style.display = 'block';
    }

    // Logout-Funktionalität
    document.getElementById('logoutButton').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.reload();
    });

    // Suche und Filter
    document.getElementById('searchInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const searchTerm = event.target.value;
            const queryParams = new URLSearchParams({ search: searchTerm });
            window.location.href = `search-results.html?${queryParams}`;
        }
    });

    document.getElementById('filterButton').addEventListener('click', () => {
        const minAge = document.getElementById('minAge').value.trim();
        const maxAge = document.getElementById('maxAge').value.trim();
        const searchTerm = document.getElementById('searchInput').value.trim();

        const queryParams = new URLSearchParams();

        if (searchTerm) queryParams.append('search', searchTerm);
        if (minAge) queryParams.append('minAge', minAge);
        if (maxAge) queryParams.append('maxAge', maxAge);

        window.location.href = `search-results.html?${queryParams}`;
    });
}

loadHeader();