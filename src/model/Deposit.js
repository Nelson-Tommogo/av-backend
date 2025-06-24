import mongoose from "mongoose"

const DepositSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
})

const Deposit = mongoose.model("Deposit", DepositSchema)

export default Deposit
