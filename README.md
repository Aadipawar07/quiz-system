# Quiz System

A full-stack Quiz Web Application built with Node.js, Express, MongoDB, and React.

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** MongoDB with Mongoose
- **Frontend:** React (Vite)
- **Communication:** REST APIs (JSON)

## Project Structure

```
quiz-system/
├── server/          # Backend API
│   ├── controllers/ # Route controllers
│   ├── models/      # Mongoose models
│   ├── routes/      # API routes
│   ├── config/      # Configuration files
│   ├── middleware/  # Custom middleware
│   ├── server.js    # Entry point
│   └── package.json
│
├── client/          # Frontend React app
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   ├── services/   # API services
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account or local MongoDB instance

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the server directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The backend will be running at `http://localhost:5000`

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be running at `http://localhost:5173`

## API Endpoints

### Health Check
- `GET /api/health` - Returns server status

## Development

- Backend runs on port **5000**
- Frontend runs on port **5173**
- CORS is configured to allow communication between frontend and backend

## License

MIT
