# Feature Spec: Process Tracking, Meetings & Contacts

## 1. Overview
Manages the logistical and operational side of the advisory process: tracking meetings, reading summaries, and providing direct access to relevant professionals.

## 2. Dynamic Contact Cards
* **The Master List:** A global database of external service providers (Lawyers, Mortgage Brokers, CPAs).
* **Dynamic Access:** Contacts are securely revealed to the Client based on the specific "Process Type" they purchased.
* **UI/UX:** High-end "Contact Cards" featuring a persistent, one-click "WhatsApp" action button for seamless mobile communication.

## 3. Monday.com Integration (Meeting Summaries)
* **Single Source of Truth:** Analysts type the meeting summaries natively inside Monday.com (not the app).
* **API/Webhooks:** The system's backend will listen for changes in Monday.com and automatically ingest and display these summaries in the Client's app timeline.

## 4. Meeting Counter & Smart Alerts
* **Tracker:** A visual progress indicator (e.g., "Meetings Utilized: 3 out of 10").
* **Automated Nudges:** The system automatically sends alerts to the client to schedule their next session when appropriate.
