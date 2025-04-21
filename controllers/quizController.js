const Quiz = require('../models/quiz');

// @desc    Create a new quiz
// @route   POST /api/quiz
// @access  Private
const createQuiz = async (req, res) => {
  try {
    const { title, subject, questions } = req.body;

    const newQuiz = new Quiz({
      title,
      subject,
      questions,
      createdBy: req.user.id // assuming your verifyToken adds user info to req.user
    });

    await newQuiz.save();
    res.status(201).json(newQuiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
};

// @desc    Get all quizzes
// @route   GET /api/quiz
// @access  Public or Private depending on your setup
const getQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

module.exports = {
  createQuiz,
  getQuizzes
};
