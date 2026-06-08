import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveApiAssetUrl } from '../services/apiClient';
import { listarProyectosPublicos } from '../services/proyectosInmobiliariosPublicService';
import './ProyectosInmobiliariosPage.css';

const TIPOS_PROYECTO = [
  { value: '', label: 'Todos' },
  { value: 'LOTEO', label: 'Loteos / terrenos' },
  { value: 'DESARROLLO_CASAS', label: 'Desarrollo de casas' },
  { value: 'DESARROLLO_VERTICAL', label: 'Desarrollo vertical' },
  { value: 'MIXTO', label: 'Mixto' },
];

const TIPO_LABELS = {
  LOTEO: 'Loteos / terrenos',
  DESARROLLO_CASAS: 'Desarrollo de casas',
  DESARROLLO_VERTICAL: 'Desarrollo vertical',
  MIXTO: 'Mixto',
};

const FILTROS_INICIALES = {
  texto: '',
  tipoProyecto: '',
};

const OTROS_PROYECTOS_KEY = '__otros_proyectos__';

const formatAreaRange = (desde, hasta) => {
  const format = (value) => {
    if (!value || Number.isNaN(Number(value))) return '';
    return `${Number(value).toLocaleString('es-MX')} m2`;
  };
  const values = [format(desde), format(hasta)].filter(Boolean);
  return values.length ? values.join(' - ') : 'Superficie por confirmar';
};

const normalizeGroupName = (value) => String(value || '').trim();

const sortNumberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getEmpresaKey = (proyecto = {}) => {
  const empresaId = String(proyecto.empresaId || '').trim();
  if (empresaId) return `empresa-${empresaId}`;

  const nombreEmpresa = normalizeGroupName(proyecto.empresaNombre);
  return nombreEmpresa ? `empresa-nombre-${nombreEmpresa.toLowerCase()}` : OTROS_PROYECTOS_KEY;
};

const agruparProyectosPorEmpresa = (proyectos = []) => {
  const grupos = new Map();

  proyectos.forEach((proyecto, index) => {
    const key = getEmpresaKey(proyecto);
    const nombreEmpresa = normalizeGroupName(proyecto.empresaNombre) || 'Otros proyectos';
    const grupoActual = grupos.get(key);

    if (!grupoActual) {
      grupos.set(key, {
        key,
        empresaId: proyecto.empresaId || '',
        nombreEmpresa,
        logoEmpresaUrl: proyecto.logoEmpresaUrl || '',
        ordenEmpresa: sortNumberOrNull(proyecto.ordenEmpresa),
        primerIndice: index,
        proyectos: [{ ...proyecto, indiceOriginal: index }],
      });
      return;
    }

    if (!grupoActual.logoEmpresaUrl && proyecto.logoEmpresaUrl) {
      grupoActual.logoEmpresaUrl = proyecto.logoEmpresaUrl;
    }

    if (grupoActual.ordenEmpresa === null && sortNumberOrNull(proyecto.ordenEmpresa) !== null) {
      grupoActual.ordenEmpresa = sortNumberOrNull(proyecto.ordenEmpresa);
    }

    grupoActual.proyectos.push({ ...proyecto, indiceOriginal: index });
  });

  return Array.from(grupos.values())
    .sort((a, b) => {
      if (a.key === OTROS_PROYECTOS_KEY) return 1;
      if (b.key === OTROS_PROYECTOS_KEY) return -1;

      const ordenA = sortNumberOrNull(a.ordenEmpresa);
      const ordenB = sortNumberOrNull(b.ordenEmpresa);
      if (ordenA !== null || ordenB !== null) {
        return (ordenA ?? Number.MAX_SAFE_INTEGER) - (ordenB ?? Number.MAX_SAFE_INTEGER);
      }

      return a.nombreEmpresa.localeCompare(b.nombreEmpresa, 'es-MX', { numeric: true });
    })
    .map((grupo) => ({
      ...grupo,
      proyectos: grupo.proyectos.sort((a, b) => {
        const ordenA = sortNumberOrNull(a.ordenProyecto);
        const ordenB = sortNumberOrNull(b.ordenProyecto);
        if (ordenA !== null || ordenB !== null) {
          return (ordenA ?? Number.MAX_SAFE_INTEGER) - (ordenB ?? Number.MAX_SAFE_INTEGER);
        }
        return a.indiceOriginal - b.indiceOriginal;
      }),
    }));
};

const getLogoVisible = (proyecto = {}) => {
  if (proyecto.usarLogoEmpresa && proyecto.logoEmpresaUrl) {
    return proyecto.logoEmpresaUrl;
  }

  return proyecto.logoProyectoUrl || null;
};

export default function ProyectosInmobiliariosPage() {
  const [proyectos, setProyectos] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIALES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const cargar = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await listarProyectosPublicos({
          texto: filtrosAplicados.texto.trim(),
          tipoProyecto: filtrosAplicados.tipoProyecto,
          signal: controller.signal,
        });
        setProyectos(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.data?.mensaje || err.data?.message || 'No fue posible cargar los proyectos inmobiliarios.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargar();

    return () => controller.abort();
  }, [filtrosAplicados]);

  const heroImage = useMemo(
    () => resolveApiAssetUrl(proyectos.find((proyecto) => proyecto.imagenPrincipalUrl)?.imagenPrincipalUrl),
    [proyectos]
  );

  const proyectosAgrupados = useMemo(() => agruparProyectosPorEmpresa(proyectos), [proyectos]);
  const hayFiltros = Boolean(filtrosAplicados.texto || filtrosAplicados.tipoProyecto);

  const actualizarFiltro = (event) => {
    const { name, value } = event.target;
    setFiltros((actual) => ({ ...actual, [name]: value }));
  };

  const buscar = (event) => {
    event.preventDefault();
    setFiltrosAplicados(filtros);
  };

  const limpiar = () => {
    setFiltros(FILTROS_INICIALES);
    setFiltrosAplicados(FILTROS_INICIALES);
  };

  return (
    <main className="proyectos-publicos-page">
      <section className="proyectos-publicos-hero">
        <div
          className={`proyectos-publicos-hero-bg ${heroImage ? '' : 'is-placeholder'}`}
          style={heroImage ? { backgroundImage: `linear-gradient(90deg, rgba(9, 22, 35, 0.88), rgba(15, 27, 45, 0.5)), url(${heroImage})` } : undefined}
        >
          <div>
            <p>CN Inmobiliaria</p>
            <h1>Proyectos inmobiliarios</h1>
            <span>Explora loteos, desarrollos de casas y proyectos inmobiliarios disponibles.</span>
          </div>
        </div>
      </section>

      <section className="proyectos-publicos-shell">
        <form className="proyectos-publicos-filtros" onSubmit={buscar}>
          <label>
            <span>Buscar</span>
            <input
              name="texto"
              value={filtros.texto}
              onChange={actualizarFiltro}
              placeholder="Nombre, ubicacion o empresa"
            />
          </label>
          <label>
            <span>Tipo de proyecto</span>
            <select name="tipoProyecto" value={filtros.tipoProyecto} onChange={actualizarFiltro}>
              {TIPOS_PROYECTO.map((tipo) => (
                <option key={tipo.value || 'TODOS'} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
          </label>
          <div className="proyectos-publicos-filter-actions">
            <button type="submit">Buscar</button>
            <button type="button" onClick={limpiar}>Limpiar filtros</button>
          </div>
        </form>

        {loading ? <p className="proyectos-publicos-feedback">Cargando proyectos inmobiliarios...</p> : null}
        {error ? <p className="proyectos-publicos-feedback is-error">{error}</p> : null}

        {!loading && !error && proyectos.length === 0 ? (
          <section className="proyectos-publicos-empty">
            <h2>{hayFiltros ? 'No encontramos proyectos con esos filtros.' : 'Por ahora no hay proyectos inmobiliarios publicados.'}</h2>
            <p>{hayFiltros ? 'Prueba con otra busqueda o limpia los filtros.' : 'Pronto publicaremos nuevos proyectos disponibles.'}</p>
          </section>
        ) : null}

        {!loading && !error && proyectosAgrupados.length > 0 ? (
          <section className="proyectos-publicos-groups" aria-label="Listado de proyectos inmobiliarios por empresa">
            {proyectosAgrupados.map((grupo) => {
              const groupLogoUrl = resolveApiAssetUrl(grupo.logoEmpresaUrl);

              return (
                <section key={grupo.key} className="proyectos-publicos-group">
                  <header className="proyectos-publicos-group-head">
                    {groupLogoUrl ? (
                      <img src={groupLogoUrl} alt={grupo.nombreEmpresa} />
                    ) : null}
                    <div>
                      <span>{grupo.key === OTROS_PROYECTOS_KEY ? 'CN Inmobiliaria' : 'Empresa desarrolladora'}</span>
                      <h2>{grupo.key === OTROS_PROYECTOS_KEY ? 'Otros proyectos' : `Proyectos de ${grupo.nombreEmpresa}`}</h2>
                    </div>
                  </header>

                  <div className="proyectos-publicos-grid">
                    {grupo.proyectos.map((proyecto) => {
                      const imageUrl = resolveApiAssetUrl(proyecto.imagenPrincipalUrl);
                      const logoVisibleUrl = resolveApiAssetUrl(getLogoVisible(proyecto));

                      return (
                        <article key={proyecto.id || proyecto.slug} className={`proyecto-publico-card ${logoVisibleUrl ? 'has-logo' : ''}`}>
                          {logoVisibleUrl ? (
                            <aside className="proyecto-publico-card-logo-panel" aria-label={`Logo de ${proyecto.empresaNombre || proyecto.nombre}`}>
                              <img src={logoVisibleUrl} alt={proyecto.empresaNombre || proyecto.nombre} />
                            </aside>
                          ) : null}

                          <div className="proyecto-publico-card-content">
                            <div className={`proyecto-publico-card-media ${imageUrl ? '' : 'is-placeholder'}`}>
                              {imageUrl ? (
                                <img src={imageUrl} alt={proyecto.nombre} />
                              ) : (
                                <div>Imagen proximamente</div>
                              )}
                              <span>{TIPO_LABELS[proyecto.tipoProyecto] || proyecto.tipoProyecto}</span>
                            </div>
                            <div className="proyecto-publico-card-body">
                              <div>
                                <h2>{proyecto.nombre}</h2>
                                <p>{proyecto.ubicacionTexto || proyecto.ubicacion}</p>
                              </div>
                              {proyecto.resumen ? <p className="proyecto-publico-card-summary">{proyecto.resumen}</p> : null}
                              <dl>
                                <div><dt>Precio desde</dt><dd>{proyecto.precioDesdeTexto}</dd></div>
                                <div><dt>Superficie</dt><dd>{formatAreaRange(proyecto.superficieDesdeM2, proyecto.superficieHastaM2)}</dd></div>
                                <div><dt>Unidades</dt><dd>{proyecto.totalUnidades || 'Por confirmar'}</dd></div>
                              </dl>
                              {proyecto.empresaNombre ? <small>Por {proyecto.empresaNombre}</small> : null}
                              <Link to={`/proyectos-inmobiliarios/${proyecto.slug}`}>Ver proyecto</Link>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </section>
        ) : null}
      </section>
    </main>
  );
}
