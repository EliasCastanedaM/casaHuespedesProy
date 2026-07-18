const services = [
  {
    title: "WiFi",
    description: "Conexión a internet para huéspedes durante su estadía.",
  },
  {
    title: "Cocina para huéspedes",
    description: "Espacio disponible para preparar alimentos según coordinación.",
  },
  {
    title: "Lavado y planchado",
    description: "Servicio adicional sujeto a disponibilidad y coordinación.",
  },
  {
    title: "Orientación turística",
    description: "Información sobre lugares cercanos para visitar en Pimentel y Lambayeque.",
  },
];

export default function Services() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <p className="text-brand-blue font-semibold">Servicios</p>

        <h1 className="text-4xl font-bold text-brand-dark mt-2">
          Servicios incluidos y adicionales
        </h1>

        <p className="mt-3 text-gray-600 max-w-2xl">
          Conoce los servicios disponibles para hacer más cómoda tu estadía en
          Casa Huéspedes Pimentel.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {services.map((service) => (
          <article
            key={service.title}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <h2 className="text-xl font-bold text-brand-dark">
              {service.title}
            </h2>

            <p className="mt-3 text-gray-600">
              {service.description}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}