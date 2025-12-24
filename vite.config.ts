import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")

  return {
    plugins: [react()],
    base: "/", // OBRIGATÓRIO no Vercel

    server: {
      port: 3000,
      host: "0.0.0.0",
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  }
})
