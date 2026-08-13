# SmartBin Backend

Production-ready backend for the SmartBin IoT garbage monitoring system.

## Features

- Secure MQTT connection to AWS IoT Core using TLS certificates
- Subscribes to `smartbin/data`
- Parses JSON payloads
- Validates incoming sensor data
- Broadcasts valid messages to React clients via Socket.IO
- Automatic reconnect handling for AWS IoT MQTT
- Graceful error handling and status reporting
- CORS-enabled Socket.IO configuration

## Project Structure

- `server.js` - application entrypoint
- `config/awsConfig.js` - environment variable loading and TLS path resolution
- `mqtt/mqttService.js` - AWS IoT Core MQTT connection, subscription, and payload handling
- `socket/socket.js` - Socket.IO setup and broadcast helper
- `routes/health.js` - health check route
- `utils/logger.js` - simple structured logger

## Environment

Create a `.env` file with these values:

```env
PORT=5000
AWS_IOT_ENDPOINT=az1cjg059aaqf-ats.iot.ap-southeast-2.amazonaws.com
CLIENT_ID=SmartBinBackend
MQTT_TOPIC=smartbin/data
MQTT_CERT_PATH=certs/device-certificate.pem.crt
MQTT_PRIVATE_KEY_PATH=certs/private.pem.key
MQTT_CA_PATH=certs/AmazonRootCA1.pem
```

## API

- `GET /` returns `SmartBin Backend Running`
- `GET /health` returns `{ "status": "OK", "mqtt": "Connected" }`

## Run

Install dependencies:

```bash
cd smartbin-backend
npm install
```

Start server:

```bash
npm start
```

## Notes

- Do not hardcode AWS values; use `.env`
- The service is ready for future persistence layers such as DynamoDB
- Sensor data is emitted via `io.emit('smartbin-data', data)`
