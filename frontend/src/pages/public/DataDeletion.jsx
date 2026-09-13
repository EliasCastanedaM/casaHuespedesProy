import { Link } from "react-router-dom";
import LegalPage, {
  LegalList,
  LegalSection,
} from "../../components/LegalPage";

export default function DataDeletion() {
  return (
    <LegalPage
      title="Eliminación de datos"
      intro="Instrucciones para solicitar la eliminación de datos personales proporcionados a Casa Huéspedes Pimentel."
    >
      <LegalSection title="1. Cómo presentar una solicitud">
        <p>
          El usuario puede solicitar la eliminación de sus datos personales
          mediante cualquiera de los medios de contacto que Casa Huéspedes
          Pimentel mantiene publicados en este sitio, incluido el canal de
          WhatsApp disponible en el footer.
        </p>
        <p>
          También puede dirigirse a la{" "}
          <Link
            to="/contacto"
            className="font-bold text-[#8f623a] underline decoration-[#d9b48f] underline-offset-4 hover:text-[#a87545]"
          >
            página de contacto
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Información que debe indicar">
        <LegalList>
          <li>Que desea solicitar la eliminación de sus datos personales.</li>
          <li>
            El canal utilizado para comunicarse con Casa Huéspedes Pimentel,
            como WhatsApp, Facebook, Instagram o el sitio web.
          </li>
          <li>
            La información necesaria para localizar la conversación, consulta o
            solicitud de reserva correspondiente.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Verificación de la solicitud">
        <p>
          Para evitar que otra persona solicite la eliminación de información
          ajena, Casa Huéspedes Pimentel puede verificar la identidad o la
          relación del solicitante con los datos que desea eliminar. No se debe
          enviar contraseñas, códigos de verificación ni información bancaria.
        </p>
      </LegalSection>

      <LegalSection title="4. Atención de la solicitud">
        <p>
          Una vez identificados los datos y validada la solicitud, Casa
          Huéspedes Pimentel gestionará su eliminación y podrá comunicar la
          atención de la solicitud mediante el mismo canal de contacto utilizado
          por el usuario.
        </p>
      </LegalSection>

      <LegalSection title="5. Alcance">
        <p>
          Esta página se aplica a los datos recibidos a través del sitio web y de
          los canales digitales vinculados a Casa Huéspedes Pimentel, incluidos
          WhatsApp, Facebook e Instagram.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
