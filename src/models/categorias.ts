import { supabase } from "../database/db";

export class ModeloCategorias {

    static async ListarCategorias() {
        try {
            const { data, error } = await supabase.from('categorias').select('*');

            if (error) {
                return { success: false, message: error.message };
            }

            return { success: true, data: data, message: 'Categorias obtenidas correctamente' };
        } catch (error) {
            return { success: false, message: error };
        }
    }

    static async CrearCategoria(nombre: string) {
        try {
            const { data: categoria, error } = await supabase
                .from('categorias')
                .insert([{ nombre }])  // nota que va dentro de un array de objetos
                .select('*');

            if (error) {
                return { success: false, categoria, message: error.message };
            }

            return { success: true, data: categoria, message: 'Categoria creada correctamente' };
        } catch (error) {
            return { success: false, message: error };
        }
    }

    static async ModificarCategoria(id: number, nombre: string) {
        try {
            console.log(id, nombre);
            const { data: categoria, error } = await supabase
                .from('categorias')
                .update({ nombre })
                .eq('id_categoria', id)
                .select('*');

            if (error) {
                return { success: false, categoria, message: error.message };
            }

            return { success: true, data: categoria, message: 'Categoria modificada correctamente' };
        } catch (error) {
            return { success: false, message: error };
        }
    }

    static async EliminarCategoria(id: number) {
        try {
            const { data: categoria, error } = await supabase
                .from('categorias')
                .delete()
                .eq('id_categoria', id)
                .select('*');

            if (error) {
                return { success: false, categoria, message: error.message };
            }

            return { success: true, data: categoria, message: 'Categoria eliminada correctamente' };
        } catch (error) {
            return { success: false, message: error };
        }
    }
}