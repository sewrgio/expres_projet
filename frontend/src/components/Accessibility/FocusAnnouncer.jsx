import React, { useState } from 'react';
import useFocusAnnouncer from '../../hooks/useFocusAnnouncer';

/**
 * Componente que muestra visualmente el elemento enfocado
 * Alternativa accesible para usuarios sin screen reader
 * Compatible con todos los navegadores: Chrome, Firefox, Safari, Edge, Brave, Opera
 */
const FocusAnnouncer = () => {
  const { announcement } = useFocusAnnouncer();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        aria-label="Mostrar anunciador de foco"
      >
        👁️ Mostrar foco
      </button>
    );
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl border-t border-amber-500/30"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Indicador visual de foco */}
        <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30">
          <span className="text-amber-400 font-bold text-sm uppercase tracking-wider">
            🔍 FOCO:
          </span>
        </div>
        
        {/* Anuncio del elemento */}
        <span className="text-sm font-medium flex-1 truncate">
          {announcement || 'Navega con Tab para ver elementos'}
        </span>
        
        {/* Instrucciones de teclado */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg">
          <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">Tab</kbd>
          <span>para navegar</span>
          <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">Enter</kbd>
          <span>para activar</span>
        </div>
        
        {/* Botón para ocultar */}
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-white transition-colors p-1"
          aria-label="Ocultar anunciador de foco"
          title="Ocultar (Alt + A)"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default FocusAnnouncer;
