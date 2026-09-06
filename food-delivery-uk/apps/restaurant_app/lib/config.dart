// Backend base URL.
// Android emulator: http://10.0.2.2:4000 | iOS simulator: http://localhost:4000
// Real device: use your machine's LAN IP or the deployed server URL.
const String apiBaseUrl = 'http://10.0.2.2:4000';

String formatGBP(int pence) => '£${(pence / 100).toStringAsFixed(2)}';
