### Build a WhatsApp Events Reminder App

#### Description

This project is designed to send daily reminders of scheduled events via WhatsApp. It uses Vonage's WhatsApp API for messaging and Firebase Firestore as a backend database to store and retrieve event data. This service allows users to receive notifications for today's events and query future events directly through WhatsApp.

#### Prerequisites

Before you can run this project, you need the following installed:

- Node.js
- npm (Node Package Manager)
- Firebase CLI (Optional, for deploying Firebase functions and managing the Firestore database)
- A Firebase account and a configured Firebase project.
- A Vonage API account
- Localtunnel.me

#### Installation

Install the dependencies

```bash
npm install
```

#### Configure your environment variables
Create a `.env` file in the root directory of the project and populate it with the necessary credentials:

```plaintext
VONAGE_API_KEY=your_vonage_api_key
VONAGE_API_SECRET=your_vonage_api_secret
VONAGE_WHATSAPP_NUMBER=your_vonage_whatsapp_number
TO_NUMBER=destination_number_for_notifications
FIREBASE_PROJECT_ID=your_firebase_project_id
```

Replace the placeholder values with your actual Vonage and Firebase configurations.

#### Setup Firebase

- Import your Firebase service account key JSON file to the root of the project.
- Initialize Firebase:
  ```bash
  firebase init
  ```

#### Run the application

```bash
lt --port 8000
node index.js
```

#### Usage

The application is scheduled to check for today's events and send a message via WhatsApp at a specified time each day. You can query for events on specific dates by sending messages in the format "Events on YYYY-MM-DD?" through WhatsApp.
