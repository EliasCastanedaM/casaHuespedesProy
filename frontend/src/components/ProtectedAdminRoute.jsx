import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedAdminRoute() {
  const token = localStorage.getItem("adminToken");

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}