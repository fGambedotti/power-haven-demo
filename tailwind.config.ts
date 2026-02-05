import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui"],
        body: ["Inter", "ui-sans-serif", "system-ui"]
      },
      colors: {
        ink: "#0B0F1A",
        slate: "#1E293B",
        mist: "#F4F6FA",
        accent: "#2E7CF6",
        coral: "#FF7A59",
        emerald: "#10B981"
      },
      boxShadow: {
        card: "0 10px 30px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
