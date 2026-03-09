

# Plan: Optimizar visualización de imágenes de espectaculares

## Problema actual

Las imágenes usan `object-cover` en la galería del detalle, lo que recorta las fotos. Para espectaculares/pantallas digitales, esto puede cortar el producto que se está vendiendo. Además, fotos con aspect ratios variados generan espacios vacíos o recortes agresivos.

## Enfoque

Usar una estrategia de **imagen con fondo difuminado (blurred backdrop)** — la imagen se muestra completa (`object-contain`) sobre una versión borrosa de sí misma como fondo (`object-cover` + `blur`). Esto elimina barras grises/negras y evita recortes.

## Cambios

### 1. `ImageGallery.tsx` — Galería del detalle
- Reemplazar cada `<img>` en el grid por un contenedor con dos capas:
  - **Capa fondo**: misma imagen con `object-cover`, `blur-2xl`, `scale-110`, `opacity-60` — rellena todo el espacio sin bordes vacíos
  - **Capa principal**: imagen con `object-contain` centrada — muestra la foto completa sin recorte
- Aplicar lo mismo en el lightbox (single image view) y en la vista "todas las fotos"
- Esto cubre los layouts de 1, 2, 3 y 4+ imágenes

### 2. `SearchResultCard.tsx` — Tarjetas de búsqueda
- Aplicar la misma técnica de blurred backdrop en el contenedor de imagen `h-48`
- Mantener el carousel con flechas y dots existente

### 3. `OwnerPropertyCard.tsx` y `PropertyListItem.tsx` — Dashboard del propietario
- Verificar si usan `object-cover` y aplicar el mismo patrón donde corresponda

## Resultado esperado
- Las imágenes nunca se recortan — el espectacular/pantalla siempre se ve completo
- No hay espacios grises/negros — el fondo difuminado rellena naturalmente
- No hay pixelación — la imagen principal mantiene su resolución nativa
- Funciona con cualquier aspect ratio de foto subida por el usuario

