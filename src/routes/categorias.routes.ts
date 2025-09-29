import { Router } from 'express';

import { CategoriasController } from '../controllers/categorias';

const RouterCategorias = Router();

RouterCategorias.get('/', CategoriasController.obtenerCategorias);

export default RouterCategorias;