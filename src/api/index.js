
// This file serves as a Node.js Express backend to handle MySQL database operations

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection Configuration - use environment variables in production
const dbConfig = {
  host: process.env.MYSQL_HOST || 'mysqlrezx-rezaaaraboktavian-fee8.i.aivencloud.com',
  port: process.env.MYSQL_PORT || 17516,
  user: process.env.MYSQL_USER || 'avnadmin',
  password: process.env.MYSQL_PASSWORD || 'AVNS_zj4dS057qjFzKcKE7OD',
  database: process.env.MYSQL_DATABASE || 'defaultdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database with required tables
const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Applications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        discord VARCHAR(255) NOT NULL,
        position VARCHAR(100) NOT NULL,
        experience TEXT NOT NULL,
        playtime VARCHAR(255) NOT NULL,
        message TEXT,
        answers JSON,
        status ENUM('Under Review', 'Accepted', 'Rejected') DEFAULT 'Under Review',
        submitted_at DATE NOT NULL,
        ip_address VARCHAR(45)
      )
    `);
    
    // Application Settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS application_settings (
        id INT PRIMARY KEY DEFAULT 1,
        is_open BOOLEAN DEFAULT TRUE,
        open_positions JSON,
        start_date DATE,
        end_date DATE
      )
    `);
    
    // Admin Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        username VARCHAR(50) PRIMARY KEY,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'superadmin') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id VARCHAR(36) PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        action VARCHAR(50) NOT NULL,
        username VARCHAR(50),
        applicant_name VARCHAR(255),
        applicant_role VARCHAR(100),
        application_id VARCHAR(36),
        ip_address VARCHAR(45),
        details TEXT
      )
    `);
    
    // Statistics table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS statistics (
        id INT PRIMARY KEY DEFAULT 1,
        total_applications INT DEFAULT 0,
        accepted INT DEFAULT 0,
        rejected INT DEFAULT 0,
        under_review INT DEFAULT 0,
        by_position JSON
      )
    `);
    
    // Position Questions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS position_questions (
        position VARCHAR(100) PRIMARY KEY,
        questions JSON NOT NULL
      )
    `);
    
    // Check if we need to initialize default data
    const [settingsRows] = await connection.query('SELECT * FROM application_settings LIMIT 1');
    if (Array.isArray(settingsRows) && settingsRows.length === 0) {
      // Insert default application settings
      await connection.query(`
        INSERT INTO application_settings (is_open, open_positions, start_date, end_date)
        VALUES (true, '["Moderator", "Builder", "Developer", "Event Manager"]', '2023-11-01', '2025-12-31')
      `);
    }
    
    const [adminRows] = await connection.query('SELECT * FROM admins LIMIT 1');
    if (Array.isArray(adminRows) && adminRows.length === 0) {
      // Insert default admin user
      await connection.query(`
        INSERT INTO admins (username, password, role)
        VALUES ('admin', 'admin', 'superadmin')
      `);
    }
    
    const [statsRows] = await connection.query('SELECT * FROM statistics LIMIT 1');
    if (Array.isArray(statsRows) && statsRows.length === 0) {
      // Insert default statistics
      await connection.query(`
        INSERT INTO statistics (total_applications, accepted, rejected, under_review, by_position)
        VALUES (0, 0, 0, 0, '{}')
      `);
    }
    
    // Initialize default questions for each position if needed
    const defaultQuestions = {
      "Moderator": [
        "Why do you want to be a moderator?",
        "How would you handle a situation with two players arguing?",
        "Have you had any previous moderator experience on other servers?",
        "How many hours a week can you dedicate to moderating?"
      ],
      "Builder": [
        "Please provide links to screenshots of your previous builds",
        "What building styles are you most comfortable with?",
        "How would you approach a collaborative build project?",
        "Do you have experience with WorldEdit or similar tools?"
      ],
      "Developer": [
        "What programming languages are you proficient in?",
        "Have you developed Minecraft plugins before? If so, please share examples",
        "How would you approach optimizing server performance?",
        "What IDE do you use for development?"
      ],
      "Event Manager": [
        "What type of events would you like to organize?",
        "How often do you think events should be held?",
        "Describe an event you would implement if accepted",
        "How would you encourage player participation in events?"
      ]
    };
    
    const [questionRows] = await connection.query('SELECT * FROM position_questions');
    if (Array.isArray(questionRows) && questionRows.length === 0) {
      // Insert default questions for each position
      for (const [position, questions] of Object.entries(defaultQuestions)) {
        await connection.query(
          'INSERT INTO position_questions (position, questions) VALUES (?, ?)',
          [position, JSON.stringify(questions)]
        );
      }
    }
    
    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Initialize the database when the server starts
initializeDatabase().catch(console.error);

// API Routes

// Database connection status check
app.get('/api/database/status', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.json({ connected: true });
  } catch (error) {
    console.error('Error checking database connection:', error);
    res.json({ connected: false });
  }
});

// Get statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM statistics LIMIT 1');
    connection.release();
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.json({
        totalApplications: 0,
        accepted: 0,
        rejected: 0,
        underReview: 0,
        byPosition: {}
      });
    }
    
    const stats = rows[0];
    res.json({
      totalApplications: stats.total_applications,
      accepted: stats.accepted,
      rejected: stats.rejected,
      underReview: stats.under_review,
      byPosition: JSON.parse(stats.by_position)
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get application settings
app.get('/api/settings', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM application_settings LIMIT 1');
    connection.release();
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.json({
        isOpen: false,
        openPositions: [],
        startDate: "",
        endDate: ""
      });
    }
    
    const settings = rows[0];
    res.json({
      isOpen: settings.is_open === 1,
      openPositions: JSON.parse(settings.open_positions),
      startDate: settings.start_date ? new Date(settings.start_date).toISOString().split('T')[0] : "",
      endDate: settings.end_date ? new Date(settings.end_date).toISOString().split('T')[0] : ""
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update application settings
app.put('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    const connection = await pool.getConnection();
    
    await connection.query(
      'UPDATE application_settings SET is_open = ?, open_positions = ?, start_date = ?, end_date = ? WHERE id = 1',
      [
        settings.isOpen ? 1 : 0,
        JSON.stringify(settings.openPositions),
        settings.startDate || null,
        settings.endDate || null
      ]
    );
    
    connection.release();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get all applications
app.get('/api/applications', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT id, name, email, position, status, submitted_at, ip_address FROM applications');
    connection.release();
    
    if (!Array.isArray(rows)) {
      return res.json([]);
    }
    
    const applications = rows.map((app) => ({
      id: app.id,
      name: app.name,
      email: app.email,
      position: app.position,
      status: app.status,
      submittedAt: app.submitted_at ? new Date(app.submitted_at).toISOString().split('T')[0] : '',
      ipAddress: app.ip_address
    }));
    
    res.json(applications);
  } catch (error) {
    console.error('Error getting applications:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

// Get application by ID
app.get('/api/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM applications WHERE id = ?', [id]);
    connection.release();
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const app = rows[0];
    res.json({
      id: app.id,
      name: app.name,
      email: app.email,
      discord: app.discord,
      position: app.position,
      experience: app.experience,
      playtime: app.playtime,
      message: app.message,
      answers: JSON.parse(app.answers),
      status: app.status,
      submittedAt: app.submitted_at ? new Date(app.submitted_at).toISOString().split('T')[0] : '',
      ipAddress: app.ip_address
    });
  } catch (error) {
    console.error('Error getting application:', error);
    res.status(500).json({ error: 'Failed to get application' });
  }
});

// Get applications by email
app.get('/api/applications/byEmail/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT id, name, email, position, status, submitted_at FROM applications WHERE email = ?', [email]);
    connection.release();
    
    if (!Array.isArray(rows)) {
      return res.json([]);
    }
    
    const applications = rows.map((app) => ({
      id: app.id,
      name: app.name,
      email: app.email,
      position: app.position,
      status: app.status,
      submittedAt: app.submitted_at ? new Date(app.submitted_at).toISOString().split('T')[0] : ''
    }));
    
    res.json(applications);
  } catch (error) {
    console.error('Error getting applications by email:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

// Create new application
app.post('/api/applications', async (req, res) => {
  try {
    const applicationData = req.body;
    const applicationId = applicationData.id || crypto.randomUUID();
    const ipAddress = req.ip || 'Unknown';
    
    const connection = await pool.getConnection();
    
    // Begin transaction
    await connection.beginTransaction();
    
    try {
      // Insert the application
      await connection.query(
        `INSERT INTO applications 
         (id, name, email, discord, position, experience, playtime, message, answers, status, submitted_at, ip_address) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)`,
        [
          applicationId,
          applicationData.name,
          applicationData.email,
          applicationData.discord,
          applicationData.position,
          applicationData.experience,
          applicationData.playtime,
          applicationData.message || null,
          JSON.stringify(applicationData.answers || []),
          'Under Review',
          ipAddress
        ]
      );
      
      // Update statistics
      // First get current statistics
      const [statsRows] = await connection.query('SELECT * FROM statistics LIMIT 1');
      if (Array.isArray(statsRows) && statsRows.length > 0) {
        const stats = statsRows[0];
        const byPosition = JSON.parse(stats.by_position);
        
        if (!byPosition[applicationData.position]) {
          byPosition[applicationData.position] = 0;
        }
        byPosition[applicationData.position] += 1;
        
        // Update statistics
        await connection.query(
          'UPDATE statistics SET total_applications = total_applications + 1, under_review = under_review + 1, by_position = ? WHERE id = 1',
          [JSON.stringify(byPosition)]
        );
      }
      
      // Add log entry
      const logId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO logs 
         (id, action, applicant_name, applicant_role, application_id, ip_address, details) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          logId,
          'APPLICATION_SUBMITTED',
          applicationData.name,
          applicationData.position,
          applicationId,
          ipAddress,
          `New application submitted for ${applicationData.position} position`
        ]
      );
      
      // Commit transaction
      await connection.commit();
      
      res.status(201).json({ id: applicationId, success: true });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// Update application status
app.put('/api/applications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminUsername } = req.body;
    
    const connection = await pool.getConnection();
    
    // Begin transaction
    await connection.beginTransaction();
    
    try {
      // Get current application to determine old status
      const [appRows] = await connection.query('SELECT status, name, position FROM applications WHERE id = ?', [id]);
      
      if (!Array.isArray(appRows) || appRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Application not found' });
      }
      
      const app = appRows[0];
      const oldStatus = app.status;
      
      // Update application status
      await connection.query('UPDATE applications SET status = ? WHERE id = ?', [status, id]);
      
      // Update statistics
      if (oldStatus !== status) {
        // Decrement old status count
        if (oldStatus === 'Under Review') {
          await connection.query('UPDATE statistics SET under_review = under_review - 1 WHERE id = 1');
        } else if (oldStatus === 'Accepted') {
          await connection.query('UPDATE statistics SET accepted = accepted - 1 WHERE id = 1');
        } else if (oldStatus === 'Rejected') {
          await connection.query('UPDATE statistics SET rejected = rejected - 1 WHERE id = 1');
        }
        
        // Increment new status count
        if (status === 'Under Review') {
          await connection.query('UPDATE statistics SET under_review = under_review + 1 WHERE id = 1');
        } else if (status === 'Accepted') {
          await connection.query('UPDATE statistics SET accepted = accepted + 1 WHERE id = 1');
        } else if (status === 'Rejected') {
          await connection.query('UPDATE statistics SET rejected = rejected + 1 WHERE id = 1');
        }
      }
      
      // Add log entry
      const logId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO logs 
         (id, action, username, applicant_name, applicant_role, application_id, details) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          logId,
          'STATUS_CHANGE',
          adminUsername || 'admin',
          app.name,
          app.position,
          id,
          `Status changed from ${oldStatus} to ${status}`
        ]
      );
      
      // Commit transaction
      await connection.commit();
      
      res.json({ success: true });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// Get logs
app.get('/api/logs', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM logs ORDER BY timestamp DESC');
    connection.release();
    
    if (!Array.isArray(rows)) {
      return res.json([]);
    }
    
    const logs = rows.map((log) => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      action: log.action,
      username: log.username,
      applicantName: log.applicant_name,
      applicantRole: log.applicant_role,
      applicationId: log.application_id,
      ipAddress: log.ip_address,
      details: log.details
    }));
    
    res.json(logs);
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Add log entry
app.post('/api/logs', async (req, res) => {
  try {
    const logData = req.body;
    const logId = crypto.randomUUID();
    
    const connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO logs 
       (id, action, username, applicant_name, applicant_role, application_id, ip_address, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        logData.action,
        logData.username || null,
        logData.applicantName || null,
        logData.applicantRole || null,
        logData.applicationId || null,
        logData.ipAddress || req.ip || null,
        logData.details
      ]
    );
    connection.release();
    
    res.status(201).json({ id: logId, success: true });
  } catch (error) {
    console.error('Error adding log:', error);
    res.status(500).json({ error: 'Failed to add log' });
  }
});

// Admin login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM admins WHERE username = ?', [username]);
    connection.release();
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const admin = rows[0];
    
    // In a real app, passwords would be hashed
    if (admin.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({
      username: admin.username,
      role: admin.role,
      createdAt: admin.created_at.toISOString()
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get all position questions
app.get('/api/questions', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM position_questions');
    connection.release();
    
    const questions = {};
    rows.forEach(row => {
      questions[row.position] = JSON.parse(row.questions);
    });
    
    res.json(questions);
  } catch (error) {
    console.error('Error getting position questions:', error);
    res.status(500).json({ error: 'Failed to get position questions' });
  }
});

// Update position questions
app.put('/api/questions', async (req, res) => {
  try {
    const questions = req.body;
    const connection = await pool.getConnection();
    
    // Begin transaction
    await connection.beginTransaction();
    
    try {
      // Clear existing questions
      await connection.query('DELETE FROM position_questions');
      
      // Insert new questions
      for (const [position, positionQuestions] of Object.entries(questions)) {
        await connection.query(
          'INSERT INTO position_questions (position, questions) VALUES (?, ?)',
          [position, JSON.stringify(positionQuestions)]
        );
      }
      
      // Commit transaction
      await connection.commit();
      
      res.json({ success: true });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating position questions:', error);
    res.status(500).json({ error: 'Failed to update position questions' });
  }
});

module.exports = app;
