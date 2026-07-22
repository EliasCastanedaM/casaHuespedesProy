const gallerySections = [
  {
    id: "lugares",
    eyebrow: "Mar, historia y tradición",
    title: "Descubre Pimentel",
    description:
      "Conoce los principales atractivos de este histórico balneario de Lambayeque, donde la tradición pesquera convive con el mar y sus inolvidables atardeceres.",
    images: [
      {
        id: "caballitos-totora",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Caballitos de totora navegando en el mar de Pimentel",
        title: "Caballitos de Totora",
        category: "Tradición",
        description:
          "Embarcaciones artesanales de origen ancestral que todavía son utilizadas por los pescadores de Pimentel.",
      },
      {
        id: "muelle-pimentel",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Muelle histórico de Pimentel frente al océano Pacífico",
        title: "Muelle de Pimentel",
        category: "Historia",
        description:
          "Uno de los principales símbolos del balneario y un lugar privilegiado para contemplar el mar.",
      },
      {
        id: "playa-pimentel",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Playa de Pimentel en Lambayeque",
        title: "Playa de Pimentel",
        category: "Naturaleza",
        description:
          "Una extensa playa de arena ideal para caminar, descansar y disfrutar del paisaje de la costa norte.",
      },
      {
        id: "malecon-pimentel",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Malecón turístico de Pimentel",
        title: "Malecón de Pimentel",
        category: "Paseo",
        description:
          "Un agradable recorrido frente al mar rodeado de restaurantes, viviendas tradicionales y espacios para descansar.",
      },
      {
        id: "playa-las-rocas",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Playa Las Rocas en el distrito de Pimentel",
        title: "Playa Las Rocas",
        category: "Naturaleza",
        description:
          "Un rincón costero de Pimentel que combina formaciones rocosas, brisa marina y paisajes naturales.",
      },
      {
        id: "casa-museo-quinones",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Casa Museo del capitán FAP José Abelardo Quiñones en Pimentel",
        title: "Casa Museo José Quiñones",
        category: "Cultura",
        description:
          "Casa natal del héroe de la aviación peruana José Abelardo Quiñones, convertida en un espacio histórico y cultural.",
      },
      {
        id: "pesca-artesanal",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Pescadores artesanales trabajando en la playa de Pimentel",
        title: "Pesca artesanal",
        category: "Identidad",
        description:
          "Una actividad que mantiene viva la relación histórica entre los habitantes de Pimentel y el océano.",
      },
      {
        id: "atardecer-pimentel",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Atardecer frente al mar en Pimentel",
        title: "Atardeceres frente al mar",
        category: "Experiencia",
        description:
          "El muelle, la playa y el horizonte crean uno de los paisajes más especiales de la costa lambayecana.",
      },
    ],
  },
  {
    id: "gastronomia",
    eyebrow: "Sabores del norte",
    title: "Gastronomía de Pimentel y Lambayeque",
    description:
      "La cercanía al mar y la tradición culinaria lambayecana ofrecen platos preparados con pescados, mariscos e ingredientes característicos del norte peruano.",
    images: [
      {
        id: "ceviche",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Ceviche de pescado preparado en Pimentel",
        title: "Ceviche de pescado",
        category: "Cocina marina",
        description:
          "Pescado fresco marinado con limón, cebolla y ají, acompañado con los sabores tradicionales de la costa norte.",
      },
      {
        id: "arroz-mariscos",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Arroz con mariscos de la gastronomía de Pimentel",
        title: "Arroz con mariscos",
        category: "Cocina marina",
        description:
          "Un plato abundante preparado con arroz sazonado y una variedad de mariscos frescos.",
      },
      {
        id: "chinguirito",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Chinguirito tradicional de Lambayeque",
        title: "Chinguirito",
        category: "Tradición lambayecana",
        description:
          "Especialidad norteña elaborada tradicionalmente con pescado seco deshilachado, limón, cebolla y ají.",
      },
      {
        id: "tortilla-raya",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Tortilla de raya tradicional de Lambayeque",
        title: "Tortilla de raya",
        category: "Tradición lambayecana",
        description:
          "Preparación emblemática de la cocina costera elaborada con raya seca, huevos y condimentos.",
      },
      {
        id: "arroz-pato",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Arroz con pato a la chiclayana",
        title: "Arroz con pato",
        category: "Cocina regional",
        description:
          "Uno de los platos bandera de Lambayeque, reconocido por su arroz verde con culantro y su sazón norteña.",
      },
      {
        id: "seco-cabrito",
        src: "", // PEGA AQUÍ EL LINK DE LA FOTO
        alt: "Seco de cabrito tradicional de Lambayeque",
        title: "Seco de cabrito",
        category: "Cocina regional",
        description:
          "Guiso tradicional norteño servido generalmente con frejoles, arroz y yuca.",
      },
    ],
  },
];

export default function Gallery() {
  return (
    <main className="pimentel-gallery-page">
      <section className="gallery-hero">
        <div className="gallery-hero-overlay" />

        <div className="gallery-hero-content">
          <span>Casa Huéspedes Pimentel</span>

          <h1>Conoce la esencia de Pimentel</h1>

          <p>
            Tradición, historia, mar y gastronomía en uno de los balnearios
            más representativos de Lambayeque.
          </p>
        </div>
      </section>

      {gallerySections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="hotel-gallery-section"
        >
          <div className="hotel-gallery-heading">
            <span>{section.eyebrow}</span>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </div>

          <div className="hotel-gallery-grid">
            {section.images.map((image) => (
              <article className="hotel-gallery-card" key={image.id}>
                <div className="hotel-gallery-image">
                  {image.src ? (
                    <img
                      src={image.src}
                      alt={image.alt}
                      loading="lazy"
                    />
                  ) : (
                    <div className="gallery-image-placeholder">
                      <span>Agrega la fotografía</span>
                      <small>{image.title}</small>
                    </div>
                  )}

                  <div className="hotel-gallery-overlay" />

                  <div className="hotel-gallery-information">
                    <span>{image.category}</span>
                    <h3>{image.title}</h3>
                    <p>{image.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}