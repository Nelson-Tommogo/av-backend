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
  
      if (!email || !betAmount || betAmount <= 0) {
        return res.status(400).json({ message: "Invalid input data" });
      }
  
      // Get user deposit record
      const userDeposit = await Deposit.findOne({ email });
  
      if (!userDeposit) {
        return res.status(404).json({ message: "User deposit not found" });
      }
  
      if (userDeposit.amount < betAmount) {
        return res.status(400).json({ message: "Insufficient funds" });
      }
  
      // Deduct bet amount
      userDeposit.amount -= betAmount;
  
      // Save updated amount
      await userDeposit.save();
  
      res.status(200).json({
        message: "Bet placed successfully",
        updatedAmount: userDeposit.amount
      });
  
    } catch (error) {
      console.error("Error placing bet:", error.message);
      res.status(500).json({ message: "Server error" });
    }
  });
  
export default router
