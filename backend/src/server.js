// Importamos la aplicación principal de Express
import app from "./app.js";

// Importamos las variables de entorno centralizadas
import { env } from "./config/env.js";

// Importamos la función que prueba la conexión a la base de datos
import { testDatabaseConnection } from "./config/db.js";
import { pool } from "./config/db.js";
import { validateProductionConfig } from "./config/validateConfig.js";
import { recoverPendingMessages } from "./modules/meta/meta.controller.js";

// Render asigna automáticamente el puerto mediante process.env.PORT.
// En local usará env.port o 4000.
const PORT = process.env.PORT || env.port || 4000;

validateProductionConfig();

// Iniciamos el servidor backend
const server = app.listen(PORT, async () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);

  const databaseConnected = await testDatabaseConnection();

  if (databaseConnected) {
    console.log("Conexión a la base de datos verificada correctamente.");

    try {
      const recovered = await recoverPendingMessages();
      if (recovered > 0) {
        console.log(
          "Mensajes Meta pendientes puestos nuevamente en cola:",
          recovered
        );
      }
    } catch (error) {
      // El servidor sigue disponible; el webhook responderá con error si la
      // persistencia aún no está lista, permitiendo que Meta vuelva a intentar.
      console.error(
        "No se pudieron recuperar los mensajes Meta pendientes:",
        error.message
      );
    }
  } else {
    console.error("No se pudo verificar la conexión a la base de datos.");
  }
});

async function shutdown(signal) {
  console.log(`${signal} recibido. Cerrando el servidor...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
