/* ==========================================================================
   PÁGINA: POLÍTICA DE COOKIES
   --------------------------------------------------------------------------
   En Colombia no hay una ley específica de cookies: la SIC considera que la
   información que se guarda en el equipo del usuario es un medio para
   recolectar datos personales, así que aplica la Ley 1581 de 2012 y hay que
   informar al usuario qué se guarda y para qué.

   Este sitio NO usa cookies. Solo usa el almacenamiento del navegador
   (localStorage / sessionStorage) para lo estrictamente necesario:
     - grither_theme              -> utils/themeStorage.js
     - grither_remember           -> lib/supabaseClient.js
     - sb-<proyecto>-auth-token   -> sesión de Supabase (lib/supabaseClient.js)
   Si se agrega analítica, publicidad o un script de terceros, hay que
   actualizar esta página y pedir consentimiento ANTES de activarlo.
   ========================================================================== */

import { Link } from 'react-router-dom';
import LegalDocument from '../../components/legal/LegalDocument.jsx';
import { LEGAL_ROUTES } from '../../data/siteContent.js';

/* Todo lo que el sitio guarda en el navegador (se muestra en la tabla) */
const STORED_ITEMS = [
  {
    name: 'grither_theme',
    place: 'localStorage',
    purpose: 'Recordar si elegiste el modo oscuro o el claro.',
    type: 'Preferencia',
    duration: 'Hasta que borres los datos del sitio.',
  },
  {
    name: 'grither_remember',
    place: 'localStorage',
    purpose: 'Recordar si marcaste "Recordarme" al iniciar sesión.',
    type: 'Necesario',
    duration: 'Hasta que borres los datos del sitio.',
  },
  {
    name: 'sb-…-auth-token',
    place: 'localStorage o sessionStorage',
    purpose: 'Mantener tu sesión iniciada (lo crea Supabase, nuestro proveedor de inicio de sesión).',
    type: 'Necesario',
    duration:
      'Con "Recordarme": hasta que cierres sesión. Sin "Recordarme": hasta que cierres la pestaña o el navegador.',
  },
];

function CookiesPage() {
  const sections = [
    {
      id: 'que-son',
      title: 'Qué son las cookies',
      content: (
        <p>
          Las cookies y el almacenamiento local (localStorage y sessionStorage) son pequeños datos que un sitio web
          guarda en tu navegador para recordar algo entre una visita y otra, como tu sesión o tus preferencias.
        </p>
      ),
    },
    {
      id: 'no-usamos',
      title: 'Este sitio no usa cookies',
      content: (
        <p>
          No usamos cookies propias ni de terceros. Tampoco usamos herramientas de analítica, publicidad, rastreo
          ni redes sociales integradas en las páginas. Las fuentes e iconos se cargan desde nuestro propio sitio, y
          las imágenes desde nuestro proveedor de almacenamiento (Supabase), que no instala cookies.
        </p>
      ),
    },
    {
      id: 'que-guardamos',
      title: 'Qué guardamos en tu navegador',
      content: (
        <>
          <p>Solo guardamos lo necesario para que el sitio funcione y para recordar tu preferencia de tema:</p>
          <div className="legal__table-wrap">
            <table className="legal__table">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Dónde</th>
                  <th scope="col">Para qué</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Duración</th>
                </tr>
              </thead>
              <tbody>
                {STORED_ITEMS.map((item) => (
                  <tr key={item.name}>
                    <td className="text-mono">{item.name}</td>
                    <td>{item.place}</td>
                    <td>{item.purpose}</td>
                    <td>{item.type}</td>
                    <td>{item.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Estos datos se quedan en tu dispositivo. La sesión incluye un identificador de tu cuenta y tu correo, y
            se trata según la <Link to={LEGAL_ROUTES.PRIVACY}>Política de privacidad</Link>.
          </p>
        </>
      ),
    },
    {
      id: 'terceros',
      title: 'Enlaces a otros servicios',
      content: (
        <p>
          El botón de WhatsApp y los enlaces a Instagram, LinkedIn y al portafolio te llevan a otros sitios. Esos
          servicios pueden usar sus propias cookies desde el momento en que entras a ellos, según sus propias
          políticas.
        </p>
      ),
    },
    {
      id: 'borrar',
      title: 'Cómo borrar estos datos',
      content: (
        <ul className="legal__list">
          <li>
            <strong>Cerrar sesión</strong> borra tu sesión del navegador.
          </li>
          <li>
            Si inicias sesión <strong>sin marcar &quot;Recordarme&quot;</strong>, la sesión se borra sola al cerrar
            la pestaña o el navegador.
          </li>
          <li>
            Puedes borrar todo desde la configuración de tu navegador, en la opción para borrar los datos de los
            sitios. Si lo haces, tendrás que volver a iniciar sesión y elegir de nuevo el tema.
          </li>
        </ul>
      ),
    },
    {
      id: 'cambios',
      title: 'Cambios en esta política',
      content: (
        <p>
          Si algún día agregamos cookies o herramientas de analítica, actualizaremos esta página y te pediremos
          permiso antes de activarlas.
        </p>
      ),
    },
  ];

  return (
    <LegalDocument
      title="Política de cookies"
      intro={<p>Aquí te contamos qué guarda este sitio en tu navegador y cómo puedes borrarlo.</p>}
      sections={sections}
    />
  );
}

export default CookiesPage;
