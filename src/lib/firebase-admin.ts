import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccountContent = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountContent) {
      // Handle both stringified JSON and base64 encoded JSON for safety
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountContent);
      } catch (e) {
        // Try base64 decoding if JSON parse fails
        const decoded = Buffer.from(serviceAccountContent, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin initialized successfully.");
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is missing. Native push notifications will be disabled.");
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

export default admin;
