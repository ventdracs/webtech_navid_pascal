const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg'); // PostgreSQL Client

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

// Personen abrufen
app.get('/api/person', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM persons'); // ÄNDERUNG: Abrufen des neuen Feldes "image"
        res.json(result.rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Personen:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Person hinzufügen
app.post('/api/person', async (req, res) => {
    const { name, age, height, image } = req.body;

    if (!name || !age || !height || !image) {
        return res.status(400).json({ error: 'Alle Felder (name, age, height, image) sind erforderlich.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO persons (name, age, height, image) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, parseInt(age, 10), parseInt(height, 10), image]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Fehler beim Hinzufügen der Person:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});


// Einzelne Person abrufen
app.get('/api/person/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM persons WHERE id = $1', [id]); // ÄNDERUNG: Abrufen des neuen Feldes "image"
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
    const { name, age, height, image } = req.body; // ÄNDERUNG: Hinzufügen des Feldes "image"

    try {
        const result = await pool.query(
            'UPDATE persons SET name = $1, age = $2, height = $3, image = $4 WHERE id = $5 RETURNING *', // ÄNDERUNG: Hinzufügen von "image" in der Abfrage
            [name, parseInt(age, 10), parseInt(height, 10), image, id]
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
        const result = await pool.query('DELETE FROM persons WHERE id = $1 RETURNING *', [id]); // ÄNDERUNG: Feld "image" wird automatisch gelöscht
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Person nicht gefunden' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Fehler beim Löschen der Person:', error);
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
