import { obtenerStripe } from '../constants/Stripe';
import { supabase } from '../database/db';
import { CartItem } from '../types/producto';
import { disminuirStock, obtenerCompras, restaurarStock } from '../utils/consultas/compras';

export interface PedidoItem {
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
}

export interface CrearPedidoData {
    user_id: string;
    cart_items: Array<{ id: string; quantity: number }>;
    direccion_envio: Domicilio;
    referencias: string;
    checkout_session_id: string;
}

export interface PedidoResponse {
    success: boolean;
    message: string;
    data?: any;
}

export interface DomicilioResponse {
    success: boolean;
    message: string;
    data?: string;
}

export interface Domicilio {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
}

export interface dataCrearPedido {
    user_id: string;
    cart_items: Array<{ id: CartItem; quantity: number }>;
    direccion_envio: Domicilio;
    checkout_session_id: string;
}

export class PedidosModel {
    /**
     * Crea un nuevo pedido con validaciones de stock y usuario
     */
    static async crearPedido(data: CrearPedidoData): Promise<PedidoResponse> {
        const { checkout_session_id } = data;

        const stripe = obtenerStripe();
        try {
            // 1. Verificar si ya existe pedido para esa sesión
            const { data: pedidoExistente, error: errorBuscar } = await supabase
                .from('pedidos')
                .select('id')
                .eq('id', checkout_session_id)
                .single();

            if (pedidoExistente && !errorBuscar) {
                return {
                    success: true,
                    message: 'Pedido ya existía, no se duplicó',
                    data: { pedido_id: pedidoExistente.id }
                };
            }

            const session = await stripe.checkout.sessions.retrieve(checkout_session_id, {
                expand: ['line_items', 'customer']
            });

            const line_items = session.metadata?.carrito;

            // 2. Verificar usuario
            const { data: usuario, error: errorUsuario } = await supabase
                .from('usuarios')
                .select('id_usuario')
                .eq('id_usuario', session.metadata?.customer_id)
                .single();

            if (errorUsuario || !usuario) {
                return {
                    success: false,
                    message: 'Usuario no encontrado'
                };
            }

            console.log({ hola: JSON.parse(line_items ?? '[]') })

            // 3. Obtener todos los productos de una sola vez
            const productIds = JSON.parse(line_items ?? '[]').map((i: { producto_id: string }) => i.producto_id);

            console.log({ productIds })
            const { data: productosDB, error: errorProductosDB } = await supabase
                .from('productos_sku')
                .select('id, sku, precio, stock')
                .in('id', productIds);

            if (errorProductosDB || !productosDB) {
                return {
                    success: false,
                    message: 'Error al obtener productos'
                };
            }

            console.log({ productosDB })

            // 4. Validar stock y preparar items
            const { total, itemsProcesados, error: errorValidacion } = await this.validarStockYPrepararItems(JSON.parse(line_items ?? '[]'), productosDB);

            if (errorValidacion) {
                return {
                    success: false,
                    message: errorValidacion
                };
            }

            console.log({ itemsProcesados })
            console.log({ total })

            const line1 = session.customer_details?.address?.line1;
            const line2 = session.customer_details?.address?.line2;
            const city = session.customer_details?.address?.city;
            const state = session.customer_details?.address?.state;
            const postal_code = session.customer_details?.address?.postal_code;
            const country = session.customer_details?.address?.country;
            const user_id = session.metadata?.customer_id;

            if (!line1 || !line2 || !city || !state || !postal_code || !country || !user_id) {
                return {
                    success: false,
                    message: 'Error al obtener datos de cliente'
                };
            }

            // 5. Insertar el domicilio
            const { data: domicilio_id } = await this.InsertarDomicilio(line1, line2, city, state, postal_code, country, user_id);

            console.log({ domicilio_id });
            // 5. Crear el pedido principal
            const { data: pedido, error: errorPedido } = await supabase
                .from('pedidos')
                .insert([
                    {
                        id: checkout_session_id,
                        usuario_id: user_id,
                        direccion_envio_id: domicilio_id,
                        total,
                    }
                ])
                .select('id')
                .single();

            if (errorPedido) throw errorPedido;
            const pedido_id = pedido.id;

            console.log({ pedido });

            // 6. Insertar items
            const { error: errorItems } = await supabase.from('pedido_items').insert(
                itemsProcesados.map(item => ({
                    pedido_id,
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario,
                    subtotal: item.subtotal
                }))
            );
            if (errorItems) throw errorItems;

            // 7. Disminuir stock de cada producto
            await this.actualizarStockProductos(itemsProcesados);

            return {
                success: true,
                message: 'Pedido creado exitosamente',
                data: {
                    pedido_id,
                    total: total.toFixed(2),
                    items_count: itemsProcesados.length,
                    estado: 'pendiente'
                }
            };

        } catch (error) {
            console.error('Error al crear pedido:', error);
            return {
                success: false,
                message: 'Error interno del servidor'
            };
        }
    }

    /**
     * Valida stock y prepara los items del pedido
     */
    private static async validarStockYPrepararItems(
        cart_items: Array<{ producto_id: string; cantidad: number }>,
        productosDB: any[]
    ): Promise<{ total: number; itemsProcesados: PedidoItem[]; error?: string }> {
        let total = 0;
        const itemsProcesados: PedidoItem[] = [];

        for (const item of cart_items) {
            const producto_db = productosDB.find(p => p.id === item.producto_id);
            if (!producto_db) {
                return { total: 0, itemsProcesados: [], error: `Producto no válido: ${item.producto_id}` };
            }

            const cantidad = item.cantidad;

            // Verificación de stock
            if (cantidad > producto_db.stock) {
                return {
                    total: 0,
                    itemsProcesados: [],
                    error: `Stock insuficiente para ${producto_db.sku}. Disponible: ${producto_db.stock}, Solicitado: ${cantidad}`
                };
            }

            const precio_unitario = parseFloat(Number(producto_db.precio).toFixed(2));
            const subtotal = precio_unitario * cantidad;
            total += subtotal;

            itemsProcesados.push({
                producto_id: producto_db.id,
                cantidad: cantidad,
                precio_unitario,
                subtotal,
            });
        }

        return { total, itemsProcesados };
    }

    private static async InsertarDomicilio(line1: string, line2: string, city: string, state: string, postal_code: string, country: string, usuario_id: string): Promise<DomicilioResponse> {


        const { data, error } = await supabase
            .from('direcciones')
            .insert([{
                usuario_id,
                direccion_1: line1,
                direccion_2: line2,
                ciudad: city,
                estado: state,
                codigo_postal: postal_code,
                pais: country
            }])
            .select('id_direccion')
            .single();

        if (error) throw error;
        if (!data) throw new Error('Error al insertar domicilio: resultado vacío');

        return { success: true, message: 'Domicilio creado exitosamente', data: data.id_direccion };

    }

    /**
     * Actualiza el stock de los productos después de crear el pedido
     */
    private static async actualizarStockProductos(itemsProcesados: PedidoItem[]): Promise<void> {
        await Promise.all(itemsProcesados.map(async i => {
            // Obtener stock actual
            const { data: producto, error: err } = await supabase
                .from('productos_sku')
                .select('stock')
                .eq('id', i.producto_id)
                .single();

            if (err || !producto) {
                console.error(`No se pudo actualizar stock para ${i.producto_id}`);
                return;
            }

            // Restar cantidad
            const nuevoStock = producto.stock - i.cantidad;

            const { error: stockError } = await supabase
                .from('productos_sku')
                .update({ stock: nuevoStock })
                .eq('id', i.producto_id);

            if (stockError) console.error(`Error al actualizar stock producto ${i.producto_id}:`, stockError);
        }));
    }

    /**
     * Obtiene pedidos por ID de usuario
     */
    static async obtenerPedidosPorUsuario(user_id: string): Promise<PedidoResponse> {
        try {
            const { pedidos } = await obtenerCompras(user_id);
            return {
                success: true,
                message: 'Pedidos obtenidos correctamente',
                data: pedidos
            };
        } catch (error) {
            console.error('Error al obtener pedidos del usuario:', error);
            return {
                success: false,
                message: 'Error al obtener pedidos'
            };
        }
    }

    /**
     * Actualiza el estado de un pedido
     */
    static async actualizarEstadoPedido(pedido_id: number, nuevo_estado: string): Promise<PedidoResponse> {
        const estados_validos = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];

        try {
            // Validación de estado
            if (!nuevo_estado || !estados_validos.includes(nuevo_estado)) {
                return {
                    success: false,
                    message: 'Estado no válido',
                    data: { estados_validos }
                };
            }

            // 1. Obtener estado actual del pedido
            const { data: pedido, error: errorPedido } = await supabase
                .from('pedidos')
                .select('estado')
                .eq('id', pedido_id)
                .single();

            if (errorPedido || !pedido) {
                return {
                    success: false,
                    message: 'Pedido no encontrado'
                };
            }

            const estado_actual = pedido.estado;

            // 2. Si pasa de pendiente → confirmado, reducir stock
            if (estado_actual === 'pendiente' && nuevo_estado === 'confirmado') {
                await disminuirStock(pedido_id);
            }

            // 3. Si pasa de confirmado → cancelado, restaurar stock
            if (estado_actual === 'confirmado' && nuevo_estado === 'cancelado') {
                await restaurarStock(pedido_id);
            }

            // 4. Actualizar estado del pedido
            const { error: errorUpdate } = await supabase
                .from('pedidos')
                .update({ estado: nuevo_estado })
                .eq('id', pedido_id);

            if (errorUpdate) throw errorUpdate;

            return {
                success: true,
                message: `Estado del pedido actualizado a: ${nuevo_estado}`,
                data: {
                    pedido_id,
                    estado_anterior: estado_actual,
                    estado_nuevo: nuevo_estado
                }
            };
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            return {
                success: false,
                message: 'Error interno del servidor'
            };
        }
    }


    static async obtenerTodosLosPedidos() {
        try {
            const { data, error } = await supabase
                .from("pedidos")
                .select(`
              id,
              fecha_pedido,
              estado,
              total,
              direcciones (
                  direccion_1,
                  direccion_2,
                  ciudad,
                  estado,
                  codigo_postal,
                  pais
              ),
              pedido_items (
                  id,
                  producto_id,
                  cantidad,
                  precio_unitario,
                  subtotal
              ),
              usuarios (
                  id_usuario,
                  nombre,
                  correo
              )
            `);
            console.log({ data })

            const pedidosConHoraLocal = data?.map(pedido => ({
                ...pedido,
                fecha_pedido: new Date(pedido.fecha_pedido + 'Z').toLocaleString('es-MX', {
                    timeZone: 'America/Mexico_City'
                })
            }));




            if (error) throw error;

            return { success: true, data: pedidosConHoraLocal, message: "Pedidos obtenidos con éxito" };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    static async updateEstadoPedido(pedido_id: string, nuevo_estado: string): Promise<PedidoResponse> {
        const estados_validos = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];

        try {
            // Validación de estado
            if (!nuevo_estado || !estados_validos.includes(nuevo_estado)) {
                return {
                    success: false,
                    message: 'Estado no válido',
                    data: { estados_validos }
                };
            }

            // 1. Obtener estado actual del pedido
            const { data: pedido, error: errorPedido } = await supabase
                .from('pedidos')
                .select('estado')
                .eq('id', pedido_id)
                .single();

            if (errorPedido || !pedido) {
                return {
                    success: false,
                    message: 'Pedido no encontrado'
                };
            }
            const estado_actual = pedido.estado;


            // 4. Actualizar estado del pedido
            const { error: errorUpdate } = await supabase
                .from('pedidos')
                .update({ estado: nuevo_estado })
                .eq('id', pedido_id);

            if (errorUpdate) throw errorUpdate;

            return {
                success: true,
                message: `Estado del pedido actualizado a: ${nuevo_estado}`,
                data: {
                    pedido_id,
                    estado_anterior: estado_actual,
                    estado_nuevo: nuevo_estado
                }
            };
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            return {
                success: false,
                message: 'Error interno del servidor'
            };
        }
    }
}
