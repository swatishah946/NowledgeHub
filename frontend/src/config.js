const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

if (!process.env.REACT_APP_API_URL) {
  console.warn(
    "Notice: REACT_APP_API_URL is not set. Defaulting to local backend at http://localhost:5000."
  );
}

export const BASE_URL = API_URL;