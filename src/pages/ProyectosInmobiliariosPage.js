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

const formatAreaRange = (desde, hasta) => {
  const format = (value) => {
    if (!value || Number.isNaN(Number(value))) return '';
    return `${Number(value).toLocaleString('es-MX')} m2`;
  };
  const values = [format(desde), format(hasta)].filter(Boolean);
  return values.length ? values.join(' - ') : 'Superficie por confirmar';
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

        {!loading && !error && proyectos.length > 0 ? (
          <section className="proyectos-publicos-grid" aria-label="Listado de proyectos inmobiliarios">
            {proyectos.map((proyecto) => {
              const imageUrl = resolveApiAssetUrl(proyecto.imagenPrincipalUrl);
              const logoUrl = resolveApiAssetUrl(proyecto.logoUrl);

              return (
                <article key={proyecto.id || proyecto.slug} className="proyecto-publico-card">
                  <div className={`proyecto-publico-card-media ${imageUrl ? '' : 'is-placeholder'}`}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={proyecto.nombre} />
                    ) : (
                      <div>Imagen proximamente</div>
                    )}
                    <span>{TIPO_LABELS[proyecto.tipoProyecto] || proyecto.tipoProyecto}</span>
                    {logoUrl ? <img className="proyecto-publico-card-logo" src={logoUrl} alt={proyecto.empresaNombre || proyecto.nombre} /> : null}
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
                    {proyecto.empresaNombre ? <small>{proyecto.empresaNombre}</small> : null}
                    <Link to={`/proyectos-inmobiliarios/${proyecto.slug}`}>Ver proyecto</Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
      </section>
    </main>
  );
}
