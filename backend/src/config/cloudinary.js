// Importamos Cloudinary
import { v2 as cloudinary } from "cloudinary";

// Importamos variables de entorno
import { env } from "./env.js";

// Configuramos Cloudinary usando datos seguros desde .env
cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

// Exportamos Cloudinary configurado
export default cloudinary;