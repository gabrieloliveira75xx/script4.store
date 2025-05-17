const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const commentsRoutes = require('./routes/comments');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Rotas
app.use('/api/comments', commentsRoutes);

// Conexão com o MongoDB
mongoose.connect('mongodb://localhost:27017/portfolio', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Conectado ao MongoDB'));

// Iniciar o servidor
const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
