let socketIo = require("socket.io");
let io = socketIo();
let socketApi = {};
socketApi.io = io;

module.exports = socketApi;