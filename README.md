# Ps. Iván Oda — sitio web

Sitio publicado: https://www.psivanoda.cl/

Sitio estático HTML, CSS y JavaScript. GitHub Pages publica la raíz de main en el dominio del archivo CNAME (www.psivanoda.cl). Los cambios incorporados a main se publican automáticamente.

## Colaborar

1. Crear una rama para cada cambio (o un fork si no tienes permiso de escritura).
2. Editar los archivos y revisar la página en escritorio y móvil.
3. Abrir un pull request explicando qué cambia y cómo se comprobó.
4. Revisar y fusionar a main para publicar.

Usar Issues para errores y propuestas, indicando página, resultado esperado y captura si ayuda. No incluir datos de pacientes ni credenciales: el repositorio es público.

## Estructura

- index.html: portada.
- terapia/, valores/, saber-mas/: secciones.
- prevencion-del-suicidio-y-urgencias.html: recursos de urgencia.
- styles.css, site.js, assets/: estilos, interacción e imágenes.
- robots.txt, sitemap.xml: indexación en buscadores. Al agregar o quitar una página, actualizar sitemap.xml.

Los enlaces internos son relativos. Las URL absolutas (canonical, Open Graph, datos estructurados, sitemap) usan https://www.psivanoda.cl/, con www: https://psivanoda.cl sin www no tiene certificado HTTPS válido. Todas las páginas son indexables (index, follow).

Tras cambiar styles.css o site.js, subir el parámetro ?v= en todas las páginas para que los navegadores no usen la versión en caché.

## Entrega a otro asistente

Compartir el enlace del repositorio y el objetivo del cambio. Trabajar sobre la versión actual y conservar las rutas relativas. Validar navegación, imágenes, menú móvil y selector de tema antes de proponer cambios.
