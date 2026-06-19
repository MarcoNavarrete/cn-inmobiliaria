import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './PasswordInput.css';

export default function PasswordInput({ className = '', disabled = false, ...inputProps }) {
  const [showPassword, setShowPassword] = useState(false);
  const actionLabel = showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña';

  return (
    <div className={`password-input ${className}`.trim()}>
      <input
        {...inputProps}
        type={showPassword ? 'text' : 'password'}
        disabled={disabled}
      />
      <button
        type="button"
        className="password-input-toggle"
        onClick={() => setShowPassword((visible) => !visible)}
        onMouseDown={(event) => event.preventDefault()}
        aria-label={actionLabel}
        title={actionLabel}
        disabled={disabled}
      >
        {showPassword ? <FaEye aria-hidden="true" /> : <FaEyeSlash aria-hidden="true" />}
      </button>
    </div>
  );
}
