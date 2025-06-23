import express from "express";
const router = express.Router();

import { protect } from "../middlewares/authMiddleware.js";
import Transaction from "../model/Transaction.js";

router.get("/transactions", protect, async (req, res) => {
  try {
    const phone = req.user.phone;

    const transactions = await Transaction.find({ phone }).sort({ date: -1 });

    res.status(200).json({
      count: transactions.length,
      transactions,
    });
  } catch (err) {
    console.error("Fetch transactions error:", err.message);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

export default router;
