import LegalPage, {
  LegalList,
  LegalSection,
} from "../../components/LegalPage";

export default function TermsAndConditions() {
  return (
    <LegalPage
      title="Términos y condiciones"
      intro="Condiciones básicas para utilizar el sitio web y los canales digitales de Casa Huéspedes Pimentel."
    >
      <LegalSection title="1. Uso del sitio y canales digitales">
        <p>
          El sitio web y los canales de mensajería de Casa Huéspedes Pimentel
          permiten solicitar información relacionada con el alojamiento y
          comunicarse con el establecimiento.
        </p>
        <LegalList>
          <li>Realizar consultas generales.</li>
          <li>Consultar disponibilidad de habitaciones.</li>
          <li>Consultar precios y características.</li>
          <li>Iniciar una solicitud de reserva.</li>
          <li>Solicitar atención al cliente.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="2. Información de disponibilidad y precios">
        <p>
          La disponibilidad y los precios comunicados corresponden a la
          información disponible al momento de la consulta. La respuesta a una
          consulta permite orientar al usuario, pero no constituye por sí sola
          la confirmación de una reserva.
        </p>
      </LegalSection>

      <LegalSection title="3. Reservas">
        <p>
          Una reserva se considera confirmada únicamente cuando Casa Huéspedes
          Pimentel comunica expresamente su confirmación mediante los canales de
          atención o el proceso habilitado para ello. Enviar un mensaje,
          consultar una fecha o recibir opciones de habitaciones no confirma
          automáticamente una reserva.
        </p>
      </LegalSection>

      <LegalSection title="4. Mensajería y respuestas automatizadas">
        <p>
          Los usuarios pueden comunicarse mediante WhatsApp, Facebook,
          Instagram y los demás medios publicados en el sitio. Algunos mensajes
          pueden recibir una respuesta inicial automatizada. El usuario puede
          solicitar atención de una persona cuando lo necesite.
        </p>
      </LegalSection>

      <LegalSection title="5. Uso responsable">
        <p>
          El usuario debe proporcionar información verdadera y utilizar los
          canales de forma respetuosa. No debe intentar afectar el funcionamiento
          del sitio, acceder a información ajena o utilizar los canales para
          fines ilícitos.
        </p>
      </LegalSection>

      <LegalSection title="6. Alcance de estos términos">
        <p>
          Estos términos regulan el uso informativo del sitio y de los canales
          digitales. No establecen políticas adicionales de cancelación,
          reembolso, penalidades ni otras condiciones comerciales que no hayan
          sido comunicadas expresamente por Casa Huéspedes Pimentel.
        </p>
      </LegalSection>

      <LegalSection title="7. Consultas sobre estos términos">
        <p>
          Para realizar una consulta sobre estas condiciones, el usuario puede
          utilizar los medios de contacto ya publicados en el sitio web.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
