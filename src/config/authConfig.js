export const msalConfig = {
  auth: {
    clientId: "f5c16006-8803-40b9-9509-c861b8bd330c",

    authority:
      "https://login.microsoftonline.com/e7219c84-b820-421f-a8e2-c256634ca8fd",

    redirectUri:
      "http://localhost:5173/redirect.html",

    postLogoutRedirectUri:
      "http://localhost:5173/redirect.html",
  },

  cache: {
    cacheLocation: "sessionStorage",
  },
};

export const loginRequest = {
  scopes: [
    "User.Read",
    "Files.ReadWrite",
  ],
};