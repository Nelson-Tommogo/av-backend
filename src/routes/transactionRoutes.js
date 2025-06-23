import express from "express";
import {
  handleMpesaCallback,
  getUserTransactions,
} from "../controllers/transactionController.js";

const router = express.Router();

router.post("/callback", handleMpesaCallback);
router.get("/user/:phone", getUserTransactions);

export default router;
