# Feature Spec: Wealth Management & Net Worth

## 1. Overview
A holistic dashboard showing the client's true Net Worth, asset distribution, and the calculated distance to Financial Independence (Passive Income target).

## 2. Flexible Assets & Liabilities Schema
* **Assets:** Flexible data structure to add any asset type (Capital Markets, Crypto, Pensions).
* **Mislaka Pensyonit:** The database architecture must be prepared to ingest structured XML data from the Israeli Pension Clearing House in the future.
* **Liabilities:** A dedicated sub-module for loans and mortgages, tracking leverage amounts, interest rates, and end dates.

## 3. Dynamic FI Target (Financial Independence)
* **The Formula:** Target Capital = (Average Annual Expenses) / 0.05 (Assuming a 5% yield rule).
* **Dynamic Adjustment:** The 'Average Annual Expenses' metric is pulled dynamically from the Cashflow board. If the client reduces their lifestyle expenses, their Target Capital shrinks in real-time, bringing them closer to their goal.

## 4. Cross-Board Synchronization (Real Estate)
* Total Net Worth automatically aggregates the equity (Value - Mortgage) of all properties managed in the separate 'Real Estate Portfolio' board.
