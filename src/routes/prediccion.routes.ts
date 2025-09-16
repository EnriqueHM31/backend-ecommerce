import { Router } from 'express';
import { PrediccionController } from '../controllers/prediccion';

export const PrediccionRouter = Router();

// Endpoints principales
PrediccionRouter.post('/prediccion', PrediccionController.prediccion);
PrediccionRouter.get('/prediccion/info', PrediccionController.info);
PrediccionRouter.post('/prediccion/populares', PrediccionController.populares);

// Endpoints de entrenamiento
PrediccionRouter.post('/prediccion/entrenar', PrediccionController.entrenar); // Síncrono
PrediccionRouter.post('/prediccion/entrenar-async', PrediccionController.entrenarAsync); // Asíncrono

// Endpoints de gestión de entrenamiento
PrediccionRouter.get('/prediccion/estado', PrediccionController.estadoEntrenamiento); // Estado general
PrediccionRouter.get('/prediccion/estado/:jobId', PrediccionController.estadoEntrenamiento); // Estado específico
PrediccionRouter.delete('/prediccion/cancelar/:jobId', PrediccionController.cancelarEntrenamiento); // Cancelar
