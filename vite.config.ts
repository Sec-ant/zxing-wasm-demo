import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/demo/",
  plugins: [tailwindcss(), Icons({ compiler: "jsx", jsx: "react" })],
});
