const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'MS0208',
    database: 'user_management'
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL connected');

    // Create users table
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255),
            phone_number VARCHAR(20),
            role ENUM('Student', 'Teacher', 'Institute')
        )
    `;

    // Create messages table
    const createMessagesTable = `
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT,
            receiver_id INT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
        )
    `;

    // Execute table creation queries
    db.query(createUsersTable, (err) => {
        if (err) throw err;
        console.log('Users table created or already exists');
    });

    db.query(createMessagesTable, (err) => {
        if (err) throw err;
        console.log('Messages table created or already exists');
    });
});

// Register user
app.post('/register', async (req, res) => {
    const { name, email, password, phone_number, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query('INSERT INTO users (name, email, password, phone_number, role) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, phone_number, role],
        (err, result) => {
            if (err) return res.status(400).send(err);
            res.status(201).send('User registered');
        });
});

// Login user
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {
        if (err) return res.status(400).send(err);
        if (!result.length || !await bcrypt.compare(password, result[0].password)) {
            return res.status(401).send('Invalid credentials');
        }
        const token = jwt.sign({ id: result[0].id }, 'secretkey');
        res.json({ token, user: result[0] });
    });
});

// Get user details
app.get('/users', (req, res) => {
    db.query('SELECT id, name, email, phone_number, role FROM users', (err, result) => {
        if (err) return res.status(400).send(err);
        res.json(result);
    });
});

// Update user
app.put('/users/:id', (req, res) => {
    const { name, email, phone_number, role } = req.body;
    db.query('UPDATE users SET name = ?, email = ?, phone_number = ?, role = ? WHERE id = ?',
        [name, email, phone_number, role, req.params.id],
        (err) => {
            if (err) return res.status(400).send(err);
            res.send('User updated');
        });
});

// Delete user
app.delete('/users/:id', (req, res) => {
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(400).send(err);
        res.send('User deleted');
    });
});

// Send message
app.post('/messages', (req, res) => {
    const { sender_id, receiver_id, message } = req.body;
    db.query('INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
        [sender_id, receiver_id, message],
        (err, result) => {
            if (err) return res.status(400).send(err);
            res.status(201).send('Message sent');
        });
});

// Get messages between users
app.get('/messages/:userId', (req, res) => {
    const { userId } = req.params;
    db.query('SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ?',
        [userId, userId],
        (err, result) => {
            if (err) return res.status(400).send(err);
            res.json(result);
        });
});

app.listen(5000, () => console.log('Server running on port 5000'));
