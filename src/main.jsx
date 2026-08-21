import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PublicClientApplication } from "@azure/msal-browser";

import "./index.css";
import App from "./App.jsx";
import { msalConfig } from "./config/authConfig.js";

const msalInstance =
  new PublicClientApplication(msalConfig);

async function iniciarAplicacion() {

  try {

    // ========================================================
    // INICIALIZAR MSAL
    // ========================================================

    await msalInstance.initialize();

    // ========================================================
    // PROCESAR RESPUESTA DE REDIRECCIÓN
    // ========================================================

    await msalInstance.handleRedirectPromise();

    // ========================================================
    // CARGAR REACT
    // ========================================================

    createRoot(
      document.getElementById("root")
    ).render(
      <StrictMode>
        <App msalInstance={msalInstance} />
      </StrictMode>
    );

  } catch (error) {

    console.error(
      "Error inicializando Microsoft:",
      error
    );

  }

}

iniciarAplicacion();