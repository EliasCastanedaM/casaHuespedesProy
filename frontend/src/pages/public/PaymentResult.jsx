// Página donde se mostrará si el pago fue exitoso, fallido o pendiente
export default function PaymentResult() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-brand-dark">Resultado de pago</h1>
      <p className="mt-3 text-gray-600">
        Aquí se mostrará el estado final del pago y de la reserva.
      </p>
    </div>
  );
}