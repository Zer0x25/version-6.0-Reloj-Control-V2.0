/**
 * =================================================================
 * LIBRERÍA DE UTILIDADES
 * Este archivo contiene funciones de ayuda compartidas por toda la aplicación.
 * =================================================================
 */

// --- Funciones de Fecha y Hora ---

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD.
 * @returns {string} La fecha formateada.
 */
function obtenerFechaHoy() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = (hoy.getMonth() + 1).toString().padStart(2, '0');
  const day = hoy.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la hora actual en formato HH:MM.
 * @returns {string} La hora formateada.
 */
function obtenerHoraActual() {
  const ahora = new Date();
  return ahora.toTimeString().slice(0, 5);
}

/**
 * Genera un Identificador Único (UID) para los registros.
 * Este UID es una combinación de la marca de tiempo actual y un número aleatorio
 * para asegurar una alta probabilidad de unicidad.
 * @returns {string} Un UID alfanumérico único.
 */
function generarUID() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
}

// --- Funciones de Almacenamiento Local (Local Storage) ---

/**
 * Guarda un valor en Local Storage, convirtiéndolo a JSON.
 * @param {string} clave - La clave bajo la cual se guardará el dato.
 * @param {*} valor - El valor a guardar (puede ser un objeto, array, etc.).
 */
function guardarEnLS(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (e) {
    console.error(`Error al guardar en Local Storage con la clave "${clave}":`, e);
    sweetAlertError('Error al guardar datos. El almacenamiento puede estar lleno o inaccesible.');
  }
}

/**
 * Obtiene un valor de Local Storage, convirtiéndolo de JSON.
 * Si la clave no existe o hay un error de parseo, devuelve null.
 * @param {string} clave - La clave del dato a obtener.
 * @returns {*} El valor recuperado, o null si no se encuentra o hay un error.
 */
function obtenerDeLS(clave) {
  try {
    const valorGuardado = localStorage.getItem(clave);
    return valorGuardado ? JSON.parse(valorGuardado) : null;
  } catch (e) {
    console.error(`Error al obtener o parsear de Local Storage con la clave "${clave}":`, e);
    // Podrías decidir mostrar un sweetAlertError aquí si el error es crítico para el usuario.
    return null;
  }
}

/**
 * Elimina un valor de Local Storage.
 * @param {string} clave - La clave del dato a eliminar.
 */
function eliminarDeLS(clave) {
  try {
    localStorage.removeItem(clave);
  } catch (e) {
    console.error(`Error al eliminar de Local Storage con la clave "${clave}":`, e);
    sweetAlertError('Error al eliminar datos del almacenamiento.');
  }
}

// --- Funciones de Interfaz de Usuario (UI) ---

/**
 * Muestra una alerta de error o advertencia utilizando SweetAlert2.
 * Esta es la forma preferida de mostrar mensajes al usuario.
 * @param {string} msg - El mensaje a mostrar.
 * @param {string} [type='warning'] - El tipo de icono ('success', 'error', 'warning', 'info', 'question').
 * @param {string} [title='Atención'] - El título de la alerta.
 */
function sweetAlertError(msg, type = 'warning', title = 'Atención') {
  if (window.Swal) {
    Swal.fire({
      icon: type,
      title: title,
      text: msg,
      confirmButtonText: 'OK'
    });
  } else {
    // Fallback si SweetAlert2 no está cargado (no debería ocurrir en producción)
    console.warn('SweetAlert2 no está disponible, usando alert() nativo:', msg);
    alert(`${title}: ${msg}`);
  }
}

/**
 * Alterna el modo oscuro/claro de la interfaz.
 * Guarda la preferencia en Local Storage.
 */
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  if (document.body.classList.contains('dark-mode')) {
    guardarEnLS('darkMode', true);
  } else {
    guardarEnLS('darkMode', false);
  }
  // Actualizar el icono del sol/luna
  const iconoModo = document.querySelector('.icono-modo');
  if (iconoModo) {
    iconoModo.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
  }
}

/**
 * Muestra la sección de Control de Horario y oculta el Libro de Novedades.
 */
function showControlHorario() {
  document.getElementById('controlHorarioSection')?.classList.remove('hidden');
  document.getElementById('libroNovedadesSection')?.classList.add('hidden');
}

/**
 * Muestra la sección de Libro de Novedades y oculta el Control de Horario.
 * También inicializa el libro de novedades si la función existe.
 */
function showLibroNovedades() {
  document.getElementById('controlHorarioSection')?.classList.add('hidden');
  document.getElementById('libroNovedadesSection')?.classList.remove('hidden');

  // Asegurarse de que inicializarLibroNovedades esté definida antes de llamarla
  // Esto previene errores si los scripts se cargan en un orden inesperado.
  if (typeof inicializarLibroNovedades === 'function') {
    inicializarLibroNovedades();
  }
}

/**
 * Muestra un modal y se asegura de que sea visible en la pantalla.
 * Añade la clase 'visible' para activar los estilos de visualización.
 * @param {string} modalId - El ID del modal a mostrar.
 */
function mostrarModalConScroll(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`Modal con ID "${modalId}" no encontrado.`);
    return;
  }

  modal.classList.add('visible'); // Usa 'visible' para mostrar el modal

  // Pequeño retardo para asegurar que el modal es visible antes de intentar scrollear
  setTimeout(() => {
    // Si el modal no está fijado en la pantalla, se desplaza a él para asegurar visibilidad.
    // Esto es útil en dispositivos móviles o si el modal aparece fuera de la vista.
    if (getComputedStyle(modal).position !== 'fixed') {
      modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 50);
}

/**
 * Permite cerrar un modal al hacer clic en el fondo oscuro.
 * @param {string} modalId - El ID del modal.
 */
function habilitarCierrePorFondo(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`Modal con ID "${modalId}" no encontrado para habilitar cierre por fondo.`);
    return;
  }

  modal.addEventListener('click', (event) => {
    // Si el clic fue directamente en el fondo del modal (no en su contenido)
    if (event.target === modal) {
      modal.classList.remove('visible'); // Oculta el modal
    }
  });
}
