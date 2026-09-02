export const msalConfig = {
  auth: {
    clientId: "f5c16006-8803-40b9-9509-c861b8bd330c",

    authority:
      "https://login.microsoftonline.com/organizations",

    redirectUri:
      `${window.location.origin}/redirect.html`,

    postLogoutRedirectUri:
      `${window.location.origin}/redirect.html`,
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