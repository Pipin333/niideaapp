/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#030712',
          surface: '#061814',
          raised: '#0B241E',
          border: '#064E3B'
        },
        felt: {
          primary: '#10B981',
          ink: '#022C22',
          crimson: '#F43F5E',
          ivory: '#F8FAFC',
          muted: '#94A3B8'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace']
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)'
      },
      transitionDuration: {
        140: '140ms',
        200: '200ms'
      }
    }
  },
  plugins: []
};
