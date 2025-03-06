import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Particles from "react-particles";
import { loadFull } from "tsparticles";
import "./App.css";

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
  const [theme, setTheme] = useState("light");
  const [scoreHistory, setScoreHistory] = useState([]);

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
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
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

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-300
      ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900"
          : "bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50"
      }`}
    >
      <motion.div
        className={`max-w-2xl w-full mx-auto p-6 rounded-3xl shadow-2xl ${
          theme === "dark" ? "bg-gray-800/95 text-white" : "bg-white/95"
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="text-center mb-8 flex justify-between items-center">
          <motion.h1
            className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Japanese Vocabulary Master
          </motion.h1>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </motion.button>
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
                          className={`w-full p-3 rounded-xl transition-colors ${
                            theme === "dark"
                              ? "bg-indigo-900 text-indigo-200 hover:bg-indigo-800"
                              : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                          }`}
                          onClick={() => handleSelectLesson(lesson)}
                        >
                          Lesson {lesson}
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                )}
                {scoreHistory.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold">Score History</h3>
                    <ul className="mt-2 space-y-2">
                      {scoreHistory.map((score, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-600 dark:text-gray-300"
                        >
                          Game {index + 1}: {score} points
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <Quiz
              key="quiz"
              questions={questions}
              onBack={(finalScore) => {
                setSelectedLesson(null);
                if (finalScore !== undefined) {
                  setScoreHistory((prev) => [...prev, finalScore]);
                }
              }}
              isLoading={isLoading}
              theme={theme}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Quiz({ questions, onBack, isLoading, theme }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answerStatus, setAnswerStatus] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
  const [showParticles, setShowParticles] = useState(false);
  const timerRef = useRef(null);

  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  useEffect(() => {
    if (!answerStatus) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAnswer(null); // Timeout counts as wrong answer
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [currentQuestion, answerStatus]);

  const handleAnswer = useCallback(
    (answer) => {
      clearInterval(timerRef.current);
      setSelectedAnswer(answer);
      const isCorrect = answer === questions[currentQuestion].correctAnswer;

      if (isCorrect) {
        playCorrectSound();
        setScore((prev) => prev + 10);
        setAnswerStatus("correct");
        setShowParticles(true);
        setTimeout(() => {
          setAnswerStatus(null);
          setSelectedAnswer(null);
          setTimeLeft(30);
          setShowParticles(false);
          setCurrentQuestion((prev) => {
            const next = prev + 1;
            if (next >= questions.length) {
              onBack(score + 10); // Include final correct answer in score
              return 0;
            }
            return next;
          });
        }, 1000);
      } else {
        playWrongSound();
        setAnswerStatus("wrong");
        setTimeout(() => {
          setAnswerStatus(null);
          setSelectedAnswer(null);
          setTimeLeft(30);
          setCurrentQuestion(0);
          onBack(score);
          setScore(0);
        }, 1500);
      }
    },
    [currentQuestion, questions, onBack, score]
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto"></div>
        <p
          className={`mt-4 ${
            theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Loading questions...
        </p>
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
        <p
          className={`mb-4 ${
            theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`}
        >
          No questions available!
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-2 bg-indigo-500 text-white rounded-xl"
          onClick={() => onBack()}
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
      className="space-y-6 relative"
    >
      {showParticles && (
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            particles: {
              number: { value: 50, density: { enable: true, value_area: 800 } },
              color: { value: ["#FFD700", "#FF4500", "#00FF00"] },
              shape: { type: "star" },
              opacity: { value: 0.8, random: true },
              size: { value: 5, random: true },
              move: {
                enable: true,
                speed: 3,
                direction: "top",
                out_mode: "out",
              },
            },
            interactivity: { events: { onhover: { enable: false } } },
          }}
          className="absolute inset-0 z-10"
        />
      )}

      <div className="flex justify-between items-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-4 py-2 rounded-xl ${
            theme === "dark"
              ? "bg-gray-700 text-gray-200"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => onBack(score)}
        >
          ← Back
        </motion.button>
        <div
          className={`font-medium ${
            theme === "dark" ? "text-indigo-300" : "text-indigo-600"
          }`}
        >
          Score: <span className="font-bold">{score}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <motion.div
          className="bg-indigo-600 h-2.5 rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${((currentQuestion + 1) / questions.length) * 100}%`,
          }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <motion.div
        key={currentQuestion}
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`p-6 rounded-xl ${
          theme === "dark"
            ? "bg-gradient-to-r from-indigo-900 to-purple-900"
            : "bg-gradient-to-r from-indigo-50 to-purple-50"
        }`}
      >
        <div className="text-center mb-6">
          <span
            className={theme === "dark" ? "text-gray-400" : "text-gray-500"}
          >
            Question {currentQuestion + 1}/{questions.length}
          </span>
          <div className="mt-2 text-lg font-semibold text-red-500 dark:text-red-400">
            Time: {timeLeft}s
          </div>
          <h2
            className={`text-2xl font-medium ${
              theme === "dark" ? "text-gray-100" : "text-gray-800"
            } mt-2`}
          >
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
                      ? theme === "dark"
                        ? "bg-indigo-800 text-indigo-200 hover:bg-indigo-700"
                        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                      : isCorrect
                      ? "bg-green-500 text-white"
                      : isSelected
                      ? "bg-red-500 text-white"
                      : theme === "dark"
                      ? "bg-gray-600 text-gray-400"
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
              answerStatus === "correct"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
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
