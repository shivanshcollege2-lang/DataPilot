# DataPilot — Dark CSV Analytics Dashboard

A dark, data-analyst-style CSV analytics dashboard inspired by the attached reference UI: compact sidebar, KPI cards with sparklines, circular revenue mix, performance charts, region activity, searchable transaction table, and CSV upload.

## Features
- Upload any CSV from the dashboard.
- Automatically infers numeric, categorical, and date columns.
- Calculates total revenue/sales, profit, units, average order value.
- Builds charts dynamically from detected columns.
- Donut chart for revenue/category mix.
- Category performance and regional activity views.
- Searchable recent-record table.
- Responsive dark UI.

## Run
```bash
npm install
npm run dev
```
Open the local Vite URL shown in the terminal.

## Sample data
Use the included `DataPilot_Sample_Sales.csv` from the parent folder, or drag any similar sales/transaction CSV into the app.

## Notes
This implementation focuses on frontend analytics and CSV ingestion. It is structured so your existing Node/Express/MySQL backend and PDF/Excel export modules can be connected later without changing the dashboard shell.
