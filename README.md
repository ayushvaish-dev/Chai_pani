# Chai Hisaab

A beginner-friendly full-stack office tea and snacks tracker built with React, Tailwind CSS, Node.js, Express, and MongoDB.

## Features

- Daily entry form for tea, snacks, and other items
- Dashboard table with month, employee, and date filters
- Monthly summary with per-employee totals
- CSV export from the backend and PDF export from the frontend
- Edit and delete support for incorrect entries
- Price settings for tea and snacks to auto-calculate monthly bills
- Sample seed data for quick local testing

## Folder Structure

```text
chai-hisaab/
  client/   React + Vite + Tailwind frontend
  server/   Express + MongoDB backend
```

## Prerequisites

- Node.js 20+
- MongoDB running locally or a MongoDB Atlas connection string

## Local Setup

1. Install root dependencies:

   ```bash
   npm install
   ```

2. Create a backend env file:

   ```bash
   copy server\.env.example server\.env
   ```

3. Update `server/.env` if your MongoDB connection is different from local default.

4. Seed sample data:

   ```bash
   npm run seed
   ```

5. Start both apps:

   ```bash
   npm run dev
   ```

6. Open the app in your browser:

   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000/api`

## Forgot Password Setup

Add these values in `server/.env` so password recovery emails can be sent:

```env
CLIENT_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-app-password
SMTP_FROM_NAME=Chai Hisaab
SMTP_FROM_EMAIL=your-email@example.com
```

For Gmail, use an app password instead of your normal account password.

## Default Pricing

- Tea: Rs. 12 per cup
- Snacks: Rs. 18 per item

You can change both values directly from the UI.

## API Overview

- `GET /api/entries`
- `POST /api/entries`
- `PUT /api/entries/:id`
- `DELETE /api/entries/:id`
- `GET /api/entries/employees`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/summary/monthly`
- `GET /api/summary/monthly.csv`