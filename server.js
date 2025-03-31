// Entry point for the Express backend server
require('dotenv').config();
const app = require('./src/api/index.js');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at https://aetharcraft.xyz/api`);
});