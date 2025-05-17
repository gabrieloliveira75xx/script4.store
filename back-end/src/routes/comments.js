const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');

// Rota para obter todos os comentários
router.get('/', async (req, res) => {
  try {
    const comments = await Comment.find().sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Rota para criar um novo comentário
router.post('/', async (req, res) => {
  const comment = new Comment({
    name: req.body.name,
    text: req.body.text,
  });

  try {
    const newComment = await comment.save();
    res.status(201).json(newComment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
