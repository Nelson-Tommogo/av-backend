import express from "express"
import Deposit from "../model/Deposit.js"

const router = express.Router()

router.post("/", async (req, res) => {
  const { name, phone, amount } = req.body

  if (!name || !phone || !amount) {
    return res.status(400).json({ message: "All fields are required" })
  }

  try {
    const newDeposit = new Deposit({ name, phone, amount })
    await newDeposit.save()
    res.status(201).json({ message: "Deposit saved successfully", deposit: newDeposit })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

export default router
