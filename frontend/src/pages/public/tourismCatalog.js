const museumGalleryModules = import.meta.glob(
  "../../assets/gallery/museo-*.{jpg,jpeg,png,webp}",
  { eager: true, import: "default" },
);

function getMuseumGalleryImage(fileName) {
  const galleryEntry = Object.entries(museumGalleryModules).find(([path]) =>
    path.endsWith(`/${fileName}`),
  );
  return galleryEntry?.[1] || "";
}

function commonsImage(fileName, width = 1600) {
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(
    fileName,
  )}?width=${width}`;
}

function commonsFile(fileName) {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`;
}

const places = [
  {
    id: "muelle-pimentel",
    title: "Muelle de Pimentel",
    category: "Imperdible",
    description:
      "El ícono costero de Pimentel: una caminata sobre el Pacífico, historia portuaria y uno de los mejores puntos para ver caer el sol.",
    image: commonsImage("Muelle De Pimentel.jpg", 1700),
    source: commonsFile("Muelle De Pimentel.jpg"),
    credit: "José Enrique Montes Seminario · CC BY-SA 4.0",
    feature: true,
  },
  {
    id: "playa-pimentel",
    title: "Playa de Pimentel",
    category: "Mar y descanso",
    description:
      "Arena, brisa y un horizonte abierto para caminar, descansar y vivir la costa norte a pocos pasos del malecón.",
    image: commonsImage("Playa y muelle de Pimentel.jpg", 1700),
    source: commonsFile("Playa y muelle de Pimentel.jpg"),
    credit: "Frank Coronel Mendoza · CC BY-SA 4.0",
  },
  {
    id: "caballitos-totora",
    title: "Caballitos de Totora",
    category: "Tradición",
    description:
      "Embarcaciones ancestrales que siguen conectando a los pescadores con el mar y con una tradición viva del norte peruano.",
    image: commonsImage("Totoras in Chiclayo.JPG", 1600),
    source: commonsFile("Totoras in Chiclayo.JPG"),
    credit: "Uli von Oben · CC BY-SA 4.0",
  },
  {
    id: "malecon-pimentel",
    title: "Malecón de Pimentel",
    category: "Paseo",
    description:
      "Un recorrido junto al mar entre espacios para descansar, restaurantes, vistas abiertas y el ritmo cotidiano del balneario.",
    image: commonsImage("Pimentel beachpromenade.JPG", 1600),
    source: commonsFile("Pimentel beachpromenade.JPG"),
    credit: "Catatine · CC BY-SA 4.0",
  },
  {
    id: "pesca-artesanal",
    title: "Pesca artesanal",
    category: "Identidad",
    description:
      "Una escena que resume la relación histórica de Pimentel con el océano y la vida de quienes trabajan frente al mar.",
    image: commonsImage("Pescado Fresco - caballito totora.jpg", 1500),
    source: commonsFile("Pescado Fresco - caballito totora.jpg"),
    credit: "Miguel Vera León · CC BY 2.0",
  },
  {
    id: "atardeceres-pimentel",
    title: "Atardeceres frente al mar",
    category: "Experiencia",
    description:
      "La hora dorada transforma la playa y el muelle en una de las postales más memorables de la costa lambayecana.",
    image: commonsImage("Sunset in Pimentel, Peru.jpg", 1600),
    source: commonsFile("Sunset in Pimentel, Peru.jpg"),
    credit: "Pete Cable · CC BY 2.0",
  },
  {
    id: "casa-museo-quinones",
    title: "Casa Museo José Abelardo Quiñones",
    category: "Cultura",
    description:
      "La casa museo de Pimentel conserva ambientes, objetos y recuerdos vinculados al héroe de la aviación peruana José Abelardo Quiñones Gonzales.",
    image: "https://consultasenlinea.mincetur.gob.pe/fichaInventario/foto.aspx?cod=555332",
    source: "https://consultasenlinea.mincetur.gob.pe/fichaInventario/index.aspx?cod_Ficha=3781",
    credit: "MINCETUR · Inventario Nacional de Recursos Turísticos",
  },
  {
    id: "playa-las-rocas",
    title: "Playa Las Rocas",
    category: "Naturaleza",
    description:
      "Un rincón de la costa de Pimentel con formaciones rocosas, brisa marina y una atmósfera más tranquila para contemplar el paisaje.",
    image: "https://consultasenlinea.mincetur.gob.pe/fichaInventario/foto.aspx?cod=555297",
    source: "https://consultasenlinea.mincetur.gob.pe/fichaInventario/foto.aspx?cod=555297",
    credit: "MINCETUR · Inventario Nacional de Recursos Turísticos",
  },
];

const museumMap = getMuseumGalleryImage("museo-mapa-lambayeque.png");

const museums = [
  {
    id: "tumbas-reales-sipan",
    title: "Museo Tumbas Reales de Sipán",
    location: "Lambayeque",
    description:
      "Un museo de referencia mundial para conocer el legado del Señor de Sipán y la extraordinaria orfebrería mochica.",
    image: commonsImage("Tumbas Reales de Sipán Museum 01.jpg", 1400),
    source: commonsFile("Tumbas Reales de Sipán Museum 01.jpg"),
    credit: "Bernard Gagnon · CC BY-SA 3.0",
    brochure: getMuseumGalleryImage("museo-tumbas-reales-sipan.png"),
    officialUrl: "https://museos.cultura.pe/node/385",
  },
  {
    id: "museo-sitio-tucume",
    title: "Museo de Sitio Túcume",
    location: "Túcume",
    description:
      "El punto de entrada al Valle de las Pirámides y a siglos de continuidad cultural Lambayeque, Chimú e Inca.",
    image: commonsImage("Museo de Sitio, Túcume.jpg", 1400),
    source: commonsFile("Museo de Sitio, Túcume.jpg"),
    credit: "Bernard Gagnon · CC BY-SA 3.0",
    brochure: getMuseumGalleryImage("museo-sitio-tucume.png"),
    officialUrl: "https://museos.cultura.pe/museos/museo-de-sitio-t%C3%BAcume",
  },
  {
    id: "museo-bruning",
    title: "Museo Arqueológico Nacional Brüning",
    location: "Lambayeque",
    description:
      "Colecciones de cerámica, metales y objetos que recorren el desarrollo cultural del norte peruano.",
    image: commonsImage("Brüning Museum.jpg", 1400),
    source: commonsFile("Brüning Museum.jpg"),
    credit: "Bernard Gagnon · CC BY-SA 3.0",
    brochure: getMuseumGalleryImage("museo-arqueologico-bruning.png"),
    officialUrl:
      "https://museos.cultura.pe/museos/museo-arqueol%C3%B3gico-nacional-br%C3%BCning",
  },
  {
    id: "museo-sican",
    title: "Museo Nacional Sicán",
    location: "Ferreñafe",
    description:
      "Una visita para descubrir la cultura Sicán, su tecnología metalúrgica, sus símbolos y sus contextos funerarios.",
    image: commonsImage("Museo Nacional Sicán en Ferreñafe.jpg", 1400),
    source: commonsFile("Museo Nacional Sicán en Ferreñafe.jpg"),
    credit: "Ozesama · CC BY-SA 4.0",
    brochure: getMuseumGalleryImage("museo-nacional-sican.png"),
    officialUrl: "https://museos.cultura.pe/museos/museo-nacional-sic%C3%A1n",
  },
];

const dishes = [
  {
    id: "ceviche",
    title: "Ceviche de pescado",
    category: "Cocina marina",
    description: "Pescado, limón, cebolla y ají: frescura costera en cada bocado.",
    image: commonsImage("Ceviche Perú.jpg", 1300),
    source: commonsFile("Ceviche Perú.jpg"),
    credit: "Gatodemichi · CC BY-SA 4.0",
  },
  {
    id: "arroz-mariscos",
    title: "Arroz con mariscos",
    category: "Cocina marina",
    description: "Arroz sazonado y mariscos en una receta abundante y llena de sabor.",
    image: commonsImage("Arroz con mariscos.JPG", 1300),
    source: commonsFile("Arroz con mariscos.JPG"),
    credit: "Wikimedia Commons · Chiclayo, Lambayeque",
  },
  {
    id: "chinguirito",
    title: "Chinguirito",
    category: "Tradición lambayecana",
    description:
      "Pescado seco deshilachado, limón, cebolla y ají: una preparación profundamente norteña.",
    image: commonsImage("Chinguimixto.JPG", 1300),
    source: commonsFile("Chinguimixto.JPG"),
    credit: "Dtarazona · dominio público · la foto incluye una porción de chinguirito",
  },
  {
    id: "tortilla-raya",
    title: "Tortilla de raya",
    category: "Tradición lambayecana",
    description: "Raya seca, huevo y sazón norteña en uno de los platos más singulares de la región.",
    image: commonsImage("Tortilla de raya.JPG", 1300),
    source: commonsFile("Tortilla de raya.JPG"),
    credit: "Dtarazona · dominio público",
  },
  {
    id: "arroz-pato",
    title: "Arroz con pato",
    category: "Cocina regional",
    description: "El clásico chiclayano de arroz verde, culantro y pato con sazón del norte.",
    image: commonsImage("Arroz con pato a la chiclayana.JPG", 1300),
    source: commonsFile("Arroz con pato a la chiclayana.JPG"),
    credit: "Dtarazona · dominio público",
  },
  {
    id: "seco-cabrito",
    title: "Seco de cabrito",
    category: "Cocina regional",
    description: "Cabrito guisado con sabor intenso, acompañado tradicionalmente de arroz y frejoles.",
    image: commonsImage("Seco de Cabrito.JPG", 1300),
    source: commonsFile("Seco de Cabrito.JPG"),
    credit: "Dtarazona · dominio público",
  },
];

export { places, museums, dishes, museumMap, commonsImage, commonsFile };
