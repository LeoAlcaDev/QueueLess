// Inyecta la API key de Google Maps (Android) desde el entorno; el resto de la config
// vive en app.json. La key no es secreto (se restringe por package name y huella SHA),
// pero la mantenemos fuera del control de versiones; si falta, el mapa muestra un
// placeholder y la app igual corre.
const base = require('./app.json');

module.exports = () => {
  const expo = { ...base.expo };
  const apiKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  if (apiKey) {
    expo.android = {
      ...expo.android,
      config: {
        ...(expo.android && expo.android.config),
        googleMaps: { apiKey },
      },
    };
  }
  return { expo };
};
