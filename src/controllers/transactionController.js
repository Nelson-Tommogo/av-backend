import Transaction from "../model/Transaction.js";
import Wallet from "../model/Wallet.js";
import User from "../model/User.js";

// Save callback transaction
export const handleMpesaCallback = async (req, res) => {
  try {
    const stkCallback = req.body?.Body?.stkCallback;

    if (!stkCallback || stkCallback.ResultCode !== 0) {
      return res.status(400).json({ message: "Transaction failed or missing" });
    }

    const callbackData = stkCallback.CallbackMetadata?.Item;
    const amount = callbackData.find((i) => i.Name === "Amount")?.Value;
    const phone = callbackData.find((i) => i.Name === "PhoneNumber")?.Value;
    const mpesaReceiptNumber = callbackData.find((i) => i.Name === "MpesaReceiptNumber")?.Value;

    if (!amount || !phone || !mpesaReceiptNumber) {
      return res.status(400).json({ message: "Missing transaction details" });
    }

    // Save transaction
    const savedTransaction = await Transaction.create({
      phone,
      amount,
      mpesaReceiptNumber,
    });

    // Update or create wallet
    const wallet = await Wallet.findOne({ phone });
    if (wallet) {
      wallet.balance += amount;
      await wallet.save();
    } else {
      await Wallet.create({ phone, balance: amount });
    }

    res.status(200).json({ message: "Transaction and wallet saved", savedTransaction });
  } catch (err) {
    res.status(500).json({ message: "Callback error", error: err.message });
  }
};

// Get all user transactions
export const getUserTransactions = async (req, res) => {
  const { phone } = req.params;
  try {
    const transactions = await Transaction.find({ phone });

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);

    const user = await User.findOne({ phone });

    res.status(200).json({
      name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Unknown",
      email: user?.email || "N/A",
      phone,
      totalDeposited: total,
      transactions,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch transactions", error: err.message });
  }
};
