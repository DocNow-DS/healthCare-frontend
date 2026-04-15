# Healthcare Frontend

React + Vite frontend for the AI-Enabled Smart Healthcare Platform.

## Prerequisites
- Node.js 18+
- npm 9+

## Install Dependencies
```bash
npm install
```

## Environment Setup
Create `.env` and set backend URLs:

```env
VITE_PATIENT_SERVICE_URL=http://localhost:8081
VITE_DOCTOR_SERVICE_URL=http://localhost:8082
VITE_PAYMENT_SERVICE_URL=http://localhost:8085
VITE_TELEMEDICINE_SERVICE_URL=http://localhost:8083
```

If your backend uses different ports, update the values above.

## Run in Development
```bash
npm run dev
```

Frontend runs at:
- http://localhost:5173

## Build for Production
```bash
npm run build
npm run preview
```

## Lint
```bash
npm run lint
```

## Deployment Notes
- Ensure required backend services are running before opening the app.
- Keep API base URLs in `.env` aligned with your deployment environment.
