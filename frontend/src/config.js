const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  console.warn(
    "Warning: REACT_APP_API_URL is not defined in your .env file. Defaulting to http://localhost:5000. " +
    "Please create a .env file in the root of your frontend project and add REACT_APP_API_URL=http://your_backend_url"
  );
}

export const BASE_URL = API_URL;