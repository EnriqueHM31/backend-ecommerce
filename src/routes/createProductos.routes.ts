import { Router } from 'express';

import { CreateProductosController } from '../controllers/createProductos';

const RouterCreateProductos = Router();

RouterCreateProductos.post('/productos-sku', CreateProductosController.createProductosSku);

RouterCreateProductos.put('/productos-sku/:id', CreateProductosController.deleteProductosSku);

export default RouterCreateProductos;