import { Router } from 'express';

import { TecnicosController } from '../controllers/tecnicos';

const RouterTecnicos = Router();

RouterTecnicos.get('/', TecnicosController.obtenerTecnicos);

export default RouterTecnicos;