import { supabase } from '../database/db'

export class ModeloProductos {
  static async ListarProductos() {
    console.log('Listar productos')

    try {
      const { data: productos, error } = await supabase
        .from('productos_sku')
        .select(`
              id,
              sku,
              precio,
              stock,
              imagen_url,
              productos_base (
                id,
                nombre,
                descripcion,
                marca,
                categorias (
                  nombre
                )
              ),
              variantes (
                id,
                nombre_variante,
                procesador,
                display,
                camara,
                bateria,
                conectividad,
                sistema_operativo
              ),
              colores (
                nombre
              ),
              almacenamientos (
                capacidad
              ),
              especificaciones_ram (
                capacidad,
                tipo
              )
            `)


      if (error) throw error

      return {
        success: true,
        message: 'Productos obtenidos correctamente',
        data: productos
      }
    } catch (error: any) {
      console.error('Error al obtener productos:', error)
      return {
        success: false,
        message: error.message || 'Error al obtener los productos',
        data: []
      }
    }
  }
}
