import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({ 
  options, 
  value, 
  onChange, 
  name, 
  placeholder = "Seleccionar", 
  disabled = false, 
  required = false,
  className = "",
  direction = "down"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');
  const dropdownRef = useRef(null);

  const currentValue = value !== undefined ? value : internalValue;
  const selectedOption = options.find(opt => String(opt.value) === String(currentValue)) || null;

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <div 
        className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center transition-all shadow-sm ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'cursor-pointer hover:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 hover:border-indigo-500 outline-none'} ${isOpen ? 'bg-white border-indigo-500 ring-2 ring-indigo-100 z-20' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
        aria-controls={`select-list-${name || 'default'}`}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
          if (!disabled && e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
      >
        <span className={`block truncate text-sm font-bold ${selectedOption ? 'text-slate-800' : 'text-slate-400 font-medium'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`text-slate-400 transition-transform duration-300 text-xs ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} aria-hidden="true">▼</span>
      </div>

      {isOpen && (
        <ul 
          id={`select-list-${name || 'default'}`}
          className={`absolute z-50 w-full bg-white border border-slate-100 rounded-xl max-h-60 overflow-auto animate-fade-in-up py-2 ${direction === 'up' ? 'bottom-full mb-2 shadow-[0_-10px_40px_rgba(0,0,0,0.15)]' : 'top-full mt-2 shadow-[0_10px_40px_rgba(0,0,0,0.15)]'}`}
          role="listbox"
        >
          {options.length === 0 ? (
            <li className="px-4 py-3 text-slate-400 text-sm italic text-center" role="option" aria-disabled="true">Sin opciones</li>
          ) : (
            options.map((option) => (
              <li
                key={option.value}
                className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors flex items-center justify-between ${String(currentValue) === String(option.value) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}`}
                role="option"
                aria-selected={String(currentValue) === String(option.value)}
                onClick={() => {
                  setInternalValue(option.value);
                  if (onChange) {
                    onChange(option.value);
                  }
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
                {String(currentValue) === String(option.value) && (
                  <span className="text-indigo-600" aria-hidden="true">✓</span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
      
      {/* Input oculto para validación de formularios nativa */}
      {required && (
        <input 
          type="text" 
          name={name}
          value={currentValue || ''} 
          onChange={() => {}} 
          required={required} 
          className="absolute opacity-0 -z-10 w-full h-full bottom-0 left-0" 
          tabIndex={-1}
        />
      )}
    </div>
  );
};

export default CustomSelect;
