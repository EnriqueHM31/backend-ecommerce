import { Router } from 'express';

import { CategoriasController } from '../controllers/categorias';

const RouterCategorias = Router();

RouterCategorias.get('/', CategoriasController.obtenerCategorias);

RouterCategorias.post('/', CategoriasController.crearCategoria);

RouterCategorias.put('/', CategoriasController.modificarCategoria);

RouterCategorias.delete('/', CategoriasController.eliminarCategoria);

export default RouterCategorias;