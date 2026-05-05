import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import 'pannellum/build/pannellum.css';
import 'pannellum/build/pannellum.js';
import './tour360/Tour360Viewer.css';

const MIN_LOADING_TIME = 420;
const EDITOR_YAW_CORRECTION_DEGREES = -60;

const isValidPanoramaUrl = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  try {
    new URL(trimmedValue, window.location.origin);
    return true;
  } catch (_) {
    return false;
  }
};

const normalizeYaw = (yaw) => {
  if (!Number.isFinite(yaw)) {
    return yaw;
  }

  let normalizedYaw = yaw;

  while (normalizedYaw > 180) {
    normalizedYaw -= 360;
  }

  while (normalizedYaw < -180) {
    normalizedYaw += 360;
  }

  return normalizedYaw;
};

const buildInfoTooltip = (hotSpotDiv, args) => {
  hotSpotDiv.classList.add('tour360-hotspot', 'tour360-hotspot-info');
  hotSpotDiv.setAttribute('aria-label', args?.texto || 'Informacion');
  hotSpotDiv.setAttribute('role', 'button');
  hotSpotDiv.tabIndex = 0;
  hotSpotDiv.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      hotSpotDiv.click();
    }
  });

  const marker = document.createElement('span');
  marker.className = 'tour360-hotspot-marker';
  marker.textContent = 'i';

  const label = document.createElement('span');
  label.className = 'tour360-hotspot-label';
  label.textContent = args?.texto || 'Info';

  hotSpotDiv.appendChild(marker);
  hotSpotDiv.appendChild(label);
};

const buildSceneTooltip = (hotSpotDiv, args) => {
  hotSpotDiv.classList.add('tour360-hotspot', 'tour360-hotspot-scene');
  hotSpotDiv.setAttribute('aria-label', args?.texto || 'Ir a escena');
  hotSpotDiv.setAttribute('role', 'button');
  hotSpotDiv.tabIndex = 0;
  hotSpotDiv.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      hotSpotDiv.click();
    }
  });

  const marker = document.createElement('span');
  marker.className = 'tour360-hotspot-marker';
  marker.textContent = '>';

  const label = document.createElement('span');
  label.className = 'tour360-hotspot-label';
  label.textContent = args?.texto || 'Ir a escena';

  hotSpotDiv.appendChild(marker);
  hotSpotDiv.appendChild(label);
};

const buildEditorMarkerTooltip = (hotSpotDiv) => {
  hotSpotDiv.classList.add('tour360-editor-marker');

  const marker = document.createElement('span');
  marker.className = 'tour360-editor-marker-dot';
  marker.textContent = '+';

  hotSpotDiv.appendChild(marker);
};

const buildViewerConfig = (tour, onInfoClick) => {
  const scenes = {};
  const validScenes = tour.escenas.filter((escena) => isValidPanoramaUrl(escena.urlImagen360));
  const validSceneIds = new Set(validScenes.map((escena) => escena.id));

  validScenes.forEach((escena) => {
    const panoramaUrl = escena.urlImagen360.trim();

    scenes[escena.id] = {
      type: 'equirectangular',
      panorama: panoramaUrl,
      title: escena.nombre,
      pitch: escena.pitchInicial ?? 0,
      yaw: escena.yawInicial ?? 0,
      hfov: escena.hfovInicial ?? 110,
      hotSpots: escena.hotspots
        .map((hotspot) => {
          if (hotspot.escenaDestinoId && !validSceneIds.has(hotspot.escenaDestinoId)) {
            return null;
          }

          if (hotspot.escenaDestinoId) {
            return {
              id: hotspot.id,
              pitch: hotspot.pitch,
              yaw: hotspot.yaw,
              type: 'scene',
              text: hotspot.texto || 'Ir a otra escena',
              sceneId: hotspot.escenaDestinoId,
              cssClass: 'tour360-hotspot-wrapper',
              createTooltipFunc: buildSceneTooltip,
              createTooltipArgs: {
                texto: hotspot.texto || 'Ir a otra escena',
              },
            };
          }

          return {
            id: hotspot.id,
            pitch: hotspot.pitch,
            yaw: hotspot.yaw,
            type: 'info',
            text: hotspot.texto || 'Informacion',
            cssClass: 'tour360-hotspot-wrapper',
            createTooltipFunc: buildInfoTooltip,
            createTooltipArgs: {
              texto: hotspot.texto || 'Informacion',
            },
            clickHandlerFunc: (_, args) => onInfoClick(args?.texto || 'Informacion'),
            clickHandlerArgs: {
              texto: hotspot.texto || 'Informacion',
            },
          };
        })
        .filter(Boolean),
    };
  });

  const firstScene =
    scenes[tour.escenaInicialId] !== undefined
      ? tour.escenaInicialId
      : Object.keys(scenes)[0];

  return {
    default: {
      firstScene,
      sceneFadeDuration: 650,
      autoLoad: true,
      showControls: true,
      showZoomCtrl: true,
      showFullscreenCtrl: true,
      mouseZoom: true,
      keyboardZoom: true,
    },
    scenes,
  };
};

export default function Tour360Viewer({
  activeSceneId,
  editorMarker = null,
  editorMode = false,
  loopScenes = true,
  onSceneChange,
  onViewerReady,
  onPanoramaClick,
  tour,
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const loadingStartedAtRef = useRef(0);
  const editorMarkerIdRef = useRef(null);
  const [mensajeInfo, setMensajeInfo] = useState('');
  const onSceneChangeRef = useRef(onSceneChange);
  const [escenaActualId, setEscenaActualId] = useState(activeSceneId || tour?.escenaInicialId || '');
  const [cargandoEscena, setCargandoEscena] = useState(true);

  const escenas = useMemo(() => tour?.escenas || [], [tour]);
  const tourKey = useMemo(
    () =>
      JSON.stringify({
        id: tour?.id || '',
        escenaInicialId: tour?.escenaInicialId || '',
        escenas: escenas.map((escena) => ({
          id: escena.id,
          urlImagen360: escena.urlImagen360,
          nombre: escena.nombre,
          pitchInicial: escena.pitchInicial,
          yawInicial: escena.yawInicial,
          hfovInicial: escena.hfovInicial,
          hotspots: (escena.hotspots || []).map((hotspot) => ({
            id: hotspot.id,
            pitch: hotspot.pitch,
            yaw: hotspot.yaw,
            texto: hotspot.texto,
            etiqueta: hotspot.etiqueta,
            escenaDestinoId: hotspot.escenaDestinoId,
          })),
        })),
      }),
    [escenas, tour?.escenaInicialId, tour?.id]
  );
  const stableTourRef = useRef(tour);
  const escenasValidas = useMemo(
    () => escenas.filter((escena) => isValidPanoramaUrl(escena.urlImagen360)),
    [escenas]
  );
  const escenasPorId = useMemo(() => Object.fromEntries(escenas.map((escena) => [escena.id, escena])), [escenas]);
  const indiceEscenaActual = escenasValidas.findIndex((escena) => escena.id === escenaActualId);
  const escenaActual = escenasPorId[escenaActualId] || escenasPorId[tour?.escenaInicialId];
  const tieneVariasEscenas = escenasValidas.length > 1;

  useEffect(() => {
    onSceneChangeRef.current = onSceneChange;
  }, [onSceneChange]);

  useEffect(() => {
    stableTourRef.current = tour;
  }, [tour, tourKey]);

  const iniciarCargaEscena = useCallback(() => {
    loadingStartedAtRef.current = Date.now();
    setCargandoEscena(true);
  }, []);

  const finalizarCargaEscena = useCallback(() => {
    const elapsed = Date.now() - loadingStartedAtRef.current;
    const delay = Math.max(MIN_LOADING_TIME - elapsed, 0);

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    loadingTimeoutRef.current = setTimeout(() => {
      setCargandoEscena(false);
      loadingTimeoutRef.current = null;
    }, delay);
  }, []);

  useEffect(() => {
    setEscenaActualId(activeSceneId || tour?.escenaInicialId || '');
    setMensajeInfo('');
    iniciarCargaEscena();
  }, [activeSceneId, tour?.escenaInicialId, iniciarCargaEscena]);

  useEffect(() => {
    const currentTour = stableTourRef.current;

    if (!currentTour || !containerRef.current || !window.pannellum || escenasValidas.length === 0) {
      return undefined;
    }

    containerRef.current.innerHTML = '';
    const config = buildViewerConfig(currentTour, setMensajeInfo);
    viewerRef.current = window.pannellum.viewer(containerRef.current, config);
    onViewerReady?.(viewerRef.current);

    const syncScene = () => {
      const activeScene = viewerRef.current?.getScene?.() || currentTour.escenaInicialId;
      setEscenaActualId(activeScene);
      onSceneChangeRef.current?.(activeScene);
      iniciarCargaEscena();
    };
    const handleLoad = finalizarCargaEscena;

    const resizeViewer = () => {
      viewerRef.current?.resize?.();
    };

    syncScene();
    viewerRef.current.on('scenechange', syncScene);
    viewerRef.current.on('scenechangefadedone', handleLoad);
    viewerRef.current.on('load', handleLoad);
    window.addEventListener('resize', resizeViewer);
    requestAnimationFrame(resizeViewer);

    return () => {
      if (viewerRef.current) {
        viewerRef.current.off('scenechange', syncScene);
        viewerRef.current.off('scenechangefadedone', handleLoad);
        viewerRef.current.off('load', handleLoad);
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      onViewerReady?.(null);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      window.removeEventListener('resize', resizeViewer);
    };
  }, [tourKey, escenasValidas.length, iniciarCargaEscena, finalizarCargaEscena, onViewerReady]);

  useEffect(() => {
    if (!activeSceneId || !escenasValidas.some((escena) => escena.id === activeSceneId)) {
      return;
    }

    if (escenaActualId === activeSceneId && viewerRef.current?.getScene?.() === activeSceneId) {
      return;
    }

    setEscenaActualId(activeSceneId);

    if (viewerRef.current?.getScene?.() !== activeSceneId) {
      iniciarCargaEscena();
      viewerRef.current?.loadScene?.(activeSceneId);
    }
  }, [activeSceneId, escenaActualId, escenasValidas, iniciarCargaEscena]);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!viewer || !containerRef.current || !editorMode || typeof onPanoramaClick !== 'function') {
      return undefined;
    }

    const viewerElement = containerRef.current;

    const handleViewerPointerDown = (event) => {
      if (event.button !== 0) {
        return;
      }

      if (event.target.closest?.('.tour360-hotspot, .pnlm-controls')) {
        return;
      }

      const coords = viewer.mouseEventToCoords?.(event);

      if (!Array.isArray(coords) || coords.length < 2) {
        return;
      }

      const correctedYaw = normalizeYaw(coords[1] + EDITOR_YAW_CORRECTION_DEGREES);

      onPanoramaClick({
        pitch: Number(coords[0].toFixed(6)),
        yaw: Number(correctedYaw.toFixed(6)),
        sceneId: viewer.getScene?.() || escenaActualId,
      });
    };

    viewerElement.addEventListener('mousedown', handleViewerPointerDown, true);

    return () => {
      viewerElement.removeEventListener('mousedown', handleViewerPointerDown, true);
    };
  }, [editorMode, escenaActualId, onPanoramaClick]);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!viewer) {
      return undefined;
    }

    if (editorMarkerIdRef.current) {
      try {
        viewer.removeHotSpot(editorMarkerIdRef.current);
      } catch (_) {
        // Pannellum throws if the hotspot was already removed during a scene change.
      }
      editorMarkerIdRef.current = null;
    }

    if (!editorMarker || editorMarker.sceneId !== escenaActualId) {
      return undefined;
    }

    const markerId = 'tour360-editor-marker-temp';
    editorMarkerIdRef.current = markerId;
    viewer.addHotSpot({
      id: markerId,
      pitch: editorMarker.pitch,
      yaw: editorMarker.yaw,
      type: 'info',
      text: 'Nuevo hotspot',
      cssClass: 'tour360-editor-marker-wrapper',
      createTooltipFunc: buildEditorMarkerTooltip,
    });

    return () => {
      if (editorMarkerIdRef.current) {
        try {
          viewer.removeHotSpot(editorMarkerIdRef.current);
        } catch (_) {
          // The viewer may have been destroyed or the scene may have changed.
        }
        editorMarkerIdRef.current = null;
      }
    };
  }, [editorMarker, escenaActualId]);

  if (!tour || !tour.escenas?.length) {
    return null;
  }

  if (escenasValidas.length === 0) {
    return (
      <div className="tour360-seccion">
        <div className="tour360-encabezado">
          <div className="tour360-encabezado-copy">
            <h2>Tour 360</h2>
            {tour.descripcion ? <p>{tour.descripcion}</p> : null}
          </div>
        </div>
        <div className="tour360-estado-error">
          No hay una imagen 360 valida para cargar el visor.
        </div>
      </div>
    );
  }

  const cambiarEscena = (direccion) => {
    if (!viewerRef.current || !tieneVariasEscenas || indiceEscenaActual === -1) {
      return;
    }

    const siguienteIndice = loopScenes
      ? (indiceEscenaActual + direccion + escenasValidas.length) % escenasValidas.length
      : indiceEscenaActual + direccion;
    const siguienteEscena = escenasValidas[siguienteIndice];

    if (!siguienteEscena || siguienteEscena.id === escenaActualId) {
      return;
    }

    iniciarCargaEscena();
    viewerRef.current.loadScene(siguienteEscena.id);
  };

  return (
    <div className="tour360-seccion">
      <div className="tour360-encabezado">
        <div className="tour360-encabezado-copy">
          <h2>Tour 360</h2>
          {tour.descripcion ? <p>{tour.descripcion}</p> : null}
        </div>
        <div className="tour360-encabezado-meta">
          {escenaActual ? (
            <div className="tour360-escena-actual" aria-live="polite">
              <span className="tour360-escena-label">Escena actual</span>
              <span className="tour360-escena-nombre">{escenaActual.nombre}</span>
              {tieneVariasEscenas && indiceEscenaActual >= 0 ? (
                <span className="tour360-escena-contador">
                  {indiceEscenaActual + 1} / {escenasValidas.length}
                </span>
              ) : null}
            </div>
          ) : null}
          {tieneVariasEscenas ? (
            <div className="tour360-acciones">
              <button
                type="button"
                className="tour360-nav-btn"
                onClick={() => cambiarEscena(-1)}
                aria-label="Escena anterior"
                disabled={cargandoEscena || (!loopScenes && indiceEscenaActual <= 0)}
              >
                <FaChevronLeft aria-hidden="true" />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                className="tour360-nav-btn"
                onClick={() => cambiarEscena(1)}
                aria-label="Siguiente escena"
                disabled={cargandoEscena || (!loopScenes && indiceEscenaActual >= escenasValidas.length - 1)}
              >
                <span>Siguiente</span>
                <FaChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className={`tour360-visor-shell ${editorMode ? 'is-editor-mode' : ''}`}>
        <div ref={containerRef} className="tour360-visor" />
        {editorMode ? (
          <div className="tour360-editor-instruction">
            Haz clic en la imagen para colocar el hotspot.
          </div>
        ) : null}
        {cargandoEscena ? (
          <div className="tour360-loading-overlay" aria-live="polite">
            <span className="tour360-loading-spinner" />
            <span className="tour360-loading-text">Cargando escena...</span>
          </div>
        ) : null}
      </div>

      {mensajeInfo ? (
        <div className="tour360-mensaje-info">
          <strong>Info:</strong> {mensajeInfo}
        </div>
      ) : null}
    </div>
  );
}
