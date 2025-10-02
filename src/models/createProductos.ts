
import { supabase } from "../database/db";
export class ModeloCreateProductos {
  static async createProductos(
    sku: string,
    producto_base_id: number,
    variante_id: number,
    color_id: number,
    almacenamiento_id: number,
    ram_id: number,
    stock: number,
    imagen_url: string,
    precio: number
  ) {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('productos_sku')
        .select('id')
        .eq('sku', sku)
        .maybeSingle();


      if (checkError) {
        return { success: false, message: checkError.message };
      }

      if (existing) {
        return { success: false, message: `Ese producto con esas caracteristicas ya existe` };
      }

      // 2️⃣ Insertar nuevo producto
      const { data: productos, error } = await supabase
        .from('productos_sku')
        .insert([
          {
            sku,
            producto_base_id,
            variante_id,
            color_id,
            almacenamiento_id,
            ram_id,
            stock,
            imagen_url,
            precio,
          },
        ])
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
        .single(); // 👈 trae solo el recién insertado


      if (error) {
        return { success: false, productos, message: error.message };
      }

      return { success: true, data: productos, message: 'Producto creado correctamente' };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }

  static async deleteProductosSku(id: string) {
    try {
      // 1️⃣ Obtener el producto por id
      const { data: producto, error: fetchError } = await supabase
        .from('productos_sku')
        .select('id, active')
        .eq('id', id)
        .single(); // obtener solo un registro

      if (fetchError) {
        return { success: false, message: fetchError.message };
      }
      if (!producto) {
        return { success: false, message: 'Producto no encontrado' };
      }
      // 2️⃣ Cambiar el valor de active al contrario
      const nuevoEstado = !producto.active;

      // 3️⃣ Actualizar el registro
      const { data: updated, error: updateError } = await supabase
        .from('productos_sku')
        .update({ active: nuevoEstado })
        .eq('id', id)
        .select('id, active');

      if (updateError) throw updateError;

      return { success: true, data: updated, message: 'Producto actualizado correctamente' };
    } catch (error) {
      console.error('Error al cambiar estado del producto:', error);
      throw error;
    }
  }


}   