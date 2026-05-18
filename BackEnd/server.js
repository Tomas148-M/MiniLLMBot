const express = require('express');
const cors = require('cors');
const { healthCheck, readyCheck, chat, chatStream } = require('./controllers/chatController');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', healthCheck);
app.get('/api/ready', readyCheck);
app.post('/api/chat', chat);
app.post('/api/chatstream', chatStream);

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
