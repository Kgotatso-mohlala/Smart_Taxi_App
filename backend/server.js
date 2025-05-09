// server.js (Main server setup)
const express = require('express');
const http = require('http'); // Import http module
const dotenv = require('dotenv').config();
const helmetMiddleware = require('./middlewares/helmetMiddleware');
const { initializeSocket } = require('./config/socket'); 
const rateLimiterMiddleware = require('./middlewares/rateLimiterMiddleware');
const corsMiddleware = require('./middlewares/corsMiddleware');
const forceHttpsMiddleware = require('./middlewares/forceHttpsMiddleware');
const errorHandler = require("./middlewares/errorHandlerMiddleware");
const { validateSignup, validateErrors } = require('./middlewares/validateInputMiddleware');
const gracefulShutdown = require('./middlewares/dbDisconnectMiddleware');
const getClientIP = require('./utils/ipUtils');
const { connectDB } = require('./config/db');
const passport = require("./config/passport");
const userRoutes = require('./routes/userRoutes');
const authRoutes = require("./routes/authRoutes");
const taxiRoutes = require('./routes/taxiRoutes');
const taxirouteRoutes = require("./routes/taxirouteRoutes");
const rideRequestRoutes = require('./routes/rideRequestRoutes');
const chatRoutes = require('./routes/chatRoutes'); // Import chat routes
const chatGroupRoutes = require('./routes/taxiDriverGroupRoutes');

const app = express();

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});


process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Middleware setup
app.use(express.json());
app.use(helmetMiddleware());
app.use(rateLimiterMiddleware);
app.use(corsMiddleware);
app.use(forceHttpsMiddleware);

const server = http.createServer(app); // Create HTTP server
const io = initializeSocket(server);
connectDB();

// Graceful shutdown
gracefulShutdown();

app.use(passport.initialize());
app.use("/auth", authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/taxis', taxiRoutes);
app.use('/api/chat', chatRoutes); //chat routes
app.use('/api/chatGroups', chatGroupRoutes); // chat groups route
app.use("/api/admin/routes", taxirouteRoutes);
app.use("/api/routes", taxirouteRoutes)
app.use('/api/rideRequest', rideRequestRoutes);

app.use(errorHandler);

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => { // Use server.listen()
  console.log(`Server is running on port ${port}`);
});


exports.module = server