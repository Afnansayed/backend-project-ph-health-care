import { v2 as cloudinary } from 'cloudinary';
import { envVars } from './env';

cloudinary.config({
  cloud_name: envVars.cloudinary.CLOUDINARY_CLOUD_NAME,
  api_key: envVars.cloudinary.CLOUDINARY_API_KEY,
  api_secret: envVars.cloudinary.CLOUDINARY_API_SECRET
});
console.log(envVars.cloudinary);


export const cloudinaryUpload = cloudinary;