import User from "../model/User.js";
import Transaction from "../model/Transaction.js";

export const getProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const freshUser = await User.findById(user._id).select("-password");

    if (!freshUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const transactions = await Transaction.find({ phone: freshUser.phone });

    const totalDeposited = transactions.reduce((sum, t) => sum + t.amount, 0);

    res.status(200).json({
      id: freshUser._id,
      email: freshUser.email,
      phone: freshUser.phone,
      createdAt: freshUser.createdAt,
      transactions,
      totalDeposited
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile.", error: error.message });
  }
};
