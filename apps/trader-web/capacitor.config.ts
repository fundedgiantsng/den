const config = {
  appId: 'ng.fundedgiants.trader',
  appName: 'FundedGiants',
  webDir: 'public',
  server: {
    // In local testing, points to Trader Web instance
    // In production, points to https://trader.fundedgiants.ng
    url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#050906',
  },
};

export default config;
