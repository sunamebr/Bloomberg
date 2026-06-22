const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from frontend/dist
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Handle client-side routing - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MestraDosTrades frontend serving on port ${PORT}`);
  console.log(`Serving from: ${path.join(__dirname, 'frontend', 'dist')}`);
});
