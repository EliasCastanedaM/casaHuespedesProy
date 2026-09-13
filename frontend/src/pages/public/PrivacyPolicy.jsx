import LegalPage, {
  LegalList,
  LegalSection,
} from "../../components/LegalPage";

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro="Información sobre el tratamiento de datos personales al utilizar el sitio web y los canales digitales de Casa Huéspedes Pimentel."
    >
      <LegalSection title="1. Información que podemos recibir">
        <p>
          Casa Huéspedes Pimentel puede recibir y tratar la información que una
          persona proporciona voluntariamente al realizar una consulta o iniciar
          una solicitud de reserva.
        </p>
        <LegalList>
          <li>Nombre y número de teléfono.</li>
          <li>Contenido de los mensajes enviados.</li>
          <li>Fechas previstas de entrada y salida.</li>
          <li>Cantidad de huéspedes.</li>
          <li>
            Otros datos necesarios para responder la consulta o gestionar una
            reserva.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="2. Para qué utilizamos los datos">
        <LegalList>
          <li>Responder consultas.</li>
          <li>Informar la disponibilidad de habitaciones.</li>
          <li>Informar precios.</li>
          <li>Gestionar solicitudes y reservas.</li>
          <li>Brindar atención al cliente.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Canales digitales y asistente automatizado">
        <p>
          Las consultas pueden recibirse mediante el sitio web, WhatsApp,
          Facebook e Instagram, servicios pertenecientes a Meta. Algunos
          mensajes pueden ser atendidos inicialmente por un asistente
          automatizado que utiliza la información disponible de Casa Huéspedes
          Pimentel para orientar al usuario.
        </p>
      </LegalSection>

      <LegalSection title="4. Servicios tecnológicos">
        <p>
          Para operar el sitio, almacenar información, procesar consultas y
          brindar respuestas automatizadas, el sistema puede utilizar servicios
          tecnológicos como Supabase, Render, Vercel y OpenAI. Estos servicios
          intervienen únicamente como parte de la infraestructura necesaria para
          el funcionamiento de la atención digital.
        </p>
      </LegalSection>

      <LegalSection title="5. Venta de información">
        <p>
          Casa Huéspedes Pimentel no vende los datos personales de sus usuarios
          ni utiliza la información recibida para comercializar bases de datos.
        </p>
      </LegalSection>

      <LegalSection title="6. Acceso, corrección y eliminación">
        <p>
          El usuario puede solicitar acceso, corrección o eliminación de sus
          datos personales utilizando los medios de contacto publicados en este
          sitio. Para proteger la información, puede ser necesario verificar que
          la solicitud corresponde a la persona titular de los datos.
        </p>
      </LegalSection>

      <LegalSection title="7. Actualizaciones">
        <p>
          Esta política puede actualizarse para reflejar cambios en la atención
          digital o en los servicios utilizados. La fecha indicada al inicio
          permite identificar la versión vigente.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
