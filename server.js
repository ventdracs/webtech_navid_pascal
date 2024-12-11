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
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, 'public')));

// Personen abrufen
app.get('/api/person', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM persons');
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

// Statische Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft unter http://localhost:${PORT}`);
});
