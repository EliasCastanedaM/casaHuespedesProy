import { Outlet } from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AmbientExperience from "../components/AmbientExperience";

export default function PublicLayout() {
  return (
    <>
      <AmbientExperience />
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}
