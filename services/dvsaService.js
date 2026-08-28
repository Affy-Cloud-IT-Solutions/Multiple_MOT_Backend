const dotenv = require('dotenv');
dotenv.config();

const CLIENT_ID = process.env.DVSA_CLIENT_ID;
const CLIENT_SECRET = process.env.DVSA_CLIENT_SECRET;
const API_KEY = process.env.DVSA_API_KEY;
const SCOPE = process.env.DVSA_SCOPE || 'https://tapi.dvsa.gov.uk/.default';
const TOKEN_URL = process.env.DVSA_TOKEN_URL || 'https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token';
const BASE_URL = 'https://history.mot.api.gov.uk';

let cachedToken = null;
let tokenExpiryTime = 0; // Epoch time in ms

/**
 * Obtains an OAuth Access Token from Microsoft Entra ID.
 * Implements token caching.
 */
async function getAccessToken(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedToken && now < tokenExpiryTime) {
    return cachedToken;
  }

  console.log('[DVSA Service] Fetching new OAuth token...');
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('scope', SCOPE);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to retrieve DVSA token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Expire token slightly earlier (e.g. 60s early) to avoid edge cases
  const expiresInMs = (data.expires_in || 3600) * 1000;
  tokenExpiryTime = now + expiresInMs - 60000;

  console.log('[DVSA Service] Token retrieved successfully. Expires in:', data.expires_in, 'seconds');
  return cachedToken;
}

/**
 * Queries the MOT history of a vehicle using its registration mark.
 * @param {string} registration The registration number of the vehicle.
 * @returns {Promise<object|null>} The vehicle data if found, or null if not found.
 */
async function getVehicleMotHistory(registration) {
  const cleanReg = registration.toUpperCase().replace(/\s+/g, '');
  
  try {
    let token = await getAccessToken();
    
    let response = await fetch(`${BASE_URL}/v1/trade/vehicles/registration/${cleanReg}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': API_KEY,
        'Accept': 'application/json'
      }
    });

    // If unauthorized, token might have expired or been revoked; try refreshing once
    if (response.status === 401) {
      console.log('[DVSA Service] Received 401 Unauthorized. Retrying with fresh token...');
      token = await getAccessToken(true);
      response = await fetch(`${BASE_URL}/v1/trade/vehicles/registration/${cleanReg}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': API_KEY,
          'Accept': 'application/json'
        }
      });
    }

    if (response.status === 404) {
      console.log(`[DVSA Service] Vehicle not found in registry: ${cleanReg}`);
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DVSA API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[DVSA Service] Error checking MOT history for ${cleanReg}:`, error.message);
    throw error;
  }
}

module.exports = {
  getVehicleMotHistory
};
