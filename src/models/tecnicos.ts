import { supabase } from "../database/db";
export class ModeloTecnicos {
    static async ListarTecnicos() {
        try {
            const { data: dataProductosBase, error: errorProductosBase } = await supabase.from('productos_base').select('*');
            const { data: dataVariantes, error: errorVariantes } = await supabase.from('variantes').select('*');
            const { data: dataColores, error: errorColors } = await supabase.from('colores').select('*');
            const { data: dataRams, error: errorRams } = await supabase.from('especificaciones_ram').select('*');
            const { data: dataAlmacenamientos, error: errorAlmacenamientos } = await supabase.from('almacenamientos').select('*');



            if (errorVariantes || errorColors || errorRams || errorAlmacenamientos || errorProductosBase) {
                return { success: false, message: 'Error al obtener los datos de los productos' };
            }

            console.log(dataProductosBase, dataVariantes, dataColores, dataRams, dataAlmacenamientos);

            return { success: true, data: { dataProductosBase, dataVariantes, dataColores, dataRams, dataAlmacenamientos }, message: 'Productos obtenidos correctamente' };
        } catch (error) {
            return { success: false, message: error };
        }
    }
}