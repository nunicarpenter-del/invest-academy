# Feature Spec: Cashflow & Habits Board

## 1. Overview
The Cashflow board is the daily interaction hub. It tracks expenses against budgets using smart time-relative alerts, and uses AI to assign personalized financial habits.

## 2. Data Ingestion & Security (Open Banking Ready)
* **Phase 1:** Manual transaction entry and CSV/Excel uploads.
* **Phase 2 (Architecture requirement):** Designed to integrate with Open Banking APIs (e.g., Finanda).
* **Security Protocol:** The system will NEVER store bank login credentials. It will only handle secure, read-only OAuth tokens. Database architecture must support storing standardized transaction objects securely locked behind Row Level Security (RLS) per `user_id`.

## 3. Categories & Budgeting
* **Categories:** A fixed list of global categories (e.g., Housing, Food, Transportation) provided by the system.
* **Budget Rules:** The **Client** defines their own monthly budget limit for each category.

## 4. Smart Alerts Engine (Time-Relative Logic)
* **Trigger Logic:** Alerts are calculated based on budget consumption relative to the time passed in the current month.
* *Example:* If 25% of the month has passed, but 40% of the category budget is already consumed, the system triggers an alert.
* **Recipients:** These specific micro-alerts are sent **strictly to the Client** (via In-App notification and Email) to build personal accountability. Analysts do NOT receive these alerts.

## 5. AI-Driven Habits & Task Engine
* **The Task Bank:** A central database of financial habits/tasks created by the Admins.
* **AI Assignment:** An AI logic layer will profile the client based on their onboarding data and cashflow behavior, automatically assigning them the most relevant tasks from the Task Bank.
* **Progression:** Clients check off completed tasks, feeding back into their engagement metrics.
