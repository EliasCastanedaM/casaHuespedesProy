import StatisticsAdmin from "./pages/admin/StatisticsAdmin";
import ScrollToHash from "./components/ScrollToHash";
import { Routes, Route } from "react-router-dom";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import ScheduleAdmin from "./pages/admin/ScheduleAdmin";
import InquiriesAdmin from "./pages/admin/InquiriesAdmin";
import Home from "./pages/public/Home";
import Rooms from "./pages/public/Rooms";
import RoomDetail from "./pages/public/RoomDetail";
import Booking from "./pages/public/Booking";
import Services from "./pages/public/Services";
import Gallery from "./pages/public/Gallery";
import Tourism from "./pages/public/Tourism";
import Contact from "./pages/public/Contact";
import PaymentResult from "./pages/public/PaymentResult";

import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import BookingsAdmin from "./pages/admin/BookingsAdmin";
import CustomersAdmin from "./pages/admin/CustomersAdmin";
import RoomsAdmin from "./pages/admin/RoomsAdmin";
import GalleryAdmin from "./pages/admin/GalleryAdmin";

export default function App() {
  return (
    <>
      <ScrollToHash />

      <Routes>
        <Route path="/turismo" element={<Tourism />} />

        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/habitaciones" element={<Rooms />} />
          <Route path="/habitaciones/:id" element={<RoomDetail />} />
          <Route path="/reservar" element={<Booking />} />
          <Route path="/servicios" element={<Services />} />
          <Route path="/galeria" element={<Gallery />} />
          <Route path="/contacto" element={<Contact />} />
          <Route path="/pago-resultado" element={<PaymentResult />} />
        </Route>

        <Route path="/admin/login" element={<Login />} />

        <Route path="/admin/login" element={<Login />} />

        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="reservas" element={<BookingsAdmin />} />
            <Route path="consultas" element={<InquiriesAdmin />} />
            <Route path="horarios" element={<ScheduleAdmin />} />
            <Route path="clientes" element={<CustomersAdmin />} />
            <Route path="habitaciones" element={<RoomsAdmin />} />
            <Route path="galeria" element={<GalleryAdmin />} />
            <Route path="estadisticas" element={<StatisticsAdmin />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
