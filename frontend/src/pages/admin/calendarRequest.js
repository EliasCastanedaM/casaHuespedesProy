// Peticiones de calendario cancelables para evitar condiciones de carrera
// cuando recepción cambia de día, semana o mes rápidamente.
export function startCalendarRequest({ period, periodKey, request, onSuccess, onError, onFinish }) {
  const controller = new AbortController();
  let active = true;
  let pending;
  try {
    pending = Promise.resolve(request(period, controller.signal));
  } catch (failure) {
    pending = Promise.reject(failure);
  }

  pending.then((response) => {
    if (active) onSuccess({ key: periodKey, data: response.data.data });
  }).catch((failure) => {
    if (active && failure?.code !== "ERR_CANCELED" && failure?.name !== "AbortError") {
      onError(failure);
    }
  }).finally(() => {
    if (active) onFinish();
  });

  return () => {
    active = false;
    controller.abort();
  };
}
