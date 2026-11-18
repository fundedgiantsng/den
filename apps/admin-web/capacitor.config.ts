const config = {
  appId: 'ng.fundedgiants.admin',
  appName: 'FundedGiants Admin',
  webDir: 'public',
  server: {
    // In local development / emulator, points directly to Admin Web instance
    // In production, points to https://giant.fundedgiants.ng
    url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:3001',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#070a08',
  },
};

export default config;
