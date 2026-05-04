import React from 'react';
import { useParams } from 'react-router-dom';
import {
  guardarTourModelo,
  obtenerTourModelo,
} from '../../services/tour360Service';
import AdminTour360BasePage from './AdminTour360BasePage';
import './AdminModeloTour360Page.css';

export default function AdminModeloTour360Page() {
  const { desarrolloId, modeloId } = useParams();

  return (
    <AdminTour360BasePage
      backTo={`/admin/desarrollos/${desarrolloId}/modelos`}
      entityId={modeloId}
      guardarTour={guardarTourModelo}
      obtenerTour={obtenerTourModelo}
      title={`Tour 360 del modelo ${modeloId}`}
    />
  );
}
