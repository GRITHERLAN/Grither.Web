/* ==========================================================================
   SERVICIO DE OFERTA: SERVICIOS ("Qué hago") Y PLANES
   --------------------------------------------------------------------------
   Lee y guarda las cards de la página Servicios. Reemplaza a las funciones
   SQL save_services y save_plans.

   ¿Cómo se guarda una lista completa sin perder datos?
   Antes la función SQL borraba todo y volvía a insertar dentro de una
   transacción. Desde JavaScript no hay transacción, así que se hace en un
   orden seguro:
     1) upsert ("insertar o actualizar") de todas las cards que llegan, en
        UNA sola instrucción (si falla, no cambia nada);
     2) borrar solo las cards que ya no vienen.
   Si el paso 2 fallara, quedaría alguna card de más, pero nunca se pierde
   una card que el admin quería conservar.

   Errores: "list" (de la lista) o "<indice>.campo" (de una card), igual que
   en el frontend.
   ========================================================================== */

import { supabase } from '../database/supabase.js';
import { throwIfInvalid } from '../utils/HttpError.js';
import { check } from '../utils/dbErrors.js';
import {
  MAX_LENGTH,
  cleanStringList,
  cleanText,
  isTooLong,
  isValidUrl,
  normalizeText,
  tooLongMessage,
  validateStringList,
} from '../utils/validators.js';

const MIN_CARDS = 1;
const MAX_CARDS = 6;
const SERVICE_ICONS = ['layout', 'cart', 'apps', 'globe', 'sparkle', 'folder'];
const ID_MAX_LENGTH = 40; // CHECK de la columna id

/* Columnas que se devuelven (se mantienen en snake_case, como antes) */
const SERVICE_COLUMNS = 'id, icon, title, description, tags';
const PLAN_COLUMNS = 'id, name, price, description, features, cta, cta_url, featured';

/* --------------------------------------------------------------------------
   Utilidades internas
   -------------------------------------------------------------------------- */

/** Revisa el largo de la lista, los ids y los nombres repetidos */
function validateListShape(list, nameField, errors, itemsName) {
  if (!Array.isArray(list) || list.length < MIN_CARDS) {
    errors.list = `Debe haber al menos ${MIN_CARDS} card de ${itemsName}.`;
    return false;
  }
  if (list.length > MAX_CARDS) errors.list = `Máximo ${MAX_CARDS} cards de ${itemsName}.`;

  const seenNames = new Set();
  const seenIds = new Set();
  list.forEach((item, index) => {
    // El id lo crea el frontend (ej. "srv-lk3j9a2"): debe existir y no repetirse
    const id = cleanText(item?.id);
    if (!id || id.length > ID_MAX_LENGTH || seenIds.has(id)) errors.list = 'Hay una card con un identificador inválido. Recarga la página.';
    seenIds.add(id);

    // Nombres repetidos: se marca el error en la segunda card que repite
    const key = normalizeText(item?.[nameField]);
    if (key && seenNames.has(key)) errors[`${index}.${nameField}`] = 'Ya existe otra card con este nombre.';
    seenNames.add(key);
  });
  return true;
}

/** Revisa un texto con mínimo y máximo y deja el error en errors[key] */
function validateLength(value, min, max, key, minMessage, errors) {
  if (cleanText(value).length < min) errors[key] = errors[key] || minMessage;
  else if (isTooLong(value, max)) errors[key] = tooLongMessage(max);
}

/** Convierte el precio escrito (texto, número o vacío) en número o null ("Cotización") */
function parsePlanPrice(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return Number(value);
}

/** Borra de una tabla las filas cuyo id ya no está en la lista nueva */
async function deleteMissingIds(table, keptIds, fallback) {
  const rows = check(await supabase.from(table).select('id'), fallback);
  const removedIds = rows.map((row) => row.id).filter((id) => !keptIds.includes(id));
  if (removedIds.length === 0) return;
  check(await supabase.from(table).delete().in('id', removedIds), fallback);
}

/* --------------------------------------------------------------------------
   Servicios
   -------------------------------------------------------------------------- */

export async function getServices() {
  return check(
    await supabase.from('services').select(SERVICE_COLUMNS).order('position'),
    'No se pudieron cargar los servicios.'
  );
}

function validateServices(services) {
  const errors = {};
  if (!validateListShape(services, 'title', errors, 'servicios')) return errors;

  services.forEach((service, index) => {
    validateLength(service.title, 3, MAX_LENGTH.CARD_TITLE, `${index}.title`, 'El título debe tener mínimo 3 caracteres.', errors);
    validateLength(service.description, 10, MAX_LENGTH.CARD_DESCRIPTION, `${index}.description`, 'La descripción debe tener mínimo 10 caracteres.', errors);
    if (!SERVICE_ICONS.includes(service.icon)) errors[`${index}.icon`] = 'Selecciona un icono.';
    const tagsError = validateStringList(service.tags, 'una etiqueta');
    if (tagsError) errors[`${index}.tags`] = tagsError;
  });
  return errors;
}

/** Valida y guarda la lista completa de servicios (en el orden recibido) */
export async function saveServices(services) {
  throwIfInvalid(validateServices(services));

  // "position" guarda el orden en que se ven las cards
  const rows = services.map((service, index) => ({
    id: cleanText(service.id),
    icon: service.icon,
    title: cleanText(service.title),
    description: cleanText(service.description),
    tags: cleanStringList(service.tags),
    position: index,
  }));

  const fallback = 'No se pudieron guardar los servicios.';
  check(await supabase.from('services').upsert(rows), fallback);
  await deleteMissingIds('services', rows.map((row) => row.id), fallback);

  return getServices();
}

/* --------------------------------------------------------------------------
   Planes
   -------------------------------------------------------------------------- */

export async function getPlans() {
  // price null significa "Cotización"
  return check(
    await supabase.from('plans').select(PLAN_COLUMNS).order('position'),
    'No se pudieron cargar los planes.'
  );
}

function validatePlans(plans) {
  const errors = {};
  if (!validateListShape(plans, 'name', errors, 'planes')) return errors;
  if (plans.filter((plan) => plan.featured === true).length > 1) errors.list = 'Solo un plan puede ser "Más elegido".';

  plans.forEach((plan, index) => {
    validateLength(plan.name, 3, MAX_LENGTH.CARD_TITLE, `${index}.name`, 'El nombre debe tener mínimo 3 caracteres.', errors);
    validateLength(plan.description, 10, MAX_LENGTH.CARD_DESCRIPTION, `${index}.description`, 'La descripción debe tener mínimo 10 caracteres.', errors);
    validateLength(plan.cta, 3, MAX_LENGTH.CTA_TEXT, `${index}.cta`, 'Escribe el texto del botón (mínimo 3 caracteres).', errors);

    // Precio: vacío = "Cotización"; si se escribe debe ser entero mayor a 0
    const price = parsePlanPrice(plan.price);
    if (price !== null && (!Number.isInteger(price) || price <= 0)) {
      errors[`${index}.price`] = 'Escribe un precio entero mayor a 0 o déjalo vacío para mostrar "Cotización".';
    }
    if (!isValidUrl(plan.cta_url) || isTooLong(plan.cta_url, MAX_LENGTH.URL)) {
      errors[`${index}.cta_url`] = 'Escribe un enlace válido (https://..., mailto:... o tel:...).';
    }
    const featuresError = validateStringList(plan.features, 'una característica');
    if (featuresError) errors[`${index}.features`] = featuresError;
  });
  return errors;
}

/** Valida y guarda la lista completa de planes (en el orden recibido) */
export async function savePlans(plans) {
  throwIfInvalid(validatePlans(plans));

  const rows = plans.map((plan, index) => ({
    id: cleanText(plan.id),
    name: cleanText(plan.name),
    price: parsePlanPrice(plan.price),
    description: cleanText(plan.description),
    features: cleanStringList(plan.features),
    cta: cleanText(plan.cta),
    cta_url: cleanText(plan.cta_url),
    featured: false, // el "Más elegido" se marca en el paso 2 (ver abajo)
    position: index,
  }));
  const featuredPlan = plans.find((plan) => plan.featured === true);
  const fallback = 'No se pudieron guardar los planes.';

  /* La base de datos solo permite UN plan con featured = true (índice
     plans_single_featured). Si se mueve el "Más elegido" de un plan a otro
     en una sola instrucción, por un instante habría dos y la BD lo rechaza.
     Por eso: 1) se guardan todos sin marcar, 2) se marca el elegido. */
  check(await supabase.from('plans').upsert(rows), fallback);
  if (featuredPlan) {
    check(await supabase.from('plans').update({ featured: true }).eq('id', cleanText(featuredPlan.id)), fallback);
  }
  await deleteMissingIds('plans', rows.map((row) => row.id), fallback);

  return getPlans();
}
