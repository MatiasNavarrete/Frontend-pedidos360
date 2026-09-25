import { PublicClientApplication } from "@azure/msal-browser";
import axios from "axios";

export const msalConfig = {
  auth: {
    clientId: "c3e94e13-54ab-41ca-9d7b-8155651cde76", 
    authority: "https://login.microsoftonline.com/095cf233-eca7-4e46-b9bf-8113574cb7ed",
    redirectUri: "http://localhost:5173",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

export const loginRequest = {
  scopes: ["api://80da648c-e621-43bd-b7ba-e4d2c0ea6a99/access_as_user"]
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const api = axios.create({
  baseURL: "https://fx9jac5soj.execute-api.us-east-1.amazonaws.com/api/bff"
});

api.interceptors.request.use(async (config) => {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0]
      });
      // Adjunta el token recibido para consumir el BFF
      config.headers.Authorization = `Bearer ${response.accessToken}`;
    } catch (e) {
      console.error("Error obteniendo token silencioso", e);
    }
  }
  return config;
});