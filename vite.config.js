import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(
          new URL("./index.html", import.meta.url)
        ),

        redirect: fileURLToPath(
          new URL("./redirect.html", import.meta.url)
        ),
      },
    },
  },
});