import express from "express";
import axios from "axios";
import moment from "moment";
import { getToken } from "../middlewares/tokenMiddleware.js";
import Transaction from "../model/Transaction.js";

const router = express.Router();

// Helper function to generate password
const generatePassword = (shortCode, passKey) => {
  const timestamp = moment().format("YYYYMMDDHHmmss");
  return {
    password: Buffer.from(`${shortCode}${passKey}${timestamp}`).toString("base64"),
    timestamp,
  };
};

// Helper function to validate and format phone number
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;

  // Remove any non-digit characters
  const cleaned = phoneNumber.toString().replace(/\D/g, '');

  // Handle Kenyan numbers
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `254${cleaned.substring(1)}`;
  }
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned;
  }
  if (cleaned.length === 9) {
    return `254${cleaned}`;
  }

  return null;
};

// Route to test token generation
router.get("/test-token", getToken, (req, res) => {
  res.status(200).json({
    message: "Token generated successfully",
    token: req.token,
  });
});

// Route to handle STK push request
router.post("/stk", getToken, async (req, res) => {
  try {
    const token = req.token;
    let { phoneNumber, amount } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({ 
        error: "Phone number and amount are required fields." 
      });
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      return res.status(400).json({ 
        error: "Invalid phone number format. Expected formats: 07XXXXXXXX, 2547XXXXXXXX, or XXXXXXXXX (9 digits)" 
      });
    }

    const { password, timestamp } = generatePassword(
      process.env.M_PESA_SHORT_CODE,
      process.env.M_PESA_PASSKEY
    );

    // Use Till Number if available, else fallback to Short Code
    const partyB = process.env.M_PESA_TILL_NUMBER || process.env.M_PESA_SHORT_CODE;

    const requestBody = {
      BusinessShortCode: process.env.M_PESA_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: process.env.M_PESA_TRANSACTION_TYPE || "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: partyB,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.CALLBACK_URL,
      AccountReference: process.env.M_PESA_ACCOUNT_REFERENCE || "PaymentRef",
      TransactionDesc: process.env.M_PESA_TRANSACTION_DESC || "Payment for goods/services",
    };

    const response = await axios.post(
      `${process.env.BASE_URL}mpesa/stkpush/v1/processrequest`,
      requestBody,
      { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }, 
      }
    );

    if (response.data.ResponseCode === "0") {
      return res.status(200).json({
        message: "STK push request sent successfully.",
        checkoutRequestID: response.data.CheckoutRequestID,
        merchantRequestID: response.data.MerchantRequestID,
        responseDescription: response.data.ResponseDescription,
      });
    } else {
      return res.status(400).json({
        error: "Failed to initiate STK push.",
        responseDescription: response.data.ResponseDescription,
      });
    }
  } catch (error) {
    console.error("Error during STK Push:", error.message);
    if (error.response) {
      return res.status(error.response.status).json({
        error: "Safaricom API Error",
        message: error.response.data.errorMessage || error.response.data,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

router.post("/callback", async (req, res) => {
  console.log("✅ Received callback from M-PESA");
  console.log(JSON.stringify(req.body, null, 2));
  try {
    if (!req.body || !req.body.Body) {
      return res.status(400).json({ error: "Invalid callback data" });
    }

    const callbackData = req.body;
    const resultCode = callbackData.Body.stkCallback.ResultCode;

    if (resultCode !== 0) {
      return res.status(400).json({
        ResultCode: resultCode,
        ResultDesc: callbackData.Body.stkCallback.ResultDesc,
      });
    }

    const metadata = callbackData.Body.stkCallback.CallbackMetadata;
    const getItemValue = (name) =>
      metadata.Item.find((obj) => obj.Name === name)?.Value || null;

    const transaction = {
      amount: getItemValue("Amount"),
      mpesaCode: getItemValue("MpesaReceiptNumber"),
      phone: getItemValue("PhoneNumber"),
    };

    // Save transaction to DB
    await Transaction.create(transaction);

    res.status(200).json({
      message: "Transaction saved",
      transaction,
    });
  } catch (error) {
    console.error("Callback processing error:", error);
    return res.status(500).json({
      error: "An error occurred while processing the callback.",
      details: error.message,
    });
  }
});




router.post("/stkquery", getToken, async (req, res) => {
  try {
    const { checkoutRequestID } = req.body;

    // 1. Validate input
    if (!checkoutRequestID || typeof checkoutRequestID !== "string") {
      return res.status(400).json({ 
        success: false,
        error: "Valid CheckoutRequestID is required (string)",
      });
    }

    // 2. Generate M-Pesa password and timestamp
    const { password, timestamp } = generatePassword(
      process.env.M_PESA_SHORT_CODE,
      process.env.M_PESA_PASSKEY
    );

    // 3. Call Safaricom STK Query API
    const response = await axios.post(
      `${process.env.BASE_URL}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: process.env.M_PESA_SHORT_CODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID.trim(),
      },
      {
        headers: {
          Authorization: `Bearer ${req.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10-second timeout
      }
    );

    const { 
      ResultCode, 
      ResultDesc, 
      MerchantRequestID, 
      CheckoutRequestID: reqID,
      CallbackMetadata // Contains payment details (amount, receipt, phone)
    } = response.data;

    // 4. Handle successful payment
    if (ResultCode === "0") {
      // Extract payment details from CallbackMetadata
      const metadata = CallbackMetadata?.Item || [];
      const getItemValue = (name) => metadata.find((item) => item.Name === name)?.Value;

      const transactionData = {
        merchantRequestID: MerchantRequestID,
        checkoutRequestID: reqID,
        amount: getItemValue("Amount"),
        mpesaReceiptNumber: getItemValue("MpesaReceiptNumber"),
        phoneNumber: getItemValue("PhoneNumber"),
        transactionDate: getItemValue("TransactionDate"),
        status: "completed",
      };

      // 5. Save to MongoDB
      const savedTransaction = await Transaction.create(transactionData);

      return res.status(200).json({
        success: true,
        status: "success",
        message: "Payment completed and saved successfully",
        data: savedTransaction,
      });
    }

    // 6. Handle failed payment
    return res.status(200).json({
      success: false,
      status: "failed",
      message: ResultDesc || "Payment failed",
      data: {
        resultCode: ResultCode,
        merchantRequestID: MerchantRequestID,
        checkoutRequestID: reqID,
      },
    });

  } catch (error) {
    console.error("STK Query Error:", error.message);

    // Handle errors (same as before)
    if (error.response) {
      return res.status(502).json({
        success: false,
        error: "Safaricom API Error",
        message: error.response.data.errorMessage || "Payment status query failed",
      });
    }
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

export default router;
