// Los .ttf de Manrope viven en assets/fonts y se cargan con expo-font al arrancar
// (ver el gate de fuentes en App.tsx). Cada peso es un archivo, ver typography.ts.
export const fontMap = {
  'Manrope-Regular': require('../../assets/fonts/Manrope-Regular.ttf'),
  'Manrope-Medium': require('../../assets/fonts/Manrope-Medium.ttf'),
  'Manrope-SemiBold': require('../../assets/fonts/Manrope-SemiBold.ttf'),
  'Manrope-Bold': require('../../assets/fonts/Manrope-Bold.ttf'),
};
