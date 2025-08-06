/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Existing shadcn/ui color system (preserved)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        popover: 'hsl(var(--popover))',
        'popover-foreground': 'hsl(var(--popover-foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        
        // Ayu Dark Extended Palette - Direct Color Access
        ayu: {
          'bg-primary': 'hsl(216 33% 7%)',      // #0A0E14
          'bg-secondary': 'hsl(216 21% 16%)',   // #1F2430  
          'bg-tertiary': 'hsl(216 16% 20%)',    // #272D38
          'text-primary': 'hsl(36 6% 69%)',     // #B3B1AD
          'text-secondary': 'hsl(216 11% 49%)', // #707A8C
          'border': 'hsl(216 20% 25%)',         // #323A4C
          'accent-orange': 'hsl(25 100% 62%)',  // #FF8F40
          'accent-blue': 'hsl(205 100% 67%)',   // #59C2FF
          'accent-green': 'hsl(74 64% 57%)',    // #AAD84C
        }
      },
    },
  },
  plugins: [],
}