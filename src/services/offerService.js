/* ==========================================================================
   SERVICIO DE OFERTA: SERVICIOS ("Qué hacemos") Y PLANES
   --------------------------------------------------------------------------
   Lee, valida y guarda las cards que se ven en la página Servicios.
   Solo las edita el Administrador. Igual que projectService, toda escritura
   se VUELVE a validar aquí ("BackEnd") aunque el formulario ya lo haya hecho.

   Fuente de datos: Supabase (tablas services y plans). Para guardar se usan
   las funciones SQL save_services y save_plans, que reemplazan la lista
   completa en una sola transacción (solo el Administrador, por la RLS).

   Los errores se devuelven en un objeto plano con estas llaves:
     "list"          -> error general de la lista (ej. "máximo 6 cards")
     "<indice>.campo" -> error de un campo de una card (ej. "0.title")
   ========================================================================== */

import { supabase } from '../lib/supabaseClient.js';
import { ValidationError } from './errors.js';
import { toAppError } from './supabaseErrors.js';
import { normalizeText } from '../utils/validators.js';

/* Límites de cards por bloque */
export const MIN_CARDS = 1;
export const MAX_CARDS = 6;

/* Iconos que se pueden elegir para un servicio (nombre en Icon.jsx -> texto visible) */
export const SERVICE_ICON_OPTIONS = [
  { value: 'layout', label: 'Página' },
  { value: 'cart', label: 'Carrito' },
  { value: 'apps', label: 'Aplicaciones' },
  { value: 'globe', label: 'Globo web' },
  { value: 'sparkle', label: 'Destello (IA)' },
  { value: 'folder', label: 'Carpeta' },
];

/* --------------------------------------------------------------------------
   Utilidades internas
   -------------------------------------------------------------------------- */

/** Genera un id único para una card nueva. Ej: "srv-lk3j9a2" */
export function createOfferId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** Convierte el precio escrito (texto, número o vacío) en número o null */
export function parsePlanPrice(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return Number(value);
}

/**
 * Valida una lista de textos (etiquetas o características).
 * @returns {string} mensaje de error o cadena vacía
 */
function validateStringList(list, singularName) {
  if (!Array.isArray(list) || list.length === 0) {
    return `Agrega al menos ${singularName}.`;
  }
  if (list.some((item) => String(item).trim().length === 0)) {
    return 'No dejes elementos vacíos.';
  }
  return '';
}

/** Quita espacios extra de cada texto de una lista */
function cleanStringList(list) {
  return list.map((item) => String(item).trim());
}

/** Revisa el largo de la lista y los nombres repetidos (compartido por ambos bloques) */
function validateListShape(list, getName, errors, itemsName) {
  if (!Array.isArray(list) || list.length < MIN_CARDS) {
    errors.list = `Debe haber al menos ${MIN_CARDS} card de ${itemsName}.`;
    return;
  }
  if (list.length > MAX_CARDS) {
    errors.list = `Máximo ${MAX_CARDS} cards de ${itemsName}.`;
  }

  // Nombres repetidos: marcamos el error en la segunda card que repite
  const seen = new Set();
  list.forEach((item, index) => {
    const key = normalizeText(getName(item));
    if (key && seen.has(key)) {
      errors[`${index}.${itemsName === 'servicios' ? 'title' : 'name'}`] = 'Ya existe otra card con este nombre.';
    }
    seen.add(key);
  });
}

/* --------------------------------------------------------------------------
   Servicios ("Qué hacemos")
   -------------------------------------------------------------------------- */

export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('id, icon, title, description, tags')
    .order('position');
  if (error) throw toAppError(error, 'No se pudieron cargar los servicios.');

  return data;
}

/** Valida la lista de servicios. Devuelve errores (vacío = todo bien) */
export function validateServices(services) {
  const errors = {};
  validateListShape(services, (service) => service.title, errors, 'servicios');
  if (!Array.isArray(services)) return errors;

  services.forEach((service, index) => {
    if (String(service.title).trim().length < 3) {
      errors[`${index}.title`] = errors[`${index}.title`] || 'El título debe tener mínimo 3 caracteres.';
    }
    if (String(service.description).trim().length < 10) {
      errors[`${index}.description`] = 'La descripción debe tener mínimo 10 caracteres.';
    }
    if (!SERVICE_ICON_OPTIONS.some((option) => option.value === service.icon)) {
      errors[`${index}.icon`] = 'Selecciona un icono.';
    }
    const tagsError = validateStringList(service.tags, 'una etiqueta');
    if (tagsError) errors[`${index}.tags`] = tagsError;
  });

  return errors;
}

/** Valida y guarda los servicios */
export async function saveServices(services) {
  const errors = validateServices(services);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  const cleanServices = services.map((service) => ({
    id: service.id,
    icon: service.icon,
    title: service.title.trim(),
    description: service.description.trim(),
    tags: cleanStringList(service.tags),
  }));

  const { error } = await supabase.rpc('save_services', { items: cleanServices });
  if (error) throw toAppError(error, 'No se pudieron guardar los servicios.');
  return cleanServices;
}

/* --------------------------------------------------------------------------
   Planes
   -------------------------------------------------------------------------- */

export async function getPlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, price, description, features, cta, featured')
    .order('position');
  if (error) throw toAppError(error, 'No se pudieron cargar los planes.');

  // price null significa "Cotización"
  return data;
}

/** Valida la lista de planes. Devuelve errores (vacío = todo bien) */
export function validatePlans(plans) {
  const errors = {};
  validateListShape(plans, (plan) => plan.name, errors, 'planes');
  if (!Array.isArray(plans)) return errors;

  // Solo un plan puede ser "Más elegido"
  if (plans.filter((plan) => plan.featured).length > 1) {
    errors.list = 'Solo un plan puede ser "Más elegido".';
  }

  plans.forEach((plan, index) => {
    if (String(plan.name).trim().length < 3) {
      errors[`${index}.name`] = errors[`${index}.name`] || 'El nombre debe tener mínimo 3 caracteres.';
    }
    if (String(plan.description).trim().length < 10) {
      errors[`${index}.description`] = 'La descripción debe tener mínimo 10 caracteres.';
    }

    // Precio: vacío = "Cotización"; si se escribe debe ser entero mayor a 0
    const price = parsePlanPrice(plan.price);
    if (price !== null && (!Number.isInteger(price) || price <= 0)) {
      errors[`${index}.price`] = 'Escribe un precio entero mayor a 0 o déjalo vacío para mostrar "Cotización".';
    }

    if (String(plan.cta).trim().length < 3) {
      errors[`${index}.cta`] = 'Escribe el texto del botón (mínimo 3 caracteres).';
    }

    const featuresError = validateStringList(plan.features, 'una característica');
    if (featuresError) errors[`${index}.features`] = featuresError;
  });

  return errors;
}

/** Valida y guarda los planes */
export async function savePlans(plans) {
  const errors = validatePlans(plans);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  const cleanPlans = plans.map((plan) => ({
    id: plan.id,
    name: plan.name.trim(),
    price: parsePlanPrice(plan.price),
    description: plan.description.trim(),
    features: cleanStringList(plan.features),
    cta: plan.cta.trim(),
    featured: Boolean(plan.featured),
  }));

  const { error } = await supabase.rpc('save_plans', { items: cleanPlans });
  if (error) throw toAppError(error, 'No se pudieron guardar los planes.');
  return cleanPlans;
}
