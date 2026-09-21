# SmartBin Backend

The website backend is the Socket.IO relay between the dedicated EC2 SmartBin service and the React dashboard. It owns the website REST API, MongoDB, authentication, profiles, employers, notifications, and browser-facing Socket.IO server.

## Architecture

```text
ESP32 -> MQTT -> AWS IoT Core -> MQTT -> EC2 SmartBin IoT Service
      -> Socket.IO (smartbin-data) -> Website Backend
      -> Socket.IO (smartbin-data) -> React Frontend
```

AWS IoT/MQTT is handled only by the EC2 SmartBin IoT Service. This backend does not connect to AWS IoT or subscribe to MQTT, and the React frontend never connects to AWS IoT or EC2 directly.

## Environment

Create `smartbin-backend/.env` (it is ignored by Git):

```env
PORT=5000
MONGODB_URI=<your MongoDB URI>
SMARTBIN_IOT_SERVICE_URL=http://54.206.16.121
```

The frontend's `smartbin-frontend/.env.local` is also ignored by Git and should contain:

```env
VITE_API_URL=http://localhost:5000
```

## SmartBin data flow

`SmartBinIoTService` connects to `SMARTBIN_IOT_SERVICE_URL` through Socket.IO at `/socket.io`. It validates each incoming `smartbin-data` event and broadcasts the validated event to website clients using the same event name. The client automatically reconnects when EC2 is temporarily unavailable; the Express server continues serving REST requests.

Expected sensor fields are `deviceId`, `fillPercentage`, `distance`, `uptime`, `status`, `online`, and `lastUpdated`.

Sensor events are not automatically stored as historical MongoDB records on every message. Historical IoT storage is a separate future feature. Existing alert-notification behavior remains independent of raw sensor-event storage.

## Run

```bash
cd smartbin-backend
npm install
npm start
```

The backend listens on port 5000 by default. Useful endpoints include `GET /`, `GET /health`, `GET /profile`, `GET /notifications`, `POST /auth/login`, and `GET /employers`.
