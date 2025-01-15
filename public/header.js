async function loadHeader() {
    try {
        const response = await fetch('header.html');
        const headerHTML = await response.text();
        document.getElementById('global-header').innerHTML = headerHTML;

        setupHeader(); // Initialisiert die Header-Funktionen

        // Initialisiere Funktionen spezifisch für die Seite
        if (typeof setupPage === 'function') {
            setupPage(); // Ruft die spezifischen Funktionen für die Seite auf
        }
    } catch (error) {
        console.error('Fehler beim Laden des Headers:', error);
    }
}

function setupHeader() {
    const token = localStorage.getItem('token');

    // Login-Status prüfen
    const loggedInUserElement = document.getElementById('loggedInUser');
    if (token && loggedInUserElement) {
        const username = localStorage.getItem('username');
        loggedInUserElement.textContent = `Hallo, ${username}`;
        const logoutButton = document.getElementById('logoutButton');
        const loginButton = document.getElementById('loginButton');
        const registerButton = document.getElementById('registerButton');
        const addCategoryButton = document.querySelector('.add-category-button');
        const addPersonButton = document.querySelector('.add-person-button');

        if (logoutButton) logoutButton.style.display = 'block';
        if (loginButton) loginButton.style.display = 'none';
        if (registerButton) registerButton.style.display = 'none';
        if (addCategoryButton) addCategoryButton.style.display = 'inline-block';
        if (addPersonButton) addPersonButton.style.display = 'inline-block';
    } else {
        const loginButton = document.getElementById('loginButton');
        const registerButton = document.getElementById('registerButton');
        if (loginButton) loginButton.style.display = 'block';
        if (registerButton) registerButton.style.display = 'block';
    }

    // Logout-Funktionalität
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.reload();
        });
    }

    // Suche und Filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                const searchTerm = event.target.value;
                const queryParams = new URLSearchParams({ search: searchTerm });
                window.location.href = `search-results.html?${queryParams}`;
            }
        });
    }

    const filterButton = document.getElementById('filterButton');
    if (filterButton) {
        filterButton.addEventListener('click', () => {
            const minAge = document.getElementById('minAge')?.value.trim();
            const maxAge = document.getElementById('maxAge')?.value.trim();
            const searchTerm = document.getElementById('searchInput')?.value.trim();

            const queryParams = new URLSearchParams();

            if (searchTerm) queryParams.append('search', searchTerm);
            if (minAge) queryParams.append('minAge', minAge);
            if (maxAge) queryParams.append('maxAge', maxAge);

            window.location.href = `search-results.html?${queryParams}`;
        });
    }

    // Personenliste laden
    if (document.getElementById('peopleGrid')) {
        loadPersons();
    }
}

async function loadPersons() {
    try {
        const token = localStorage.getItem('token');
        console.log('Token:', token); // Debugging

        const response = await fetch('/api/person');
        if (!response.ok) throw new Error(`API-Fehler: ${response.statusText}`);

        const persons = await response.json();
        const peopleGrid = document.getElementById('peopleGrid');
        if (!peopleGrid) return;

        peopleGrid.innerHTML = '';

        persons.forEach(person => {
            const categories = person.categories ? person.categories.join(', ') : 'Keine Kategorien';
            const personCard = `
                <div class="person-card-container">
                    <a href="person.html?id=${person.id}" class="person-card">
                        <div class="person-image-container">
                            <img src="${person.image}" alt="Foto von ${person.name}" class="person-image">
                        </div>
                        <div class="person-info">
                            <h2>${person.name}</h2>
                            <p><strong>Alter:</strong> ${person.age}</p>
                            <p><strong>Größe:</strong> ${person.height} cm</p>
                            <p><strong>Haarfarbe:</strong> ${categories}</p>
                        </div>
                    </a>
                    ${token ? `
                    <div class="card-actions">
                        <a href="edit-person.html?id=${person.id}" class="edit-button">Bearbeiten</a>
                        <button class="delete-button" data-id="${person.id}">Löschen</button>
                    </div>` : ''}
                </div>
            `;
            peopleGrid.innerHTML += personCard;
        });

        // Event-Listener für Löschen-Button
        if (token) {
            document.querySelectorAll('.delete-button').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const id = event.target.dataset.id;
                    if (confirm('Möchten Sie diese Person wirklich löschen?')) {
                        await deletePerson(id);
                        loadPersons(); // Aktualisiert die Liste
                    }
                });
            });
        }
    } catch (error) {
        console.error('Fehler beim Laden der Personen:', error);
    }
}

async function deletePerson(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/person/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Fehler beim Löschen der Person');
        }
    } catch (error) {
        console.error('Fehler beim Löschen:', error);
    }
}

// Lade den Header beim Start der Seite
loadHeader();
