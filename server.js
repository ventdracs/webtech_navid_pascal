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

// CRUD ROUTEN

// Personen abrufen
app.get('/api/person', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM persons'); // Tabelle 'persons' anpassen
        res.json(result.rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Personen:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Person hinzufügen
app.post('/api/person', async (req, res) => {
    const { name, age, height } = req.body;

    if (!name || !age || !height) {
        return res.status(400).json({ error: 'Alle Felder (name, age, height) sind erforderlich.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO persons (name, age, height) VALUES ($1, $2, $3) RETURNING *',
            [name, parseInt(age, 10), parseInt(height, 10)]
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
        const result = await pool.query('SELECT * FROM persons WHERE id = $1', [id]);
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

// Routen
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft unter http://localhost:${PORT}`);
});
