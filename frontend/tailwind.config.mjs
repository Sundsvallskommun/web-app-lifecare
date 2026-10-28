import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';
import skWebGuiCore from '@sk-web-gui/core';

const config = {
  mode: 'jit',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/layouts/**/*.{js,ts,jsx,tsx}',
    './node_modules/@sk-web-gui/*/dist/**/*.{js,mjs}',
  ],
  darkMode: 'class',
  theme: {},
  plugins: [
    forms,
    containerQueries,
    skWebGuiCore({
      colors: [],
      cssBase: true,
    }),
  ],
};

export default config;
