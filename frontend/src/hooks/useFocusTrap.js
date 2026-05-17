import { useEffect, useRef } from 'react';

/**
 * Hook para atrapar el foco dentro de un elemento (modal, diálogo, etc.)
 * Cumple con WCAG 2.2 para accesibilidad de modales
 * @param {boolean} isActive - Si el trap está activo
 */
const useFocusTrap = (isActive) => {
  const trapRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!isActive || !trapRef.current) return;

    // Guardar el elemento que tenía el foco antes de abrir el modal
    previousActiveElement.current = document.activeElement;

    // Encontrar todos los elementos focusables dentro del trap
    const focusableElements = trapRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Mover el foco al primer elemento focusable
    if (firstFocusable) {
      firstFocusable.focus();
    }

    // Manejar la tecla Tab para mantener el foco dentro del modal
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab: mover al último elemento
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab: mover al primer elemento
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    // Manejar Escape para cerrar el modal
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        // El componente padre debe manejar el cierre
        const event = new CustomEvent('modal-close-request', { bubbles: true });
        trapRef.current?.dispatchEvent(event);
      }
    };

    trapRef.current?.addEventListener('keydown', handleTab);
    trapRef.current?.addEventListener('keydown', handleEscape);

    return () => {
      // Limpiar event listeners
      trapRef.current?.removeEventListener('keydown', handleTab);
      trapRef.current?.removeEventListener('keydown', handleEscape);
      
      // Restaurar el foco al elemento anterior
      previousActiveElement.current?.focus();
    };
  }, [isActive]);

  return trapRef;
};

export default useFocusTrap;
