/* ==========================================================================
   BOTÓN FLOTANTE DE WHATSAPP
   --------------------------------------------------------------------------
   Fijo en la esquina inferior izquierda de la página, con un mensaje fijo
   "¿Quieres más información?". Abre el enlace en una pestaña nueva.
   ========================================================================== */

import Icon from '../ui/Icon.jsx';
import './WhatsAppButton.css';

/* Enlace definido en Claude.md */
const WHATSAPP_URL = 'https://wa.link/0wzo59';

function WhatsAppButton() {
  return (
    <a
      className="whatsapp-button"
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp: ¿Quieres más información?"
    >
      <span className="whatsapp-button__icon">
        <Icon name="whatsapp" />
      </span>
      <span className="whatsapp-button__message">¿Quieres más información?</span>
    </a>
  );
}

export default WhatsAppButton;
