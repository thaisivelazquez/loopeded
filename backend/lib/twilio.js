import twilio from "twilio";

// Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
// in .env.local. See the console setup steps you were given alongside this
// file for how to get these three values.
export const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
export const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;