import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Include popup components specifically for better CSS generation
    "./src/components/map/**/*.{js,ts,jsx,tsx}",
    "./src/components/popup/**/*.{js,ts,jsx,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Popup-specific utilities
      spacing: {
        'popup': '1rem',
        'popup-sm': '0.5rem',
        'popup-lg': '1.5rem',
      },
      backdropBlur: {
        'popup': '20px',
        'popup-intense': '30px',
      },
      boxShadow: {
        'popup': '0 20px 40px -12px rgba(0, 0, 0, 0.15), 0 8px 16px -8px rgba(0, 0, 0, 0.1)',
        'popup-dark': '0 20px 40px -12px rgba(0, 0, 0, 0.4), 0 8px 16px -8px rgba(0, 0, 0, 0.3)',
        'popup-glass': '0 25px 50px -12px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      animation: {
        'popup-entrance': 'popupEntranceSpring 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'popup-exit': 'popupExitSpring 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        'popupEntranceSpring': {
          '0%': {
            opacity: '0',
            transform: 'translateY(24px) scale(0.88) rotate(-0.5deg)',
          },
          '50%': {
            opacity: '0.8',
            transform: 'translateY(-2px) scale(1.02) rotate(0.2deg)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1) rotate(0deg)',
          },
        },
        'popupExitSpring': {
          '0%': {
            opacity: '1',
            transform: 'translateY(0) scale(1) rotate(0deg)',
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(-16px) scale(0.92) rotate(-0.3deg)',
          },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Custom plugin for popup utilities
    function({ addUtilities, theme }: any) {
      addUtilities({
        '.popup-reset': {
          'font-family': 'inherit',
          'line-height': 'inherit',
          'color': 'inherit',
        },
        '.popup-glass': {
          'background': 'rgba(255, 255, 255, 0.85)',
          'backdrop-filter': 'blur(20px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(20px) saturate(180%)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.popup-glass-dark': {
          'background': 'rgba(17, 24, 39, 0.9)',
          'backdrop-filter': 'blur(20px) saturate(150%)',
          '-webkit-backdrop-filter': 'blur(20px) saturate(150%)',
          'border': '1px solid rgba(55, 65, 81, 0.3)',
        },
        '.popup-container': {
          'max-width': '420px',
          'min-width': '320px',
          'border-radius': '20px',
          'overflow': 'hidden',
        },
        '.popup-container-mobile': {
          '@media (max-width: 640px)': {
            'min-width': '280px',
            'max-width': 'calc(100vw - 40px)',
            'border-radius': '16px',
          },
        },
      });
    },
  ],
};

export default config;
