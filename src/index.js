import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import connectDB from "./config/db.js";
import stkRoutes from "./routes/stkRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js"
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

// Load env
dotenv.config({ path: "./src/.env" });

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS config
const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server is up and running!",
    note: "CORS is configured to allow all origins.",
  });
});

// API routes
app.use("/api/stk", stkRoutes);        
app.use("/api/auth", authRoutes);      
app.use("/api/users", userRoutes);  
app.use("/api/mpesa", transactionRoutes);


// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("✅ CORS: All origins are allowed.");
});

export { app, PORT };
