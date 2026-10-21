# Northstar Business Intelligence Dashboard

A responsive business operations dashboard built with React, Bootstrap, Recharts, and Papa Parse. The sample workspace includes a year of fictional operating data so current-period metrics can be compared with the previous period without importing a file.

Requires Node.js 20.19 or newer.

## Run locally

```sh
npm install
npm run dev
```

## Import a CSV

Use **Import data** to load a comma-separated file with a header row. The dashboard accepts these column names (case-insensitive):

| Field | Accepted headers |
| --- | --- |
| Date | `Date`, `Transaction Date`, `Day` |
| Department | `Department`, `Team`, `Business Unit` |
| Revenue | `Revenue`, `Sales`, `Income` |
| Orders | `Orders`, `Order Count`, `Transactions` |
| Profit | `Profit`, `Net Profit`, `Earnings` |

Values are validated before replacing the current dataset. Currency symbols and thousands separators are accepted in revenue and profit values.

## Reports

The **Export report** action downloads the records matching the current department and date filters as a CSV file.

## Scripts

- `npm run dev` starts the Vite development server.
- `npm run lint` checks the code with ESLint.
- `npm run build` creates a production build in `dist/`.
