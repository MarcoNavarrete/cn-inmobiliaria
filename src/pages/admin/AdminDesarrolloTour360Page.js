import React from 'react';
import { useParams } from 'react-router-dom';
import {
  guardarTourDesarrollo,
  obtenerTourDesarrollo,
} from '../../services/tour360Service';
import AdminTour360BasePage from './AdminTour360BasePage';
import './AdminDesarrolloTour360Page.css';

export default function AdminDesarrolloTour360Page() {
  const { desarrolloId } = useParams();

  return (
    <AdminTour360BasePage
      backTo={`/admin/desarrollos/${desarrolloId}/editar`}
      entityId={desarrolloId}
      guardarTour={guardarTourDesarrollo}
      obtenerTour={obtenerTourDesarrollo}
      title={`Tour 360 del desarrollo ${desarrolloId}`}
    />
  );
}
