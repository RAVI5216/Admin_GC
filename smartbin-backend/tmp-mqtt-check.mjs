import { iot } from 'aws-iot-device-sdk-v2';

const certPath = 'certs/device-certificate.pem.crt';
const keyPath = 'certs/private.pem.key';
const caPath = 'certs/AmazonRootCA1.pem';

const builder = iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(certPath, keyPath);
builder
  .with_certificate_authority(caPath)
  .with_clean_session(false)
  .with_client_id('SmartBinBackend')
  .with_endpoint('az1cjg059aaqf-ats.iot.ap-southeast-2.amazonaws.com')
  .with_keep_alive_seconds(30)
  .with_ping_timeout_ms(30000)
  .with_protocol_operation_timeout_ms(60000)
  .with_reconnect_min_sec(1)
  .with_reconnect_max_sec(60);

try {
  const config = builder.build();
  console.log('config-built', !!config);
} catch (e) {
  console.error('SDK_ERROR', e?.message || String(e));
  console.error('CODE', e?.code);
  console.error('STACK', e?.stack);
}
