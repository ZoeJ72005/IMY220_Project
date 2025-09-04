const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from frontend/public
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Serve bundle.js from dist
app.use('/dist', express.static(path.join(__dirname, '../dist')));

// Dummy data for stubbing
const dummyUsers = [
  { id: 1, username: 'terminal_user', email: 'user@terminal.dev', password: 'password123' },
  { id: 2, username: 'code_master', email: 'master@terminal.dev', password: 'master456' }
];

// Authentication endpoints (stubbed)
app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body;
  
  // Stub authentication - find user by email
  const user = dummyUsers.find(u => u.email === email);
  
  if (user && user.password === password) {
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token: 'dummy_jwt_token_' + user.id,
      message: 'Authentication successful'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/signup', (req, res) => {
  const { username, email, password } = req.body;
  
  // Stub registration - check if user exists
  const existingUser = dummyUsers.find(u => u.email === email || u.username === username);
  
  if (existingUser) {
    res.status(400).json({
      success: false,
      message: 'User already exists'
    });
  } else {
    const newUser = {
      id: dummyUsers.length + 1,
      username,
      email,
      password
    };
    
    dummyUsers.push(newUser);
    
    res.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      },
      token: 'dummy_jwt_token_' + newUser.id,
      message: 'User created successfully'
    });
  }
});

// Catch-all handler for React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`> Terminal server running on port ${PORT}`);
  console.log(`> Access at: http://localhost:${PORT}`);
});