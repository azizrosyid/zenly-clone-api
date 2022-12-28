const mysql = require("mysql2");
const pool = mysql.createPool({
  host: "188.166.204.247",
  user: "itc",
  password: "itcnihbos",
  database: "gps",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
module.exports = pool;
