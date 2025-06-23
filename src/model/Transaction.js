import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  mpesaCode: { type: String, required: true },
  status: { type: String, default: "Completed" },
  date: { type: Date, default: Date.now },
});

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
