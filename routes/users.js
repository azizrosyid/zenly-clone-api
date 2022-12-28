const express = require("express");
const router = express.Router();

const pool = require("../utils/poolDB");
const promisePool = pool.promise();

router.post("/signup", async function (req, res, next) {
  const sql = "INSERT INTO user (username, password, image) VALUES (?, ?, ?)";

  console.log(req.body);
  const values = [
    req.body.username,
    req.body.password,
    "https://i.pravatar.cc/100",
  ];
  try {
    const [rows, fields] = await promisePool.query(sql, values);
    res.json({
      id: rows.insertId,
      username: req.body.username,
      image: "https://i.pravatar.cc/100",
    });
  } catch (e) {
    res.status(500).json({
      message: e.message,
    });
  }
});

router.post("/login", async function (req, res, next) {
  const sql = "SELECT * FROM user WHERE username = ? AND password = ?";
  const values = [req.body.username, req.body.password];
  const [rows, fields] = await promisePool.query(sql, values);
  if (rows.length > 0) {
    res.json({
      id: rows[0].id,
      username: rows[0].username,
      image: rows[0].image,
    });
  } else {
    res.status(401).json({
      message: "Username or password is incorrect",
    });
  }
});

module.exports = router;
