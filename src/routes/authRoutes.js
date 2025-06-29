import express from "express";
import { signup, login,getLoggedInUser } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";


const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

router.get("/me", protect, getLoggedInUser);


export default router;
