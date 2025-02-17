const express = require('express');
const path = require('path');

const app = express();

app.use(express.static('build'));

// 🔹 Adicionando uma rota de teste para ver se o servidor responde
app.get('/api/test', (req, res) => {
  res.json({ message: "API funcionando!" });
});

// 🔹 Mantenha essa rota para servir o frontend
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, './build/index.html'));
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor rodando na porta 3000");
});
