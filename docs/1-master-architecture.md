# Master Architecture & System Specifications
**Project Name:** The Investment Academy (App)
**Type:** Premium Progressive Web App (PWA), Mobile-First Design.

## 1. Core Vision & Target Audience
A high-end, digital "Financial Family Office" ecosystem for existing academy clients.
The system automates 90% of routine client support, builds deep brand loyalty, and provides full financial clarity (cashflow, goals, net worth, real estate, and VOD education).

## 2. Tech Stack Recommendations
* **Framework:** Next.js (React) - for fast, SEO-friendly, and app-like performance.
* **Database & Backend:** Supabase (PostgreSQL) - chosen for its robust Row Level Security (RLS) which is critical for financial data.
* **Styling:** Tailwind CSS & Shadcn UI - to achieve a custom, premium, and luxury UI/UX (dark/gold themes).
* **Hosting:** Vercel.

## 3. Authentication & Access (Biometrics)
* **Registration:** Analysts create the account and send an invite/initial password to the client.
* **Login Flow:** Clients log in initially via email/password. Immediately after, the system prompts them to enable **Passkeys/WebAuthn** (Face ID / Fingerprint / Windows Hello). Future logins will be seamless and passwordless using biometrics.

## 4. Team Roles & Strict Permissions (RLS Rules)
* **Super Admin (Founders - 2 Users):** Full CRUD (Create, Read, Update, Delete) access to all tables, users, and system settings.
* **Analyst (Employees):** * Can CREATE and READ users/data only for clients assigned to their specific `analyst_id`.
    * Can UPDATE client data to keep financial boards current.
    * **NEVER DELETE:** Analysts have strictly zero 'Delete' permissions across the entire database to prevent data loss.
* **Client:** READ and UPDATE access restricted absolutely to their own `user_id`. Cannot see other clients' data.

## 5. Client Lifecycle & Retention Strategy
* **Lifetime Access:** Clients are never locked out of the app, even after their active advising process ends.
* **Post-Process State:** When a process ends, the app transitions into a "Nurture/Alumni" state. They retain access to their historical data and VOD.
* **Upsell Engine:** The UI will dynamically display targeted prompts, new insights, or automated calls-to-action to re-engage the client into a new paid advisory process.
