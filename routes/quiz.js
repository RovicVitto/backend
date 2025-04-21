const express = require('express');
const router = express.Router();
const { createQuiz, getQuizzes } = require('../controllers/quizController');
const Quiz = require('../models/quiz');

// Routes
router.post('/', createQuiz);
router.get('/', getQuizzes);

router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Quiz.aggregate([
      {
        $group: {
          _id: "$subject",
          name: { $first: "$subject" },
          quizCount: { $sum: 1 },
          latestQuiz: { $max: "$createdAt" }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          quizCount: 1,
          lastUpdated: "$latestQuiz",
          icon: {
            $switch: {
              branches: [
                { case: { $eq: ["$name", "Mathematics"] }, then: "🧮" },
                { case: { $eq: ["$name", "Science"] }, then: "🔬" },
                { case: { $eq: ["$name", "English"] }, then: "📚" },
                { case: { $eq: ["$name", "History"] }, then: "🏛️" },
                { case: { $eq: ["$name", "Geography"] }, then: "🌍" },
                { case: { $eq: ["$name", "Computer Science"] }, then: "💻" }
              ],
              default: "📝"
            }
          }
        }
      },
      { $sort: { name: 1 } }
    ]);

    if (subjects.length === 0) {
      return res.json([
        { _id: 'math', name: 'Mathematics', quizCount: 0, icon: '🧮' },
        { _id: 'science', name: 'Science', quizCount: 0, icon: '🔬' },
        { _id: 'english', name: 'English', quizCount: 0, icon: '📚' },
        { _id: 'history', name: 'History', quizCount: 0, icon: '🏛️' }
      ]);
    }

    res.json(subjects);
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: 'Failed to fetch quiz subjects' });
  }
});

module.exports = router;
