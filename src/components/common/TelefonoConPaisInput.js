import React from 'react';
import './TelefonoConPaisInput.css';

const getPaisLabel = (pais) => {
  const bandera = pais?.emojiBandera ? `${pais.emojiBandera} ` : '';
  const nombre = pais?.nombrePais || pais?.iso2 || 'Pais';
  const marcacion = pais?.codigoMarcacion ? ` (+${String(pais.codigoMarcacion).replace(/^\+/, '')})` : '';
  return `${bandera}${nombre}${marcacion}`;
};

export const ordenarPaisesTelefono = (paises = []) =>
  [...paises].sort((a, b) => {
    if (a.iso2 === 'MX') return -1;
    if (b.iso2 === 'MX') return 1;
    return String(a.nombrePais || '').localeCompare(String(b.nombrePais || ''), 'es');
  });

export const getPaisTelefonoDefaultId = (paises = []) =>
  paises.find((pais) => pais.iso2 === 'MX')?.id || paises[0]?.id || '';

export default function TelefonoConPaisInput({
  paises = [],
  codigoNumeroPaisId = '',
  telefono = '',
  onChangePais,
  onChangeTelefono,
  disabled = false,
  required = false,
  selectName = 'codigoNumeroPaisId',
  inputName = 'telefono',
  autoComplete = 'tel-national',
}) {
  const paisesOrdenados = ordenarPaisesTelefono(paises);

  return (
    <div className="telefono-pais-input">
      <select
        name={selectName}
        value={codigoNumeroPaisId || ''}
        onChange={onChangePais}
        disabled={disabled || paisesOrdenados.length === 0}
        required={required}
        aria-label="Pais y lada"
      >
        <option value="">Pais/lada</option>
        {paisesOrdenados.map((pais) => (
          <option key={pais.id} value={pais.id}>
            {getPaisLabel(pais)}
          </option>
        ))}
      </select>
      <input
        type="tel"
        name={inputName}
        value={telefono}
        onChange={onChangeTelefono}
        autoComplete={autoComplete}
        maxLength={20}
        disabled={disabled}
        required={required}
        placeholder="Telefono local"
      />
    </div>
  );
}
