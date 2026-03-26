import { defineConfig } from "vite";

export default defineConfig({
  // Use relative asset URLs so the build works whether Vercel serves the app
  // at the domain root or from a nested project path.
  base: "./"
});
