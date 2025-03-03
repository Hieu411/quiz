import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const playCorrectSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.3
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.3);
};

const playWrongSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(349.23, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(293.66, audioContext.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.4
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.4);
};

function App() {
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [reverseMode, setReverseMode] = useState(false);

  useEffect(() => {
    axios.get("http://localhost:5000/api/lessons").then((res) => {
      setLessons(res.data);
    });
  }, []);

  const handleSelectLesson = (lesson) => {
    setSelectedLesson(lesson);
    axios.get(`http://localhost:5000/api/lessons/${lesson}`).then((res) => {
      const words = shuffleArray(Object.entries(res.data));
      const formattedQuestions = words.map(([jp, vi]) => {
        const correctAnswer = reverseMode ? jp : vi;
        const allAnswers = words.map(([j, v]) => (reverseMode ? j : v));
        const options = shuffleArray([
          correctAnswer,
          ...shuffleArray(allAnswers).slice(0, 3),
        ]);
        return {
          question: reverseMode ? vi : jp,
          correctAnswer,
          options,
        };
      });
      setQuestions(formattedQuestions);
    });
  };

  const shuffleArray = (array) => {
    return array.sort(() => Math.random() - 0.5);
  };

  return (
    <div className="container">
      <h1 className="title">Ôn tập từ vựng tiếng Nhật</h1>
      <p className="">by huahieu</p>

      {!selectedLesson ? (
        <div className="lesson-selection">
          <h2>Chọn bài học</h2>
          <button
            className="mode-button"
            onClick={() => setReverseMode(!reverseMode)}
          >
            {reverseMode
              ? "Chế độ: Tiếng Nhật -> Tiếng Việt"
              : "Chế độ: Tiếng Việt -> Tiếng Nhật"}
          </button>
          <ul className="lesson-list">
            {lessons.map((lesson) => (
              <li key={lesson}>
                <button
                  className="lesson-button"
                  onClick={() => handleSelectLesson(lesson)}
                >
                  Bài {lesson}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Quiz
          questions={questions}
          onBack={() => setSelectedLesson(null)}
          onWrongAnswer={() => setSelectedLesson(null)}
        />
      )}
    </div>
  );
}

function Quiz({ questions, onBack, onWrongAnswer }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answerStatus, setAnswerStatus] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  if (!questions || questions.length === 0) {
    return (
      <div className="quiz-container">
        <h2>Không có câu hỏi nào trong bài học này!</h2>
        <button className="back-button" onClick={onBack}>
          Quay lại chọn bài
        </button>
      </div>
    );
  }

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);

    if (answer === questions[currentQuestion].correctAnswer) {
      playCorrectSound();

      setScore(score + 10);
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
        onWrongAnswer();
      }, 2000);
    }
  };

  // Hàm để xác định class cho mỗi nút đáp án
  const getButtonClass = (option) => {
    const isCorrect = option === questions[currentQuestion].correctAnswer;
    const isSelected = option === selectedAnswer;

    let buttonClass = "option-button";

    if (answerStatus === "wrong") {
      if (isCorrect) {
        buttonClass += " correct-answer";
      } else if (isSelected) {
        buttonClass += " wrong-answer";
      }
    } else if (answerStatus === "correct" && isSelected) {
      buttonClass += " correct-answer";
    }

    return buttonClass;
  };

  return (
    <div className="quiz-container">
      <button className="back-button" onClick={onBack}>
        Quay lại chọn bài
      </button>
      <h2 className="question-number">Câu hỏi {currentQuestion + 1}</h2>
      <p className="question-text">{questions[currentQuestion]?.question}</p>
      <div className="options-container">
        {questions[currentQuestion]?.options.map((option, index) => (
          <button
            key={index}
            className={getButtonClass(option)}
            onClick={() => !answerStatus && handleAnswer(option)}
            disabled={answerStatus !== null}
          >
            {option}
          </button>
        ))}
      </div>
      {answerStatus === "correct" && <p className="correct">Chính xác!</p>}
      {answerStatus === "wrong" && <p className="wrong">Sai rồi, ngu thế!</p>}
      <p className="score">Điểm: {score}</p>
    </div>
  );
}

export default App;
