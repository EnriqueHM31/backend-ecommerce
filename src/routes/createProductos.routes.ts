import { Router } from 'express';

import { CreateProductosController } from '../controllers/createProductos';

const RouterCreateProductos = Router();

RouterCreateProductos.post('/', CreateProductosController.createProductosSku);

export default RouterCreateProductos;