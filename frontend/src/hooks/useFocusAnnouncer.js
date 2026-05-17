import { useState, useEffect } from 'react';

/**
 * Hook para anunciar visualmente el elemento enfocado
 * Alternativa visual para usuarios sin screen reader
 */
const useFocusAnnouncer = () => {
  const [announcement, setAnnouncement] = useState('');
  const [focusedElement, setFocusedElement] = useState(null);

  useEffect(() => {
    const handleFocus = (e) => {
      const element = e.target;
      setFocusedElement(element);
      
      // Construir el anuncio basado en atributos del elemento
      let message = '';
      
      // Obtener aria-label o aria-labelledby
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledBy = element.getAttribute('aria-labelledby');
      if (ariaLabelledBy) {
        const labelledElement = document.getElementById(ariaLabelledBy);
        if (labelledElement) {
          message = labelledElement.textContent || '';
        }
      } else if (ariaLabel) {
        message = ariaLabel;
      }
      
      // Si no hay aria-label, usar textContent o placeholder
      if (!message) {
        message = element.textContent?.trim() || 
                  element.placeholder || 
                  element.value || 
                  element.getAttribute('title') ||
                  element.tagName.toLowerCase();
      }
      
      // Agregar información del rol
      const role = element.getAttribute('role') || element.tagName.toLowerCase();
      
      // Agregar información adicional
      const ariaExpanded = element.getAttribute('aria-expanded');
      const ariaPressed = element.getAttribute('aria-pressed');
      const ariaCurrent = element.getAttribute('aria-current');
      const ariaInvalid = element.getAttribute('aria-invalid');
      
      let additionalInfo = [];
      if (ariaExpanded === 'true') additionalInfo.push('expandido');
      if (ariaExpanded === 'false') additionalInfo.push('colapsado');
      if (ariaPressed === 'true') additionalInfo.push('presionado');
      if (ariaCurrent === 'page') additionalInfo.push('página actual');
      if (ariaInvalid === 'true') additionalInfo.push('inválido');
      
      // Agregar tipo de elemento
      let elementType = '';
      if (element.tagName === 'BUTTON') elementType = 'Botón';
      else if (element.tagName === 'A') elementType = 'Enlace';
      else if (element.tagName === 'INPUT') elementType = `Campo ${element.type || 'texto'}`;
      else if (element.tagName === 'SELECT') elementType = 'Lista desplegable';
      else if (element.tagName === 'TEXTAREA') elementType = 'Área de texto';
      else if (role === 'menuitem') elementType = 'Elemento de menú';
      else if (role === 'navigation') elementType = 'Navegación';
      else if (role === 'dialog') elementType = 'Diálogo';
      
      // Construir mensaje final
      let finalMessage = '';
      if (elementType) finalMessage += `${elementType}: `;
      finalMessage += message;
      if (additionalInfo.length > 0) {
        finalMessage += ` (${additionalInfo.join(', ')})`;
      }
      
      // Limitar longitud
      if (finalMessage.length > 100) {
        finalMessage = finalMessage.substring(0, 100) + '...';
      }
      
      setAnnouncement(finalMessage || 'Elemento enfocado');
    };

    const handleBlur = () => {
      // No limpiar inmediatamente para que el usuario pueda leer
    };

    // Agregar listeners a todo el documento
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  return { announcement, focusedElement };
};

export default useFocusAnnouncer;
