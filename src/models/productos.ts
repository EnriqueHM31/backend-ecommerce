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
              active,
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

  static async topProductos() {
    console.log('Listar top 5 productos más vendidos');

    try {
      // Llamamos a la función SQL
      const { data: topIds, error: errorTop } = await supabase
        .rpc('top_productos');

      if (errorTop) throw errorTop;
      if (!topIds || topIds.length === 0)
        return { success: true, message: 'No hay productos vendidos', data: [] };

      console.log({ topIds });
      const productoIds = topIds.map((p: any) => p.producto_id);



      // Traer todos los datos de esos productos
      const { data: productos, error: errorProductos } = await supabase
        .from('productos_sku')
        .select(`
        id,
        sku,
        stock,
        imagen_url,
        active,
        precio,
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
        .in('id', productoIds)
        .eq('active', true);


      if (errorProductos) throw errorProductos;

      // Unir total_vendido
      const productosConTotal = productos.map((p: any) => {
        const total_vendido = topIds.find((t: any) => t.producto_id === p.id)?.total_vendido || 0;
        return { ...p, total_vendido };
      });

      return {
        success: true,
        message: 'Top 5 productos más vendidos obtenidos correctamente',
        data: productosConTotal
      };
    } catch (error: any) {
      console.error('Error al obtener productos:', error);
      return {
        success: false,
        message: error.message || 'Error al obtener los productos',
        data: []
      };
    }
  }

  static async ListarProductosActivos() {
    console.log('Listar productos activos')
    try {
      const { data: productos, error } = await supabase
        .from('productos_sku')
        .select(`
              id,
              sku,
              precio,
              stock,
              imagen_url,
              active,
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
        .eq('active', true)

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
