import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({ 
  options, 
  value, 
  onChange, 
  name, 
  placeholder = "Seleccionar", 
  disabled = false, 
  required = false,
  className = ""
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
        className={`w-full px-4 py-3 sm:py-3.5 2xl:py-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center transition-all shadow-sm ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'cursor-pointer hover:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-indigo-500'} ${isOpen ? 'bg-white border-indigo-500 ring-4 ring-indigo-500/10 z-20' : ''}`}
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
        <span className={`block truncate text-sm sm:text-base 2xl:text-lg ${selectedOption ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} aria-hidden="true">▼</span>
      </div>

      {isOpen && (
        <ul 
          id={`select-list-${name || 'default'}`}
          className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] max-h-60 overflow-auto animate-fade-in-up py-2"
          role="listbox"
        >
          {options.length === 0 ? (
            <li className="px-4 py-3 text-slate-400 text-sm italic text-center" role="option" aria-disabled="true">Sin opciones</li>
          ) : (
            options.map((option) => (
              <li
                key={option.value}
                className={`px-4 py-3 text-sm sm:text-base 2xl:text-lg cursor-pointer transition-colors flex items-center justify-between ${String(currentValue) === String(option.value) ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium'}`}
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
