// Importamos la configuración base de Vite
import { defineConfig } from "vite";

// Importamos el plugin de React para trabajar con JSX
import react from "@vitejs/plugin-react";

// Exportamos la configuración principal de Vite
export default defineConfig({
  plugins: [
    // Activa React dentro del proyecto
    react(),
  ],
});