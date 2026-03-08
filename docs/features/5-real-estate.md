# Feature Spec: Yielding Real Estate & Primary Residence

## 1. Overview
Tracks physical, yielding real estate properties and the client's primary residence.

## 2. Yield & Valuation Mechanics
* **Valuation:** The Client is responsible for updating the current market value of the property.
* **Auto-Yield Calculation:** The system automatically calculates Gross Yield: `(Monthly Rent * 12) / Current Value`.
* **Mortgage Integration:** Each property holds its own nested mortgage data (Monthly Payment, Outstanding Principal).
* **Equity Calculation:** `Current Value - Outstanding Principal`. This equity directly feeds the global Net Worth in the Wealth Management board.

## 3. Property Statuses
* **Yielding Statuses:** Rented, Vacant (Seeking Tenant), Renovating, In Eviction, Listed for Sale.
* **Non-Yielding Status:** Primary Residence (Excluded from passive income and yield calculations).

## 4. The "Opportunity Cost" Engine (Game Changer Feature)
* **Concept:** For any property marked as "Primary Residence", the system runs a constant background simulation.
* **Display:** A prominent widget showing an "Alternative Scenario": It calculates how much time the client would save on their journey to Financial Independence (FI), and how much additional capital they would generate, IF they sold the house, invested the equity at a 5% yield, and moved to a rental property.
