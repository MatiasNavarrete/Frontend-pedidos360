import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./authConfig";

msalInstance.initialize().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>,
  );
});