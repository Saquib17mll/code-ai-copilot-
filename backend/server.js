const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const employeeRoutes = require('./routes/employees');
const timerRoutes = require('./routes/timer');

const app = express();
const PORT = process.env.PORT || 3001;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use(apiLimiter);

app.use('/api/employees', employeeRoutes);
app.use('/api/timer', timerRoutes);

// Serve React frontend in production
const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(frontendBuild));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
