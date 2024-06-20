require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const admin = require("firebase-admin");

const serviceAccount = require("./events-reminder-store-credentials.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
app.use(express.json());

const PORT = 8000;
const { VONAGE_WHATSAPP_NUMBER, TO_NUMBER, VONAGE_API_KEY, VONAGE_API_SECRET } =
  process.env;

async function sendMessage(text, to_number) {
  try {
    const data = {
      from: { type: "whatsapp", number: VONAGE_WHATSAPP_NUMBER },
      to: { type: "whatsapp", number: to_number },
      message: { content: { type: "text", text } },
    };

    const headers = {
      Authorization: `Basic ${Buffer.from(
        `${VONAGE_API_KEY}:${VONAGE_API_SECRET}`
      ).toString("base64")}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(
      "https://messages-sandbox.nexmo.com/v0.1/messages",
      data,
      { headers }
    );
    console.log("Message sent successfully", response.data);
  } catch (error) {
    console.error("Failed to send message:", error);
  }
}

cron.schedule(
  "* * * * *",
  async () => {
    const message = await getEventsForToday();
    sendMessage(message, TO_NUMBER);
  },
  {
    scheduled: true,
    timezone: "Europe/London",
  }
);

async function getEventsForToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  try {
    const snapshot = await db
      .collection("events")
      .where("date", ">=", admin.firestore.Timestamp.fromDate(today))
      .where("date", "<", admin.firestore.Timestamp.fromDate(tomorrow))
      .get();

    if (snapshot.empty) {
      return "No events found for today.";
    }

    let eventsText = "Today's events: ";
    snapshot.forEach((doc) => {
      const event = doc.data();
      eventsText += `${event.details}; `;
    });
    return eventsText;
  } catch (error) {
    console.error("Error fetching events:", error);
    return "Failed to fetch events.";
  }
}

app.post("/inbound", (req, res) => {
  const incomingMsgText = req.body.text;
  const requesterNumber = req.body.from;

  const dateRegex = /(\d{4}-\d{2}-\d{2})/;
  const dateMatch = incomingMsgText.match(dateRegex);
  if (dateMatch) {
    const dateString = dateMatch[0];
    handleDateRequest(dateString, requesterNumber);
  } else {
    sendMessage(
      "Please provide a date in YYYY-MM-DD format to check for events.",
      requesterNumber
    );
  }
  res.status(200).send();
});

async function handleDateRequest(dateString, requesterNumber) {
  const queryDateStart = new Date(dateString + "T00:00:00Z");
  const queryDateEnd = new Date(dateString + "T00:00:00Z");
  queryDateEnd.setDate(queryDateEnd.getDate() + 1); // Increment the day for the end date

  try {
    const snapshot = await db
      .collection("events")
      .where("date", ">=", admin.firestore.Timestamp.fromDate(queryDateStart))
      .where("date", "<", admin.firestore.Timestamp.fromDate(queryDateEnd))
      .get();

    if (snapshot.empty) {
      sendMessage("No events found for " + dateString, requesterNumber);
      return;
    }

    let eventsText = `Events on ${dateString}: `;
    snapshot.forEach((doc) => {
      const event = doc.data();
      eventsText += `${event.details}; `;
    });
    sendMessage(eventsText, requesterNumber);
  } catch (error) {
    console.error("Error retrieving events:", error);
  }
}

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
