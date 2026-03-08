# Feature Spec: Goal Planner

## 1. Overview
A dynamic planning board that connects long-term financial goals directly to the daily Cashflow board.

## 2. Goal Definition & Math
* **Inputs:** Goal Name, Target Amount, Target Date (MM/YYYY).
* **Auto-Calculation:** The system calculates the 'Monthly Required Saving' by dividing the remaining amount by the months left.
* *Example:* 15,000 ILS goal in 15 months = 1,000 ILS/month.

## 3. Cross-Board Synchronization (Cashflow)
* **Injection:** The calculated monthly amount is automatically injected into the Client's Cashflow board as a mandatory 'Savings/Goal' budget line.
* **Tracking:** Progress is NOT manual. It is automatically updated based on the actual savings executed and recorded in the Cashflow board.
