const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg'); // PostgreSQL Client
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'geheimratsecken';


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// PostgreSQL Datenbankverbindung
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Stelle sicher, dass die Verbindung korrekt konfiguriert ist
    ssl: { rejectUnauthorized: false }, // Für Neon häufig nötig
});

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, 'public')));

// Middleware für geschützte Routen
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Kein Token bereitgestellt' });
    }

    jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Ungültiges Token' });
        }
        req.user = user;
        next();
    });
};

// Test-Endpunkt für die Datenbankverbindung
app.get('/api/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ success: true, timestamp: result.rows[0].now });
    } catch (error) {
        console.error('Fehler bei der Datenbankverbindung:', error);
        res.status(500).json({ success: false, error: 'Datenbankverbindung fehlgeschlagen' });
    }
});

// Personen abrufen CRUD
app.get('/api/person', async (req, res) => {
    const { search, minAge, maxAge } = req.query;
    const searchTerm = search ? `%${search}%` : '%';

    try {
        const result = await pool.query(`
            SELECT p.id, p.name, p.age, p.height, p.image, 
                   ARRAY_AGG(c.name) AS categories
            FROM persons p
            LEFT JOIN person_categories pc ON p.id = pc.person_id
            LEFT JOIN categories c ON pc.category_id = c.id
            WHERE (p.name ILIKE $1 OR CAST(p.age AS TEXT) ILIKE $1 OR CAST(p.height AS TEXT) ILIKE $1
                   OR EXISTS (
                       SELECT 1
                       FROM categories
                       WHERE categories.name ILIKE $1
                         AND categories.id = pc.category_id
                   ))
              AND (p.age >= $2 OR $2 IS NULL)
              AND (p.age <= $3 OR $3 IS NULL)
            GROUP BY p.id
        `, [searchTerm, minAge || null, maxAge || null]);

        res.json(result.rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Personen:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Person hinzufügen
app.post('/api/person', authenticateToken, async (req, res) => {
    const { name, age, height, image, categories } = req.body;

    console.log('Empfangene Daten:', req.body); // Debugging, um die Anfrage zu überprüfen

    // Validierung: Überprüfen, ob alle Felder vorhanden sind
    if (!name || !age || !height || !categories || categories.length === 0) {
        return res.status(400).json({ error: 'Alle Felder erforderlich, einschließlich mindestens einer Kategorie.' });
    }

    try {
        const client = await pool.connect();
        await client.query('BEGIN'); // Transaktion starten

        const personResult = await client.query(
            'INSERT INTO persons (name, age, height, image) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, age, height, image]
        );

        const personId = personResult.rows[0].id;

        // Kategorien zur Person hinzufügen
        for (const categoryId of categories) {
            await client.query(
                'INSERT INTO person_categories (person_id, category_id) VALUES ($1, $2)',
                [personId, categoryId]
            );
        }

        await client.query('COMMIT'); // Transaktion abschließen
        res.status(201).json({ id: personId });
    } catch (error) {
        console.error('Fehler beim Hinzufügen der Person:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});



// Einzelne Person abrufen
app.get('/api/person/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(`
            SELECT p.id, p.name, p.age, p.height, p.image, 
                   ARRAY_AGG(c.name) AS categories
            FROM persons p
            LEFT JOIN person_categories pc ON p.id = pc.person_id
            LEFT JOIN categories c ON pc.category_id = c.id
            WHERE p.id = $1
            GROUP BY p.id
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Person nicht gefunden' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Fehler beim Abrufen der Person:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});


// Person aktualisieren
app.put('/api/person/:id', async (req, res) => {
    const { id } = req.params;
    const { name, age, height } = req.body;

    try {
        const result = await pool.query(
            'UPDATE persons SET name = $1, age = $2, height = $3 WHERE id = $4 RETURNING *',
            [name, parseInt(age, 10), parseInt(height, 10), id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Person nicht gefunden' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Person:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Person löschen
app.delete('/api/person/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM persons WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Person nicht gefunden' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Fehler beim Löschen der Person:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Kategorien abrufen CRUD
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT categories.id, categories.name, COUNT(person_categories.person_id) AS count ' +
            'FROM categories ' +
            'LEFT JOIN person_categories ON categories.id = person_categories.category_id ' +
            'GROUP BY categories.id'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Kategorien:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Kategorie hinzufügen
app.post('/api/categories', async (req, res) => {
    const { name } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO categories (name) VALUES ($1) RETURNING *',
            [name]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Fehler beim Hinzufügen der Kategorie:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Kategorie bearbeiten
app.put('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const result = await pool.query(
            'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Kategorie nicht gefunden' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Kategorie:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Kategorie löschen
app.delete('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Kategorie nicht gefunden' });
        }
        res.json({ message: 'Kategorie gelöscht', category: result.rows[0] });
    } catch (error) {
        console.error('Fehler beim Löschen der Kategorie:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});


// Nutzer registrieren
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username und Passwort sind erforderlich' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Passwort hashen
        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Fehler bei der Registrierung:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Nutzer einloggen
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username und Passwort sind erforderlich' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Ungültiger Benutzername oder Passwort' });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Ungültiger Benutzername oder Passwort' });
        }

        // JWT erstellen
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        res.json({ token, username: user.username });
    } catch (error) {
        console.error('Fehler beim Login:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});


// Routen
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft unter http://localhost:${PORT}`);
});
