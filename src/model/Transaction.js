import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  mpesaReceiptNumber: { type: String, required: true, unique: true },
  transactionDate: { type: Date, default: Date.now },
});

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
