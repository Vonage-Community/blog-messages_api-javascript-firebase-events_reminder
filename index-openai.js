require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const admin = require("firebase-admin");
const OpenAI = require("openai");

admin.initializeApp({
  credential: admin.credential.cert(
    require("./events-reminder-store-credentials.json")
  ),
});

const db = admin.firestore();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8000;
const {
  VONAGE_API_KEY,
  VONAGE_API_SECRET,
  VONAGE_WHATSAPP_NUMBER,
  TO_NUMBER,
  OPENAI_API_KEY,
} = process.env;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function sendMessage(text, to_number) {
  try {
    const data = {
      from: { type: "whatsapp", number: VONAGE_WHATSAPP_NUMBER },
      to: { type: "whatsapp", number: to_number },
      message: { content: { type: "text", text } },
    };

    const response = await axios.post(
      "https://messages-sandbox.nexmo.com/v0.1/messages",
      data,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${VONAGE_API_KEY}:${VONAGE_API_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Message sent successfully", response.data);
  } catch (error) {
    console.error("Failed to send message:", error);
  }
}

async function generateCreativeMessage(eventsText) {
  try {
    const response = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: `Create a friendly and engaging message based on the following events: ${eventsText}`,
      max_tokens: 150,
    });
    return response.choices[0].text.trim();
  } catch (error) {
    console.error("Failed to generate message with OpenAI:", error);
    return `Here's what's happening today: ${eventsText}`; // Fallback text
  }
}

function getEventsForToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return db
    .collection("events")
    .where("date", ">=", admin.firestore.Timestamp.fromDate(today))
    .where("date", "<", admin.firestore.Timestamp.fromDate(tomorrow))
    .get()
    .then((snapshot) => {
      if (snapshot.empty) return "No events found for today.";
      let eventsText = "Today's events: ";
      snapshot.forEach((doc) => (eventsText += `${doc.data().details}; `));
      return eventsText;
    })
    .catch((error) => {
      console.error("Error fetching events:", error);
      return "Failed to fetch events.";
    });
}

cron.schedule(
  "50 09 * * *",
  async () => {
    console.log("Running a job at 09:50 at Europe/London timezone");
    const eventsText = await getEventsForToday();
    const creativeText = await generateCreativeMessage(eventsText);
    sendMessage(
      `${eventsText}\n\nSuggested message to send: ${creativeText}`,
      TO_NUMBER
    );
  },
  {
    scheduled: true,
    timezone: "Europe/London",
  }
);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
