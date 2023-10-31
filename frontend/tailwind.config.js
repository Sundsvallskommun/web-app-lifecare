module.exports = {
  mode: 'jit',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/layouts/**/*.{js,ts,jsx,tsx}',
    './node_modules/@sk-web-gui/*/dist/**/*.js',
  ],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    /* screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
    },*/
    backgroundImage: {
      // main: "url('./public/main-bg.png')",
    },
    screens: {
      sm: '640px',
      // => @media (min-width: 640px) { ... }

      md: '768px',
      // => @media (min-width: 768px) { ... }

      lg: '1024px',
      // => @media (min-width: 1024px) { ... }

      xl: '1280px',
      // => @media (min-width: 1280px) { ... }

      '2xl': '1536px',
      // => @media (min-width: 1536px) { ... }
    },
  },
  plugins: [
    //require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@sk-web-gui/core')({
      colors: [],
      cssBase: true,
    }),
  ],
};
