const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const http = require("http");
const { Server } = require("socket.io");

const usersRouter = require("./routes/users");
const cors = require("cors");
const axios = require("axios");
const pool = require("./utils/poolDB");
const data_place = require("./data_place");
const promisePool = pool.promise();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const key = "AIzaSyA5v1V6NQp55zEAWOrDZwzjgoa-pIjZD5U";

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/user", usersRouter);
app.get("/place", async (req, res) => {
  res.json(data_place);
});

const allLocations = {};

const loadAllLocations = async () => {
  const sql = "SELECT * FROM location JOIN user ON location.user_id = user.id";
  const [rows, fields] = await promisePool.query(sql);
  rows.forEach(async (row) => {
    allLocations[row.user_id] = {
      id: row.user_id,
      coordinates: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      status: "offline",
      emitTime: new Date().getTime(),
    };
    allLocations[row.user_id].address = await getAddress(
      allLocations[row.user_id].coordinates
    );
    allLocations[row.user_id].user = {
      id: row.user_id,
      username: row.username,
      image: row.image,
    };
  });
};

function onConnection(socket) {
  socket.on("sendLocation", (data) => {
    console.log(data);
    allLocations[data.id] = {
      ...data,
      socketId: socket.id,
      status: "online",
      emitTime: new Date().getTime(),
    };
  });
}

loadAllLocations();

io.on("connection", onConnection);

const cache = {};

async function getAddress(coordinates) {
  const { latitude, longitude } = coordinates;
  const cacheKey = `${latitude},${longitude}`;
  // Check if the address is in the cache
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  // If not, make a request to the API
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${key}`;

  try {
    const address = await axios.post(url).then((res) => {
      return res.data.results[0].formatted_address;
    });

    // Add the address to the cache
    cache[cacheKey] = address;

    return address;
  } catch (e) {
    return await getAddress(coordinates);
  }
}

const savedToDatabase = [];

setInterval(() => {
  let listLocations = Object.values(allLocations);
  listLocations = listLocations.map(async (location) => {
    let result = location;
    const { coordinates } = location;
    if (!coordinates) return;

    if (new Date().getTime() - location.emitTime > 10000) {
      if (!savedToDatabase.includes(location.id)) {
        const sql =
          "INSERT INTO location (user_id, latitude, longitude, created_at) VALUES (?, ?, ?, ?)";
        const values = [
          location.id,
          coordinates.latitude,
          coordinates.longitude,
          new Date().toISOString().slice(0, 19).replace("T", " "),
        ];
        try {
          const [rows, fields] = await promisePool.query(sql, values);
          console.log(rows);
        } catch (e) {
          console.log(e.message);
        }

        savedToDatabase.push(location.id);
      }

      result = {
        ...location,
        status: "offline",
      };
    } else {
      savedToDatabase.splice(savedToDatabase.indexOf(location.id), 1);
      result = {
        ...location,
        status: "online",
      };
    }

    const address = await getAddress(coordinates);
    result = {
      ...result,
      address,
    };

    return result;
  });

  Promise.all(listLocations).then((listLocations) => {
    io.emit("allLocations", listLocations);
  });
}, 3000);

server.listen(5000, () => {
  console.log("listening on *:3000");
});
