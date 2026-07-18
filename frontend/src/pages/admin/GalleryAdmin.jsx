import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const categoryLabels = {
  hospedaje: "Hospedaje",
  habitaciones: "Habitaciones",
  servicios: "Servicios",
  turismo: "Turismo",
  pimentel: "Pimentel",
  general: "General",
};

const mediaTypeLabels = {
  image: "Imagen",
  video: "Video",
};

function getCategoryLabel(category) {
  return categoryLabels[category] || category || "General";
}

function getMediaTypeLabel(type) {
  return mediaTypeLabels[type] || type || "Contenido";
}

export default function GalleryAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingItemId, setEditingItemId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    media_type: "image",
    url: "",
    public_id: "",
    category: "hospedaje",
    is_featured: false,
  });

  async function loadGallery() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/gallery/admin");

      setItems(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      console.error("Error cargando galería:", err);
      setError("No se pudo cargar la galería.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGallery();
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setEditingItemId(null);

    setFormData({
      title: "",
      description: "",
      media_type: "image",
      url: "",
      public_id: "",
      category: "hospedaje",
      is_featured: false,
    });

    setError("");
    setSuccess("");
  }

  function handleEdit(item) {
    setEditingItemId(item.id);

    setFormData({
      title: item.title || "",
      description: item.description || "",
      media_type: item.media_type || "image",
      url: item.url || "",
      public_id: item.public_id || "",
      category: item.category || "hospedaje",
      is_featured: Boolean(item.is_featured),
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!formData.title.trim()) {
        setError("El título es obligatorio.");
        return;
      }

      if (!formData.url.trim()) {
        setError("La URL de imagen o video es obligatoria.");
        return;
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        media_type: formData.media_type,
        url: formData.url.trim(),
        public_id: formData.public_id.trim() || null,
        category: formData.category,
        is_featured: formData.is_featured,
      };

      if (editingItemId) {
        await api.put(`/gallery/${editingItemId}`, payload);
        setSuccess("Elemento actualizado correctamente.");
      } else {
        await api.post("/gallery", payload);
        setSuccess("Elemento agregado correctamente.");
      }

      resetForm();
      await loadGallery();
    } catch (err) {
      console.error("Error guardando galería:", err);

      const backendMessage = err.response?.data?.message;
      setError(backendMessage || "No se pudo guardar el elemento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(itemId) {
    const confirmDelete = window.confirm(
      "¿Seguro que deseas eliminar este elemento de la galería?"
    );

    if (!confirmDelete) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/gallery/${itemId}`);

      setSuccess("Elemento eliminado correctamente.");
      await loadGallery();
    } catch (err) {
      console.error("Error eliminando galería:", err);

      const backendMessage = err.response?.data?.message;
      setError(backendMessage || "No se pudo eliminar el elemento.");
    }
  }

  async function handleToggleFeatured(item) {
    try {
      setError("");
      setSuccess("");

      await api.put(`/gallery/${item.id}`, {
        title: item.title,
        description: item.description || null,
        media_type: item.media_type,
        url: item.url,
        public_id: item.public_id || null,
        category: item.category,
        is_featured: !item.is_featured,
      });

      setSuccess(
        item.is_featured
          ? "Elemento quitado de destacados."
          : "Elemento marcado como destacado."
      );

      await loadGallery();
    } catch (err) {
      console.error("Error actualizando destacado:", err);

      const backendMessage = err.response?.data?.message;
      setError(backendMessage || "No se pudo actualizar el destacado.");
    }
  }

  const stats = useMemo(() => {
    const featuredItems = items.filter((item) => item.is_featured);
    const imageItems = items.filter((item) => item.media_type === "image");
    const videoItems = items.filter((item) => item.media_type === "video");

    return {
      totalItems: items.length,
      featuredItems: featuredItems.length,
      imageItems: imageItems.length,
      videoItems: videoItems.length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      const matchesSearch =
        !term ||
        String(item.title || "").toLowerCase().includes(term) ||
        String(item.description || "").toLowerCase().includes(term) ||
        String(item.category || "").toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [items, searchTerm, categoryFilter]);

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <section className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="uppercase tracking-[0.25em] text-sm font-black text-brand-ocean">
              Panel administrativo
            </p>

            <h1 className="text-4xl md:text-5xl font-black text-brand-dark mt-2">
              Galería
            </h1>

            <p className="text-slate-600 mt-3">
              Administra imágenes y videos del hospedaje, habitaciones,
              servicios y turismo.
            </p>
          </div>

          <button
            type="button"
            onClick={loadGallery}
            className="bg-white border border-slate-200 text-brand-dark px-5 py-3 rounded-full font-black hover:bg-slate-100 transition"
          >
            Actualizar
          </button>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 font-bold">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl bg-green-50 border border-green-200 text-green-700 px-4 py-3 font-bold">
            {success}
          </div>
        )}

        {/* Métricas */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
          <article className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 font-bold">Total elementos</p>
            <h2 className="text-3xl font-black text-brand-dark mt-2">
              {stats.totalItems}
            </h2>
          </article>

          <article className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 font-bold">Destacados</p>
            <h2 className="text-3xl font-black text-yellow-600 mt-2">
              {stats.featuredItems}
            </h2>
          </article>

          <article className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 font-bold">Imágenes</p>
            <h2 className="text-3xl font-black text-blue-600 mt-2">
              {stats.imageItems}
            </h2>
          </article>

          <article className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 font-bold">Videos</p>
            <h2 className="text-3xl font-black text-purple-600 mt-2">
              {stats.videoItems}
            </h2>
          </article>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-slate-200 p-6 mt-8"
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-brand-dark">
                {editingItemId ? "Editar elemento" : "Agregar elemento"}
              </h2>

              <p className="text-slate-500 text-sm mt-1">
                Los elementos destacados pueden usarse para mostrar contenido
                principal en la web.
              </p>
            </div>

            {editingItemId && (
              <span className="inline-flex w-fit rounded-full bg-brand-gold text-brand-navy px-4 py-2 text-sm font-black">
                Editando elemento #{editingItemId}
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black tracking-widest text-brand-navy mb-2">
                TÍTULO
              </label>

              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ej: Fachada principal"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-brand-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-black tracking-widest text-brand-navy mb-2">
                CATEGORÍA
              </label>

              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-brand-gold"
              >
                <option value="hospedaje">Hospedaje</option>
                <option value="habitaciones">Habitaciones</option>
                <option value="servicios">Servicios</option>
                <option value="turismo">Turismo</option>
                <option value="pimentel">Pimentel</option>
                <option value="general">General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black tracking-widest text-brand-navy mb-2">
                TIPO
              </label>

              <select
                name="media_type"
                value={formData.media_type}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-brand-gold"
              >
                <option value="image">Imagen</option>
                <option value="video">Video</option>
              </select>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5">
              <input
                id="is_featured"
                type="checkbox"
                name="is_featured"
                checked={formData.is_featured}
                onChange={handleChange}
                className="w-4 h-4"
              />

              <label htmlFor="is_featured" className="font-black text-brand-dark">
                Mostrar como destacado
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black tracking-widest text-brand-navy mb-2">
                URL DE IMAGEN O VIDEO
              </label>

              <input
                type="text"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://res.cloudinary.com/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-brand-gold"
              />

              <p className="text-xs text-slate-500 mt-2">
                Por ahora pega la URL de Cloudinary o una URL pública. Luego se
                puede conectar subida directa.
              </p>
            </div>

            {formData.url && (
              <div className="md:col-span-2">
                <p className="text-xs font-black tracking-widest text-brand-navy mb-2">
                  VISTA PREVIA
                </p>

                <div className="w-full max-w-xl h-64 rounded-3xl overflow-hidden border border-slate-200 bg-slate-100">
                  {formData.media_type === "image" ? (
                    <img
                      src={formData.url}
                      alt={formData.title || "Vista previa"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                      Video registrado
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-black tracking-widest text-brand-navy mb-2">
                PUBLIC ID DE CLOUDINARY OPCIONAL
              </label>

              <input
                type="text"
                name="public_id"
                value={formData.public_id}
                onChange={handleChange}
                placeholder="casa-huespedes-pimentel/gallery/imagen..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-brand-gold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black tracking-widest text-brand-navy mb-2">
                DESCRIPCIÓN
              </label>

              <textarea
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe brevemente la imagen o video..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none resize-none focus:ring-2 focus:ring-brand-gold"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-ocean text-white px-6 py-3 rounded-full font-black hover:bg-brand-dark transition disabled:opacity-60"
            >
              {saving
                ? "Guardando..."
                : editingItemId
                ? "Actualizar elemento"
                : "Agregar a galería"}
            </button>

            {editingItemId && (
              <button
                type="button"
                onClick={resetForm}
                className="border border-slate-200 bg-white px-6 py-3 rounded-full font-black text-brand-dark hover:bg-slate-100 transition"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>

        {/* Filtros */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 mt-8">
          <div className="grid lg:grid-cols-[1fr_260px] gap-4">
            <div>
              <label className="block text-xs font-black tracking-widest text-brand-navy mb-2">
                BUSCAR ELEMENTO
              </label>

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por título, descripción o categoría..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-brand-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-black tracking-widest text-brand-navy mb-2">
                FILTRAR CATEGORÍA
              </label>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-brand-gold"
              >
                <option value="all">Todas</option>
                <option value="hospedaje">Hospedaje</option>
                <option value="habitaciones">Habitaciones</option>
                <option value="servicios">Servicios</option>
                <option value="turismo">Turismo</option>
                <option value="pimentel">Pimentel</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          <p className="text-sm text-slate-500 mt-3">
            Mostrando {filteredItems.length} de {items.length} elemento(s).
          </p>
        </div>

        {/* Lista */}
        <div className="mt-8">
          {loading && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center font-bold text-slate-500">
              Cargando galería...
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
              <h2 className="text-2xl font-black text-brand-dark">
                Aún no hay elementos en la galería
              </h2>

              <p className="text-slate-500 mt-2">
                Agrega la primera imagen o video usando el formulario superior.
              </p>
            </div>
          )}

          {!loading && items.length > 0 && filteredItems.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
              <h2 className="text-2xl font-black text-brand-dark">
                No se encontraron elementos
              </h2>

              <p className="text-slate-500 mt-2">
                Prueba con otro título, descripción o categoría.
              </p>
            </div>
          )}

          {!loading && filteredItems.length > 0 && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-soft transition"
                >
                  <div className="h-56 bg-slate-100 relative">
                    {item.media_type === "image" ? (
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                        Video registrado
                      </div>
                    )}

                    {item.is_featured && (
                      <span className="absolute top-4 left-4 bg-brand-gold text-brand-navy px-4 py-2 rounded-full text-xs font-black">
                        Destacado
                      </span>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-xl text-brand-dark">
                          {item.title || "Sin título"}
                        </h3>

                        <p className="text-xs text-slate-500 mt-1 font-bold">
                          {getCategoryLabel(item.category)} ·{" "}
                          {getMediaTypeLabel(item.media_type)}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mt-4 line-clamp-2">
                      {item.description || "Sin descripción"}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-6">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="bg-brand-ocean text-white px-4 py-2 rounded-full text-xs font-black hover:bg-brand-dark transition"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(item)}
                        className="border border-slate-200 px-4 py-2 rounded-full text-xs font-black text-brand-dark hover:bg-slate-100 transition"
                      >
                        {item.is_featured ? "Quitar destacado" : "Destacar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="col-span-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-full text-xs font-black hover:bg-red-100 transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}