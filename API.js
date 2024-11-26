// Importando as dependências
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

// Usando o bodyParser para parsear o corpo das requisições como JSON
app.use(bodyParser.json());

// Conexão com o banco de dados MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "game"
});

// Verificando se a conexão com o MySQL foi bem-sucedida
db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar no banco de dados:", err.stack);
    return;
  }
  console.log("Conectado ao banco de dados");
});

// Rota de login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no servidor" });
    if (results.length === 0) return res.status(400).json({ error: "Usuário não encontrado" });

    const user = results[0];
    bcrypt.compare(password, user.password, (err, match) => {
      if (err) return res.status(500).json({ error: "Erro no servidor" });
      if (!match) return res.status(400).json({ error: "Senha incorreta" });

      const token = jwt.sign({ id: user.id }, "secret_key");
      res.json({ username: user.username, token });
    });
  });
});

// Rota de progresso
app.get("/progress", (req, res) => {
  const username = req.query.username;
  db.query("SELECT progress.level FROM progress JOIN users ON progress.user_id = users.id WHERE users.username = ?", [username], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no servidor" });
    if (results.length === 0) return res.json({ next_level_path: "res://Scenes/Level1.tscn" });

    res.json({ next_level_path: results[results.length - 1].level });
  });
});

// Rota para salvar progresso
app.post("/save_progress", (req, res) => {
  const { username, level, status } = req.body;
  db.query("SELECT id FROM users WHERE username = ?", [username], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no servidor" });
    if (results.length === 0) return res.status(400).json({ error: "Usuário não encontrado" });

    const user_id = results[0].id;
    db.query("INSERT INTO progress (user_id, level, status) VALUES (?, ?, ?)", [user_id, level, status], (err) => {
      if (err) return res.status(500).json({ error: "Erro ao salvar progresso" });
      res.json({ success: true });
    });
  });
});

// Rota de registro de usuário
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  // Validação dos campos
  if (!username || !password) {
    return res.status(400).json({ error: "Preencha todos os campos." });
  }

  // Verifica se o nome de usuário já existe
  db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no servidor." });
    if (results.length > 0) return res.status(400).json({ error: "Usuário já existe." });

    // Criptografa a senha e insere o novo usuário
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ error: "Erro ao processar senha." });

      db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hash], (err) => {
        if (err) return res.status(500).json({ error: "Erro ao registrar usuário." });

        res.status(201).json({ success: true, message: "Usuário registrado com sucesso." });
      });
    });
  });
});

// Inicia o servidor na porta 3000
app.listen(3000, () => console.log("API rodando na porta 3000"));
