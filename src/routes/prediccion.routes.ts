import { Router } from 'express';
import { PrediccionController } from '../controllers/prediccion';

export const PrediccionRouter = Router();

// Endpoints
PrediccionRouter.post('/prediccion', PrediccionController.prediccion);
PrediccionRouter.get('/prediccion/info', PrediccionController.info);
PrediccionRouter.post('/prediccion/entrenar', PrediccionController.entrenar);
