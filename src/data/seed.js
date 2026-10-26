/* ==========================================================================
   DATOS INICIALES Y DE PRUEBA
   --------------------------------------------------------------------------
   La primera vez que se abre la web, LocalStorage está vacío. Esta función
   guarda:
     - 1 administrador y 2 clientes de prueba.
     - 5 proyectos de prueba (sin imágenes).
     - La información de Contacto y de Sobre nosotros.
   Solo escribe una clave si NO existe, así nunca pisa cambios del admin.

   Cuentas de prueba:
     Admin    -> admin@grither.co     / Admin123*
     Cliente1 -> cliente1@correo.com  / Cliente123*
     Cliente2 -> cliente2@correo.com  / Cliente123*
   ========================================================================== */

import { readStorage, writeStorage, STORAGE_KEYS } from '../services/storage.js';
import { hashPassword, ROLES } from '../services/authService.js';

/* --------------------------------------------------------------------------
   Información de Contacto por defecto
   -------------------------------------------------------------------------- */
export const DEFAULT_CONTACT_INFO = {
  email: 'hola@grither.co',
  phone: '+57 300 000 0000',
  brandDescription:
    'Grither es un estudio de desarrollo web en Colombia. Diseñamos y programamos sitios, tiendas y aplicaciones a la medida de cada negocio, con trato directo y entregas claras.',
  instagram: 'https://www.instagram.com/grither',
  linkedin: 'https://www.linkedin.com/in/grither',
  portfolio: 'https://grither.co',
  indicators: [
    { value: '+30', label: 'Proyectos entregados' },
    { value: '< 24 h', label: 'Tiempo de respuesta' },
    { value: '5', label: 'Años de experiencia' },
  ],
};

/* --------------------------------------------------------------------------
   Información de Sobre nosotros por defecto
   -------------------------------------------------------------------------- */
export const DEFAULT_ABOUT_INFO = {
  brandDescription:
    'Grither nace en Colombia para que emprendedores y pequeñas empresas tengan software a la medida sin la complejidad de una gran agencia: trato directo, código limpio y entregas claras.\n\nEl nombre une dos ideas: el crecimiento y las alas del emblema, que representan llevar cada proyecto más alto.',
  indicators: [
    { value: '+30', label: 'Proyectos entregados' },
    { value: '5', label: 'Años de experiencia' },
    { value: '4', label: 'Fases por proyecto' },
    { value: '100%', label: 'Trato directo' },
  ],
  owner: {
    name: 'Nicolas Valencia',
    role: 'Fundador · Desarrollador Full-Stack',
    bio: 'Desarrollador web apasionado por convertir ideas en productos digitales rápidos, claros y fáciles de usar. Acompaño cada proyecto desde la primera reunión hasta su lanzamiento.',
    photo: '',
  },
  phases: {
    reunion:
      'Conversamos sobre tu negocio, tus objetivos y tus usuarios para definir el alcance, los tiempos y el presupuesto.',
    bocetos:
      'Creamos bocetos y prototipos navegables para validar la experiencia antes de escribir una sola línea de código.',
    desarrollo:
      'Construimos el proyecto por módulos, con avances semanales que puedes revisar desde tu panel.',
    despliegue:
      'Publicamos la web, configuramos el dominio y te capacitamos para que la administres sin complicaciones.',
  },
};

/* --------------------------------------------------------------------------
   Cards de "Qué hacemos" por defecto (editables desde el panel admin)
   Cada card tiene un "id" estable para poder editarla o borrarla.
   -------------------------------------------------------------------------- */
export const DEFAULT_SERVICES = [
  {
    id: 'srv-landing',
    icon: 'layout',
    title: 'Landing pages',
    description: 'Páginas de una sola vista enfocadas en convertir visitas en clientes.',
    tags: ['Responsive', 'SEO', 'WhatsApp'],
  },
  {
    id: 'srv-ecommerce',
    icon: 'cart',
    title: 'E-commerce',
    description: 'Tiendas online con catálogo, carrito, pagos y gestión de pedidos.',
    tags: ['Pagos', 'Inventario', 'Envíos'],
  },
  {
    id: 'srv-webapps',
    icon: 'apps',
    title: 'Web apps y SaaS',
    description: 'Aplicaciones a medida con usuarios, roles y paneles de control.',
    tags: ['Full-Stack', 'Autenticación', 'Dashboards'],
  },
];

/* --------------------------------------------------------------------------
   Cards de "Planes" por defecto (editables desde el panel admin)
   "price" es un número en COP; si es null se muestra "Cotización".
   Solo un plan puede tener featured = true ("Más elegido").
   -------------------------------------------------------------------------- */
export const DEFAULT_PLANS = [
  {
    id: 'plan-esencial',
    name: 'Esencial',
    price: 1500000,
    description: 'Landing page para presentar tu marca y captar contactos.',
    features: ['Una página, diseño responsive', 'Formulario + botón WhatsApp', 'Publicación y dominio'],
    cta: 'Elegir Esencial',
    featured: false,
  },
  {
    id: 'plan-profesional',
    name: 'Profesional',
    price: 3500000,
    description: 'Sitio corporativo con secciones, blog y panel para editar contenido.',
    features: ['Hasta 6 secciones', 'Panel administrador', 'SEO básico y analítica', 'Soporte por 1 mes'],
    cta: 'Elegir Profesional',
    featured: true,
  },
  {
    id: 'plan-medida',
    name: 'A medida',
    price: null,
    description: 'E-commerce, SaaS o sistemas internos diseñados para tu operación.',
    features: ['Arquitectura y base de datos', 'Pasarela de pagos', 'Entregas por fases'],
    cta: 'Hablemos',
    featured: false,
  },
];

/* --------------------------------------------------------------------------
   Utilidades para fechas de prueba
   -------------------------------------------------------------------------- */

/** Devuelve la fecha de hace "days" días en formato ISO */
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

/* --------------------------------------------------------------------------
   Función principal de sembrado
   -------------------------------------------------------------------------- */

/**
 * Guarda los datos iniciales que falten en LocalStorage.
 * Es async porque las contraseñas se convierten a hash con crypto.subtle.
 */
export async function seedDatabase() {
  // ---------- Usuarios ----------
  if (readStorage(STORAGE_KEYS.USERS) === null) {
    const adminHash = await hashPassword('Admin123*');
    const clientHash = await hashPassword('Cliente123*');

    writeStorage(STORAGE_KEYS.USERS, [
      {
        id: 'USR-ADMIN',
        name: 'Nicolas Valencia',
        email: 'admin@grither.co',
        passwordHash: adminHash,
        role: ROLES.ADMIN,
        createdAt: daysAgo(120),
      },
      {
        id: 'USR-CLIENTE-1',
        name: 'Clínica San Gabriel',
        email: 'cliente1@correo.com',
        passwordHash: clientHash,
        role: ROLES.USER,
        createdAt: daysAgo(90),
      },
      {
        id: 'USR-CLIENTE-2',
        name: 'Urbania Real Estate',
        email: 'cliente2@correo.com',
        passwordHash: clientHash,
        role: ROLES.USER,
        createdAt: daysAgo(60),
      },
    ]);
  }

  // ---------- Proyectos de prueba ----------
  if (readStorage(STORAGE_KEYS.PROJECTS) === null) {
    writeStorage(STORAGE_KEYS.PROJECTS, [
      {
        id: 'GTH-8041',
        name: 'E-commerce B2B farmacéutico',
        description:
          'Catálogo omnicanal para droguerías con precios por volumen, pedidos recurrentes y pasarela de pagos.',
        price: 8500000,
        category: 'Web a la medida',
        phase: 'desarrollo',
        clientId: 'USR-CLIENTE-1',
        contactLink: 'mailto:hola@grither.co?subject=Proyecto%20GTH-8041',
        media: [],
        status: 'activo',
        cancelReason: '',
        createdAt: daysAgo(3),
        updatedAt: null,
      },
      {
        id: 'GTH-8042',
        name: 'SaaS inmobiliario con tours 3D',
        description:
          'Plataforma para inmobiliarias con visor 3D de propiedades, CRM de leads y agenda de visitas.',
        price: 12000000,
        category: 'Web app / SaaS',
        phase: 'bocetos',
        clientId: 'USR-CLIENTE-2',
        contactLink: 'https://wa.link/0wzo59',
        media: [],
        status: 'activo',
        cancelReason: '',
        createdAt: daysAgo(12),
        updatedAt: null,
      },
      {
        id: 'GTH-8043',
        name: 'ERP y punto de venta en la nube',
        description:
          'Sistema de inventario, facturación y punto de venta para las sedes de la clínica, con reportes diarios.',
        price: 15500000,
        category: 'Web app / SaaS',
        phase: 'despliegue',
        clientId: 'USR-CLIENTE-1',
        contactLink: 'https://wa.link/0wzo59',
        media: [],
        status: 'activo',
        cancelReason: '',
        createdAt: daysAgo(35),
        updatedAt: null,
      },
      {
        id: 'GTH-8044',
        name: 'Sitio corporativo Urbania',
        description:
          'Sitio institucional con secciones de proyectos, blog y formulario de contacto conectado a WhatsApp.',
        price: 4800000,
        category: 'Sitio corporativo',
        phase: 'reunion',
        clientId: 'USR-CLIENTE-2',
        contactLink: 'mailto:hola@grither.co?subject=Proyecto%20GTH-8044',
        media: [],
        status: 'inactivo',
        cancelReason: '',
        createdAt: daysAgo(50),
        updatedAt: null,
      },
      {
        id: 'GTH-8045',
        name: 'Landing de citas médicas',
        description:
          'Página de una sola vista para agendar citas médicas en línea con recordatorios por correo.',
        price: 1800000,
        category: 'Landing page',
        phase: 'desarrollo',
        clientId: 'USR-CLIENTE-1',
        contactLink: 'https://wa.link/0wzo59',
        media: [],
        status: 'cancelado',
        cancelReason: 'El cliente pospuso el presupuesto para el próximo año.',
        createdAt: daysAgo(70),
        updatedAt: null,
      },
    ]);
  }

  // Ajuste único: la categoría "E-commerce" ya no existe en la lista de categorías.
  // Si el proyecto de prueba GTH-8041 ya estaba guardado con ella, se actualiza.
  const storedProjects = readStorage(STORAGE_KEYS.PROJECTS, []);
  if (storedProjects.some((project) => project.id === 'GTH-8041' && project.category === 'E-commerce')) {
    writeStorage(
      STORAGE_KEYS.PROJECTS,
      storedProjects.map((project) =>
        project.id === 'GTH-8041' && project.category === 'E-commerce'
          ? { ...project, category: 'Web a la medida' }
          : project
      )
    );
  }

  // ---------- Información del sitio ----------
  if (readStorage(STORAGE_KEYS.CONTACT) === null) {
    writeStorage(STORAGE_KEYS.CONTACT, DEFAULT_CONTACT_INFO);
  }
  if (readStorage(STORAGE_KEYS.ABOUT) === null) {
    writeStorage(STORAGE_KEYS.ABOUT, DEFAULT_ABOUT_INFO);
  }

  // ---------- Cards de Servicios y Planes ----------
  if (readStorage(STORAGE_KEYS.SERVICES) === null) {
    writeStorage(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES);
  }
  if (readStorage(STORAGE_KEYS.PLANS) === null) {
    writeStorage(STORAGE_KEYS.PLANS, DEFAULT_PLANS);
  }
}
