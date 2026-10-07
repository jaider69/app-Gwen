# Instrucciones del Proyecto: Gwen

Este archivo establece las directrices y reglas permanentes de colaboración para el desarrollo y mantenimiento del proyecto Gwen.

## 1. Idioma
* **Respuestas y Explicaciones:** Siempre comunícate y responde en **español**. Todas las explicaciones, diagnósticos, planes de acción y respuestas en general deben redactarse en este idioma.
* **Nombres en el Código:** El código fuente (variables, funciones, componentes, clases, etc.) debe utilizar nombres en **inglés** cuando sea la práctica recomendada y estándar de la industria.
* **Comentarios de Código:** Los comentarios explicativos dentro del código fuente pueden estar en **español** para facilitar la comprensión de lógicas complejas.

## 2. Descripción del Proyecto
* **Nombre:** Gwen.
* **Naturaleza:** Aplicación móvil multiplataforma para la gestión y control de inventarios.
* **Estado Actual:** El proyecto cuenta con un desarrollo previo sustancial. 
  * **NO** se debe comenzar desde cero bajo ninguna circunstancia.
  * **NO** se deben eliminar funcionalidades existentes sin analizar previamente sus dependencias, integraciones y propósito.

## 3. Metodología y Forma de Trabajar
* **Análisis de Impacto:** Antes de modificar cualquier archivo de código, se deben inspeccionar minuciosamente todos los archivos relacionados con la tarea solicitada.
* **Comprensión del Contexto:** Es mandatorio comprender el funcionamiento actual de la aplicación antes de proponer cambios o refactorizaciones.
* **Reutilización:** Se deben reutilizar las utilidades, componentes, servicios y funcionalidades existentes tanto como sea posible.
* **Simplicidad:** Evitar la duplicación de código y el diseño de soluciones innecesariamente complejas o sobre-ingenieriles.
* **Consistencia Tecnológica:** Mantener rigurosamente la arquitectura de software actual y la pila tecnológica elegida (Expo, React Native, TypeScript, Supabase, SQLite, etc.), salvo que exista una justificación técnica de peso aprobada por el usuario.
* **Control de Calidad:** Tras realizar cualquier modificación, se debe verificar que no se hayan introducido regresiones u otros errores de compilación o ejecución. Si el proyecto cuenta con scripts de pruebas, linters (ESLint, Prettier) o verificación estática (TypeScript/tsc), se deben ejecutar para garantizar la estabilidad de la rama de desarrollo.

## 4. Flujo de Trabajo ante cada Tarea
Cuando se solicite una nueva tarea, se debe seguir el siguiente flujo de dos fases:

### Fase 1: Análisis y Planificación
Antes de modificar cualquier archivo, el asistente debe:
1. **Analizar el estado actual** del código relacionado.
2. **Identificar y listar** los archivos potencialmente afectados o involucrados.
3. **Explicar brevemente el plan de acción** (qué se va a hacer y por qué).

### Fase 2: Implementación y Verificación
Posterior al análisis, el asistente debe:
1. **Realizar los cambios** requeridos de manera quirúrgica y limpia.
2. **Verificar el resultado** mediante comprobaciones oportunas (compilación, pruebas, linting).
3. **Informar detalladamente** qué archivos fueron modificados y qué problemas específicos se solucionaron.

## 5. Regla de Oro sobre Funcionalidades Existentes
* **Nunca asumas** que una funcionalidad, componente o lógica no existe solo porque el usuario mencione que falta. 
* **Siempre verifica primero** el código fuente existente para comprobar si ya hay bases o implementaciones previas del comportamiento solicitado antes de programarlo de cero.

## 6. Seguridad y Buenas Prácticas
* **Protección de Credenciales:** Nunca expongas ni guardes en el código API keys, tokens de acceso, contraseñas, secretos, credenciales ni información sensible. Utiliza variables de entorno o mecanismos de almacenamiento seguro.
* **Integridad de Código:** No sobrescribas archivos de configuración ni lógicas críticas de la aplicación sin antes haber inspeccionado su contenido actual y comprendido su rol.
* **Prevención de Pérdida de Datos:** Nunca elimines datos de prueba, bases de datos o configuraciones existentes sin confirmación expresa del usuario cuando exista riesgo real de pérdida de información histórica o de desarrollo.
