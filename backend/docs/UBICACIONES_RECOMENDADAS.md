# Ubicaciones de recomendaciones turísticas

Las listas se presentan numeradas, con nombre y dirección, separadas por espacios.
La selección inicial de restaurantes de Pimentel incluye un único enlace de Google
Maps que abre las cuatro fichas juntas (shortlist). Se comprobó el 17/11/2026 en
Google Maps: La Tintorera, Bertika's, La Tienda del Pato y Picantería del Mar.

Los identificadores placeId corresponden a esas fichas exactas. El enlace agrupa
solo la selección mostrada, sin generar un recorrido ni añadir lugares distintos.
No requiere llamadas al modelo ni a una API de pago.

Una consulta de un lugar concreto conserva su enlace individual. Si una selección
incluye un lugar sin placeId verificado, conserva los enlaces individuales; nunca
se omite un sitio ni se afirma que todos están marcados cuando faltan fichas.
Las direcciones incompletas conservan su nota de confirmación pendiente.

Documentación oficial:
https://developers.google.com/maps/documentation/urls/get-started#create-a-shortlist

Fuentes de identificación:
- La Tintorera: ficha de Google Maps, Manuel Seoane 733, CID 0x904cfac1233c95cf:0x3b97229a17d1fd0b.
- Bertika's: https://pe.todosnegocios.com/bertikas-979-732-537 (mapa de la ficha).
- La Tienda del Pato: https://wanderlog.com/place/details/11886652/la-tienda-del-pato
- Picantería del Mar: https://wanderlog.com/place/details/3250515/picanteria-del-mar
