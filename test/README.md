# Tests del Backend E-commerce

Este directorio contiene los tests unitarios para el backend del e-commerce.

## Estructura

```
test/
├── controllers/          # Tests para controladores
│   └── pedidos.test.ts   # Tests del controlador de pedidos
├── utils/                # Tests para utilidades
│   └── validaciones.test.ts # Tests de validaciones
├── __mocks__/            # Mocks para testing
│   ├── supabase.ts       # Mock de Supabase
│   └── @/database/db.ts  # Mock del módulo de DB
├── setup.ts              # Configuración global de tests
├── tsconfig.json         # Configuración TypeScript para tests
└── README.md             # Este archivo
```

## Scripts Disponibles

- `npm test` - Ejecutar todos los tests
- `npm run test:watch` - Ejecutar tests en modo watch
- `npm run test:coverage` - Ejecutar tests con reporte de cobertura

## Tests Incluidos

### Controlador de Pedidos (5 tests)
1. **crearPedido sin checkout_session_id** - Valida error 400 cuando falta el ID de sesión
2. **crearPedido exitoso** - Valida creación exitosa de pedido
3. **crearPedido duplicado** - Valida manejo de pedidos duplicados
4. **crearPedido con error** - Valida manejo de errores del modelo
5. **obtenerPedidosPorId** - Valida obtención de pedidos por usuario
6. **actualizarCompraEstado** - Valida actualización de estado de pedido

### Validaciones Utils (3 tests)
1. **CartItemsValidation** - Valida items del carrito (cantidad válida/inválida)
2. **UsuarioValidation** - Valida datos de usuario (campos requeridos)
3. **validarComentario** - Valida comentarios (nombre y mensaje requeridos)

## Configuración

Los tests utilizan:
- **Jest** como framework de testing
- **ts-jest** para soporte de TypeScript
- **Supertest** para testing de APIs (instalado pero no utilizado en estos tests básicos)
- **Mocks** para aislar las dependencias externas

## Ejecutar Tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar con cobertura
npm run test:coverage
```
# Análisis de Tests en la Carpeta `test`

## Descripción General
Esta carpeta contiene las pruebas unitarias y de integración para la API de backend-ecommerce. El objetivo principal de estos tests es asegurar la calidad, robustez y confiabilidad de las funcionalidades implementadas en la API.

## Herramientas Utilizadas
- **Jest**: Framework principal para la ejecución de pruebas en el entorno Node.js. Permite realizar pruebas unitarias, de integración y mocks de dependencias.
- **Mocks personalizados**: Se han creado mocks en la carpeta `__mocks__` para simular dependencias externas como Supabase y otros módulos, facilitando pruebas aisladas y controladas.

## Pruebas Realizadas
- **Controladores**: Se han testeado los controladores de pedidos y productos (`controllers/pedidos.test.ts`, `controllers/productos.test.ts`) para verificar el correcto funcionamiento de las rutas y la lógica de negocio.
- **Utilidades**: Se han realizado pruebas sobre funciones de validación (`utils/validaciones.test.ts`) para asegurar que los datos procesados cumplen con los requisitos esperados.

## Beneficios para la API
- **Prevención de errores**: Los tests permiten detectar errores antes de que el código llegue a producción, reduciendo el riesgo de fallos en el servicio.
- **Facilitan el mantenimiento**: Al contar con una base de pruebas, es más sencillo realizar cambios y refactorizaciones sin temor a romper funcionalidades existentes.
- **Mejoran la calidad del software**: Garantizan que las funcionalidades clave de la API se comportan como se espera bajo diferentes escenarios.
- **Documentación viva**: Los tests sirven como referencia para entender el comportamiento esperado de cada módulo y función.

## Ejecución de Pruebas
Para ejecutar los tests, utiliza el siguiente comando en la raíz del proyecto:

```bash
npm test
```

Esto ejecutará todas las pruebas definidas en la carpeta `test` utilizando Jest.

---
Si tienes dudas sobre algún test específico, revisa los archivos dentro de la carpeta para ver ejemplos y casos cubiertos.
