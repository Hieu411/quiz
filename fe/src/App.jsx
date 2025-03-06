import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

// Audio utilities
const createSound = (frequencies, duration) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  frequencies.forEach(([freq, time]) =>
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + time)
  );

  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + duration
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
};

const playCorrectSound = () =>
  createSound(
    [
      [587.33, 0],
      [880, 0.1],
    ],
    0.3
  );
const playWrongSound = () =>
  createSound(
    [
      [349.23, 0],
      [293.66, 0.1],
    ],
    0.4
  );

// Utility function
const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

function App() {
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [reverseMode, setReverseMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLessons = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get("http://localhost:5000/api/lessons");
      setLessons(res.data);
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const handleSelectLesson = useCallback(
    async (lesson) => {
      try {
        setIsLoading(true);
        setSelectedLesson(lesson);
        const res = await axios.get(
          `http://localhost:5000/api/lessons/${lesson}`
        );
        const words = shuffleArray(Object.entries(res.data));
        const formattedQuestions = words.map(([jp, vi]) => {
          const correctAnswer = reverseMode ? jp : vi;
          const allAnswers = words.map(([j, v]) => (reverseMode ? j : v));
          const options = shuffleArray([
            correctAnswer,
            ...shuffleArray(
              allAnswers.filter((a) => a !== correctAnswer)
            ).slice(0, 3),
          ]);
          return { question: reverseMode ? vi : jp, correctAnswer, options };
        });
        setQuestions(formattedQuestions);
      } catch (error) {
        console.error("Error fetching lesson:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [reverseMode]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 font-sans">
      <motion.div
        className="max-w-2xl w-full mx-auto p-6 bg-white/95 rounded-3xl shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="text-center mb-8">
          <motion.h1
            className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Japanese Vocabulary Master
          </motion.h1>
          <p className="text-gray-500 mt-2">Learn Japanese with fun quizzes</p>
        </header>

        <AnimatePresence mode="wait">
          {!selectedLesson ? (
            <motion.div
              key="lesson-select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="space-y-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full p-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl shadow-lg"
                  onClick={() => setReverseMode(!reverseMode)}
                >
                  {reverseMode ? "JP → VN" : "VN → JP"}
                </motion.button>

                {isLoading ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto"></div>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {lessons.map((lesson) => (
                      <motion.li
                        key={lesson}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <button
                          className="w-full p-3 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors"
                          onClick={() => handleSelectLesson(lesson)}
                        >
                          Lesson {lesson}
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          ) : (
            <Quiz
              key="quiz"
              questions={questions}
              onBack={() => setSelectedLesson(null)}
              isLoading={isLoading}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Quiz({ questions, onBack, isLoading }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answerStatus, setAnswerStatus] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const handleAnswer = useCallback(
    (answer) => {
      setSelectedAnswer(answer);
      const isCorrect = answer === questions[currentQuestion].correctAnswer;

      if (isCorrect) {
        playCorrectSound();
        setScore((prev) => prev + 10);
        setAnswerStatus("correct");
        setTimeout(() => {
          setAnswerStatus(null);
          setSelectedAnswer(null);
          setCurrentQuestion((prev) => (prev + 1) % questions.length);
        }, 1000);
      } else {
        playWrongSound();
        setAnswerStatus("wrong");
        setTimeout(() => {
          setAnswerStatus(null);
          setSelectedAnswer(null);
          setCurrentQuestion(0);
          setScore(0);
          onBack();
        }, 1500);
      }
    },
    [currentQuestion, questions, onBack]
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading questions...</p>
      </div>
    );
  }

  if (!questions?.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <p className="text-gray-600 mb-4">No questions available!</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-2 bg-indigo-500 text-white rounded-xl"
          onClick={onBack}
        >
          Back to Lessons
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl"
          onClick={onBack}
        >
          ← Back
        </motion.button>
        <div className="text-indigo-600 font-medium">
          Score: <span className="font-bold">{score}</span>
        </div>
      </div>

      <motion.div
        key={currentQuestion}
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl"
      >
        <div className="text-center mb-6">
          <span className="text-gray-500">
            Question {currentQuestion + 1}/{questions.length}
          </span>
          <h2 className="text-2xl font-medium text-gray-800 mt-2">
            {questions[currentQuestion].question}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {questions[currentQuestion].options.map((option) => {
            const isCorrect =
              option === questions[currentQuestion].correctAnswer;
            const isSelected = option === selectedAnswer;

            return (
              <motion.button
                key={option}
                whileHover={{ scale: answerStatus ? 1 : 1.05 }}
                whileTap={{ scale: answerStatus ? 1 : 0.95 }}
                className={`
                  p-4 rounded-xl text-center transition-colors disabled:cursor-not-allowed
                  ${
                    !answerStatus
                      ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                      : isCorrect
                      ? "bg-green-500 text-white"
                      : isSelected
                      ? "bg-red-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }
                `}
                onClick={() => !answerStatus && handleAnswer(option)}
                disabled={answerStatus}
              >
                {option}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        {answerStatus && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-center font-bold text-lg ${
              answerStatus === "correct" ? "text-green-600" : "text-red-600"
            }`}
          >
            {answerStatus === "correct" ? "Correct! 🎉" : "Wrong! 😢"}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default App;
