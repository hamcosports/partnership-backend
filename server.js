const express = require('express');
const jsonServer = require('json-server');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

// Create Express server
const app = express();
const port = process.env.PORT || 3001; // Use environment port for Render.com compatibility

// Database path
const dbPath = path.join(__dirname, 'database.json');

// Create JSON Server router
const router = jsonServer.router(dbPath);

// Database backup path for persistence on Render's free tier
const backupPath = path.join(__dirname, 'database-backup.json');

// Configure CORS for Hostinger domain
app.use(cors({
  // Replace with your actual Hostinger domain
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-hostinger-domain.com', 'http://localhost:3000'] 
    : 'http://localhost:3000',
  credentials: true
}));

app.use(bodyParser.json());

// JWT secret - use environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Database persistence for Render.com free tier
// Backup database on changes
router.db._.write = function() {
  const data = router.db.getState();
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  console.log(`Database backed up at ${new Date().toISOString()}`);
  return this;
};

// Restore database from backup if it exists
const restoreFromBackup = () => {
  if (fs.existsSync(backupPath)) {
    try {
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      fs.writeFileSync(dbPath, JSON.stringify(backupData, null, 2));
      console.log('Database restored from backup');
    } catch (error) {
      console.error('Error restoring database from backup:', error);
    }
  }
};

// Run restore on startup
restoreFromBackup();

// Ensure database file exists
if (!fs.existsSync(dbPath)) {
  // Create database file with initial data
  const initialData = {
    "users": [
      {
        "id": "admin",
        "username": "admin",
        "password": "admin",
        "name": "Administrator",
        "role": "admin"
      },
      {
        "id": "usman",
        "username": "usman",
        "password": "password",
        "name": "Usman Ahmed",
        "role": "partner"
      },
      {
        "id": "mark",
        "username": "mark",
        "password": "password",
        "name": "Mark Jason Sanker",
        "role": "partner"
      }
    ],
    "categories": [
      {
        "id": "cat1",
        "name": "Samples",
        "description": "Product samples and prototypes"
      },
      {
        "id": "cat2",
        "name": "Shipping",
        "description": "Shipping and logistics expenses"
      },
      {
        "id": "cat3",
        "name": "Marketing",
        "description": "Marketing and advertising expenses"
      },
      {
        "id": "cat4",
        "name": "Office Supplies",
        "description": "Office supplies and equipment"
      },
      {
        "id": "cat5",
        "name": "Software",
        "description": "Software subscriptions and tools"
      },
      {
        "id": "cat6",
        "name": "Travel",
        "description": "Business travel expenses"
      },
      {
        "id": "cat7",
        "name": "Other",
        "description": "Other miscellaneous expenses"
      }
    ],
    "expenses": [
      {
        "id": "e001",
        "description": "Product Samples",
        "amount": 500,
        "categoryId": "cat1",
        "paidBy": "usman",
        "date": "2025-03-01",
        "notes": "Initial product samples for client presentations"
      },
      {
        "id": "e002",
        "description": "Express Shipping",
        "amount": 120.50,
        "categoryId": "cat2",
        "paidBy": "mark",
        "date": "2025-03-05",
        "notes": "Overnight delivery to important client"
      },
      {
        "id": "e003",
        "description": "Office Supplies",
        "amount": 75.25,
        "categoryId": "cat4",
        "paidBy": "usman",
        "date": "2025-03-10",
        "notes": "Paper, pens, and basic office needs"
      }
    ],
    "investments": [
      {
        "id": "i001",
        "partner": "usman",
        "amount": 5000,
        "date": "2025-02-15",
        "notes": "Initial investment"
      },
      {
        "id": "i002",
        "partner": "mark",
        "amount": 5000,
        "date": "2025-02-15",
        "notes": "Initial investment"
      }
    ],
    "subsidies": [
      {
        "id": "s001",
        "partner": "usman",
        "amount": 1000,
        "date": "2025-03-10",
        "description": "Marketing campaign subsidy",
        "notes": "Extra funding for urgent marketing needs"
      }
    ],
    "tasks": [
      {
        "id": "t001",
        "title": "Contact supplier",
        "description": "Reach out to XYZ supplier for pricing",
        "assignedTo": "mark",
        "status": "pending",
        "priority": "high",
        "dueDate": "2025-03-20",
        "createdAt": "2025-03-15",
        "completedAt": null
      },
      {
        "id": "t002",
        "title": "Prepare sales presentation",
        "description": "Create slides for new client pitch",
        "assignedTo": "usman",
        "status": "completed",
        "priority": "medium",
        "dueDate": "2025-03-10",
        "createdAt": "2025-03-05",
        "completedAt": "2025-03-09"
      }
    ],
    "events": [
      {
        "id": "ev001",
        "name": "Industry Conference",
        "description": "Annual industry conference",
        "startDate": "2025-04-15",
        "endDate": "2025-04-18",
        "location": "Convention Center",
        "status": "upcoming",
        "notes": "Need to prepare marketing materials"
      }
    ]
  };
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  
  fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  console.log(`Created database file at ${dbPath}`);
  // Create initial backup
  fs.writeFileSync(backupPath, JSON.stringify(initialData, null, 2));
}

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Read users from the database
    const dbContent = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(dbContent);
    const user = db.users.find(u => u.username === username && u.password === password);
    
    if (user) {
      // Create token
      const token = jwt.sign({ 
        id: user.id, 
        username: user.username,
        name: user.name,
        role: user.role
      }, JWT_SECRET, { expiresIn: '1h' });
      
      res.json({ 
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Check if request is authenticated
const isAuthenticated = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, JWT_SECRET);
      return true;
    } catch (err) {
      return false;
    }
  }
  return false;
};

// Auth middleware for API routes
app.use('/api', (req, res, next) => {
  // Skip auth for login
  if (req.path === '/login') {
    return next();
  }
  
  if (isAuthenticated(req)) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// Use json-server middleware
app.use('/api', jsonServer.defaults());

// Mount the router under /api
app.use('/api', router);

// Add health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Removed static file serving since frontend will be on Hostinger

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`API routes are available under /api`);
});