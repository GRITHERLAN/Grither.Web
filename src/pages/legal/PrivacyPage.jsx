/* ==========================================================================
   PÁGINA: POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES (Política de privacidad)
   --------------------------------------------------------------------------
   Redactada según la ley colombiana de protección de datos (Habeas Data):
     - Ley 1581 de 2012 (régimen general de protección de datos).
     - Decreto 1377 de 2013, compilado en el Decreto 1074 de 2015
       (art. 13: contenido mínimo de esta política).
     - Circular Externa 005 de 2017 de la SIC (transferencias internacionales).
   Si cambia algo sustancial (finalidades, responsable, encargados), hay que
   actualizar LEGAL_UPDATED_AT en src/data/siteContent.js y avisar a los
   clientes ANTES de aplicar el cambio (art. 5 del Decreto 1377).
   ========================================================================== */

import { Link } from 'react-router-dom';
import LegalDocument from '../../components/legal/LegalDocument.jsx';
import ResponsibleBlock from '../../components/legal/ResponsibleBlock.jsx';
import { useResponsible } from '../../hooks/useResponsible.js';
import { LEGAL_ROUTES, LEGAL_UPDATED_AT } from '../../data/siteContent.js';

function PrivacyPage() {
  const { data: responsible, error, reload } = useResponsible();

  // Mientras cargan los datos se muestra un texto genérico en lugar del correo
  const contactEmail = responsible ? (
    <a href={`mailto:${responsible.email}`}>{responsible.email}</a>
  ) : (
    'el correo de contacto indicado en la sección 1'
  );

  const sections = [
    {
      id: 'responsable',
      title: 'Responsable del tratamiento',
      content: (
        <>
          <p>
            El responsable de recolectar, guardar y usar tus datos personales en este sitio web es la persona
            natural que aparece a continuación, quien presta sus servicios bajo la marca Grither:
          </p>
          <ResponsibleBlock responsible={responsible} error={error} onRetry={reload} />
          <p>
            Este mismo correo es el canal para atender tus consultas, reclamos y solicitudes sobre tus datos
            personales.
          </p>
        </>
      ),
    },
    {
      id: 'marco-legal',
      title: 'Marco legal',
      content: (
        <p>
          Esta política se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074
          de 2015) y las demás normas colombianas sobre protección de datos personales. La autoridad de
          vigilancia es la Superintendencia de Industria y Comercio (SIC).
        </p>
      ),
    },
    {
      id: 'datos',
      title: 'Qué datos tratamos',
      content: (
        <>
          <p>Solo pedimos los datos necesarios para cada finalidad:</p>
          <ul className="legal__list">
            <li>
              <strong>Clientes con cuenta:</strong> nombre o empresa, correo electrónico y contraseña. La
              contraseña se guarda cifrada (hash) por nuestro proveedor de autenticación y nadie puede leerla.
              También guardamos la información de tus proyectos: descripción, precio, categoría, fase, estado e
              imágenes o videos del avance.
            </li>
            <li>
              <strong>Formulario de contacto:</strong> nombre, empresa, correo, número de WhatsApp, tipo de
              proyecto, presupuesto y mensaje. Este sitio no los guarda: el formulario abre tu programa de correo
              con el mensaje listo, y los datos nos llegan solo si tú decides enviarlo.
            </li>
            <li>
              <strong>Datos técnicos:</strong> tu sesión y tu preferencia de tema (oscuro o claro) se guardan en
              tu propio navegador. Lo explicamos en la <Link to={LEGAL_ROUTES.COOKIES}>Política de cookies</Link>.
            </li>
          </ul>
          <p>
            No pedimos datos sensibles (salud, origen racial, ideas políticas, datos biométricos, etc.) ni datos
            de niños, niñas o adolescentes. Este sitio no está dirigido a menores de edad.
          </p>
        </>
      ),
    },
    {
      id: 'finalidades',
      title: 'Para qué usamos tus datos',
      content: (
        <>
          <ul className="legal__list">
            <li>Responder tus mensajes y enviarte cotizaciones.</li>
            <li>Ejecutar el contrato de desarrollo web: reuniones, entregas, soporte y garantía.</li>
            <li>
              Crear tu cuenta en el panel de proyectos para que veas el avance, las imágenes y la fase de tu
              proyecto.
            </li>
            <li>Comunicarnos contigo sobre tu proyecto por correo, teléfono o WhatsApp.</li>
            <li>Cumplir obligaciones legales, contables y tributarias.</li>
            <li>Proteger la seguridad del sitio y de las cuentas.</li>
          </ul>
          <p>
            No vendemos, alquilamos ni cedemos tus datos a terceros, y no los usamos para publicidad de otras
            empresas.
          </p>
        </>
      ),
    },
    {
      id: 'autorizacion',
      title: 'Cómo pedimos tu autorización',
      content: (
        <>
          <p>
            Tratamos tus datos solo con tu autorización previa, expresa e informada (art. 9 de la Ley 1581 de
            2012), salvo las excepciones de la ley. La pedimos así:
          </p>
          <ul className="legal__list">
            <li>
              <strong>Formulario de contacto:</strong> marcando la casilla de autorización antes de enviar el
              mensaje.
            </li>
            <li>
              <strong>Cuentas de clientes:</strong> en este sitio no hay registro público. Las cuentas las crea el
              Responsable solo después de que aceptas la cotización o firmas el contrato, y solo si antes nos diste
              tu autorización por escrito (por ejemplo, en el contrato, por correo o por WhatsApp). Guardamos esa
              autorización como prueba (art. 8 del Decreto 1377 de 2013).
            </li>
          </ul>
          <p>Tu silencio nunca se entiende como autorización.</p>
        </>
      ),
    },
    {
      id: 'encargados',
      title: 'Quién más trata tus datos (encargados)',
      content: (
        <>
          <p>Para que el sitio funcione usamos proveedores que tratan los datos por cuenta nuestra:</p>
          <ul className="legal__list">
            <li>
              <strong>Supabase Inc.:</strong> base de datos, inicio de sesión y almacenamiento de archivos. Sus
              servidores están en Estados Unidos (región us-east-1).
            </li>
            <li>
              <strong>Proveedor de alojamiento del sitio web:</strong> entrega las páginas a tu navegador.
            </li>
          </ul>
          <p>
            Enviar datos a Estados Unidos es una transferencia o transmisión internacional (art. 26 de la Ley 1581
            de 2012). Estados Unidos está en la lista de países con un nivel adecuado de protección que publicó la
            SIC en la Circular Externa 005 de 2017. Además, al autorizar esta política nos autorizas de forma
            expresa a hacer esta transmisión.
          </p>
          <p>
            El botón de WhatsApp y los enlaces a Instagram y LinkedIn te llevan a servicios de otras empresas, que
            tienen sus propias políticas de privacidad.
          </p>
        </>
      ),
    },
    {
      id: 'derechos',
      title: 'Tus derechos',
      content: (
        <>
          <p>Como titular de los datos tienes derecho a (art. 8 de la Ley 1581 de 2012):</p>
          <ul className="legal__list">
            <li>Conocer, actualizar y corregir tus datos.</li>
            <li>Pedir una copia de la autorización que nos diste.</li>
            <li>Saber para qué hemos usado tus datos.</li>
            <li>
              Revocar la autorización o pedir que borremos tus datos, cuando no exista un deber legal o
              contractual de conservarlos.
            </li>
            <li>Consultar gratis tus datos personales.</li>
            <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'procedimiento',
      title: 'Cómo ejercer tus derechos',
      content: (
        <>
          <p>
            Escríbenos a {contactEmail} con tu nombre, el correo de tu cuenta (si tienes una) y lo que necesitas.
          </p>
          <ul className="legal__list">
            <li>
              <strong>Consultas</strong> (saber qué datos tenemos): las respondemos en máximo 10 días hábiles. Si
              necesitamos más tiempo te avisamos el motivo, y la respuesta no pasará de 5 días hábiles más (art.
              14 de la Ley 1581 de 2012).
            </li>
            <li>
              <strong>Reclamos</strong> (corregir, actualizar o borrar datos, revocar la autorización o reportar un
              incumplimiento): los respondemos en máximo 15 días hábiles, con una prórroga máxima de 8 días hábiles
              más. Si el reclamo está incompleto, te pediremos lo que falta dentro de los 5 días siguientes; si
              pasan 2 meses sin respuesta, entenderemos que desististe (art. 15 de la Ley 1581 de 2012).
            </li>
          </ul>
          <p>
            Antes de acudir a la SIC debes presentar tu consulta o reclamo ante nosotros (art. 16 de la Ley 1581 de
            2012).
          </p>
        </>
      ),
    },
    {
      id: 'seguridad',
      title: 'Seguridad de la información',
      content: (
        <p>
          Protegemos tus datos con conexión cifrada (HTTPS), contraseñas guardadas con hash, reglas en la base de
          datos para que cada cliente vea solo sus propios proyectos, y acceso de administración limitado al
          Responsable. Ningún sistema es 100 % infalible; si ocurre un incidente que afecte tus datos, te
          avisaremos y lo reportaremos a la SIC como exige la ley.
        </p>
      ),
    },
    {
      id: 'conservacion',
      title: 'Cuánto tiempo guardamos tus datos',
      content: (
        <p>
          Guardamos tus datos mientras dure nuestra relación comercial y el plazo de garantía del proyecto. Al
          terminar, inactivamos o borramos tu cuenta, y solo conservamos lo que la ley nos obligue a guardar (por
          ejemplo, información contable).
        </p>
      ),
    },
    {
      id: 'vigencia',
      title: 'Vigencia y cambios',
      content: (
        <p>
          Esta política está vigente desde el {LEGAL_UPDATED_AT}. La base de datos estará vigente mientras sigan
          existiendo las finalidades descritas. Si hacemos un cambio importante, te lo avisaremos antes de
          aplicarlo y, si cambia la finalidad, te pediremos una nueva autorización.
        </p>
      ),
    },
  ];

  return (
    <LegalDocument
      title="Política de privacidad"
      intro={
        <p>
          Esta es nuestra política de tratamiento de datos personales. Aquí te contamos qué datos recogemos, para
          qué los usamos, con quién los compartimos y cómo puedes ejercer tus derechos.
        </p>
      }
      sections={sections}
    />
  );
}

export default PrivacyPage;
