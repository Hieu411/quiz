const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());

// Đọc dữ liệu từ file JSON
const data = JSON.parse(fs.readFileSync("data.json", "utf8"));

// API lấy danh sách các bài học
app.get("/api/lessons", (req, res) => {
  res.json(Object.keys(data));
});

// API lấy từ vựng theo bài
app.get("/api/lessons/:lesson", (req, res) => {
  const lesson = req.params.lesson;
  if (data[lesson]) {
    res.json(data[lesson]);
  } else {
    res.status(404).json({ message: "Bài học không tồn tại" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
