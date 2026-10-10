# Implementaciones pendientes para `main`

Este documento es el inventario vivo de funcionalidades que existen en
`feature/general-controls-and-mixer` y no forman parte de la rama oficial.

## Referencia

- Rama de trabajo: `feature/general-controls-and-mixer`
- Rama oficial comparada: `origin/main`
- Referencia revisada: `ac112f8` (`2026-10-10`)
- Base común de las ramas: `5f88d98`

La rama oficial contiene cambios posteriores a la base común. Antes de llevar
cualquiera de estos elementos a `main`, hay que rebasar esta rama o preparar
cherry-picks y resolver sus conflictos contra el estado actual de `origin/main`.

## Implementaciones confirmadas

| Estado    | Implementación                                           | Origen    | Alcance antes de integrar                                                                                                                                                                                                                                 |
| --------- | -------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pendiente | Controles ampliados de reproducción y ambiente por clima | `f8cb1a1` | Capas ambientales secuenciales, previsualización, modos de una sola reproducción/secuencia, volumen de música por clima, reordenamiento de climas y detección/reubicación de audio local faltante. Incluye cambios de IPC, remoto, exportación y pruebas. |
| Pendiente | Mezclador global y controles de audio en vivo            | `ba1069d` | Mezclador por categorías, panel Live/sonidos activos, control de capas ambientales y sincronización con el remoto. Incluye UI de escritorio y remoto, motor de audio, IPC y pruebas.                                                                      |
| Pendiente | Limpieza de atajos al borrar un sonido de la soundboard  | `7c5ed3f` | Elimina correctamente la asignación de tecla del sonido borrado; incluye prueba unitaria.                                                                                                                                                                 |
| Pendiente | Controles ambientales adicionales                        | `49818df` | Extiende el motor y las tarjetas de clima para controles ambientales, exportación y estado. Algunos cambios se solapan con `f8cb1a1`; deben integrarse como una serie, no como funcionalidades aisladas.                                                  |
| Pendiente | Búsqueda en la campaña activa                            | `d957bda` | Búsqueda de climas, pistas, capas y sonidos de la campaña activa, con componente, utilidades y pruebas.                                                                                                                                                   |

## Trabajo local sin commit

Estas modificaciones están presentes en el árbol de trabajo al redactar este
inventario. No deben llevarse a `main` hasta que se separen, revisen y tengan
commits propios.

| Estado   | Implementación                          | Alcance observado                                                                                                                                    |
| -------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| En curso | Tema claro para escritorio              | Selector persistente en la barra lateral, paleta CSS intercambiable, notificaciones, QR e indicador de normalización adaptados. No aplica al remoto. |
| En curso | Mejoras del panel Live                  | Agrupa música, ambiente y SFX; muestra clip activo, orden de inicio y progreso de reproducciones temporizadas.                                       |
| En curso | Pausar/reanudar desde tarjetas de clima | La tarjeta activa cambia entre pausar y reanudar; los demás climas siguen activándose normalmente.                                                   |
| En curso | Sin límite máximo de climas             | Permite crear y duplicar climas más allá de la paleta predefinida, reutilizando colores.                                                             |
| En curso | Restablecer posiciones de clima         | Añade la acción para olvidar posiciones de reproducción guardadas antes de futuras activaciones.                                                     |
| En curso | Atajo `/` para buscar                   | Abre y enfoca la búsqueda de la campaña activa desde el panel Live.                                                                                  |

## Cómo mantener este inventario

Al terminar una implementación en esta rama:

1. Añadir una fila con su commit y una descripción orientada a la integración.
2. Mover una fila de **En curso** a **Pendiente** sólo cuando tenga pruebas y un commit propio.
3. Tras integrarla en `main`, cambiar su estado a **Integrado** e incluir el commit o PR de destino.
4. Actualizar la referencia de `origin/main` después de comparar con la rama remota actualizada.
