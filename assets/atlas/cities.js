/* Registro de ciudades del atlas. Coordenadas WGS84.
   status: live (con video) | next (en producción) | future (ruta futura).
   video: { long, short } = IDs de YouTube. */
window.ATLAS_CITIES = [
  { name:'Barranquilla', country:'Colombia', lat:10.9639, lon:-74.7964, status:'live',
    video:{ long:'5Q8Sq7YQrEE', short:'yT4JEs4TVQg' },
    quote:'“Con los cabellos al viento, la dulce piel encendida, y el andar sin descanso tal aire de gallardía que el alma de las palmeras se detiene a verla pasar.”',
    attrib:'— Meira Delmar, “Romance de Barranquilla”' },
  { name:'Bogotá',      country:'Colombia', lat:4.7110,  lon:-74.0721, status:'next' },
  { name:'Medellín',    country:'Colombia', lat:6.2442,  lon:-75.5812, status:'next' },
  { name:'Cali',        country:'Colombia', lat:3.4516,  lon:-76.5320, status:'next' },
  { name:'Cartagena',   country:'Colombia', lat:10.4236, lon:-75.5508, status:'next' },
  { name:'Lima',        country:'Perú',     lat:-12.0464, lon:-77.0428, status:'future' },
  { name:'CDMX',        country:'México',   lat:19.4326, lon:-99.1332, status:'future' },
  { name:'Nueva York',  country:'EE.UU.',   lat:40.7128, lon:-74.0060, status:'future' },
  { name:'Kansas City', country:'EE.UU.',   lat:39.0997, lon:-94.5786, status:'future' },
  { name:'Londres',     country:'R.U.',     lat:51.5074, lon:-0.1278,  status:'future' },
  { name:'Dublín',      country:'Irlanda',  lat:53.3498, lon:-6.2603,  status:'future' },
  { name:'París',       country:'Francia',  lat:48.8566, lon:2.3522,   status:'future' },
  { name:'Barcelona',   country:'España',   lat:41.3874, lon:2.1686,   status:'future' },
  { name:'Roma',        country:'Italia',   lat:41.9028, lon:12.4964,  status:'future' },
  { name:'Dakar',       country:'Senegal',  lat:14.7167, lon:-17.4677, status:'future' },
  { name:'Mumbai',      country:'India',    lat:19.0760, lon:72.8777,  status:'future' },
  { name:'Tokio',       country:'Japón',    lat:35.6762, lon:139.6503, status:'future' },
  { name:'Sídney',      country:'Australia',lat:-33.8688,lon:151.2093, status:'future' },
];
