import express from "express"
import Deposit from "../model/Deposit.js"

const router = express.Router()

router.post("/", async (req, res) => {
  const { name, phone, amount, email } = req.body

  if (!name || !phone || !amount || !email) {
    return res.status(400).json({ message: "All fields are required" })
  }

  try {
    const newDeposit = new Deposit({ name, phone, amount, email })
    await newDeposit.save()
    res.status(201).json({ message: "Deposit saved successfully", deposit: newDeposit })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})
router.get("/", async (req, res) => {
    try {
      const deposits = await Deposit.find().sort({ createdAt: -1 })
      res.status(200).json(deposits)
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deposits" })
    }
  })

router.get("/by-email", async (req, res) => {
    const { email } = req.query
  
    if (!email) {
      return res.status(400).json({ message: "Email query parameter is required" })
    }
  
    try {
      const deposits = await Deposit.find({ email: email.toLowerCase() }).sort({ createdAt: -1 })
      res.status(200).json(deposits)
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deposits" })
    }
  })


  router.post("/placebet", async (req, res) => {
    try {
      const { email, betAmount } = req.body;
  
      // Validate input
      if (!email || !betAmount || betAmount <= 0) {
        return res.status(400).json({ message: "Invalid input data" });
      }
  
      // Get all deposits for this user
      const deposits = await Deposit.find({ email });
      
      if (!deposits || deposits.length === 0) {
        return res.status(404).json({ message: "No deposits found for this user" });
      }
  
      // Calculate total balance
      const totalBalance = deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
  
      if (totalBalance < betAmount) {
        return res.status(400).json({ 
          message: "Insufficient funds",
          currentBalance: totalBalance,
          requiredAmount: betAmount
        });
      }
  
      // Deduct from the most recent deposit first (better for tracking)
      deposits.sort((a, b) => b.createdAt - a.createdAt);
      
      let remainingDeduction = betAmount;
      for (const deposit of deposits) {
        if (remainingDeduction <= 0) break;
  
        const deductionAmount = Math.min(deposit.amount, remainingDeduction);
        deposit.amount -= deductionAmount;
        remainingDeduction -= deductionAmount;
  
        await deposit.save();
      }
  
      // Calculate new balance (could also sum deposits again for verification)
      const newBalance = totalBalance - betAmount;
  
      res.status(200).json({
        success: true,
        message: "Bet placed successfully",
        newBalance: newBalance,
        betAmount: betAmount
      });
  
    } catch (error) {
      console.error("Error placing bet:", error.message);
      res.status(500).json({ 
        success: false,
        message: "Server error while processing bet" 
      });
    }
  });
  
export default router
