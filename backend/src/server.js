// Importamos la aplicación principal de Express
import app from "./app.js";

// Importamos las variables de entorno centralizadas
import { env } from "./config/env.js";

// Importamos la función que prueba la conexión a la base de datos
import { testDatabaseConnection } from "./config/db.js";

// Render asigna automáticamente el puerto mediante process.env.PORT.
// En local usará env.port o 4000.
const PORT = process.env.PORT || env.port || 4000;

// Iniciamos el servidor backend
app.listen(PORT, async () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);

  const databaseConnected = await testDatabaseConnection();

  if (databaseConnected) {
    console.log("Conexión a la base de datos verificada correctamente.");
  } else {
    console.error("No se pudo verificar la conexión a la base de datos.");
  }
});