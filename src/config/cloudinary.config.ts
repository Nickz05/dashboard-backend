// src/config/cloudinary.config.ts

import { v2 as cloudinary } from 'cloudinary';

// Optie 1: Als je CLOUDINARY_URL gebruikt (makkelijkst)
// cloudinary.config({
//   cloudinary_url: process.env.CLOUDINARY_URL
// });

// Optie 2: Als je aparte credentials gebruikt (aanbevolen voor duidelijkheid)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Valideer dat credentials zijn ingesteld
const { cloud_name, api_key, api_secret } = cloudinary.config();

if (!cloud_name || !api_key || !api_secret) {
    console.error('❌ CLOUDINARY CONFIGURATIE FOUT!');
    console.error('Missing credentials:', {
        cloud_name: cloud_name ? '✅' : '❌',
        api_key: api_key ? '✅' : '❌',
        api_secret: api_secret ? '✅' : '❌'
    });
    console.error('Zorg dat deze environment variables zijn ingesteld:');
    console.error('- CLOUDINARY_CLOUD_NAME');
    console.error('- CLOUDINARY_API_KEY');
    console.error('- CLOUDINARY_API_SECRET');
    throw new Error('Cloudinary credentials niet gevonden in environment variables');
}

console.log('✅ Cloudinary geconfigureerd voor cloud:', cloud_name);

export default cloudinary;