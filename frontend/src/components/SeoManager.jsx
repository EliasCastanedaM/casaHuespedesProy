import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://www.casahuespedespimentel.com";
const DEFAULT_IMAGE = `${SITE_URL}/img/galeria/galeria-1.jpg`;

const pageMetadata = {
  "/": {
    title:
      "Casa Huéspedes Pimentel | Hospedaje cerca de la playa en Pimentel",
    description:
      "Casa Huéspedes Pimentel: hospedaje en Pimentel, Lambayeque, cerca de la playa. Habitaciones matrimoniales, dobles, triples y familiares.",
  },
  "/habitaciones": {
    title: "Habitaciones en Pimentel | Casa Huéspedes Pimentel",
    description:
      "Conoce nuestras habitaciones matrimoniales, dobles, triples y familiares en Pimentel. Consulta disponibilidad para tus fechas.",
  },
  "/reservar": {
    title: "Reservar hospedaje en Pimentel | Casa Huéspedes Pimentel",
    description:
      "Consulta disponibilidad y realiza tu solicitud de reserva en Casa Huéspedes Pimentel, cerca de la playa de Pimentel.",
  },
  "/servicios": {
    title: "Servicios del hospedaje | Casa Huéspedes Pimentel",
    description:
      "Conoce los servicios disponibles en Casa Huéspedes Pimentel para disfrutar una estadía cómoda en Pimentel, Lambayeque.",
  },
  "/galeria": {
    title: "Galería | Casa Huéspedes Pimentel",
    description:
      "Conoce en fotos y videos las habitaciones, espacios y experiencias de Casa Huéspedes Pimentel, cerca de la playa.",
  },
  "/turismo": {
    title: "Qué hacer en Pimentel | Turismo, playa y gastronomía",
    description:
      "Descubre qué hacer en Pimentel: playa, muelle, gastronomía y atractivos de Lambayeque durante tu estadía en Casa Huéspedes Pimentel.",
  },
  "/contacto": {
    title: "Contacto y ubicación | Casa Huéspedes Pimentel",
    description:
      "Contacta a Casa Huéspedes Pimentel y consulta información para tu estadía en Pimentel, Lambayeque.",
  },
  "/politica-privacidad": {
    title: "Política de privacidad | Casa Huéspedes Pimentel",
    description:
      "Consulta la política de privacidad de Casa Huéspedes Pimentel.",
  },
  "/terminos-y-condiciones": {
    title: "Términos y condiciones | Casa Huéspedes Pimentel",
    description:
      "Consulta los términos y condiciones de Casa Huéspedes Pimentel.",
  },
  "/eliminacion-datos": {
    title: "Eliminación de datos | Casa Huéspedes Pimentel",
    description:
      "Información para solicitar la eliminación de datos en Casa Huéspedes Pimentel.",
  },
};

function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
}

function getMetadata(pathname) {
  if (pageMetadata[pathname]) {
    return pageMetadata[pathname];
  }

  if (pathname.startsWith("/habitaciones/")) {
    return {
      title: "Habitación en Pimentel | Casa Huéspedes Pimentel",
      description:
        "Conoce fotografías, características y disponibilidad de nuestras habitaciones en Casa Huéspedes Pimentel.",
    };
  }

  return pageMetadata["/"];
}

function ensureMeta(attribute, key, content) {
  let element = document.head.querySelector(
    `meta[${attribute}="${key}"]`
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function ensureCanonical(href) {
  let canonical = document.head.querySelector('link[rel="canonical"]');

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }

  canonical.setAttribute("href", href);
}

export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const pathname = normalizePath(location.pathname);
    const metadata = getMetadata(pathname);
    const shouldNoIndex =
      pathname.startsWith("/admin") ||
      pathname === "/pago-resultado";

    const canonicalPath = pathname === "/" ? "" : pathname;
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;

    document.title = metadata.title;

    ensureMeta("name", "description", metadata.description);
    ensureMeta(
      "name",
      "robots",
      shouldNoIndex
        ? "noindex,nofollow"
        : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
    );

    ensureMeta("property", "og:title", metadata.title);
    ensureMeta("property", "og:description", metadata.description);
    ensureMeta("property", "og:url", canonicalUrl);
    ensureMeta("property", "og:type", "website");
    ensureMeta("property", "og:locale", "es_PE");
    ensureMeta("property", "og:site_name", "Casa Huéspedes Pimentel");
    ensureMeta("property", "og:image", DEFAULT_IMAGE);
    ensureMeta(
      "property",
      "og:image:alt",
      "Casa Huéspedes Pimentel en Pimentel, Lambayeque"
    );

    ensureMeta("name", "twitter:card", "summary_large_image");
    ensureMeta("name", "twitter:title", metadata.title);
    ensureMeta("name", "twitter:description", metadata.description);
    ensureMeta("name", "twitter:image", DEFAULT_IMAGE);

    ensureCanonical(canonicalUrl);
  }, [location.pathname]);

  return null;
}
