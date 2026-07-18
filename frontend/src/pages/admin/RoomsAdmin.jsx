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
        setError("El nombre de la habitación es obligatorio.");
        return;
      }

      if (!formData.price_per_night || Number(formData.price_per_night) < 0) {
        setError("El precio por noche es obligatorio y no puede ser negativo.");
        return;
      }

      if (!formData.capacity || Number(formData.capacity) < 1) {
        setError("La capacidad debe ser como mínimo 1 persona.");
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
        setSuccess("Habitación actualizada correctamente.");
      } else {
        await api.post("/rooms", payload);
        setSuccess("Habitación creada correctamente.");
      }

      resetForm();
      await loadRooms();
    } catch (err) {
      console.error("Error guardando habitación:", err);

      const backendMessage = err.response?.data?.message;
      setError(backendMessage || "No se pudo guardar la habitación.");
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

      setSuccess("Estado de habitación actualizado correctamente.");
      await loadRooms();
    } catch (err) {
      console.error("Error actualizando estado de habitación:", err);
      setError("No se pudo actualizar el estado de la habitación.");
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
      icon: "🛏️",
    },
    {
      title: "Activas",
      value: stats.activeRooms,
      helper: "Visibles en la web",
      icon: "✅",
    },
    {
      title: "Inactivas",
      value: stats.inactiveRooms,
      helper: "No disponibles",
      icon: "⏸️",
    },
    {
      title: "Mantenimiento",
      value: stats.maintenanceRooms,
      helper: "En revisión",
      icon: "🛠️",
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
              alt="Habitaciones Casa Huéspedes Pimentel"
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
                web pública del hospedaje.
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

        {/* MÉTRICAS */}
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
                Gestión
              </p>

              <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                {editingRoomId ? "Editar habitación" : "Crear nueva habitación"}
              </h2>

              <p className="text-[#6f6258] text-sm mt-2 leading-relaxed">
                Las habitaciones activas aparecen en la web y pueden ser
                seleccionadas por los huéspedes.
              </p>
            </div>

            {editingRoomId && (
              <span className="inline-flex w-fit rounded-full bg-[#fbf7ef] border border-[#d9b48f] text-[#2d261f] px-4 py-2 text-sm font-black">
                Editando habitación #{editingRoomId}
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Nombre de habitación</label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Habitación Familiar con terraza"
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
                Activa: aparece en la web. Inactiva o mantenimiento: no debería
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
                Puedes pegar una URL o usar el botón “Subir imagen” en la lista
                de habitaciones.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="admin-label">Descripción</label>

              <textarea
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe servicios, camas, baño privado, WiFi, terraza, vista, etc."
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
                  ? "Actualizar habitación"
                  : "Crear habitación"}
            </button>

            {editingRoomId && (
              <button
                type="button"
                onClick={resetForm}
                className="border border-[#eadfce] bg-[#fbf7ef] px-6 py-3 rounded-xl font-black text-[#2d261f] hover:bg-[#f7f1e8] transition"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>

        {/* FILTROS */}
        <div className="bg-white rounded-[1.5rem] border border-[#eadfce] p-5 mt-6 shadow-sm">
          <div className="grid lg:grid-cols-[1fr_260px] gap-4">
            <div>
              <label className="admin-label">Buscar habitación</label>

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nombre o descripción..."
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
            Mostrando {filteredRooms.length} de {rooms.length} habitación(es).
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
              title="Aún no hay habitaciones registradas"
              text="Crea la primera habitación usando el formulario superior."
            />
          )}

          {!loading && rooms.length > 0 && filteredRooms.length === 0 && (
            <EmptyBlock
              title="No se encontraron habitaciones"
              text="Prueba con otro nombre, descripción o estado."
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
                  Gestiona disponibilidad, precios, imágenes y estado de cada
                  habitación.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#2b1d12] text-white">
                    <tr>
                      <th className="text-left px-5 py-4">Habitación</th>
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
                                {room.name || "Habitación sin nombre"}
                              </p>

                              <p className="text-xs text-[#9d9187] mt-1 font-bold">
                                Habitación #{room.id}
                              </p>

                              <p className="text-sm text-[#6f6258] line-clamp-2 mt-2 max-w-xl">
                                {room.description || "Sin descripción"}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full border border-[#eadfce] bg-white px-2.5 py-1 text-[11px] font-black text-[#6f6258]">
                                  📷 {Number(room.image_count || 0)} foto(s)
                                </span>
                                <span className="rounded-full border border-[#eadfce] bg-white px-2.5 py-1 text-[11px] font-black text-[#6f6258]">
                                  🎥 {Number(room.video_count || 0)} video(s)
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
