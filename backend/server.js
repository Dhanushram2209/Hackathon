require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || 'AC5cb66cf0a4209d0d22414fa973a59ad5';
const twilioApiKey = process.env.TWILIO_API_KEY || '26716487a7705ba09b4ecb735e1f9277';
const twilioApiSecret = process.env.TWILIO_API_SECRET || 'MnkYCUA1ysNzrjJo9T6FidGvgDBhpeX8PKHwmRu5Lc3xOSQ7tWfEbl40VIa2Zq';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true, // For Azure
    trustServerCertificate: true, // For local dev
    enableArithAbort: true
  }
};

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Database initialization function
async function initializeDatabase() {
  try {
    const pool = await sql.connect(dbConfig);

        // First check if Users table exists
    const tableCheck = await pool.request()
      .query("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users'");
    
    console.log(`Users table exists: ${tableCheck.recordset.length > 0}`);
    
    if (tableCheck.recordset.length === 0) {
      console.log('Creating tables...');
      // Rest of your table creation code
    } else {
      console.log('Tables already exist, skipping creation');
    }
    
    // Check if tables exist and create them if not
    // Check if tables exist and create them if not
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
    BEGIN
      CREATE TABLE Users (
        UserID INT PRIMARY KEY IDENTITY(1,1),
        Email NVARCHAR(100) UNIQUE NOT NULL,
        Password NVARCHAR(255) NOT NULL,
        FirstName NVARCHAR(50) NOT NULL,
        LastName NVARCHAR(50) NOT NULL,
        Role NVARCHAR(20) NOT NULL CHECK (Role IN ('patient', 'doctor','medical_owner')),
        CreatedAt DATETIME DEFAULT GETDATE(),
        LastLogin DATETIME NULL
      );
      
      CREATE TABLE PatientDetails (
        PatientID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT FOREIGN KEY REFERENCES Users(UserID),
        DateOfBirth DATE,
        Gender NVARCHAR(10),
        PhoneNumber NVARCHAR(20),
        Address NVARCHAR(255),
        EmergencyContact NVARCHAR(100),
        EmergencyPhone NVARCHAR(20)
      );
      

      CREATE TABLE MedicalOwnerDetails (
      OwnerID INT PRIMARY KEY IDENTITY(1,1),
      UserID INT FOREIGN KEY REFERENCES Users(UserID),
      CompanyName NVARCHAR(100),
      PhoneNumber NVARCHAR(20),
      BusinessAddress NVARCHAR(255),
      BusinessLicense NVARCHAR(50),
      TaxId NVARCHAR(50)
      );
 

      CREATE TABLE DoctorDetails (
        DoctorID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT FOREIGN KEY REFERENCES Users(UserID),
        Specialization NVARCHAR(100),
        LicenseNumber NVARCHAR(50),
        PhoneNumber NVARCHAR(20),
        HospitalAffiliation NVARCHAR(100)
      );

      CREATE TABLE PatientHealthData (
        RecordID INT PRIMARY KEY IDENTITY(1,1),
        PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
        BloodPressure NVARCHAR(20),
        HeartRate INT,
        BloodSugar INT,
        OxygenLevel INT,
        Notes NVARCHAR(500),
        RecordedAt DATETIME DEFAULT GETDATE()
      );

      CREATE TABLE PatientRiskScores (
        ScoreID INT PRIMARY KEY IDENTITY(1,1),
        PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
        RiskScore INT,
        CalculatedAt DATETIME DEFAULT GETDATE()
      );

      CREATE TABLE PatientAlerts (
        AlertID INT PRIMARY KEY IDENTITY(1,1),
        PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
        Message NVARCHAR(500),
        Severity NVARCHAR(20) CHECK (Severity IN ('Low', 'Medium', 'High')),
        Timestamp DATETIME DEFAULT GETDATE(),
        IsRead BIT DEFAULT 0
      );

      CREATE TABLE PatientMedications (
        MedicationID INT PRIMARY KEY IDENTITY(1,1),
        PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
        Name NVARCHAR(100),
        Dosage NVARCHAR(50),
        Frequency NVARCHAR(50),
        NextDose DATETIME,
        Status NVARCHAR(20) DEFAULT 'Pending',
        Notes NVARCHAR(500) -- Add Notes column here
      );

      CREATE TABLE PatientAppointments (
        AppointmentID INT PRIMARY KEY IDENTITY(1,1),
        PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
        DoctorID INT FOREIGN KEY REFERENCES DoctorDetails(DoctorID),
        DateTime DATETIME,
        Type NVARCHAR(50),
        Status NVARCHAR(20) DEFAULT 'Scheduled',
        Notes NVARCHAR(500)
      );

      CREATE TABLE TelemedicineRequests (
        RequestID INT PRIMARY KEY IDENTITY(1,1),
        PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
        DoctorID INT FOREIGN KEY REFERENCES DoctorDetails(DoctorID),
        RequestedAt DATETIME DEFAULT GETDATE(),
        PreferredDateTime DATETIME,
        Reason NVARCHAR(500),
        Symptoms NVARCHAR(500),
        Status NVARCHAR(20) DEFAULT 'Pending'
      );

      CREATE TABLE PatientPoints (
        PointID INT PRIMARY KEY IDENTITY(1,1),
        PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
        Points INT,
        Reason NVARCHAR(200),
        AwardedAt DATETIME DEFAULT GETDATE()
      );
      
      PRINT 'Tables created successfully';
    END
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MedicalStores')
    BEGIN
      CREATE TABLE MedicalStores (
        StoreID INT PRIMARY KEY IDENTITY(1,1),
        OwnerID INT FOREIGN KEY REFERENCES MedicalOwnerDetails(OwnerID),
        Name NVARCHAR(100) NOT NULL,
        Address NVARCHAR(255) NOT NULL,
        Phone NVARCHAR(20),
        Email NVARCHAR(100),
        Manager NVARCHAR(100),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      );
      
      CREATE TABLE Medicines (
        MedicineID INT PRIMARY KEY IDENTITY(1,1),
        Name NVARCHAR(100) NOT NULL,
        Category NVARCHAR(50),
        Description NVARCHAR(500),
        Manufacturer NVARCHAR(100),
        Dosage NVARCHAR(50),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      );
      
      CREATE TABLE Inventory (
        InventoryID INT PRIMARY KEY IDENTITY(1,1),
        StoreID INT FOREIGN KEY REFERENCES MedicalStores(StoreID),
        MedicineID INT FOREIGN KEY REFERENCES Medicines(MedicineID),
        Quantity INT DEFAULT 0,
        Price DECIMAL(10, 2) DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        UNIQUE(StoreID, MedicineID)
      );
      
      CREATE TABLE MedicalAlerts (
        AlertID INT PRIMARY KEY IDENTITY(1,1),
        StoreID INT FOREIGN KEY REFERENCES MedicalStores(StoreID) NULL,
        MedicineID INT FOREIGN KEY REFERENCES Medicines(MedicineID) NULL,
        Message NVARCHAR(500) NOT NULL,
        Severity NVARCHAR(20) CHECK (Severity IN ('Low', 'Medium', 'High')),
        IsRead BIT DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE()
      );
      
      PRINT 'Medical owner tables created successfully';

      CREATE TABLE Symptoms (
          SymptomID INT PRIMARY KEY IDENTITY(1,1),
          Name NVARCHAR(100) NOT NULL,
          Category NVARCHAR(50),
          Description NVARCHAR(500),
          CreatedAt DATETIME DEFAULT GETDATE()
      );

      CREATE TABLE SymptomQuestions (
          QuestionID INT PRIMARY KEY IDENTITY(1,1),
          QuestionText NVARCHAR(500) NOT NULL,
          SymptomID INT FOREIGN KEY REFERENCES Symptoms(SymptomID),
          InputType NVARCHAR(20) DEFAULT 'boolean', -- boolean, scale, multiple_choice
          Options NVARCHAR(1000), -- JSON string for multiple choice options
          CreatedAt DATETIME DEFAULT GETDATE()
      );

      CREATE TABLE PatientSymptomResponses (
          ResponseID INT PRIMARY KEY IDENTITY(1,1),
          PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
          QuestionID INT FOREIGN KEY REFERENCES SymptomQuestions(QuestionID),
          Response NVARCHAR(500),
          CreatedAt DATETIME DEFAULT GETDATE()
      );

      CREATE TABLE TriageAssessments (
          AssessmentID INT PRIMARY KEY IDENTITY(1,1),
          PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
          TriageLevel NVARCHAR(20) CHECK (TriageLevel IN ('Emergency', 'Urgent', 'Routine', 'Self-care')),
          ConfidenceScore DECIMAL(5,2),
          RecommendedAction NVARCHAR(500),
          SymptomsSummary NVARCHAR(1000),
          CreatedAt DATETIME DEFAULT GETDATE(),
          ReviewedByDoctor INT FOREIGN KEY REFERENCES DoctorDetails(DoctorID) NULL,
          ReviewStatus NVARCHAR(20) DEFAULT 'Pending' CHECK (ReviewStatus IN ('Pending', 'Approved', 'Modified', 'Rejected'))
      );

      CREATE TABLE SymptomAssessments (
        AssessmentID INT PRIMARY KEY IDENTITY(1,1),
        PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
        Symptoms NVARCHAR(MAX) NOT NULL, -- JSON string of symptoms and responses
        TriageLevel NVARCHAR(20) CHECK (TriageLevel IN ('Emergency', 'Urgent', 'Routine', 'Self-care')),
        ConfidenceScore DECIMAL(5,2),
        RecommendedAction NVARCHAR(500),
        CreatedAt DATETIME DEFAULT GETDATE(),
        ReviewedByDoctor INT FOREIGN KEY REFERENCES DoctorDetails(DoctorID) NULL,
        ReviewStatus NVARCHAR(20) DEFAULT 'Pending' CHECK (ReviewStatus IN ('Pending', 'Approved', 'Modified', 'Rejected'))
    );
    END
  `);
    
    console.log('Database tables verified');
    return pool;
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

// Initialize database connection
let dbPool;
initializeDatabase()
  .then(pool => {
    dbPool = pool;
    console.log('Database connection established');
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { email, password, firstName, lastName, role, ...details } = req.body;

  try {
    // Check if user already exists
    const userCheck = await dbPool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');

    if (userCheck.recordset.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await dbPool.request()
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashedPassword)
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('role', sql.NVarChar, role)
      .query('INSERT INTO Users (Email, Password, FirstName, LastName, Role) OUTPUT INSERTED.UserID VALUES (@email, @password, @firstName, @lastName, @role)');

    const userId = result.recordset[0].UserID;

    // Insert role-specific details
    if (role === 'patient') {
      await dbPool.request()
        .input('userId', sql.Int, userId)
        .input('dateOfBirth', sql.Date, details.dateOfBirth)
        .input('gender', sql.NVarChar, details.gender)
        .input('phoneNumber', sql.NVarChar, details.phoneNumber)
        .input('address', sql.NVarChar, details.address)
        .input('emergencyContact', sql.NVarChar, details.emergencyContact)
        .input('emergencyPhone', sql.NVarChar, details.emergencyPhone)
        .query('INSERT INTO PatientDetails (UserID, DateOfBirth, Gender, PhoneNumber, Address, EmergencyContact, EmergencyPhone) VALUES (@userId, @dateOfBirth, @gender, @phoneNumber, @address, @emergencyContact, @emergencyPhone)');
    } else if (role === 'doctor') {
      await dbPool.request()
        .input('userId', sql.Int, userId)
        .input('specialization', sql.NVarChar, details.specialization)
        .input('licenseNumber', sql.NVarChar, details.licenseNumber)
        .input('phoneNumber', sql.NVarChar, details.phoneNumber)
        .input('hospitalAffiliation', sql.NVarChar, details.hospitalAffiliation)
        .query('INSERT INTO DoctorDetails (UserID, Specialization, LicenseNumber, PhoneNumber, HospitalAffiliation) VALUES (@userId, @specialization, @licenseNumber, @phoneNumber, @hospitalAffiliation)');
    } else if (role === 'medical_owner') {
      await dbPool.request()
        .input('userId', sql.Int, userId)
        .input('companyName', sql.NVarChar, details.companyName)
        .input('phoneNumber', sql.NVarChar, details.phoneNumber)
        .input('businessAddress', sql.NVarChar, details.businessAddress)
        .input('businessLicense', sql.NVarChar, details.businessLicense)
        .input('taxId', sql.NVarChar, details.taxId)
        .query('INSERT INTO MedicalOwnerDetails (UserID, CompanyName, PhoneNumber, BusinessAddress, BusinessLicense, TaxId) VALUES (@userId, @companyName, @phoneNumber, @businessAddress, @businessLicense, @taxId)');
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await dbPool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.Password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await dbPool.request()
      .input('userId', sql.Int, user.UserID)
      .query('UPDATE Users SET LastLogin = GETDATE() WHERE UserID = @userId');

    // Create token
    const token = jwt.sign(
      { userId: user.UserID, email: user.Email, role: user.Role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      user: { 
        email: user.Email, 
        firstName: user.FirstName, 
        lastName: user.LastName, 
        role: user.Role 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Patient Data Endpoints
app.get('/api/patient/health-data', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT * FROM PatientHealthData 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY RecordedAt DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching health data:', error);
    res.status(500).json({ message: 'Failed to fetch health data' });
  }
});

app.post('/api/patient/health-data', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const { bloodPressure, heartRate, bloodSugar, oxygenLevel, notes } = req.body;
    
    await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('bloodPressure', sql.NVarChar, bloodPressure)
      .input('heartRate', sql.Int, heartRate)
      .input('bloodSugar', sql.Int, bloodSugar)
      .input('oxygenLevel', sql.Int, oxygenLevel)
      .input('notes', sql.NVarChar, notes || null)
      .query(`
        INSERT INTO PatientHealthData 
        (PatientID, BloodPressure, HeartRate, BloodSugar, OxygenLevel, Notes, RecordedAt)
        VALUES (@patientId, @bloodPressure, @heartRate, @bloodSugar, @oxygenLevel, @notes, GETDATE())
      `);
    
    // Trigger AI analysis
    await analyzePatientData(req.user.userId);
    
    res.status(201).json({ message: 'Health data recorded successfully' });
  } catch (error) {
    console.error('Error recording health data:', error);
    res.status(500).json({ message: 'Failed to record health data' });
  }
});

app.get('/api/patient/risk-score', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT TOP 1 RiskScore FROM PatientRiskScores 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY CalculatedAt DESC
      `);
    
    res.json({ score: result.recordset.length > 0 ? result.recordset[0].RiskScore : 0 });
  } catch (error) {
    console.error('Error fetching risk score:', error);
    res.status(500).json({ message: 'Failed to fetch risk score' });
  }
});

// Add this endpoint before the error handling middleware
app.get('/api/patient/vitals', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT TOP 1 
          BloodPressure as bloodPressure,
          HeartRate as heartRate,
          BloodSugar as bloodSugar,
          OxygenLevel as oxygenLevel
        FROM PatientHealthData 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY RecordedAt DESC
      `);
    
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({ message: 'Failed to fetch vitals' });
  }
});

// AI Analysis Function
async function analyzePatientData(userId) {
  try {
    // Get patient's recent health data
    const healthData = await dbPool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT TOP 10 * FROM PatientHealthData 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY RecordedAt DESC
      `);
    
    if (healthData.recordset.length === 0) return;
    
    // Simple risk calculation (replace with actual ML model in production)
    const latestData = healthData.recordset[0];
    let riskScore = 0;
    
    // Blood pressure risk
    const [systolic, diastolic] = latestData.BloodPressure.split('/').map(Number);
    if (systolic > 140 || diastolic > 90) riskScore += 30;
    else if (systolic > 130 || diastolic > 85) riskScore += 15;
    
    // Heart rate risk
    if (latestData.HeartRate > 100 || latestData.HeartRate < 60) riskScore += 20;
    else if (latestData.HeartRate > 90 || latestData.HeartRate < 65) riskScore += 10;
    
    // Blood sugar risk
    if (latestData.BloodSugar > 140) riskScore += 25;
    else if (latestData.BloodSugar > 120) riskScore += 12;
    
    // Oxygen level risk
    if (latestData.OxygenLevel < 92) riskScore += 25;
    else if (latestData.OxygenLevel < 95) riskScore += 10;
    
    // Cap at 100
    riskScore = Math.min(100, riskScore);
    
    // Save risk score
    await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('riskScore', sql.Int, riskScore)
      .query(`
        INSERT INTO PatientRiskScores (PatientID, RiskScore, CalculatedAt)
        VALUES (@patientId, @riskScore, GETDATE())
      `);
    
    // Generate alerts if needed
    if (riskScore > 70) {
      await generateAlert(userId, 'High risk detected. Please consult your doctor immediately.', 'High');
    } else if (riskScore > 40) {
      await generateAlert(userId, 'Moderate risk detected. Monitor your condition closely.', 'Medium');
    }
    
  } catch (error) {
    console.error('AI analysis error:', error);
  }
}

async function generateAlert(userId, message, severity) {
  try {
    await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('message', sql.NVarChar, message)
      .input('severity', sql.NVarChar, severity)
      .query(`
        INSERT INTO PatientAlerts (PatientID, Message, Severity, Timestamp, IsRead)
        VALUES (@patientId, @message, @severity, GETDATE(), 0)
      `);
  } catch (error) {
    console.error('Error generating alert:', error);
  }
}

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: dbPool ? 'Connected' : 'Disconnected' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  if (dbPool) {
    await dbPool.close();
    console.log('Database connection closed');
  }
  process.exit(0);
});
// Add these endpoints to your server.js file

// Get patient medications
app.get('/api/patient/medications', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT * FROM PatientMedications 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY NextDose ASC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ message: 'Failed to fetch medications' });
  }
});

app.get('/api/doctor/patient/:id/medications', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    const patientId = req.params.id;
    
    const result = await dbPool.request()
      .input('patientId', sql.Int, patientId)
      .query(`
        SELECT * FROM PatientMedications 
        WHERE PatientID = @patientId
        ORDER BY NextDose ASC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching patient medications:', error);
    res.status(500).json({ message: 'Failed to fetch patient medications' });
  }
});

// Get patient alerts
app.get('/api/patient/alerts', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT * FROM PatientAlerts 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY Timestamp DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Failed to fetch alerts' });
  }
});

// Get patient appointments
app.get('/api/patient/appointments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT a.*, d.FirstName + ' ' + d.LastName as DoctorName 
        FROM PatientAppointments a
        JOIN DoctorDetails dd ON a.DoctorID = dd.DoctorID
        JOIN Users d ON dd.UserID = d.UserID
        WHERE a.PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY a.DateTime DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// Get patient points
app.get('/api/patient/points', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT SUM(Points) as points FROM PatientPoints
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
      `);
    
    res.json({ points: result.recordset[0].points || 0 });
  } catch (error) {
    console.error('Error fetching points:', error);
    res.status(500).json({ message: 'Failed to fetch points' });
  }
});

// Get all doctors
app.get('/api/doctors', authenticateToken, async (req, res) => {
  try {
    const result = await dbPool.request()
      .query(`
        SELECT 
          dd.DoctorID as id, 
          u.FirstName + ' ' + u.LastName as name, 
          dd.Specialization as specialization,
          dd.HospitalAffiliation as hospital,
          dd.PhoneNumber as phone,
          u.Email as email
        FROM DoctorDetails dd
        JOIN Users u ON dd.UserID = u.UserID
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Failed to fetch doctors' });
  }
});

// Submit telemedicine request
app.post('/api/telemedicine/request', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const { doctorId, preferredDateTime, reason, symptoms } = req.body;
    
    await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('doctorId', sql.Int, doctorId)
      .input('preferredDateTime', sql.DateTime, preferredDateTime)
      .input('reason', sql.NVarChar, reason)
      .input('symptoms', sql.NVarChar, symptoms || null)
      .query(`
        INSERT INTO TelemedicineRequests 
        (PatientID, DoctorID, PreferredDateTime, Reason, Symptoms)
        VALUES (@patientId, @doctorId, @preferredDateTime, @reason, @symptoms)
      `);
    
    // Award points for engagement
    await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('points', sql.Int, 10)
      .input('reason', sql.NVarChar, 'Telemedicine request submission')
      .query(`
        INSERT INTO PatientPoints 
        (PatientID, Points, Reason)
        VALUES (@patientId, @points, @reason)
      `);
    
    res.status(201).json({ message: 'Telemedicine request submitted successfully' });
  } catch (error) {
    console.error('Error submitting telemedicine request:', error);
    res.status(500).json({ message: 'Failed to submit telemedicine request' });
  }
});

// Mark medication as taken
app.post('/api/patient/medications/:id/taken', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    await dbPool.request()
      .input('medicationId', sql.Int, req.params.id)
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .query(`
        UPDATE PatientMedications 
        SET Status = 'Taken' 
        WHERE MedicationID = @medicationId AND PatientID = @patientId
      `);
    
    // Award points for medication adherence
    await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('points', sql.Int, 5)
      .input('reason', sql.NVarChar, 'Medication adherence')
      .query(`
        INSERT INTO PatientPoints 
        (PatientID, Points, Reason)
        VALUES (@patientId, @points, @reason)
      `);
    
    res.json({ message: 'Medication marked as taken' });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({ message: 'Failed to update medication' });
  }
});

// Mark alert as read
app.post('/api/patient/alerts/:id/read', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    await dbPool.request()
      .input('alertId', sql.Int, req.params.id)
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .query(`
        UPDATE PatientAlerts 
        SET IsRead = 1 
        WHERE AlertID = @alertId AND PatientID = @patientId
      `);
    
    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ message: 'Failed to update alert' });
  }
});


// Get patient profile
app.get('/api/patient/profile', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    // Get basic user info
    const userResult = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT FirstName, LastName, Email, Role FROM Users WHERE UserID = @userId');
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.recordset[0];
    
    // Get patient details
    const patientResult = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT DateOfBirth, Gender, PhoneNumber, Address, EmergencyContact, EmergencyPhone 
        FROM PatientDetails 
        WHERE UserID = @userId
      `);
    
    // Combine the data
    const profileData = {
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email,
      role: user.Role,
      dateOfBirth: patientResult.recordset[0]?.DateOfBirth,
      gender: patientResult.recordset[0]?.Gender,
      phoneNumber: patientResult.recordset[0]?.PhoneNumber,
      address: patientResult.recordset[0]?.Address,
      emergencyContact: patientResult.recordset[0]?.EmergencyContact,
      emergencyPhone: patientResult.recordset[0]?.EmergencyPhone
    };
    
    res.json(profileData);
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({ message: 'Failed to fetch patient profile' });
  }
});

// Get doctor profile
app.get('/api/doctor/profile', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    // Get basic user info
    const userResult = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT FirstName, LastName, Email, Role FROM Users WHERE UserID = @userId');
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.recordset[0];
    
    // Get doctor details
    const doctorResult = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT Specialization, LicenseNumber, PhoneNumber, HospitalAffiliation 
        FROM DoctorDetails 
        WHERE UserID = @userId
      `);
    
    // Combine the data
    const profileData = {
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email,
      role: user.Role,
      specialization: doctorResult.recordset[0]?.Specialization,
      licenseNumber: doctorResult.recordset[0]?.LicenseNumber,
      phoneNumber: doctorResult.recordset[0]?.PhoneNumber,
      hospitalAffiliation: doctorResult.recordset[0]?.HospitalAffiliation
    };
    
    res.json(profileData);
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    res.status(500).json({ message: 'Failed to fetch doctor profile' });
  }
});

// Generic profile endpoint that routes based on role
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'patient') {
      // Forward to patient profile endpoint
      req.url = '/api/patient/profile';
      return app.handle(req, res);
    } else if (req.user.role === 'doctor') {
      // Forward to doctor profile endpoint
      req.url = '/api/doctor/profile';
      return app.handle(req, res);
    } else if (req.user.role === 'medical_owner') {
      // Forward to medical owner profile endpoint
      req.url = '/api/medical-owner/profile';
      return app.handle(req, res);
    } else {
      return res.status(403).json({ message: 'Unknown role' });
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Get all patients for doctors
app.get('/api/doctor/patients', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request().query(`
      SELECT 
        p.PatientID as id,
        u.FirstName + ' ' + u.LastName as name,
        pd.DateOfBirth as dob,
        pd.Gender as gender,
        pd.PhoneNumber as phone,
        u.Email as email,
        (SELECT TOP 1 RiskScore FROM PatientRiskScores 
         WHERE PatientID = p.PatientID 
         ORDER BY CalculatedAt DESC) as riskScore,
        (SELECT COUNT(*) FROM PatientAlerts 
         WHERE PatientID = p.PatientID AND IsRead = 0) as unreadAlerts,
        (SELECT COUNT(*) FROM PatientMedications 
         WHERE PatientID = p.PatientID AND Status = 'Pending') as pendingMeds
      FROM PatientDetails p
      JOIN Users u ON p.UserID = u.UserID
      LEFT JOIN PatientDetails pd ON p.PatientID = pd.PatientID
      ORDER BY u.LastName, u.FirstName
    `);

    // Process the data to add status information
    const patients = result.recordset.map(patient => {
      let status = 'Normal';
      if (patient.riskScore > 70) status = 'Critical';
      else if (patient.riskScore > 40) status = 'Warning';

      return {
        ...patient,
        status,
        lastReading: patient.riskScore ? `Risk: ${patient.riskScore}` : 'No data',
        lastChecked: 'Today', // You can modify this to show actual last check date
        pendingActions: patient.pendingMeds + patient.unreadAlerts
      };
    });

    res.json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Failed to fetch patients' });
  }
});


// Get detailed patient info for doctors
app.get('/api/doctor/patient/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    const patientId = req.params.id;
    
    // Get basic patient info
    const patientResult = await dbPool.request()
      .input('patientId', sql.Int, patientId)
      .query(`
        SELECT 
          u.FirstName, u.LastName, u.Email,
          pd.DateOfBirth, pd.Gender, pd.PhoneNumber, 
          pd.Address, pd.EmergencyContact, pd.EmergencyPhone
        FROM PatientDetails pd
        JOIN Users u ON pd.UserID = u.UserID
        WHERE pd.PatientID = @patientId
      `);
    
    if (patientResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    const patient = patientResult.recordset[0];
    
    // Get health data
    const healthData = await dbPool.request()
      .input('patientId', sql.Int, patientId)
      .query(`
        SELECT TOP 10 * FROM PatientHealthData
        WHERE PatientID = @patientId
        ORDER BY RecordedAt DESC
      `);
    
    // Get medications
    const medications = await dbPool.request()
      .input('patientId', sql.Int, patientId)
      .query(`
        SELECT * FROM PatientMedications
        WHERE PatientID = @patientId
        ORDER BY NextDose ASC
      `);
    
    // Get risk scores
    const riskScores = await dbPool.request()
      .input('patientId', sql.Int, patientId)
      .query(`
        SELECT TOP 5 * FROM PatientRiskScores
        WHERE PatientID = @patientId
        ORDER BY CalculatedAt DESC
      `);
    
    res.json({
      profile: {
        name: `${patient.FirstName} ${patient.LastName}`,
        email: patient.Email,
        dob: patient.DateOfBirth,
        gender: patient.Gender,
        phone: patient.PhoneNumber,
        address: patient.Address,
        emergencyContact: patient.EmergencyContact,
        emergencyPhone: patient.EmergencyPhone
      },
      healthData: healthData.recordset,
      medications: medications.recordset,
      riskScores: riskScores.recordset
    });
  } catch (error) {
    console.error('Error fetching patient details:', error);
    res.status(500).json({ message: 'Failed to fetch patient details' });
  }
});


// Get doctor's appointments
app.get('/api/doctor/appointments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    const doctorId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT DoctorID FROM DoctorDetails WHERE UserID = @userId')
    ).recordset[0].DoctorID;

    const result = await dbPool.request()
      .input('doctorId', sql.Int, doctorId)
      .query(`
        SELECT 
          a.AppointmentID as appointmentId,
          p.PatientID as patientId,
          u.FirstName + ' ' + u.LastName as patientName,
          a.DateTime as dateTime,
          a.Type as type,
          a.Status as status,
          a.Notes as notes
        FROM PatientAppointments a
        JOIN PatientDetails p ON a.PatientID = p.PatientID
        JOIN Users u ON p.UserID = u.UserID
        WHERE a.DoctorID = @doctorId
        ORDER BY a.DateTime DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// Get doctor's alerts
app.get('/api/doctor/alerts', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    const doctorId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT DoctorID FROM DoctorDetails WHERE UserID = @userId')
    ).recordset[0].DoctorID;

    let query = `
      SELECT 
        a.AlertID as alertId,
        p.PatientID as patientId,
        u.FirstName + ' ' + u.LastName as patientName,
        a.Message as message,
        a.Severity as severity,
        a.Timestamp as timestamp,
        a.IsRead as isRead
      FROM PatientAlerts a
      JOIN PatientDetails p ON a.PatientID = p.PatientID
      JOIN Users u ON p.UserID = u.UserID
      WHERE p.PatientID IN (
        SELECT PatientID FROM PatientAppointments WHERE DoctorID = @doctorId
      )
    `;

    if (req.query.unread) {
      query += ' AND a.IsRead = 0';
    }

    query += ' ORDER BY a.Timestamp DESC';

    if (req.query.limit) {
      query += ` OFFSET 0 ROWS FETCH NEXT ${parseInt(req.query.limit)} ROWS ONLY`;
    }

    const result = await dbPool.request()
      .input('doctorId', sql.Int, doctorId)
      .query(query);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching doctor alerts:', error);
    res.status(500).json({ message: 'Failed to fetch alerts' });
  }
});

// Mark alert as read
app.post('/api/doctor/alerts/:id/read', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    await dbPool.request()
      .input('alertId', sql.Int, req.params.id)
      .query(`
        UPDATE PatientAlerts 
        SET IsRead = 1 
        WHERE AlertID = @alertId
      `);
    
    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ message: 'Failed to update alert' });
  }
});


// Get patient appointments
app.get('/api/patient/appointments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT a.*, 
               d.FirstName + ' ' + d.LastName as DoctorName,
               dd.Specialization as DoctorSpecialization
        FROM PatientAppointments a
        JOIN DoctorDetails dd ON a.DoctorID = dd.DoctorID
        JOIN Users d ON dd.UserID = d.UserID
        WHERE a.PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY a.DateTime DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// Create new appointment
app.post('/api/patient/appointments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const { doctorId, dateTime, type, notes } = req.body;
    
    const result = await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('doctorId', sql.Int, doctorId)
      .input('dateTime', sql.DateTime, dateTime)
      .input('type', sql.NVarChar, type)
      .input('notes', sql.NVarChar, notes || null)
      .query(`
        INSERT INTO PatientAppointments 
        (PatientID, DoctorID, DateTime, Type, Notes, Status)
        VALUES (@patientId, @doctorId, @dateTime, @type, @notes, 'Scheduled')
      `);
    
    res.status(201).json({ message: 'Appointment created successfully' });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ message: 'Failed to create appointment' });
  }
});

// Update appointment status
app.put('/api/appointments/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    await dbPool.request()
      .input('appointmentId', sql.Int, req.params.id)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE PatientAppointments 
        SET Status = @status 
        WHERE AppointmentID = @appointmentId
      `);
    
    res.json({ message: 'Appointment status updated' });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ message: 'Failed to update appointment' });
  }
});

// Get doctor's appointments
app.get('/api/doctor/appointments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    const doctorId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT DoctorID FROM DoctorDetails WHERE UserID = @userId')
    ).recordset[0].DoctorID;

    const result = await dbPool.request()
      .input('doctorId', sql.Int, doctorId)
      .query(`
        SELECT 
          a.AppointmentID as appointmentId,
          p.PatientID as patientId,
          u.FirstName + ' ' + u.LastName as patientName,
          a.DateTime as dateTime,
          a.Type as type,
          a.Status as status,
          a.Notes as notes
        FROM PatientAppointments a
        JOIN PatientDetails p ON a.PatientID = p.PatientID
        JOIN Users u ON p.UserID = u.UserID
        WHERE a.DoctorID = @doctorId
        ORDER BY a.DateTime DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// Add this endpoint
app.post('/api/doctor/prescribe-medication', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    const { patientId, name, dosage, frequency, notes } = req.body;
    
    // Calculate next dose time (default to now + 1 day)
    const nextDose = new Date();
    nextDose.setDate(nextDose.getDate() + 1);
    
    await dbPool.request()
      .input('patientId', sql.Int, patientId)
      .input('name', sql.NVarChar, name)
      .input('dosage', sql.NVarChar, dosage)
      .input('frequency', sql.NVarChar, frequency)
      .input('nextDose', sql.DateTime, nextDose)
      .input('notes', sql.NVarChar, notes || null)
      .query(`
        INSERT INTO PatientMedications 
        (PatientID, Name, Dosage, Frequency, NextDose, Notes, Status)
        VALUES (@patientId, @name, @dosage, @frequency, @nextDose, @notes, 'Pending')
      `);
    
    // Mark appointment as completed
    await dbPool.request()
      .input('patientId', sql.Int, patientId)
      .input('doctorId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT DoctorID FROM DoctorDetails WHERE UserID = @userId')
        ).recordset[0].DoctorID
      )
      .query(`
        UPDATE PatientAppointments 
        SET Status = 'Completed' 
        WHERE PatientID = @patientId AND DoctorID = @doctorId
        AND Status = 'Scheduled'
      `);
    
    res.status(201).json({ message: 'Medication prescribed successfully' });
  } catch (error) {
    console.error('Error prescribing medication:', error);
    res.status(500).json({ message: 'Failed to prescribe medication' });
  }
});


// AI Prediction Endpoint
app.get('/api/patient/ai-predictions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    // In a real app, you would call your ML model here
    // This is a simplified mock response
    
    // Get patient's recent health data
    const healthData = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT TOP 30 * FROM PatientHealthData 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY RecordedAt DESC
      `);
    
    if (healthData.recordset.length === 0) {
      return res.json(null);
    }
    
    // Mock prediction - in reality you would use a trained model
    const mockPredictions = generateMockPredictions(healthData.recordset);
    
    res.json(mockPredictions);
  } catch (error) {
    console.error('AI prediction error:', error);
    res.status(500).json({ message: 'Failed to generate predictions' });
  }
});

// AI Recommendations Endpoint
app.get('/api/patient/ai-recommendations', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    // Get patient's recent health data and risk score
    const [healthData, riskScore] = await Promise.all([
      dbPool.request()
        .input('userId', sql.Int, req.user.userId)
        .query(`
          SELECT TOP 10 * FROM PatientHealthData 
          WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
          ORDER BY RecordedAt DESC
        `),
      dbPool.request()
        .input('userId', sql.Int, req.user.userId)
        .query(`
          SELECT TOP 1 RiskScore FROM PatientRiskScores 
          WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
          ORDER BY CalculatedAt DESC
        `)
    ]);
    
    // Generate mock recommendations based on data
    const recommendations = generateMockRecommendations(
      healthData.recordset, 
      riskScore.recordset[0]?.RiskScore || 0
    );
    
    res.json(recommendations);
  } catch (error) {
    console.error('AI recommendations error:', error);
    res.status(500).json({ message: 'Failed to generate recommendations' });
  }
});

// AI Simulation Endpoint
app.post('/api/patient/ai-simulate', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const { days, includeExercise, includeDiet, includeMedication } = req.body;
    
    // Get patient's recent health data
    const healthData = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT TOP 30 * FROM PatientHealthData 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY RecordedAt DESC
      `);
    
    if (healthData.recordset.length === 0) {
      return res.status(400).json({ message: 'Not enough health data for simulation' });
    }
    
    // Generate mock simulation results based on parameters
    const simulationResults = generateMockSimulation(
      healthData.recordset,
      days,
      includeExercise,
      includeDiet,
      includeMedication
    );
    
    res.json(simulationResults);
  } catch (error) {
    console.error('AI simulation error:', error);
    res.status(500).json({ message: 'Failed to run simulation' });
  }
});

// AI Assistant Endpoint
app.post('/api/patient/ai-assistant', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const { message, healthData, medications, vitals, riskScore } = req.body;
    
    // In a real app, you would integrate with an NLP service or LLM
    // This is a simplified mock response
    
    const response = generateMockAssistantResponse(
      message, 
      healthData, 
      medications, 
      vitals, 
      riskScore
    );
    
    res.json(response);
  } catch (error) {
    console.error('AI assistant error:', error);
    res.status(500).json({ message: 'Failed to process your request' });
  }
});

app.post('/api/doctor/prescriptions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    const { patientId, medication, dosage, frequency, duration, instructions, startDate, endDate } = req.body;
    
    // Calculate next dose time based on frequency
    let nextDose = new Date(startDate);
    const now = new Date();
    
    // If start date is in the past, set next dose to now + frequency interval
    if (nextDose < now) {
      nextDose = new Date();
      // Add time based on frequency
      switch (frequency.toLowerCase()) {
        case 'once daily':
          nextDose.setHours(nextDose.getHours() + 24);
          break;
        case 'twice daily':
          nextDose.setHours(nextDose.getHours() + 12);
          break;
        case 'three times daily':
          nextDose.setHours(nextDose.getHours() + 8);
          break;
        case 'as needed':
          nextDose.setHours(nextDose.getHours() + 24);
          break;
        default:
          nextDose.setHours(nextDose.getHours() + 24);
      }
    }
    
    await dbPool.request()
      .input('patientId', sql.Int, patientId)
      .input('name', sql.NVarChar, medication)
      .input('dosage', sql.NVarChar, dosage)
      .input('frequency', sql.NVarChar, frequency)
      .input('nextDose', sql.DateTime, nextDose)
      .input('notes', sql.NVarChar, instructions || null)
      .query(`
        INSERT INTO PatientMedications 
        (PatientID, Name, Dosage, Frequency, NextDose, Notes, Status)
        VALUES (@patientId, @name, @dosage, @frequency, @nextDose, @notes, 'Pending')
      `);
    
    // Create alert with prescription details
    const alertMessage = `New prescription: ${medication} ${dosage} - ${frequency}. Duration: ${duration}, Start: ${startDate}, End: ${endDate}${instructions ? `. Instructions: ${instructions}` : ''}`;
    
    await dbPool.request()
      .input('patientId', sql.Int, patientId)
      .input('message', sql.NVarChar, alertMessage)
      .input('severity', sql.NVarChar, 'Medium')
      .query(`
        INSERT INTO PatientAlerts 
        (PatientID, Message, Severity, Timestamp, IsRead)
        VALUES (@patientId, @message, @severity, GETDATE(), 0)
      `);
    
    res.status(201).json({ message: 'Prescription added successfully' });
  } catch (error) {
    console.error('Error adding prescription:', error);
    res.status(500).json({ message: 'Failed to add prescription' });
  }
});

// Helper functions for mock data generation
function generateMockPredictions(healthData) {
  // This would be replaced with actual model predictions
  const predictions = [];
  const metrics = ['bloodPressure', 'heartRate', 'bloodSugar', 'oxygenLevel', 'riskScore'];
  const today = new Date();
  
  metrics.forEach(metric => {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Base value on last actual reading
      let baseValue = 0;
      if (healthData[0]) {
        switch (metric) {
          case 'bloodPressure':
            baseValue = healthData[0].BloodPressure;
            break;
          case 'heartRate':
            baseValue = healthData[0].HeartRate;
            break;
          case 'bloodSugar':
            baseValue = healthData[0].BloodSugar;
            break;
          case 'oxygenLevel':
            baseValue = healthData[0].OxygenLevel;
            break;
          case 'riskScore':
            baseValue = healthData[0].RiskScore || 50;
            break;
        }
      }
      
      // Add some variation
      const variation = (Math.random() * 0.2 - 0.1) * baseValue;
      let value = baseValue + variation;
      
      // Ensure values stay in reasonable ranges
      if (metric === 'bloodPressure') {
        const [systolic, diastolic] = value.split('/').map(Number);
        value = `${Math.max(80, Math.min(180, systolic))}/${Math.max(50, Math.min(120, diastolic))}`;
      } else if (metric === 'heartRate') {
        value = Math.max(50, Math.min(150, value));
      } else if (metric === 'bloodSugar') {
        value = Math.max(70, Math.min(300, value));
      } else if (metric === 'oxygenLevel') {
        value = Math.max(85, Math.min(100, value));
      } else if (metric === 'riskScore') {
        value = Math.max(0, Math.min(100, value));
      }
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        metric,
        value
      });
    }
  });
  
  return predictions;
}

function generateMockRecommendations(healthData, riskScore) {
  const recommendations = [];
  
  // Generate recommendations based on risk score and health data
  if (riskScore > 70) {
    recommendations.push({
      category: 'Critical Alert',
      recommendation: 'Your risk score is high. Please consult with your doctor immediately.',
      priority: 'high',
      expectedImpact: 30
    });
  } else if (riskScore > 40) {
    recommendations.push({
      category: 'Warning',
      recommendation: 'Your risk score is elevated. Consider scheduling a check-up.',
      priority: 'high',
      expectedImpact: 20
    });
  }
  
  // Analyze blood pressure
  if (healthData.length > 0) {
    const latest = healthData[0];
    const [systolic, diastolic] = latest.BloodPressure.split('/').map(Number);
    
    if (systolic > 140 || diastolic > 90) {
      recommendations.push({
        category: 'Blood Pressure',
        recommendation: 'Your blood pressure is high. Reduce sodium intake and increase physical activity.',
        priority: systolic > 160 || diastolic > 100 ? 'high' : 'medium',
        expectedImpact: 15
      });
    }
  }
  
  // Add general health recommendations
  recommendations.push(
    {
      category: 'Exercise',
      recommendation: 'Aim for at least 30 minutes of moderate exercise 5 days a week.',
      priority: 'medium',
      expectedImpact: 10
    },
    {
      category: 'Nutrition',
      recommendation: 'Increase your intake of fruits and vegetables to at least 5 servings per day.',
      priority: 'medium',
      expectedImpact: 8
    },
    {
      category: 'Sleep',
      recommendation: 'Maintain a consistent sleep schedule with 7-9 hours of sleep per night.',
      priority: 'medium',
      expectedImpact: 12
    }
  );
  
  return recommendations;
}

function generateMockSimulation(healthData, days, includeExercise, includeDiet, includeMedication) {
  // Similar to generateMockPredictions but takes simulation parameters into account
  const predictions = [];
  const metrics = ['bloodPressure', 'heartRate', 'bloodSugar', 'oxygenLevel', 'riskScore'];
  const today = new Date();
  
  metrics.forEach(metric => {
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      let baseValue = 0;
      if (healthData[0]) {
        switch (metric) {
          case 'bloodPressure':
            baseValue = healthData[0].BloodPressure;
            break;
          case 'heartRate':
            baseValue = healthData[0].HeartRate;
            break;
          case 'bloodSugar':
            baseValue = healthData[0].BloodSugar;
            break;
          case 'oxygenLevel':
            baseValue = healthData[0].OxygenLevel;
            break;
          case 'riskScore':
            baseValue = healthData[0].RiskScore || 50;
            break;
        }
      }
      
      // Apply simulation parameters
      let improvementFactor = 1;
      if (includeExercise) improvementFactor *= 0.98;
      if (includeDiet) improvementFactor *= 0.95;
      if (includeMedication) improvementFactor *= 0.9;
      
      // Add some variation with improvement trend
      const variation = (Math.random() * 0.1 - 0.05) * baseValue;
      let value = baseValue * Math.pow(improvementFactor, i) + variation;
      
      // Ensure values stay in reasonable ranges
      if (metric === 'bloodPressure') {
        const [systolic, diastolic] = value.split('/').map(Number);
        value = `${Math.max(80, Math.min(180, systolic))}/${Math.max(50, Math.min(120, diastolic))}`;
      } else if (metric === 'heartRate') {
        value = Math.max(50, Math.min(150, value));
      } else if (metric === 'bloodSugar') {
        value = Math.max(70, Math.min(300, value));
      } else if (metric === 'oxygenLevel') {
        value = Math.max(85, Math.min(100, value));
      } else if (metric === 'riskScore') {
        value = Math.max(0, Math.min(100, value));
      }
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        metric,
        value
      });
    }
  });
  
  return predictions;
}

function generateMockAssistantResponse(message, healthData, medications, vitals, riskScore) {
  // Simple keyword-based response - in reality you'd use NLP
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('blood pressure') || lowerMessage.includes('bp')) {
    return {
      response: `Your recent blood pressure reading is ${vitals?.bloodPressure || 'unknown'}. ` +
        `Normal blood pressure is below 120/80. If your reading is consistently above this, ` +
        `consider lifestyle changes or consult your doctor.`,
      sources: ['CDC Blood Pressure Guidelines']
    };
  } else if (lowerMessage.includes('heart rate') || lowerMessage.includes('pulse')) {
    return {
      response: `Your recent heart rate is ${vitals?.heartRate || 'unknown'} bpm. ` +
        `A normal resting heart rate for adults is between 60-100 bpm. ` +
        `Regular exercise can help lower your resting heart rate over time.`,
      sources: ['American Heart Association']
    };
  } else if (lowerMessage.includes('risk score')) {
    return {
      response: `Your current health risk score is ${riskScore || 'unknown'} out of 100. ` +
        `Scores above 70 indicate high risk, 40-70 moderate risk, and below 40 low risk. ` +
        `This score is based on your health metrics and trends.`,
      sources: ['Internal Risk Model']
    };
  } else if (lowerMessage.includes('medication') && medications?.length > 0) {
    const medList = medications.map(m => `${m.Name} (${m.Dosage})`).join(', ');
    return {
      response: `You have ${medications.length} active medications: ${medList}. ` +
        `Always take medications as prescribed and consult your doctor before making changes.`,
      sources: ['Your Medication Records']
    };
  } else if (lowerMessage.includes('trend') || lowerMessage.includes('progress')) {
    return {
      response: `Based on your recent health data, your metrics are ${riskScore > 70 ? 'concerning' : riskScore > 40 ? 'moderate' : 'stable'}. ` +
        `The most significant factor is your ${riskScore > 70 ? 'elevated risk score' : riskScore > 40 ? 'moderate risk score' : 'healthy readings'}. ` +
        `Continue monitoring your health and follow your care plan.`,
      sources: ['Your Health Data Trends']
    };
  } else {
    return {
      response: `I'm your health assistant. I can help explain your health metrics, medications, ` +
        `and provide general health information. For specific medical advice, please consult your doctor. ` +
        `Try asking about your blood pressure, heart rate, or medications.`,
      sources: ['Health Assistant Knowledge Base']
    };
  }
}

// Add to your server.js
const OpenAI = require('openai');

// Initialize OpenAI with your secret key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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'
});

// AI Assistant Endpoint
app.post('/api/ai/assistant', authenticateToken, async (req, res) => {
  try {
    const { prompt, max_tokens = 500, temperature = 0.7 } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable and empathetic medical AI assistant. " +
            "Provide clear, accurate health information based on the patient's data. " +
            "Be concise but thorough. Always remind patients to consult their doctor " +
            "for medical advice. Format responses for easy reading with line breaks when needed."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens,
      temperature,
    });

    const answer = completion.choices[0]?.message?.content || 
      "I couldn't generate a response. Please try again.";

    res.json({ answer });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      answer: "I'm experiencing technical difficulties. Please try again later or contact support."
    });
  }
});

// Generate Twilio access token for video calls
app.post('/api/video/token', authenticateToken, async (req, res) => {
  try {
    const { identity, room } = req.body;
    
    // Create access token
    const token = new AccessToken(
      twilioAccountSid,
      twilioApiKey,
      twilioApiSecret,
      { identity }
    );

    // Grant video access
    const videoGrant = new VideoGrant({ room });
    token.addGrant(videoGrant);

    res.json({ token: token.toJwt() });
  } catch (error) {
    console.error('Error generating video token:', error);
    res.status(500).json({ message: 'Failed to generate video token' });
  }
});

// Start video call (updates appointment status)
app.post('/api/appointments/:id/start-call', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update appointment status
    await dbPool.request()
      .input('appointmentId', sql.Int, id)
      .query(`
        UPDATE PatientAppointments 
        SET Status = 'In Progress' 
        WHERE AppointmentID = @appointmentId
      `);
    
    res.json({ message: 'Appointment call started' });
  } catch (error) {
    console.error('Error starting call:', error);
    res.status(500).json({ message: 'Failed to start call' });
  }
});

// Get medical owner profile
app.get('/api/medical-owner/profile', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    // Get basic user info
    const userResult = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT FirstName, LastName, Email, Role FROM Users WHERE UserID = @userId');
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.recordset[0];
    
    // Get medical owner details
    const ownerResult = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT CompanyName, PhoneNumber, BusinessAddress, BusinessLicense, TaxId 
        FROM MedicalOwnerDetails 
        WHERE UserID = @userId
      `);
    
    // Combine the data
    const profileData = {
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email,
      role: user.Role,
      companyName: ownerResult.recordset[0]?.CompanyName,
      phoneNumber: ownerResult.recordset[0]?.PhoneNumber,
      businessAddress: ownerResult.recordset[0]?.BusinessAddress,
      businessLicense: ownerResult.recordset[0]?.BusinessLicense,
      taxId: ownerResult.recordset[0]?.TaxId
    };
    
    res.json(profileData);
  } catch (error) {
    console.error('Error fetching medical owner profile:', error);
    res.status(500).json({ message: 'Failed to fetch medical owner profile' });
  }
});

// Get medical facilities (for medical owners)
app.get('/api/medical-owner/facilities', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    // This would query facilities associated with this medical owner
    // You'll need to create a Facilities table and link it to MedicalOwnerDetails
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT * FROM Facilities 
        WHERE OwnerID = (SELECT OwnerID FROM MedicalOwnerDetails WHERE UserID = @userId)
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({ message: 'Failed to fetch facilities' });
  }
});

// Get statistics for medical owner dashboard
app.get('/api/medical-owner/statistics', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    // This would return statistics relevant to medical owners
    const stats = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT 
          (SELECT COUNT(*) FROM Doctors WHERE FacilityID IN 
            (SELECT FacilityID FROM Facilities WHERE OwnerID = 
              (SELECT OwnerID FROM MedicalOwnerDetails WHERE UserID = @userId)
            )
          ) as totalDoctors,
          (SELECT COUNT(*) FROM Patients WHERE PrimaryFacilityID IN 
            (SELECT FacilityID FROM Facilities WHERE OwnerID = 
              (SELECT OwnerID FROM MedicalOwnerDetails WHERE UserID = @userId)
            )
          ) as totalPatients,
          (SELECT COUNT(*) FROM Appointments WHERE FacilityID IN 
            (SELECT FacilityID FROM Facilities WHERE OwnerID = 
              (SELECT OwnerID FROM MedicalOwnerDetails WHERE UserID = @userId)
            ) AND Status = 'Scheduled'
          ) as upcomingAppointments
      `);
    
    res.json(stats.recordset[0]);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Medical Owner - Get all medicines
app.get('/api/medical-owner/medicines', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request().query(`
      SELECT * FROM Medicines ORDER BY Name
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching medicines:', error);
    res.status(500).json({ message: 'Failed to fetch medicines' });
  }
});

// Medical Owner - Add new medicine
app.post('/api/medical-owner/medicines', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    const { Name, Category, Description, Manufacturer, Dosage } = req.body;
    
    const result = await dbPool.request()
      .input('Name', sql.NVarChar, Name)
      .input('Category', sql.NVarChar, Category)
      .input('Description', sql.NVarChar, Description || null)
      .input('Manufacturer', sql.NVarChar, Manufacturer || null)
      .input('Dosage', sql.NVarChar, Dosage || null)
      .query(`
        INSERT INTO Medicines (Name, Category, Description, Manufacturer, Dosage)
        OUTPUT INSERTED.MedicineID
        VALUES (@Name, @Category, @Description, @Manufacturer, @Dosage)
      `);
    
    res.status(201).json({ 
      message: 'Medicine added successfully',
      medicineId: result.recordset[0].MedicineID
    });
  } catch (error) {
    console.error('Error adding medicine:', error);
    res.status(500).json({ message: 'Failed to add medicine' });
  }
});

// Medical Owner - Delete medicine
app.delete('/api/medical-owner/medicines/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    const medicineId = req.params.id;
    
    // First delete related inventory records
    await dbPool.request()
      .input('medicineId', sql.Int, medicineId)
      .query('DELETE FROM Inventory WHERE MedicineID = @medicineId');
    
    // Then delete the medicine
    await dbPool.request()
      .input('medicineId', sql.Int, medicineId)
      .query('DELETE FROM Medicines WHERE MedicineID = @medicineId');
    
    res.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    console.error('Error deleting medicine:', error);
    res.status(500).json({ message: 'Failed to delete medicine' });
  }
});

// Medical Owner - Get all stores
app.get('/api/medical-owner/stores', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    const ownerId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT OwnerID FROM MedicalOwnerDetails WHERE UserID = @userId')
    ).recordset[0].OwnerID;

    const result = await dbPool.request()
      .input('ownerId', sql.Int, ownerId)
      .query(`
        SELECT * FROM MedicalStores 
        WHERE OwnerID = @ownerId 
        ORDER BY Name
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching medical stores:', error);
    res.status(500).json({ message: 'Failed to fetch medical stores' });
  }
});

// Medical Owner - Add new store
app.post('/api/medical-owner/stores', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    const { Name, Address, Phone, Email, Manager } = req.body;
    const ownerId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT OwnerID FROM MedicalOwnerDetails WHERE UserID = @userId')
    ).recordset[0].OwnerID;

    const result = await dbPool.request()
      .input('ownerId', sql.Int, ownerId)
      .input('Name', sql.NVarChar, Name)
      .input('Address', sql.NVarChar, Address)
      .input('Phone', sql.NVarChar, Phone || null)
      .input('Email', sql.NVarChar, Email || null)
      .input('Manager', sql.NVarChar, Manager || null)
      .query(`
        INSERT INTO MedicalStores (OwnerID, Name, Address, Phone, Email, Manager)
        OUTPUT INSERTED.StoreID
        VALUES (@ownerId, @Name, @Address, @Phone, @Email, @Manager)
      `);
    
    res.status(201).json({ 
      message: 'Medical store added successfully',
      storeId: result.recordset[0].StoreID
    });
  } catch (error) {
    console.error('Error adding medical store:', error);
    res.status(500).json({ message: 'Failed to add medical store' });
  }
});

// Medical Owner - Delete store
app.delete('/api/medical-owner/stores/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    const storeId = req.params.id;
    const ownerId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT OwnerID FROM MedicalOwnerDetails WHERE UserID = @userId')
    ).recordset[0].OwnerID;

    // Verify the store belongs to this owner
    const storeCheck = await dbPool.request()
      .input('storeId', sql.Int, storeId)
      .input('ownerId', sql.Int, ownerId)
      .query('SELECT * FROM MedicalStores WHERE StoreID = @storeId AND OwnerID = @ownerId');
    
    if (storeCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Store not found or access denied' });
    }
    
    // First delete related inventory and alerts
    await dbPool.request()
      .input('storeId', sql.Int, storeId)
      .query('DELETE FROM Inventory WHERE StoreID = @storeId');
    
    await dbPool.request()
      .input('storeId', sql.Int, storeId)
      .query('DELETE FROM MedicalAlerts WHERE StoreID = @storeId');
    
    // Then delete the store
    await dbPool.request()
      .input('storeId', sql.Int, storeId)
      .query('DELETE FROM MedicalStores WHERE StoreID = @storeId');
    
    res.json({ message: 'Medical store deleted successfully' });
  } catch (error) {
    console.error('Error deleting medical store:', error);
    res.status(500).json({ message: 'Failed to delete medical store' });
  }
});

// Medical Owner - Get inventory
app.get('/api/medical-owner/inventory', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    const ownerId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT OwnerID FROM MedicalOwnerDetails WHERE UserID = @userId')
    ).recordset[0].OwnerID;

    const result = await dbPool.request()
      .input('ownerId', sql.Int, ownerId)
      .query(`
        SELECT i.*, m.Name as MedicineName, s.Name as StoreName
        FROM Inventory i
        JOIN Medicines m ON i.MedicineID = m.MedicineID
        JOIN MedicalStores s ON i.StoreID = s.StoreID
        WHERE s.OwnerID = @ownerId
        ORDER BY s.Name, m.Name
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ message: 'Failed to fetch inventory' });
  }
});

// Medical Owner - Update inventory
app.post('/api/medical-owner/inventory', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    const { medicineId, storeId, quantity, price } = req.body;
    const ownerId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT OwnerID FROM MedicalOwnerDetails WHERE UserID = @userId')
    ).recordset[0].OwnerID;

    // Verify the store belongs to this owner
    const storeCheck = await dbPool.request()
      .input('storeId', sql.Int, storeId)
      .input('ownerId', sql.Int, ownerId)
      .query('SELECT * FROM MedicalStores WHERE StoreID = @storeId AND OwnerID = @ownerId');
    
    if (storeCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Store not found or access denied' });
    }
    
    // Check if inventory record already exists
    const existingInventory = await dbPool.request()
      .input('medicineId', sql.Int, medicineId)
      .input('storeId', sql.Int, storeId)
      .query('SELECT * FROM Inventory WHERE MedicineID = @medicineId AND StoreID = @storeId');
    
    if (existingInventory.recordset.length > 0) {
      // Update existing record
      await dbPool.request()
        .input('medicineId', sql.Int, medicineId)
        .input('storeId', sql.Int, storeId)
        .input('quantity', sql.Int, quantity)
        .input('price', sql.Decimal, price)
        .query(`
          UPDATE Inventory 
          SET Quantity = @quantity, Price = @price, UpdatedAt = GETDATE()
          WHERE MedicineID = @medicineId AND StoreID = @storeId
        `);
    } else {
      // Insert new record
      await dbPool.request()
        .input('medicineId', sql.Int, medicineId)
        .input('storeId', sql.Int, storeId)
        .input('quantity', sql.Int, quantity)
        .input('price', sql.Decimal, price)
        .query(`
          INSERT INTO Inventory (MedicineID, StoreID, Quantity, Price)
          VALUES (@medicineId, @storeId, @quantity, @price)
        `);
    }
    
    // Check for low stock alerts
    if (quantity <= 10) {
      const medicine = await dbPool.request()
        .input('medicineId', sql.Int, medicineId)
        .query('SELECT Name FROM Medicines WHERE MedicineID = @medicineId');
      
      const store = await dbPool.request()
        .input('storeId', sql.Int, storeId)
        .query('SELECT Name FROM MedicalStores WHERE StoreID = @storeId');
      
      const severity = quantity === 0 ? 'High' : quantity <= 5 ? 'Medium' : 'Low';
      const message = quantity === 0 
        ? `${medicine.recordset[0].Name} is out of stock at ${store.recordset[0].Name}`
        : `Low stock alert: ${medicine.recordset[0].Name} has only ${quantity} units left at ${store.recordset[0].Name}`;
      
      await dbPool.request()
        .input('storeId', sql.Int, storeId)
        .input('medicineId', sql.Int, medicineId)
        .input('message', sql.NVarChar, message)
        .input('severity', sql.NVarChar, severity)
        .query(`
          INSERT INTO MedicalAlerts (StoreID, MedicineID, Message, Severity)
          VALUES (@storeId, @medicineId, @message, @severity)
        `);
    }
    
    res.status(201).json({ message: 'Inventory updated successfully' });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ message: 'Failed to update inventory' });
  }
});

// Medical Owner - Get alerts
app.get('/api/medical-owner/alerts', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    const ownerId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT OwnerID FROM MedicalOwnerDetails WHERE UserID = @userId')
    ).recordset[0].OwnerID;

    const result = await dbPool.request()
      .input('ownerId', sql.Int, ownerId)
      .query(`
        SELECT a.*, s.Name as StoreName, m.Name as MedicineName
        FROM MedicalAlerts a
        LEFT JOIN MedicalStores s ON a.StoreID = s.StoreID
        LEFT JOIN Medicines m ON a.MedicineID = m.MedicineID
        WHERE s.OwnerID = @ownerId OR a.StoreID IS NULL
        ORDER BY a.CreatedAt DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Failed to fetch alerts' });
  }
});

// Medical Owner - Mark alert as read
app.post('/api/medical-owner/alerts/:id/read', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    const alertId = req.params.id;
    
    await dbPool.request()
      .input('alertId', sql.Int, alertId)
      .query('UPDATE MedicalAlerts SET IsRead = 1 WHERE AlertID = @alertId');
    
    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ message: 'Failed to update alert' });
  }
});

// Medical Owner - Get dashboard statistics
app.get('/api/medical-owner/dashboard-stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    const ownerId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT OwnerID FROM MedicalOwnerDetails WHERE UserID = @userId')
    ).recordset[0].OwnerID;

    const stats = await dbPool.request()
      .input('ownerId', sql.Int, ownerId)
      .query(`
        SELECT 
          (SELECT COUNT(*) FROM Medicines) as totalMedicines,
          (SELECT COUNT(*) FROM MedicalStores WHERE OwnerID = @ownerId) as totalStores,
          (SELECT COUNT(*) FROM MedicalAlerts a 
           LEFT JOIN MedicalStores s ON a.StoreID = s.StoreID 
           WHERE (s.OwnerID = @ownerId OR a.StoreID IS NULL) AND a.IsRead = 0) as unreadAlerts,
          (SELECT COUNT(*) FROM Inventory i 
           JOIN MedicalStores s ON i.StoreID = s.StoreID 
           WHERE s.OwnerID = @ownerId AND i.Quantity = 0) as outOfStockItems,
          (SELECT COUNT(*) FROM Inventory i 
           JOIN MedicalStores s ON i.StoreID = s.StoreID 
           WHERE s.OwnerID = @ownerId AND i.Quantity > 0 AND i.Quantity <= 10) as lowStockItems,
          (SELECT SUM(i.Quantity * i.Price) FROM Inventory i 
           JOIN MedicalStores s ON i.StoreID = s.StoreID 
           WHERE s.OwnerID = @ownerId) as totalInventoryValue
      `);
    
    res.json(stats.recordset[0]);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

// Get symptom questions
app.get('/api/triage/questions', authenticateToken, async (req, res) => {
  try {
    const result = await dbPool.request().query(`
      SELECT q.QuestionID, q.QuestionText, q.InputType, q.Options, 
             s.Name as SymptomName, s.Category
      FROM SymptomQuestions q
      JOIN Symptoms s ON q.SymptomID = s.SymptomID
      ORDER BY s.Category, q.QuestionID
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
});

async function performAdvancedTriageAssessment(symptoms) {
  let emergencyScore = 0;
  let urgentScore = 0;
  let routineScore = 0;
  let identifiedSymptoms = [];
  
  // Analyze each symptom with weighted scoring
  symptoms.forEach(symptom => {
    const { id, response } = symptom;
    identifiedSymptoms.push(`${id}: ${response}`);
    
    // Emergency symptoms (high weight)
    if (id === 'chest_pain' && response === 'true') emergencyScore += 10;
    if (id === 'breathing_difficulty' && response === 'true') emergencyScore += 9;
    if (id === 'breathing_severity' && response === 'Severe - at rest') emergencyScore += 10;
    if (id === 'pain_severity' && parseInt(response) >= 8) emergencyScore += 7;
    
    // Urgent symptoms (medium weight)
    if (id === 'fever' && response === 'true') urgentScore += 5;
    if (id === 'vomiting_frequency' && response === 'More than 5 times') urgentScore += 6;
    if (id === 'pain_severity' && parseInt(response) >= 5) urgentScore += 4;
    if (id === 'breathing_severity' && response === 'Moderate - with minimal activity') urgentScore += 5;
    
    // Routine symptoms (low weight)
    if (id === 'fatigue' && response === 'true') routineScore += 2;
    if (id === 'headache' && response === 'true') routineScore += 2;
    if (id === 'nausea' && response === 'true') routineScore += 2;
  });
  
  // Determine triage level based on scores
  let triageLevel = 'Self-care';
  let confidence = 0.85;
  let recommendation = 'Your symptoms appear mild. Rest, hydrate, and monitor your condition. Contact a doctor if symptoms worsen.';
  
  if (emergencyScore >= 10) {
    triageLevel = 'Emergency';
    confidence = Math.min(0.98, 0.85 + (emergencyScore * 0.01));
    recommendation = 'SEEK EMERGENCY CARE IMMEDIATELY. Go to the nearest emergency room or call emergency services. Your symptoms suggest a potentially life-threatening condition.';
  } else if (urgentScore >= 8 || emergencyScore >= 5) {
    triageLevel = 'Urgent';
    confidence = Math.min(0.92, 0.80 + (urgentScore * 0.01));
    recommendation = 'Schedule an urgent appointment with your doctor within 24 hours. Your symptoms require prompt medical attention.';
  } else if (routineScore >= 6 || urgentScore >= 4) {
    triageLevel = 'Routine';
    confidence = Math.min(0.88, 0.75 + (routineScore * 0.01));
    recommendation = 'Schedule a routine appointment with your doctor when convenient. Your symptoms should be evaluated but are not urgent.';
  }
  
  // Adjust confidence based on number of symptoms
  const symptomCount = symptoms.filter(s => s.response && s.response !== 'false' && s.response !== '0').length;
  confidence = Math.min(0.95, confidence + (symptomCount * 0.02));
  
  // Add some random variation to make it more realistic
  confidence = confidence + (Math.random() * 0.1 - 0.05);
  confidence = Math.max(0.6, Math.min(0.99, confidence)); // Keep within reasonable bounds
  
  return {
    level: triageLevel,
    confidence: confidence,
    recommendation: recommendation,
    symptoms: identifiedSymptoms
  };
}

// Submit symptom responses
app.post('/api/triage/assess', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const { symptoms } = req.body;
    const patientId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
    ).recordset[0].PatientID;

    // Perform intelligent triage assessment
    const triageResult = await performAdvancedTriageAssessment(symptoms);
    
    // Save assessment
    const assessmentResult = await dbPool.request()
      .input('patientId', sql.Int, patientId)
      .input('symptoms', sql.NVarChar, JSON.stringify(symptoms))
      .input('triageLevel', sql.NVarChar, triageResult.level)
      .input('confidenceScore', sql.Decimal, triageResult.confidence)
      .input('recommendedAction', sql.NVarChar, triageResult.recommendation)
      .query(`
        INSERT INTO SymptomAssessments 
        (PatientID, Symptoms, TriageLevel, ConfidenceScore, RecommendedAction)
        OUTPUT INSERTED.AssessmentID
        VALUES (@patientId, @symptoms, @triageLevel, @confidenceScore, @recommendedAction)
      `);

    res.json({
      assessmentId: assessmentResult.recordset[0].AssessmentID,
      ...triageResult
    });
  } catch (error) {
    console.error('Error processing triage:', error);
    res.status(500).json({ message: 'Failed to process triage assessment' });
  }
});

// Get triage history
app.get('/api/triage/history', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const patientId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
    ).recordset[0].PatientID;

    const result = await dbPool.request()
      .input('patientId', sql.Int, patientId)
      .query(`
        SELECT AssessmentID, TriageLevel, ConfidenceScore, RecommendedAction, 
               CreatedAt, ReviewedByDoctor, ReviewStatus
        FROM SymptomAssessments 
        WHERE PatientID = @patientId
        ORDER BY CreatedAt DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching triage history:', error);
    res.status(500).json({ message: 'Failed to fetch triage history' });
  }
});

// Triage assessment logic (simplified)
async function performTriageAssessment(patientId, responses) {
  // This is a simplified triage logic - in production, use a proper ML model
  let emergencySymptoms = 0;
  let urgentSymptoms = 0;
  let symptomsList = [];
  
  // Check for emergency symptoms
  const emergencyPatterns = [
    'chest pain', 'difficulty breathing', 'severe bleeding', 
    'unconscious', 'severe pain', 'stroke', 'heart attack'
  ];
  
  // Check for urgent symptoms
  const urgentPatterns = [
    'fever', 'persistent vomiting', 'abdominal pain', 
    'head injury', 'allergic reaction'
  ];
  
  for (const response of responses) {
    if (response.response && response.response !== 'false' && response.response !== '0') {
      // Get question text to analyze
      const questionResult = await dbPool.request()
        .input('questionId', sql.Int, response.questionId)
        .query('SELECT QuestionText FROM SymptomQuestions WHERE QuestionID = @questionId');
      
      const questionText = questionResult.recordset[0]?.QuestionText.toLowerCase() || '';
      
      // Check for emergency patterns
      if (emergencyPatterns.some(pattern => questionText.includes(pattern))) {
        emergencySymptoms++;
        symptomsList.push(questionText);
      } 
      // Check for urgent patterns
      else if (urgentPatterns.some(pattern => questionText.includes(pattern))) {
        urgentSymptoms++;
        symptomsList.push(questionText);
      }
    }
  }
  
  // Determine triage level
  let triageLevel = 'Self-care';
  let confidence = 0.85;
  let recommendation = 'Monitor symptoms and rest. Contact a doctor if symptoms worsen.';
  
  if (emergencySymptoms > 0) {
    triageLevel = 'Emergency';
    confidence = 0.95;
    recommendation = 'Seek emergency care immediately. Go to the nearest emergency room or call emergency services.';
  } else if (urgentSymptoms > 1 || (urgentSymptoms > 0 && responses.length > 5)) {
    triageLevel = 'Urgent';
    confidence = 0.80;
    recommendation = 'Schedule an urgent appointment with your doctor within 24 hours.';
  } else if (urgentSymptoms > 0 || responses.filter(r => r.response && r.response !== 'false').length > 3) {
    triageLevel = 'Routine';
    confidence = 0.75;
    recommendation = 'Schedule a routine appointment with your doctor when convenient.';
  }
  
  return {
    level: triageLevel,
    confidence: confidence,
    recommendation: recommendation,
    symptoms: symptomsList
  };
}

app.get('/api/triage/categories', authenticateToken, async (req, res) => {
  try {
    // Dynamic categories based on common medical presentations
    const categories = [
      {
        id: 'general',
        name: 'General Symptoms',
        questions: [
          { id: 'fever', text: 'Do you have a fever?', type: 'boolean' },
          { id: 'fatigue', text: 'Are you experiencing unusual fatigue?', type: 'boolean' },
          { id: 'weight_changes', text: 'Have you had any recent weight changes?', type: 'boolean' }
        ]
      },
      {
        id: 'pain',
        name: 'Pain & Discomfort',
        questions: [
          { id: 'pain_location', text: 'Where is your pain located?', type: 'multiple_choice', 
            options: ['Head', 'Chest', 'Abdomen', 'Back', 'Joints', 'Other'] },
          { id: 'pain_severity', text: 'How severe is your pain?', type: 'scale' },
          { id: 'pain_duration', text: 'How long have you had this pain?', type: 'multiple_choice',
            options: ['Less than 1 hour', '1-24 hours', '1-3 days', '4-7 days', 'More than 1 week'] }
        ]
      },
      {
        id: 'respiratory',
        name: 'Breathing & Respiratory',
        questions: [
          { id: 'breathing_difficulty', text: 'Are you having difficulty breathing?', type: 'boolean' },
          { id: 'cough', text: 'Do you have a cough?', type: 'boolean' },
          { id: 'breathing_severity', text: 'How would you describe your breathing difficulty?', type: 'multiple_choice',
            options: ['Mild - with exertion', 'Moderate - with minimal activity', 'Severe - at rest'] }
        ]
      },
      {
        id: 'cardiac',
        name: 'Heart & Circulation',
        questions: [
          { id: 'chest_pain', text: 'Are you experiencing chest pain?', type: 'boolean' },
          { id: 'heart_palpitations', text: 'Are you experiencing heart palpitations?', type: 'boolean' },
          { id: 'swelling', text: 'Do you have swelling in your legs or feet?', type: 'boolean' }
        ]
      },
      {
        id: 'digestive',
        name: 'Digestive System',
        questions: [
          { id: 'nausea', text: 'Are you experiencing nausea?', type: 'boolean' },
          { id: 'vomiting', text: 'Have you vomited?', type: 'boolean' },
          { id: 'vomiting_frequency', text: 'How many times have you vomited?', type: 'multiple_choice',
            options: ['Not at all', '1-2 times', '3-5 times', 'More than 5 times'] }
        ]
      },
      {
        id: 'neurological',
        name: 'Neurological',
        questions: [
          { id: 'dizziness', text: 'Are you experiencing dizziness?', type: 'boolean' },
          { id: 'headache', text: 'Do you have a headache?', type: 'boolean' },
          { id: 'vision_changes', text: 'Have you experienced any vision changes?', type: 'boolean' }
        ]
      }
    ];
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Update the symptom assessments endpoint to format symptoms properly
app.get('/api/doctor/symptom-assessments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request().query(`
      SELECT 
        sa.AssessmentID as id,
        p.PatientID as patientId,
        u.FirstName + ' ' + u.LastName as patientName,
        sa.Symptoms as symptoms,
        sa.TriageLevel as triageLevel,
        sa.ConfidenceScore as confidenceScore,
        sa.RecommendedAction as recommendedAction,
        sa.CreatedAt as createdAt,
        sa.ReviewStatus as reviewStatus,
        d.FirstName + ' ' + d.LastName as reviewedByDoctor,
        sa.ReviewedByDoctor as reviewedByDoctorId
      FROM SymptomAssessments sa
      JOIN PatientDetails p ON sa.PatientID = p.PatientID
      JOIN Users u ON p.UserID = u.UserID
      LEFT JOIN DoctorDetails dd ON sa.ReviewedByDoctor = dd.DoctorID
      LEFT JOIN Users d ON dd.UserID = d.UserID
      ORDER BY sa.CreatedAt DESC
    `);
    
    // Format symptoms for better display
    const formattedAssessments = result.recordset.map(assessment => {
      try {
        const parsedSymptoms = JSON.parse(assessment.symptoms);
        if (Array.isArray(parsedSymptoms)) {
          assessment.symptoms = parsedSymptoms.map(s => 
            typeof s === 'object' ? `${s.id || 'Symptom'}: ${s.response}` : s
          ).join(', ');
        }
      } catch (e) {
        // Keep original symptoms if not JSON
      }
      return assessment;
    });
    
    res.json(formattedAssessments);
  } catch (error) {
    console.error('Error fetching symptom assessments:', error);
    res.status(500).json({ message: 'Failed to fetch symptom assessments' });
  }
});
// Get specific symptom assessment details
app.get('/api/doctor/symptom-assessments/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    const assessmentId = req.params.id;
    
    const result = await dbPool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT 
          sa.AssessmentID as id,
          p.PatientID as patientId,
          u.FirstName + ' ' + u.LastName as patientName,
          u.Email as patientEmail,
          pd.PhoneNumber as patientPhone,
          sa.Symptoms as symptoms,
          sa.TriageLevel as triageLevel,
          sa.ConfidenceScore as confidenceScore,
          sa.RecommendedAction as recommendedAction,
          sa.CreatedAt as createdAt,
          sa.ReviewStatus as reviewStatus,
          d.FirstName + ' ' + d.LastName as reviewedByDoctor,
          sa.ReviewedByDoctor as reviewedByDoctorId,
          sa.Symptoms as rawSymptomsData
        FROM SymptomAssessments sa
        JOIN PatientDetails p ON sa.PatientID = p.PatientID
        JOIN Users u ON p.UserID = u.UserID
        LEFT JOIN PatientDetails pd ON p.PatientID = pd.PatientID
        LEFT JOIN DoctorDetails dd ON sa.ReviewedByDoctor = dd.DoctorID
        LEFT JOIN Users d ON dd.UserID = d.UserID
        WHERE sa.AssessmentID = @assessmentId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching assessment details:', error);
    res.status(500).json({ message: 'Failed to fetch assessment details' });
  }
});

// Update assessment review status
app.put('/api/doctor/symptom-assessments/:id/review', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    const assessmentId = req.params.id;
    const { status, notes } = req.body;
    console.log(`Updating assessment ${assessmentId} with status: ${status}, notes: ${notes}`);
    
    const doctorId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT DoctorID FROM DoctorDetails WHERE UserID = @userId')
    ).recordset[0].DoctorID;

    const result = await dbPool.request()
    .input('assessmentId', sql.Int, assessmentId)
    .input('doctorId', sql.Int, doctorId)
    .input('status', sql.NVarChar, status)
    .input('notes', sql.NVarChar, notes || null)
    .query(`
      UPDATE SymptomAssessments 
      SET ReviewStatus = @status, 
          ReviewedByDoctor = @doctorId
      WHERE AssessmentID = @assessmentId;
      
      SELECT * FROM SymptomAssessments WHERE AssessmentID = @assessmentId;
    `);

    console.log('Update result:', result.recordset);
    
    res.json({ message: 'Assessment review status updated successfully' });
  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({ message: 'Failed to update assessment' });
  }
});

app.post('/api/doctor/share-assessment', authenticateToken, async (req, res) => {
  try {
    const { doctorId, assessmentId, patientId, triageLevel, confidence, symptoms } = req.body;
    
    console.log(`Assessment shared with doctor ${doctorId}:`, {
      assessmentId,
      patientId,
      triageLevel,
      confidence,
      symptoms
    });
    
    res.json({ success: true, message: 'Assessment shared successfully' });
  } catch (error) {
    console.error('Error sharing assessment:', error);
    res.status(500).json({ error: 'Failed to share assessment' });
  }
});

// Get available medicines for patients
app.get('/api/medicines/available', authenticateToken, async (req, res) => {
  try {
    const result = await dbPool.request().query(`
      SELECT m.*, 
             (SELECT SUM(Quantity) FROM Inventory WHERE MedicineID = m.MedicineID) as TotalStock
      FROM Medicines m
      WHERE m.MedicineID IN (SELECT DISTINCT MedicineID FROM Inventory WHERE Quantity > 0)
      ORDER BY m.Name
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching available medicines:', error);
    res.status(500).json({ message: 'Failed to fetch available medicines' });
  }
});

// Get medical stores
app.get('/api/medical-stores', authenticateToken, async (req, res) => {
  try {
    const result = await dbPool.request().query(`
      SELECT * FROM MedicalStores ORDER BY Name
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching medical stores:', error);
    res.status(500).json({ message: 'Failed to fetch medical stores' });
  }
});

// Get medicine inventory
app.get('/api/medicine-inventory', authenticateToken, async (req, res) => {
  try {
    const result = await dbPool.request().query(`
      SELECT i.*, m.Name as MedicineName, s.Name as StoreName
      FROM Inventory i
      JOIN Medicines m ON i.MedicineID = m.MedicineID
      JOIN MedicalStores s ON i.StoreID = s.StoreID
      WHERE i.Quantity > 0
      ORDER BY s.Name, m.Name
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching medicine inventory:', error);
    res.status(500).json({ message: 'Failed to fetch medicine inventory' });
  }
});


// Medical Owner - Get reports data
app.get('/api/medical-owner/reports', authenticateToken, async (req, res) => {
  if (req.user.role !== 'medical_owner') return res.sendStatus(403);
  
  try {
    const ownerId = (await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT OwnerID FROM MedicalOwnerDetails WHERE UserID = @userId')
    ).recordset[0].OwnerID;

    // Get inventory value by store
    const inventoryValueResult = await dbPool.request()
      .input('ownerId', sql.Int, ownerId)
      .query(`
        SELECT 
          s.StoreID,
          s.Name as StoreName,
          SUM(i.Quantity * i.Price) as TotalValue
        FROM Inventory i
        JOIN MedicalStores s ON i.StoreID = s.StoreID
        WHERE s.OwnerID = @ownerId
        GROUP BY s.StoreID, s.Name
        ORDER BY TotalValue DESC
      `);

    // Get stock status overview
    const stockStatusResult = await dbPool.request()
      .input('ownerId', sql.Int, ownerId)
      .query(`
        SELECT 
          COUNT(*) as TotalItems,
          SUM(CASE WHEN Quantity = 0 THEN 1 ELSE 0 END) as OutOfStock,
          SUM(CASE WHEN Quantity > 0 AND Quantity <= 10 THEN 1 ELSE 0 END) as LowStock,
          SUM(CASE WHEN Quantity > 10 THEN 1 ELSE 0 END) as HealthyStock
        FROM Inventory i
        JOIN MedicalStores s ON i.StoreID = s.StoreID
        WHERE s.OwnerID = @ownerId
      `);

    // Get medicine categories distribution
    const categoriesResult = await dbPool.request()
      .input('ownerId', sql.Int, ownerId)
      .query(`
        SELECT 
          m.Category,
          COUNT(*) as MedicineCount
        FROM Medicines m
        JOIN Inventory i ON m.MedicineID = i.MedicineID
        JOIN MedicalStores s ON i.StoreID = s.StoreID
        WHERE s.OwnerID = @ownerId
        GROUP BY m.Category
        ORDER BY MedicineCount DESC
      `);

    // Get alert statistics
    const alertStatsResult = await dbPool.request()
      .input('ownerId', sql.Int, ownerId)
      .query(`
        SELECT 
          COUNT(*) as TotalAlerts,
          SUM(CASE WHEN Severity = 'High' THEN 1 ELSE 0 END) as HighPriority,
          SUM(CASE WHEN Severity = 'Medium' THEN 1 ELSE 0 END) as MediumPriority,
          SUM(CASE WHEN Severity = 'Low' THEN 1 ELSE 0 END) as LowPriority,
          SUM(CASE WHEN IsRead = 0 THEN 1 ELSE 0 END) as UnreadAlerts
        FROM MedicalAlerts a
        LEFT JOIN MedicalStores s ON a.StoreID = s.StoreID
        WHERE s.OwnerID = @ownerId OR a.StoreID IS NULL
      `);

    // Get top 5 medicines by value
    const topMedicinesResult = await dbPool.request()
      .input('ownerId', sql.Int, ownerId)
      .query(`
        SELECT TOP 5
          m.Name as MedicineName,
          SUM(i.Quantity * i.Price) as TotalValue,
          SUM(i.Quantity) as TotalQuantity
        FROM Inventory i
        JOIN Medicines m ON i.MedicineID = m.MedicineID
        JOIN MedicalStores s ON i.StoreID = s.StoreID
        WHERE s.OwnerID = @ownerId
        GROUP BY m.MedicineID, m.Name
        ORDER BY TotalValue DESC
      `);

    res.json({
      inventoryValue: inventoryValueResult.recordset,
      stockStatus: stockStatusResult.recordset[0],
      categories: categoriesResult.recordset,
      alertStats: alertStatsResult.recordset[0],
      topMedicines: topMedicinesResult.recordset
    });
  } catch (error) {
    console.error('Error fetching reports data:', error);
    res.status(500).json({ message: 'Failed to fetch reports data' });
  }
});