const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, 'public')));

// Temporärer Speicher für Einträge (als Ersatz für die Datenbank)
let persons = []; // [{ id: 1, name: 'John Doe', age: 25, height: 180 }]
let currentId = 1;

// CRUD ROUTEN

// Create
app.post('/api/person', (req, res) => {
    const { name, age, height } = req.body;

    // Validierung
    if (!name || !age || !height) {
        return res.status(400).json({ error: 'Alle Felder (name, age, height) sind erforderlich.' });
    }

    // Neuen Eintrag erstellen
    const newPerson = {
        id: currentId++,
        name,
        age: parseInt(age, 10),
        height: parseInt(height, 10),
    };

    persons.push(newPerson);
    res.status(201).json(newPerson);
});

// READ
app.get('/api/person', (req, res) => {
    res.json(persons);
});

// Einzelne Person abrufen
app.get('/api/person/:id', (req, res) => {
    const { id } = req.params;
    const person = persons.find((p) => p.id === parseInt(id, 10));

    if (!person) {
        return res.status(404).json({ error: 'Person nicht gefunden' });
    }

    res.json(person);
});


// UPDATE
app.put('/api/person/:id', (req, res) => {
    const { id } = req.params;
    const { name, age, height } = req.body;

    // Eintrag suchen
    const person = persons.find((p) => p.id === parseInt(id, 10));
    if (!person) {
        return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
    }

    // Daten aktualisieren
    if (name) person.name = name;
    if (age) person.age = parseInt(age, 10);
    if (height) person.height = parseInt(height, 10);

    res.json(person);
});

// DELETE
app.delete('/api/person/:id', (req, res) => {
    const { id } = req.params;

    // Eintrag suchen und löschen
    const index = persons.findIndex((p) => p.id === parseInt(id, 10));
    if (index === -1) {
        return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
    }

    const deletedPerson = persons.splice(index, 1);
    res.json(deletedPerson[0]);
});


// Routen
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft unter http://localhost:${PORT}`);
});
