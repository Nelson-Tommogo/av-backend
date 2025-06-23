import User from "../model/User.js";

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

    res.status(200).json({
      id: freshUser._id,
      email: freshUser.email,
      phone: freshUser.phone,
      createdAt: freshUser.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile." });
  }
};
