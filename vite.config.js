import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: "window",
  },
  server: {
    host: true, // This allows the server to be accessible from the network
    historyApiFallback: true,
    // port: 3000, // Specify the port you want to use (optional)
  },
});
