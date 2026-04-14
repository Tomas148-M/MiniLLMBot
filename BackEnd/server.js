const express = require('express');
const cors = require('cors');
const { healthCheck, chat, chatStream } = require('./controllers/chatController');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', healthCheck);
app.post('/api/chat', chat);
app.post('/api/chatstream', chatStream);

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
