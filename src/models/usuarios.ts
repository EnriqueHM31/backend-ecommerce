import { CheckearUsuario, InsertarUsuario } from '../utils/consultas/Usuario';
import { UsuarioValidation } from '../utils/validaciones/usuario';

export interface UsuarioData {
    usuario_id: string;
    nombre: string;
    correo: string;
    avatar?: string;
}

export interface UsuarioResponse {
    success: boolean;
    message: string;
    data?: any;
    creado?: boolean;
}

export class UsuariosModel {
    /**
     * Autentica o registra un usuario
     */
    static async autenticarUsuario(data: UsuarioData): Promise<UsuarioResponse> {
        try {
            const { usuario_id, nombre, correo } = data;

            // Validación con Zod
            const resultadoValidarUsuario = UsuarioValidation.RevisarUsuario({
                id: usuario_id,
                nombre,
                correo,
            });

            if (!resultadoValidarUsuario.success) {
                return {
                    success: false,
                    message: resultadoValidarUsuario.error.issues.map(err => err.message).join(", "),
                    creado: false
                };
            }

            // Revisar si ya existe el usuario
            const { existe } = await CheckearUsuario(usuario_id);

            if (!existe) {
                console.log('Creando usuario...');
                await InsertarUsuario(resultadoValidarUsuario.data.id, resultadoValidarUsuario.data.nombre, resultadoValidarUsuario.data.correo);

                return {
                    success: true,
                    creado: true,
                    message: 'Registro exitoso',
                    data: { usuario_id, nombre, correo }
                };
            } else {
                return {
                    success: true,
                    creado: false,
                    message: 'Usuario ya registrado',
                    data: { usuario_id, nombre, correo }
                };
            }

        } catch (error) {
            console.error("Error en autenticación:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Error al procesar la autenticación",
                data: null,
                creado: false
            };
        }
    }

    /**
     * Verifica si un usuario existe
     */
    static async verificarUsuario(usuario_id: string): Promise<boolean> {
        try {
            const { existe } = await CheckearUsuario(usuario_id);
            return existe;
        } catch (error) {
            console.error("Error al verificar usuario:", error);
            return false;
        }
    }

    /**
     * Crea un nuevo usuario
     */
    static async crearUsuario(data: UsuarioData): Promise<UsuarioResponse> {
        try {
            const { usuario_id, nombre, correo } = data;

            // Validación con Zod
            const resultadoValidarUsuario = UsuarioValidation.RevisarUsuario({
                id: usuario_id,
                nombre,
                correo,
            });

            if (!resultadoValidarUsuario.success) {
                return {
                    success: false,
                    message: resultadoValidarUsuario.error.issues.map(err => err.message).join(", "),
                    creado: false
                };
            }

            // Verificar si ya existe
            const existe = await this.verificarUsuario(usuario_id);
            if (existe) {
                return {
                    success: false,
                    message: 'El usuario ya existe',
                    creado: false
                };
            }

            // Crear usuario
            await InsertarUsuario(usuario_id, nombre, correo);

            return {
                success: true,
                creado: true,
                message: 'Usuario creado exitosamente',
                data: { usuario_id, nombre, correo }
            };

        } catch (error) {
            console.error("Error al crear usuario:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Error al crear el usuario",
                data: null,
                creado: false
            };
        }
    }
}
