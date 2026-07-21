import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const statusLabels = {
  active: "Activa",
  inactive: "Inactiva",
  maintenance: "Mantenimiento",
};

function formatMoney(value) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function getStatusLabel(status) {
  return statusLabels[status] || status || "Sin estado";
}

function getStatusClass(status) {
  if (status === "active") {
    return "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]";
  }

  if (status === "inactive") {
    return "bg-[#f8fafc] text-[#475569] border-[#e2e8f0]";
  }

  if (status === "maintenance") {
    return "bg-[#fff7ed] text-[#9a5b13] border-[#fed7aa]";
  }

  return "bg-[#f8fafc] text-[#475569] border-[#e2e8f0]";
}

function getMediaUrl(media) {
  if (typeof media === "string") return media;

  return (
    media?.url ||
    media?.media_url ||
    media?.secure_url ||
    media?.image_url ||
    media?.video_url ||
    ""
  );
}

function getMediaType(media) {
  const declaredType = String(
    media?.media_type || media?.type || media?.resource_type || ""
  ).toLowerCase();

  if (declaredType.includes("video")) return "video";
  if (declaredType.includes("image") || declaredType.includes("photo")) {
    return "image";
  }

  return /\.(mp4|webm|mov|m4v|avi)(?:\?|$)/i.test(getMediaUrl(media))
    ? "video"
    : "image";
}

function normalizeMediaList(payload) {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) {
    return data.map((media, index) => ({
      ...(typeof media === "string" ? { url: media } : media),
      _localKey:
        media?.id ?? media?.public_id ?? `${getMediaType(media)}-${index}`,
    }));
  }

  const normalizeGroup = (items, type) =>
    (Array.isArray(items) ? items : []).map((media, index) => ({
      ...(typeof media === "string" ? { url: media } : media),
      media_type: media?.media_type || media?.type || type,
      _localKey: media?.id ?? media?.public_id ?? `${type}-${index}`,
    }));

  return [
    ...normalizeGroup(data?.images || data?.photos, "image"),
    ...normalizeGroup(data?.videos, "video"),
  ];
}

export default function RoomsAdmin() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingRoomId, setEditingRoomId] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState({
    roomId: null,
    type: null,
  });
  const [mediaManager, setMediaManager] = useState({
    isOpen: false,
    room: null,
    items: [],
  });
  const [loadingRoomMedia, setLoadingRoomMedia] = useState(false);
  const [deletingMediaKey, setDeletingMediaKey] = useState(null);
  const [deletingCoverRoomId, setDeletingCoverRoomId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity: 1,
    price_per_night: "",
    status: "active",
    main_image_url: "",
  });

  async function loadRooms() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/rooms/admin");

      setRooms(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      console.error("Error cargando habitaciones:", err);
      setError("No se pudieron cargar las habitaciones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialRooms() {
      try {
        const response = await api.get("/rooms/admin");

        if (!cancelled) {
          setRooms(Array.isArray(response.data.data) ? response.data.data : []);
        }
      } catch (err) {
        console.error("Error cargando habitaciones:", err);

        if (!cancelled) {
          setError("No se pudieron cargar las habitaciones.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialRooms();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function resetForm() {
    setEditingRoomId(null);

    setFormData({
      name: "",
      description: "",
      capacity: 1,
      price_per_night: "",
      status: "active",
      main_image_url: "",
    });

    setError("");
    setSuccess("");
  }

  function handleEdit(room) {
    setEditingRoomId(room.id);

    setFormData({
      name: room.name || "",
      description: room.description || "",
      capacity: room.capacity || 1,
      price_per_night: room.price_per_night || "",
      status: room.status || "active",
      main_image_url: room.main_image_url || "",
    });

    setSuccess("");
    setError("");

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

      if (!formData.name.trim()) {
        setError("El nombre de la habitaciÃ³n es obligatorio.");
        return;
      }

      if (!formData.price_per_night || Number(formData.price_per_night) < 0) {
        setError("El precio por noche es obligatorio y no puede ser negativo.");
        return;
      }

      if (!formData.capacity || Number(formData.capacity) < 1) {
        setError("La capacidad debe ser como mÃ­nimo 1 persona.");
        return;
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        capacity: Number(formData.capacity),
        price_per_night: Number(formData.price_per_night),
        status: formData.status,
        main_image_url: formData.main_image_url.trim() || null,
      };

      if (editingRoomId) {
        await api.put(`/rooms/${editingRoomId}`, payload);
        setSuccess("HabitaciÃ³n actualizada correctamente.");
      } else {
        await api.post("/rooms", payload);
        setSuccess("HabitaciÃ³n creada correctamente.");
      }

      resetForm();
      await loadRooms();
    } catch (err) {
      console.error("Error guardando habitaciÃ³n:", err);

      const backendMessage = err.response?.data?.message;
      setError(backendMessage || "No se pudo guardar la habitaciÃ³n.");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickStatusChange(room, newStatus) {
    try {
      setError("");
      setSuccess("");

      await api.put(`/rooms/${room.id}`, {
        name: room.name,
        description: room.description || null,
        capacity: Number(room.capacity),
        price_per_night: Number(room.price_per_night),
        status: newStatus,
        main_image_url: room.main_image_url || null,
      });

      setSuccess("Estado de habitaciÃ³n actualizado correctamente.");
      await loadRooms();
    } catch (err) {
      console.error("Error actualizando estado de habitaciÃ³n:", err);
      setError("No se pudo actualizar el estado de la habitaciÃ³n.");
    }
  }

  async function handleImageUpload(roomId, file) {
    try {
      if (!file) return;

      setError("");
      setSuccess("");
      setUploadingMedia({ roomId, type: "cover" });

      const formDataImage = new FormData();
      formDataImage.append("image", file);

      await api.post(`/rooms/${roomId}/image`, formDataImage, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccess("Portada actualizada correctamente.");
      await loadRooms();
    } catch (err) {
      console.error("Error subiendo portada:", err);

      const backendMessage = err.response?.data?.message;
      setError(backendMessage || "No se pudo subir la portada.");
    } finally {
      setUploadingMedia({ roomId: null, type: null });
    }
  }

  async function handleMultipleMediaUpload(roomId, fileList, mediaType) {
    const files = Array.from(fileList || []);

    if (files.length === 0) return;

    try {
      setError("");
      setSuccess("");
      setUploadingMedia({ roomId, type: mediaType });

      const formDataMedia = new FormData();

      files.forEach((file) => {
        formDataMedia.append("files", file);
      });

      const endpoint =
        mediaType === "images"
          ? `/rooms/${roomId}/images`
          : `/rooms/${roomId}/videos`;

      const response = await api.post(endpoint, formDataMedia, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccess(
        response.data?.message ||
          `${files.length} archivo(s) subido(s) correctamente.`
      );

      await loadRooms();
    } catch (err) {
      console.error(`Error subiendo ${mediaType}:`, err);

      const backendMessage = err.response?.data?.message;
      setError(
        backendMessage ||
          (mediaType === "images"
            ? "No se pudieron subir las fotos."
            : "No se pudieron subir los videos.")
      );
    } finally {
      setUploadingMedia({ roomId: null, type: null });
    }
  }

  async function loadRoomMedia(room) {
    try {
      setLoadingRoomMedia(true);
      setError("");

      const response = await api.get(`/rooms/${room.id}/media`);
      const items = normalizeMediaList(response.data);

      setMediaManager((prev) => ({
        ...prev,
        room,
        items,
      }));
    } catch (err) {
      console.error("Error cargando fotos y videos:", err);

      const backendMessage = err.response?.data?.message;
      setError(
        backendMessage ||
          "No se pudieron cargar las fotos y videos de la habitaciÃ³n."
      );
    } finally {
      setLoadingRoomMedia(false);
    }
  }

  async function openMediaManager(room) {
    setSuccess("");
    setError("");
    setMediaManager({
      isOpen: true,
      room,
      items: [],
    });

    await loadRoomMedia(room);
  }

  function closeMediaManager() {
    if (deletingMediaKey || loadingRoomMedia) return;

    setMediaManager({
      isOpen: false,
      room: null,
      items: [],
    });
  }

  async function handleDeleteMedia(media) {
    const room = mediaManager.room;
    const mediaId = media?.id;

    if (!room || !mediaId) {
      setError(
        "Este archivo no tiene un identificador vÃ¡lido y no se puede eliminar."
      );
      return;
    }

    const mediaType = getMediaType(media);
    const confirmed = window.confirm(
      `Â¿Seguro que deseas eliminar este ${
        mediaType === "video" ? "video" : "foto"
      }? Esta acciÃ³n no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      const mediaKey = media._localKey ?? mediaId;

      setDeletingMediaKey(mediaKey);
      setError("");
      setSuccess("");

      await api.delete(`/rooms/${room.id}/media/${mediaId}`);

      setMediaManager((prev) => ({
        ...prev,
        items: prev.items.filter(
          (item) => (item._localKey ?? item.id) !== mediaKey
        ),
      }));

      setSuccess(
        mediaType === "video"
          ? "Video eliminado correctamente."
          : "Foto eliminada correctamente."
      );

      await loadRooms();
    } catch (err) {
      console.error("Error eliminando archivo:", err);

      const backendMessage = err.response?.data?.message;
      setError(backendMessage || "No se pudo eliminar el archivo.");
    } finally {
      setDeletingMediaKey(null);
    }
  }

  async function handleDeleteCover(room) {
    if (!room?.main_image_url) return;

    const confirmed = window.confirm(
      "Â¿Seguro que deseas eliminar la foto de portada? Esta acciÃ³n no se puede deshacer."
    );

    if (!confirmed) return;

    try {
      setDeletingCoverRoomId(room.id);
      setError("");
      setSuccess("");

      await api.delete(`/rooms/${room.id}/image`);

      setSuccess("Portada eliminada correctamente.");
      await loadRooms();
    } catch (err) {
      console.error("Error eliminando portada:", err);

      const backendMessage = err.response?.data?.message;
      setError(backendMessage || "No se pudo eliminar la portada.");
    } finally {
      setDeletingCoverRoomId(null);
    }
  }

  const stats = useMemo(() => {
    const activeRooms = rooms.filter((room) => room.status === "active");
    const inactiveRooms = rooms.filter((room) => room.status === "inactive");
    const maintenanceRooms = rooms.filter(
      (room) => room.status === "maintenance"
    );

    return {
      totalRooms: rooms.length,
      activeRooms: activeRooms.length,
      inactiveRooms: inactiveRooms.length,
      maintenanceRooms: maintenanceRooms.length,
    };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return rooms.filter((room) => {
      const matchesStatus =
        statusFilter === "all" || room.status === statusFilter;

      const matchesSearch =
        !term ||
        String(room.name || "").toLowerCase().includes(term) ||
        String(room.description || "").toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [rooms, searchTerm, statusFilter]);

  const summaryCards = [
    {
      title: "Total habitaciones",
      value: stats.totalRooms,
      helper: "Registradas",
      icon: "ðŸ›ï¸",
    },
    {
      title: "Activas",
      value: stats.activeRooms,
      helper: "Visibles en la web",
      icon: "âœ…",
    },
    {
      title: "Inactivas",
      value: stats.inactiveRooms,
      helper: "No disponibles",
      icon: "â¸ï¸",
    },
    {
      title: "Mantenimiento",
      value: stats.maintenanceRooms,
      helper: "En revisiÃ³n",
      icon: "ðŸ› ï¸",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f1e8] px-5 py-6 md:px-8 md:py-8">
      <section className="max-w-7xl mx-auto">
        {/* ENCABEZADO */}
        <div className="relative overflow-hidden rounded-[1.7rem] bg-[#2b1d12] border border-[#eadfce] shadow-sm">
          <div className="absolute inset-0 opacity-20">
            <img
              src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1800&auto=format&fit=crop"
              alt="Habitaciones Casa HuÃ©spedes Pimentel"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-[#2b1d12] via-[#2b1d12]/92 to-[#2b1d12]/65" />

          <div className="relative p-6 md:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="uppercase tracking-[0.26em] text-xs font-black text-[#d9b48f]">
                Panel administrativo
              </p>

              <h1 className="font-serif text-4xl md:text-6xl leading-none tracking-[-0.045em] text-white mt-3">
                Habitaciones
              </h1>

              <p className="text-white/75 leading-relaxed mt-4 max-w-2xl">
                Crea, edita y administra las habitaciones que se muestran en la
                web pÃºblica del hospedaje.
              </p>
            </div>

            <button
              type="button"
              onClick={loadRooms}
              disabled={loading}
              className="w-fit bg-[#d9b48f] text-[#2b1d12] px-5 py-3 rounded-xl font-black hover:bg-[#c99c6c] transition disabled:opacity-60"
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>

        {/* MENSAJES */}
        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 font-bold">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] px-4 py-3 font-bold">
            {success}
          </div>
        )}

        {/* MÃ‰TRICAS */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
          {summaryCards.map((card) => (
            <SummaryCard
              key={card.title}
              title={card.title}
              value={card.value}
              helper={card.helper}
              icon={card.icon}
            />
          ))}
        </div>

        {/* FORMULARIO */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[1.5rem] border border-[#eadfce] p-6 mt-6 shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <p className="uppercase tracking-[0.2em] text-[11px] font-black text-[#a87545]">
                GestiÃ³n
              </p>

              <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                {editingRoomId ? "Editar habitaciÃ³n" : "Crear nueva habitaciÃ³n"}
              </h2>

              <p className="text-[#6f6258] text-sm mt-2 leading-relaxed">
                Las habitaciones activas aparecen en la web y pueden ser
                seleccionadas por los huÃ©spedes.
              </p>
            </div>

            {editingRoomId && (
              <span className="inline-flex w-fit rounded-full bg-[#fbf7ef] border border-[#d9b48f] text-[#2d261f] px-4 py-2 text-sm font-black">
                Editando habitaciÃ³n #{editingRoomId}
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Nombre de habitaciÃ³n</label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: HabitaciÃ³n Familiar con terraza"
                className="admin-input"
              />
            </div>

            <div>
              <label className="admin-label">Capacidad</label>

              <input
                type="number"
                name="capacity"
                min="1"
                value={formData.capacity}
                onChange={handleChange}
                className="admin-input"
              />
            </div>

            <div>
              <label className="admin-label">Precio por noche</label>

              <input
                type="number"
                name="price_per_night"
                min="0"
                step="0.01"
                value={formData.price_per_night}
                onChange={handleChange}
                placeholder="120.00"
                className="admin-input"
              />
            </div>

            <div>
              <label className="admin-label">Estado</label>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="admin-input"
              >
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
                <option value="maintenance">Mantenimiento</option>
              </select>

              <p className="text-xs text-[#6f6258] mt-2">
                Activa: aparece en la web. Inactiva o mantenimiento: no deberÃ­a
                reservarse.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="admin-label">URL de imagen principal</label>

              <input
                type="text"
                name="main_image_url"
                value={formData.main_image_url}
                onChange={handleChange}
                placeholder="https://..."
                className="admin-input"
              />

              <p className="text-xs text-[#6f6258] mt-2">
                Puedes pegar una URL o usar el botÃ³n â€œSubir imagenâ€ en la lista
                de habitaciones.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="admin-label">DescripciÃ³n</label>

              <textarea
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe servicios, camas, baÃ±o privado, WiFi, terraza, vista, etc."
                className="admin-input resize-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#2b1d12] text-white px-6 py-3 rounded-xl font-black hover:bg-[#3a291b] transition disabled:opacity-60"
            >
              {saving
                ? "Guardando..."
                : editingRoomId
                  ? "Actualizar habitaciÃ³n"
                  : "Crear habitaciÃ³n"}
            </button>

            {editingRoomId && (
              <button
                type="button"
                onClick={resetForm}
                className="border border-[#eadfce] bg-[#fbf7ef] px-6 py-3 rounded-xl font-black text-[#2d261f] hover:bg-[#f7f1e8] transition"
              >
                Cancelar ediciÃ³n
              </button>
            )}
          </div>
        </form>

        {/* FILTROS */}
        <div className="bg-white rounded-[1.5rem] border border-[#eadfce] p-5 mt-6 shadow-sm">
          <div className="grid lg:grid-cols-[1fr_260px] gap-4">
            <div>
              <label className="admin-label">Buscar habitaciÃ³n</label>

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nombre o descripciÃ³n..."
                className="admin-input"
              />
            </div>

            <div>
              <label className="admin-label">Filtrar por estado</label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="admin-input"
              >
                <option value="all">Todas</option>
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
            </div>
          </div>

          <p className="text-sm text-[#6f6258] mt-3 font-bold">
            Mostrando {filteredRooms.length} de {rooms.length} habitaciÃ³n(es).
          </p>
        </div>

        {/* LISTA */}
        <div className="mt-6">
          {loading && (
            <div className="bg-white rounded-[1.5rem] border border-[#eadfce] p-8 text-center font-bold text-[#6f6258] shadow-sm">
              Cargando habitaciones...
            </div>
          )}

          {!loading && rooms.length === 0 && (
            <EmptyBlock
              title="AÃºn no hay habitaciones registradas"
              text="Crea la primera habitaciÃ³n usando el formulario superior."
            />
          )}

          {!loading && rooms.length > 0 && filteredRooms.length === 0 && (
            <EmptyBlock
              title="No se encontraron habitaciones"
              text="Prueba con otro nombre, descripciÃ³n o estado."
            />
          )}

          {!loading && filteredRooms.length > 0 && (
            <div className="bg-white rounded-[1.5rem] border border-[#eadfce] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-[#eadfce]">
                <p className="uppercase tracking-[0.2em] text-[11px] font-black text-[#a87545]">
                  Registro
                </p>

                <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                  Habitaciones registradas
                </h2>

                <p className="text-[#6f6258] text-sm mt-2">
                  Gestiona disponibilidad, precios, imÃ¡genes y estado de cada
                  habitaciÃ³n.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#2b1d12] text-white">
                    <tr>
                      <th className="text-left px-5 py-4">HabitaciÃ³n</th>
                      <th className="text-left px-5 py-4">Capacidad</th>
                      <th className="text-left px-5 py-4">Precio</th>
                      <th className="text-left px-5 py-4">Estado</th>
                      <th className="text-left px-5 py-4">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRooms.map((room) => (
                      <tr
                        key={room.id}
                        className="border-b border-[#eadfce] hover:bg-[#fbf7ef] transition"
                      >
                        <td className="px-5 py-4 min-w-[340px]">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-[#fbf7ef] rounded-2xl overflow-hidden shrink-0 border border-[#eadfce]">
                              {room.main_image_url ? (
                                <img
                                  src={room.main_image_url}
                                  alt={room.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-[#9d9187] font-bold">
                                  Sin foto
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="font-black text-[#2d261f]">
                                {room.name || "HabitaciÃ³n sin nombre"}
                              </p>

                              <p className="text-xs text-[#9d9187] mt-1 font-bold">
                                HabitaciÃ³n #{room.id}
                              </p>

                              <p className="text-sm text-[#6f6258] line-clamp-2 mt-2 max-w-xl">
                                {room.description || "Sin descripciÃ³n"}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full border border-[#eadfce] bg-white px-2.5 py-1 text-[11px] font-black text-[#6f6258]">
                                  ðŸ“· {Number(room.image_count || 0)} foto(s)
                                </span>
                                <span className="rounded-full border border-[#eadfce] bg-white px-2.5 py-1 text-[11px] font-black text-[#6f6258]">
                                  ðŸŽ¥ {Number(room.video_count || 0)} video(s)
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-[#fbf7ef] border border-[#eadfce] text-[#2d261f] px-3 py-1 font-black">
                            {Number(room.capacity || 0)} persona(s)
                          </span>
                        </td>

                        <td className="px-5 py-4 font-black text-[#2d261f]">
                          {formatMoney(room.price_per_night)}
                        </td>

                        <td className="px-5 py-4 min-w-[190px]">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full border text-xs font-black mb-2 ${getStatusClass(
                              room.status
                            )}`}
                          >
                            {getStatusLabel(room.status)}
                          </span>

                          <select
                            value={room.status || "inactive"}
                            onChange={(event) =>
                              handleQuickStatusChange(room, event.target.value)
                            }
                            className="block w-full bg-[#fbf7ef] border border-[#eadfce] rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[#a87545]/25"
                          >
                            <option value="active">Activa</option>
                            <option value="inactive">Inactiva</option>
                            <option value="maintenance">Mantenimiento</option>
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-2 min-w-[180px]">
                            <button
                              type="button"
                              onClick={() => handleEdit(room)}
                              className="bg-[#2b1d12] text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-[#3a291b] transition"
                            >
                              Editar
                            </button>

                            <input
                              id={`room-cover-${room.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (event) => {
                                await handleImageUpload(
                                  room.id,
                                  event.target.files?.[0]
                                );
                                event.target.value = "";
                              }}
                            />

                            <label
                              htmlFor={`room-cover-${room.id}`}
                              className={`cursor-pointer text-center border px-4 py-2 rounded-xl text-xs font-black transition ${
                                uploadingMedia.roomId === room.id &&
                                uploadingMedia.type === "cover"
                                  ? "pointer-events-none bg-[#f7f1e8] border-[#eadfce] text-[#9d9187]"
                                  : "bg-[#a87545] border-[#a87545] text-white hover:bg-[#8f623a]"
                              }`}
                            >
                              {uploadingMedia.roomId === room.id &&
                              uploadingMedia.type === "cover"
                                ? "Subiendo portada..."
                                : "Cambiar portada"}
                            </label>

                            {room.main_image_url && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCover(room)}
                                disabled={deletingCoverRoomId === room.id}
                                className="border border-red-200 bg-red-50 text-red-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {deletingCoverRoomId === room.id
                                  ? "Eliminando portada..."
                                  : "Eliminar portada"}
                              </button>
                            )}

                            <input
                              id={`room-images-${room.id}`}
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={async (event) => {
                                await handleMultipleMediaUpload(
                                  room.id,
                                  event.target.files,
                                  "images"
                                );
                                event.target.value = "";
                              }}
                            />

                            <label
                              htmlFor={`room-images-${room.id}`}
                              className={`cursor-pointer text-center border px-4 py-2 rounded-xl text-xs font-black transition ${
                                uploadingMedia.roomId === room.id &&
                                uploadingMedia.type === "images"
                                  ? "pointer-events-none bg-[#f7f1e8] border-[#eadfce] text-[#9d9187]"
                                  : "border-[#a87545] bg-white text-[#8f623a] hover:bg-[#fbf7ef]"
                              }`}
                            >
                              {uploadingMedia.roomId === room.id &&
                              uploadingMedia.type === "images"
                                ? "Subiendo fotos..."
                                : "Agregar varias fotos"}
                            </label>

                            <input
                              id={`room-videos-${room.id}`}
                              type="file"
                              accept="video/*"
                              multiple
                              className="hidden"
                              onChange={async (event) => {
                                await handleMultipleMediaUpload(
                                  room.id,
                                  event.target.files,
                                  "videos"
                                );
                                event.target.value = "";
                              }}
                            />

                            <label
                              htmlFor={`room-videos-${room.id}`}
                              className={`cursor-pointer text-center border px-4 py-2 rounded-xl text-xs font-black transition ${
                                uploadingMedia.roomId === room.id &&
                                uploadingMedia.type === "videos"
                                  ? "pointer-events-none bg-[#f7f1e8] border-[#eadfce] text-[#9d9187]"
                                  : "border-[#2b1d12] bg-white text-[#2b1d12] hover:bg-[#f7f1e8]"
                              }`}
                            >
                              {uploadingMedia.roomId === room.id &&
                              uploadingMedia.type === "videos"
                                ? "Subiendo videos..."
                                : "Agregar varios videos"}
                            </label>

                            <button
                              type="button"
                              onClick={() => openMediaManager(room)}
                              className="border border-[#d9b48f] bg-[#fbf7ef] text-[#2b1d12] px-4 py-2 rounded-xl text-xs font-black hover:bg-[#f2e7d8] transition"
                            >
                              Ver y eliminar archivos
                            </button>

                            <p className="text-[11px] leading-relaxed text-[#9d9187]">
                              Selecciona varios archivos desde tu PC en una sola
                              carga.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {mediaManager.isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/65 p-4 md:p-8 flex items-center justify-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeMediaManager();
          }}
        >
          <section className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[1.5rem] bg-[#f7f1e8] border border-[#eadfce] shadow-2xl flex flex-col">
            <header className="bg-[#2b1d12] text-white px-5 py-4 md:px-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] font-black text-[#d9b48f]">
                  GalerÃ­a administrativa
                </p>
                <h2 className="font-serif text-2xl md:text-3xl mt-1">
                  {mediaManager.room?.name || "HabitaciÃ³n"}
                </h2>
                <p className="text-white/70 text-sm mt-1">
                  Selecciona Ãºnicamente el archivo que deseas eliminar.
                </p>
              </div>

              <button
                type="button"
                onClick={closeMediaManager}
                disabled={Boolean(deletingMediaKey) || loadingRoomMedia}
                className="w-10 h-10 shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-2xl font-bold transition disabled:opacity-50"
                aria-label="Cerrar galerÃ­a"
              >
                Ã—
              </button>
            </header>

            <div className="overflow-y-auto p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <p className="font-black text-[#2d261f]">
                  {mediaManager.items.length} archivo(s)
                </p>

                <button
                  type="button"
                  onClick={() => loadRoomMedia(mediaManager.room)}
                  disabled={loadingRoomMedia || Boolean(deletingMediaKey)}
                  className="border border-[#d9b48f] bg-white px-4 py-2 rounded-xl text-xs font-black text-[#2b1d12] hover:bg-[#fbf7ef] transition disabled:opacity-60"
                >
                  {loadingRoomMedia ? "Actualizando..." : "Actualizar galerÃ­a"}
                </button>
              </div>

              {loadingRoomMedia && (
                <div className="rounded-2xl border border-[#eadfce] bg-white p-8 text-center font-bold text-[#6f6258]">
                  Cargando fotos y videos...
                </div>
              )}

              {!loadingRoomMedia && mediaManager.items.length === 0 && (
                <div className="rounded-2xl border border-[#eadfce] bg-white p-8 text-center">
                  <h3 className="font-serif text-2xl text-[#2d261f]">
                    No hay archivos adicionales
                  </h3>
                  <p className="text-sm text-[#6f6258] mt-2">
                    Usa los botones de carga para agregar fotos o videos.
                  </p>
                </div>
              )}

              {!loadingRoomMedia && mediaManager.items.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mediaManager.items.map((media) => {
                    const mediaUrl = getMediaUrl(media);
                    const mediaType = getMediaType(media);
                    const mediaKey = media._localKey ?? media.id;
                    const isDeleting = deletingMediaKey === mediaKey;

                    return (
                      <article
                        key={mediaKey}
                        className="overflow-hidden rounded-2xl bg-white border border-[#eadfce] shadow-sm"
                      >
                        <div className="h-52 bg-[#2b1d12]">
                          {mediaType === "video" ? (
                            <video
                              src={mediaUrl}
                              controls
                              preload="metadata"
                              className="w-full h-full object-contain"
                            >
                              Tu navegador no puede reproducir este video.
                            </video>
                          ) : (
                            <img
                              src={mediaUrl}
                              alt={`Foto de ${
                                mediaManager.room?.name || "la habitaciÃ³n"
                              }`}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        <div className="p-4">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <span className="rounded-full bg-[#fbf7ef] border border-[#eadfce] px-3 py-1 text-[11px] font-black text-[#6f6258]">
                              {mediaType === "video" ? "ðŸŽ¥ Video" : "ðŸ“· Foto"}
                            </span>

                            {!media.id && (
                              <span className="text-[10px] font-bold text-red-600">
                                Sin ID
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(media)}
                            disabled={isDeleting || !media.id}
                            className="w-full rounded-xl bg-red-600 text-white px-4 py-2.5 text-xs font-black hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDeleting
                              ? "Eliminando..."
                              : mediaType === "video"
                                ? "Eliminar video"
                                : "Eliminar foto"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function SummaryCard({ title, value, helper, icon }) {
  return (
    <article className="bg-white rounded-[1.35rem] border border-[#eadfce] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-[#6f6258]">{title}</p>

          <h2 className="text-3xl font-black text-[#2d261f] mt-2">{value}</h2>

          <p className="text-xs text-[#9d9187] font-bold mt-1">{helper}</p>
        </div>

        <div className="w-11 h-11 rounded-xl bg-[#f7f1e8] border border-[#eadfce] flex items-center justify-center text-xl">
          {icon}
        </div>
      </div>
    </article>
  );
}

function EmptyBlock({ title, text }) {
  return (
    <div className="bg-white rounded-[1.5rem] border border-[#eadfce] p-8 text-center shadow-sm">
      <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f]">
        {title}
      </h2>

      <p className="text-[#6f6258] mt-3">{text}</p>
    </div>
  );
}