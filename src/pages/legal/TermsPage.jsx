/* ==========================================================================
   PÁGINA: TÉRMINOS Y CONDICIONES
   --------------------------------------------------------------------------
   Normas colombianas en las que se basa:
     - Ley 1480 de 2011 (Estatuto del Consumidor): información, garantía y
       derecho de retracto en ventas a distancia (art. 47).
     - Ley 527 de 1999: validez de los mensajes de datos (correo, WhatsApp).
     - Ley 23 de 1982 y Decisión Andina 351 de 1993: derechos de autor.
     - Ley 1581 de 2012: protección de datos (ver Política de privacidad).
   ========================================================================== */

import { Link } from 'react-router-dom';
import LegalDocument from '../../components/legal/LegalDocument.jsx';
import ResponsibleBlock from '../../components/legal/ResponsibleBlock.jsx';
import { useResponsible } from '../../hooks/useResponsible.js';
import { LEGAL_ROUTES } from '../../data/siteContent.js';

function TermsPage() {
  const { data: responsible, error, reload } = useResponsible();

  const sections = [
    {
      id: 'prestador',
      title: 'Quién presta el servicio',
      content: (
        <>
          <p>Este sitio web y los servicios de desarrollo web que ofrece los presta, bajo la marca Grither:</p>
          <ResponsibleBlock responsible={responsible} error={error} onRetry={reload} />
        </>
      ),
    },
    {
      id: 'aceptacion',
      title: 'Aceptación de estos términos',
      content: (
        <p>
          Al navegar por el sitio, enviar el formulario de contacto o usar el panel de proyectos, aceptas estos
          términos. Si no estás de acuerdo con ellos, te pedimos no usar el sitio. Las cotizaciones y los contratos
          firmados con cada cliente prevalecen sobre estos términos en lo que regulen de forma distinta.
        </p>
      ),
    },
    {
      id: 'servicios',
      title: 'Servicios y forma de trabajo',
      content: (
        <>
          <p>
            Ofrecemos diseño y desarrollo de landing pages, sitios web, aplicaciones web, soporte y mantenimiento.
            Cada proyecto pasa por cuatro fases:
          </p>
          <ul className="legal__list">
            <li>
              <strong>Reunión:</strong> definimos objetivos, alcance, tiempos y precio.
            </li>
            <li>
              <strong>Bocetos / prototipos:</strong> te mostramos el diseño para que lo apruebes.
            </li>
            <li>
              <strong>Desarrollo:</strong> programamos el proyecto con avances visibles en tu panel.
            </li>
            <li>
              <strong>Despliegue:</strong> publicamos el proyecto y te lo entregamos.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'precios',
      title: 'Cotizaciones y precios',
      content: (
        <p>
          Los precios están en pesos colombianos (COP). Los valores de los planes publicados son de referencia: el
          precio final, la forma de pago, los tiempos y el alcance se fijan en la cotización o en el contrato que
          aceptes. Los trabajos fuera del alcance acordado se cotizan aparte.
        </p>
      ),
    },
    {
      id: 'cuentas',
      title: 'Cuentas de usuario',
      content: (
        <>
          <ul className="legal__list">
            <li>
              No hay registro público. El administrador crea la cuenta solo después de que aceptas la cotización o
              firmas el contrato, y solo si nos autorizaste a tratar tus datos (ver la{' '}
              <Link to={LEGAL_ROUTES.PRIVACY}>Política de privacidad</Link>).
            </li>
            <li>
              La cuenta es personal. Debes guardar tu contraseña en secreto y avisarnos de inmediato si crees que
              alguien más la conoce.
            </li>
            <li>
              Desde tu cuenta solo ves tus propios proyectos activos o terminados, con su avance, sus imágenes y
              videos y su fase.
            </li>
            <li>
              Podemos inactivar la cuenta si termina la relación comercial y la garantía, si hay un uso indebido o
              si tú lo pides.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'uso',
      title: 'Uso permitido',
      content: (
        <>
          <p>No está permitido:</p>
          <ul className="legal__list">
            <li>Intentar entrar a cuentas, proyectos o datos de otras personas.</li>
            <li>Probar, saltarse o atacar las medidas de seguridad del sitio.</li>
            <li>Usar robots o programas automáticos para enviar formularios o iniciar sesión.</li>
            <li>Publicar o enviar contenido ilegal, ofensivo o que vulnere derechos de terceros.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'propiedad-intelectual',
      title: 'Propiedad intelectual',
      content: (
        <>
          <p>
            El logo, la marca Grither, los textos, el diseño y el código de este sitio están protegidos por la Ley
            23 de 1982 y la Decisión Andina 351 de 1993. No puedes copiarlos ni usarlos sin nuestro permiso por
            escrito.
          </p>
          <p>
            Los derechos patrimoniales sobre el proyecto entregado a cada cliente se rigen por lo que diga su
            contrato. Si el contrato no dice nada, se ceden al cliente cuando haya pagado el valor total. Las
            herramientas, librerías y componentes de terceros conservan sus propias licencias. Salvo que acordemos
            otra cosa, podemos mostrar el proyecto terminado en nuestro portafolio.
          </p>
          <p>
            El cliente garantiza que tiene los derechos sobre los textos, imágenes, logos y demás material que nos
            entrega para su proyecto.
          </p>
        </>
      ),
    },
    {
      id: 'retracto',
      title: 'Derecho de retracto',
      content: (
        <p>
          Si contratas a distancia (por la web, correo o WhatsApp) y eres consumidor final, tienes derecho a
          retractarte dentro de los 5 días hábiles siguientes a la celebración del contrato, según el artículo 47
          de la Ley 1480 de 2011. Si te retractas, te devolveremos el dinero pagado en un plazo máximo de 30 días
          calendario. Este derecho no aplica cuando el servicio ya empezó a ejecutarse con tu acuerdo antes de que
          pasen esos 5 días, por ejemplo cuando ya empezamos los bocetos o el desarrollo.
        </p>
      ),
    },
    {
      id: 'garantia',
      title: 'Garantía',
      content: (
        <p>
          Corregimos sin costo los errores que se deban a nuestro desarrollo durante el plazo de garantía que fije
          el contrato. La garantía no cubre cambios en el alcance, contenido nuevo ni fallas causadas por terceros
          (alojamiento, dominio, servicios externos) o por cambios que haga otra persona en el proyecto.
        </p>
      ),
    },
    {
      id: 'responsabilidad',
      title: 'Responsabilidad',
      content: (
        <p>
          Trabajamos para que el sitio esté siempre disponible y sin errores, pero no podemos garantizarlo en todo
          momento. No respondemos por fallas de servicios de terceros (como el proveedor de alojamiento, WhatsApp
          o las redes sociales) ni por el contenido que entrega el cliente. Nada de lo anterior limita los
          derechos que la ley colombiana te da como consumidor.
        </p>
      ),
    },
    {
      id: 'comunicaciones',
      title: 'Comunicaciones electrónicas',
      content: (
        <p>
          Las aprobaciones, entregas y acuerdos que hagamos por correo electrónico o WhatsApp son mensajes de datos
          válidos según la Ley 527 de 1999, y sirven como prueba de lo acordado.
        </p>
      ),
    },
    {
      id: 'ley',
      title: 'Ley aplicable y solución de conflictos',
      content: (
        <p>
          Estos términos se rigen por las leyes de la República de Colombia. Si tienes una queja, escríbenos
          primero para buscar una solución directa. Si no llegamos a un acuerdo, puedes acudir a la
          Superintendencia de Industria y Comercio en los asuntos de consumo o a los jueces de Colombia.
        </p>
      ),
    },
    {
      id: 'cambios',
      title: 'Cambios en estos términos',
      content: (
        <p>
          Podemos actualizar estos términos. La nueva versión aplica desde que se publica en esta página y no
          cambia lo acordado en los contratos ya firmados.
        </p>
      ),
    },
  ];

  return (
    <LegalDocument
      title="Términos y condiciones"
      intro={<p>Estas son las reglas para usar este sitio web y contratar los servicios de Grither.</p>}
      sections={sections}
    />
  );
}

export default TermsPage;
