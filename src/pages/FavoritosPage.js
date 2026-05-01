import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { obtenerToken } from '../services/authService';
import { eliminarFavorito, obtenerFavoritos } from '../services/favoritosService';
import './FavoritosPage.css';

export default function FavoritosPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accionandoId, setAccionandoId] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!obtenerToken()) {
      navigate('/login', { replace: true, state: { from: location } });
      return undefined;
    }

    const controller = new AbortController();

    const cargarFavoritos = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await obtenerFavoritos({ signal: controller.signal });
        setFavoritos(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.data?.mensaje || err.data?.message || 'No fue posible cargar favoritos.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargarFavoritos();

    return () => controller.abort();
  }, [location, navigate]);

  const quitarFavorito = async (inmuebleId) => {
    setAccionandoId(String(inmuebleId));
    setMensaje('');
    setError('');

    try {
      await eliminarFavorito(inmuebleId);
      setFavoritos((actuales) => actuales.filter((item) => String(item.id) !== String(inmuebleId)));
      setMensaje('Propiedad quitada de favoritos.');
    } catch (err) {
      setError(err.data?.mensaje || err.data?.message || 'No fue posible quitar el favorito.');
    } finally {
      setAccionandoId('');
    }
  };

  return (
    <main className="favoritos-page">
      <section className="favoritos-hero">
        <div>
          <p>Cuenta</p>
          <h1>Favoritos</h1>
        </div>
        <Link to="/propiedades">Ver propiedades</Link>
      </section>

      {mensaje ? <p className="favoritos-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="favoritos-feedback is-error">{error}</p> : null}
      {loading ? <p className="favoritos-feedback">Cargando favoritos...</p> : null}

      {!loading && favoritos.length === 0 ? (
        <section className="favoritos-empty">
          <h2>Aun no tienes favoritos</h2>
          <p>Guarda propiedades para revisarlas despues.</p>
          <Link to="/propiedades">Volver a propiedades</Link>
        </section>
      ) : null}

      {!loading && favoritos.length > 0 ? (
        <section className="favoritos-grid">
          {favoritos.map((favorito) => (
            <article key={favorito.id} className="favoritos-card">
              {favorito.imagenPrincipal ? (
                <img src={favorito.imagenPrincipal} alt={favorito.titulo} />
              ) : (
                <div className="favoritos-placeholder">Imagen no disponible</div>
              )}
              <div>
                <h2>{favorito.titulo}</h2>
                <p className="favoritos-precio">{favorito.precio}</p>
                <p>{favorito.ubicacion}</p>
                <div className="favoritos-actions">
                  <Link to={`/propiedad/${favorito.id}`}>Ver propiedad</Link>
                  <button
                    type="button"
                    onClick={() => quitarFavorito(favorito.id)}
                    disabled={accionandoId === String(favorito.id)}
                  >
                    {accionandoId === String(favorito.id) ? 'Quitando...' : 'Quitar'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
