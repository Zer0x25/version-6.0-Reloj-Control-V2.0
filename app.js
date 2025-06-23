// --- Variables Globales ---
// Variables para mantener el estado de la aplicación
let empleadoSeleccionado = null; // Almacena el empleado actualmente seleccionado en la búsqueda principal.
let empleadoActual = null;       // Almacena el empleado cuyo registro se está gestionando (entrada/salida).
let registroEditando = null;     // Almacena el objeto de registro que se está editando en el modal.
let campoEditando = null;        // Almacena el nombre del campo que se está editando ('entrada' o 'salida').

// Constantes para claves de Local Storage y configuración de seguridad
const ADMIN_PIN = "1234";      // PIN de acceso al panel de administración.
const LS_EMPLEADOS = "empleados"; // Clave para almacenar la lista de empleados en Local Storage.
const LS_REGISTROS = "registros"; // Clave para almacenar los registros de entrada/salida.
const LS_LOGS = "logs";           // Clave para almacenar los logs de auditoría.

// --- Funciones de Utilidad (Centralizadas en utils.js, aquí solo las específicas de este módulo) ---

/**
 * Limpia el campo de búsqueda de empleados y resetea la selección actual.
 */
function limpiarBusquedaEmpleado() {
  document.getElementById("busquedaEmpleado").value = "";
  empleadoActual = null;
  // Opcional: También podrías limpiar la tabla de registros si no hay empleado seleccionado
  // mostrarRegistros();
}

// --- Funciones de Logs y Exportación ---

/**
 * Guarda un registro de auditoría en Local Storage.
 * @param {string} accion - La acción realizada (e.g., "Empleado creado", "Entrada registrada").
 * @param {string} empleadoInfo - Información relevante sobre el empleado afectado (ej: nombre, ID).
 */
function guardarLog(accion, empleadoInfo) {
  let logs = obtenerDeLS(LS_LOGS) || []; // Obtiene los logs existentes o un array vacío.
  const timestamp = new Date().toLocaleString(); // Fecha y hora actual formateada.
  logs.unshift({ timestamp, accion, empleadoInfo }); // Añade el nuevo log al principio.
  guardarEnLS(LS_LOGS, logs); // Guarda la lista actualizada de logs.
}

/**
 * Muestra los logs de auditoría en el visor dedicado.
 * Alterna la visibilidad del botón "Limpiar Logs".
 */
function verLogs() {
  const logsViewer = document.getElementById('logsViewer');
  const limpiarLogsBtn = document.getElementById('limpiarLogsBtn');
  let logs = obtenerDeLS(LS_LOGS) || [];

  // Alternar visibilidad
  if (logsViewer.style.display === 'block') {
    logsViewer.style.display = 'none';
    limpiarLogsBtn.classList.add('oculto'); // Oculta el botón de limpiar
  } else {
    logsViewer.style.display = 'block';
    limpiarLogsBtn.classList.remove('oculto'); // Muestra el botón de limpiar

    if (logs.length === 0) {
      logsViewer.textContent = "No hay logs disponibles.";
      limpiarLogsBtn.classList.add('oculto'); // Oculta si no hay logs
      return;
    }

    // Formatear logs para visualización
    logsViewer.innerHTML = logs.map(log =>
      `<p><strong>${log.timestamp}</strong>: ${log.accion} - ${log.empleadoInfo}</p>`
    ).join('');
  }
}

/**
 * Limpia todos los logs de auditoría del Local Storage y del visor.
 */
function limpiarLogs() {
  Swal.fire({
    title: '¿Estás seguro?',
    text: "¡No podrás revertir esto!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, borrar logs',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      eliminarDeLS(LS_LOGS); // Elimina la clave de logs del Local Storage.
      document.getElementById('logsViewer').textContent = "Logs limpiados.";
      document.getElementById('limpiarLogsBtn').classList.add('oculto'); // Oculta el botón
      sweetAlertError('Logs de auditoría limpiados.', 'success', 'Limpieza completa');
    }
  });
}

/**
 * Muestra los registros de entrada y salida en la tabla principal, aplicando filtros.
 * Se encarga de construir dinámicamente las filas de la tabla.
 */
function mostrarRegistros() {
  const tablaBody = document.querySelector("#registrosTabla tbody");
  if (!tablaBody) return; // Asegurarse de que la tabla exista

  tablaBody.innerHTML = ""; // Limpiar tabla antes de añadir nuevos registros.

  let registros = obtenerDeLS(LS_REGISTROS) || [];
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];

  const filtroNombre = document.getElementById("filtroNombre")?.value.toLowerCase() || "";
  const filtroArea = document.getElementById("filtroArea")?.value.toLowerCase() || "";
  const filtroDesde = document.getElementById("filtroDesde")?.value;
  const filtroHasta = document.getElementById("filtroHasta")?.value;

  // Filtrar registros
  const registrosFiltrados = registros.filter(registro => {
    const empleado = empleados.find(emp => emp.id === registro.empleadoId);
    if (!empleado) return false; // Si el empleado no existe, no mostrar el registro

    const nombreCompleto = empleado.nombre.toLowerCase();
    const areaEmpleado = empleado.area.toLowerCase();
    const fechaRegistro = new Date(registro.fecha); // Convertir a objeto Date para comparación

    let pasaFiltroNombre = true;
    if (filtroNombre) {
      pasaFiltroNombre = nombreCompleto.includes(filtroNombre);
    }

    let pasaFiltroArea = true;
    if (filtroArea) {
      pasaFiltroArea = areaEmpleado.includes(filtroArea);
    }

    let pasaFiltroDesde = true;
    if (filtroDesde) {
      const desdeDate = new Date(filtroDesde);
      // Comparar solo la parte de la fecha
      pasaFiltroDesde = fechaRegistro >= desdeDate;
    }

    let pasaFiltroHasta = true;
    if (filtroHasta) {
      const hastaDate = new Date(filtroHasta);
      // Para incluir el día "hasta", se compara hasta el final de ese día
      const endOfHastaDate = new Date(hastaDate);
      endOfHastaDate.setHours(23, 59, 59, 999);
      pasaFiltroHasta = fechaRegistro <= endOfHastaDate;
    }

    return pasaFiltroNombre && pasaFiltroArea && pasaFiltroDesde && pasaFiltroHasta;
  });

  // Ordenar registros: los más recientes primero
  registrosFiltrados.sort((a, b) => new Date(b.fecha + 'T' + b.hora) - new Date(a.fecha + 'T' + a.hora));

  // Renderizar registros en la tabla
  registrosFiltrados.forEach(registro => {
    const empleado = empleados.find(emp => emp.id === registro.empleadoId);
    if (!empleado) return; // Doble chequeo, aunque el filtro ya lo haría

    const row = tablaBody.insertRow();
    row.dataset.uid = registro.uid; // Asignar UID como data-attribute para fácil referencia
    row.innerHTML = `
      <td class="editable" data-field="area" data-uid="${registro.uid}">${empleado.area || ''}</td>
      <td class="editable" data-field="nombre" data-uid="${registro.uid}">${empleado.nombre}</td>
      <td class="editable" data-field="cargo" data-uid="${registro.uid}">${empleado.cargo || ''}</td>
      <td class="editable" data-field="entrada" data-uid="${registro.uid}">${registro.entrada ? registro.fecha + ' ' + registro.entrada : 'N/A'}</td>
      <td class="editable" data-field="salida" data-uid="${registro.uid}">${registro.salida ? registro.fecha + ' ' + registro.salida : 'Pendiente'}</td>
      <td>
        <button class="accion-registro" data-action="comentario" data-uid="${registro.uid}" aria-label="Agregar comentario" title="Agregar comentario">📝</button>
        <button class="accion-registro" data-action="eliminar" data-uid="${registro.uid}" aria-label="Eliminar registro" title="Eliminar registro">🗑️</button>
      </td>
    `;
  });
}

/**
 * Popula el selector de áreas en el filtro de la tabla con las áreas existentes de los empleados.
 */
function popularFiltroArea() {
  const filtroAreaSelect = document.getElementById("filtroArea");
  if (!filtroAreaSelect) return;

  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  const areas = new Set(); // Usar un Set para almacenar áreas únicas

  empleados.forEach(empleado => {
    if (empleado.area) {
      areas.add(empleado.area);
    }
  });

  // Limpiar opciones existentes, excepto "Todos"
  filtroAreaSelect.innerHTML = '<option value="">Todos</option>';

  // Añadir cada área única como una opción
  areas.forEach(area => {
    const option = document.createElement("option");
    option.value = area.toLowerCase(); // Guardar en minúsculas para coincidencia de filtro
    option.textContent = area;
    filtroAreaSelect.appendChild(option);
  });
}

/**
 * Selecciona un empleado de la datalist y lo establece como empleadoActual.
 * @param {string} nombreEmpleado - El nombre completo del empleado seleccionado.
 */
function seleccionarEmpleado(nombreEmpleado) {
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  empleadoActual = empleados.find(emp => emp.nombre.toLowerCase() === nombreEmpleado.toLowerCase());

  if (empleadoActual) {
    sweetAlertError(`Empleado seleccionado: ${empleadoActual.nombre}`, 'info', 'Info');
  } else {
    sweetAlertError('Empleado no encontrado. Por favor, seleccione uno de la lista.', 'error', 'Error');
    limpiarBusquedaEmpleado();
  }
}

/**
 * Realiza la búsqueda de empleados y actualiza la datalist.
 */
function buscarEmpleado() {
  const busquedaInput = document.getElementById("busquedaEmpleado");
  const listaBusqueda = document.getElementById("listaBusqueda");
  if (!busquedaInput || !listaBusqueda) return;

  const searchTerm = busquedaInput.value.toLowerCase();
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];

  // Limpiar datalist
  listaBusqueda.innerHTML = '';

  if (searchTerm.length > 0) {
    const empleadosFiltrados = empleados.filter(empleado =>
      empleado.nombre.toLowerCase().includes(searchTerm)
    );

    empleadosFiltrados.forEach(empleado => {
      const option = document.createElement('option');
      option.value = empleado.nombre;
      listaBusqueda.appendChild(option);
    });
  }
}


/**
 * Registra una entrada o salida para el empleado actual.
 * @param {string} tipo - 'entrada' o 'salida'.
 */
function registrar(tipo) {
  if (!empleadoActual) {
    sweetAlertError('Por favor, primero seleccione un empleado.');
    return;
  }

  let registros = obtenerDeLS(LS_REGISTROS) || [];
  const fechaHoy = obtenerFechaHoy();
  const horaActual = obtenerHoraActual();

  // Buscar el último registro de entrada/salida para este empleado hoy
  let ultimoRegistro = obtenerUltimoRegistro(registros, empleadoActual.id, fechaHoy);

  if (tipo === 'entrada') {
    if (ultimoRegistro && ultimoRegistro.entrada && !ultimoRegistro.salida) {
      sweetAlertError(`¡${empleadoActual.nombre} ya tiene una entrada registrada hoy a las ${ultimoRegistro.entrada}!`);
      return;
    }

    // Nuevo registro o un nuevo día o una nueva entrada después de una salida
    const nuevoRegistro = {
      uid: generarUID(), // Generar un UID único para el registro
      empleadoId: empleadoActual.id,
      fecha: fechaHoy,
      entrada: horaActual,
      salida: null, // La salida se establece en null inicialmente
      comentario: ''
    };
    registros.push(nuevoRegistro);
    guardarLog('Entrada registrada', `${empleadoActual.nombre} (${empleadoActual.id}) a las ${horaActual}`);
    sweetAlertError(`¡Entrada de ${empleadoActual.nombre} registrada a las ${horaActual}!`, 'success');

  } else if (tipo === 'salida') {
    if (!ultimoRegistro || !ultimoRegistro.entrada) {
      sweetAlertError(`¡${empleadoActual.nombre} no tiene una entrada registrada hoy para una salida!`);
      return;
    }
    if (ultimoRegistro.salida) {
      sweetAlertError(`¡${empleadoActual.nombre} ya registró su salida hoy a las ${ultimoRegistro.salida}!`);
      return;
    }

    // Registrar salida en el último registro de entrada del día
    ultimoRegistro.salida = horaActual;
    // Actualizar el registro en el array
    registros = registros.map(reg => reg.uid === ultimoRegistro.uid ? ultimoRegistro : reg);
    guardarLog('Salida registrada', `${empleadoActual.nombre} (${empleadoActual.id}) a las ${horaActual}`);
    sweetAlertError(`¡Salida de ${empleadoActual.nombre} registrada a las ${horaActual}!`, 'success');
  }

  guardarEnLS(LS_REGISTROS, registros);
  mostrarRegistros(); // Actualizar la tabla
  limpiarBusquedaEmpleado(); // Limpiar el campo de búsqueda
}

/**
 * Busca el último registro de un empleado en una fecha específica.
 * @param {Array} registros - Array de todos los registros.
 * @param {string} empleadoId - ID del empleado.
 * @param {string} fecha - Fecha en formato YYYY-MM-DD.
 * @returns {Object|null} El último registro encontrado o null.
 */
function obtenerUltimoRegistro(registros, empleadoId, fecha) {
  const registrosDelDia = registros.filter(reg => reg.empleadoId === empleadoId && reg.fecha === fecha);
  if (registrosDelDia.length === 0) {
    return null;
  }
  // Ordenar por hora de entrada para asegurarse de obtener el último si hay múltiples entradas/salidas en el día
  registrosDelDia.sort((a, b) => {
    const timeA = new Date(`2000/01/01 ${a.entrada}`);
    const timeB = new Date(`2000/01/01 ${b.entrada}`);
    return timeA - timeB;
  });
  return registrosDelDia[registrosDelDia.length - 1]; // Devuelve el registro más reciente del día
}

/**
 * Agrega o edita un comentario en un registro existente.
 * Utiliza SweetAlert2 para solicitar el comentario.
 * @param {string} uid - El UID del registro a modificar.
 */
async function agregarComentarioRegistro(uid) {
  let registros = obtenerDeLS(LS_REGISTROS) || [];
  let registro = registros.find(reg => reg.uid === uid);

  if (!registro) {
    sweetAlertError('Registro no encontrado.');
    return;
  }

  const { value: comentario } = await Swal.fire({
    title: 'Agregar/Editar Comentario',
    input: 'textarea',
    inputLabel: `Comentario para el registro del ${registro.fecha} (${registro.entrada || ''} - ${registro.salida || ''}):`,
    inputValue: registro.comentario || '',
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    inputValidator: (value) => {
      if (!value) {
        return '¡Necesitas escribir un comentario!';
      }
    }
  });

  if (comentario !== undefined) { // Si el usuario no canceló
    registro.comentario = comentario;
    guardarEnLS(LS_REGISTROS, registros.map(reg => reg.uid === uid ? registro : reg)); // Actualiza el registro
    guardarLog('Comentario agregado/editado', `Registro ${uid} de ${registro.empleadoId}`);
    sweetAlertError('Comentario guardado.', 'success', 'Éxito');
    mostrarRegistros(); // Refrescar tabla
  }
}

/**
 * Elimina un registro de la tabla y del Local Storage.
 * @param {string} uid - El UID del registro a eliminar.
 */
function eliminarRegistroPorUID(uid) {
  Swal.fire({
    title: '¿Estás seguro?',
    text: "¡No podrás revertir esto!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      let registros = obtenerDeLS(LS_REGISTROS) || [];
      const registroEliminado = registros.find(reg => reg.uid === uid);
      if (registroEliminado) {
        registros = registros.filter(reg => reg.uid !== uid);
        guardarEnLS(LS_REGISTROS, registros);
        guardarLog('Registro eliminado', `Registro ${uid} de ${registroEliminado.empleadoId}`);
        sweetAlertError('Registro eliminado exitosamente.', 'success', 'Eliminado');
        mostrarRegistros(); // Refrescar tabla
      } else {
        sweetAlertError('Error: Registro no encontrado para eliminar.', 'error');
      }
    }
  });
}

/**
 * Maneja el doble clic en una celda de la tabla para editar un registro.
 * Permite editar la fecha y hora de entrada o salida.
 * @param {HTMLElement} tdElement - La celda (<td>) que fue doble-clicada.
 */
function handleDblClickRegistro(tdElement) {
  const uid = tdElement.dataset.uid;
  const field = tdElement.dataset.field; // 'entrada' o 'salida'

  if (!uid || (field !== 'entrada' && field !== 'salida')) {
    console.warn("Campo no editable o UID no encontrado.");
    return;
  }

  let registros = obtenerDeLS(LS_REGISTROS) || [];
  registroEditando = registros.find(reg => reg.uid === uid);

  if (!registroEditando) {
    sweetAlertError('Registro no encontrado para edición.');
    return;
  }

  campoEditando = field; // Guardar el campo que se está editando globalmente

  const modalTitulo = document.getElementById('modalTituloEdicion');
  const nuevaFechaHoraInput = document.getElementById('nuevaFechaHoraInput');
  const btnAceptarEdicion = document.getElementById('btnAceptarEdicion');

  // Determinar el valor actual a mostrar en el input datetime-local
  let currentValue = '';
  if (registroEditando[field]) {
    currentValue = `${registroEditando.fecha}T${registroEditando[field]}`;
  } else {
    // Si el campo está vacío (ej. salida pendiente), inicializar con fecha y hora actuales
    currentValue = `${obtenerFechaHoy()}T${obtenerHoraActual()}`;
  }

  modalTitulo.textContent = `Editar ${field === 'entrada' ? 'Entrada' : 'Salida'}`;
  nuevaFechaHoraInput.value = currentValue;
  btnAceptarEdicion.disabled = false; // Habilitar el botón por defecto, la validación en oninput lo maneja

  mostrarModalConScroll('editarRegistroModal');
}

/**
 * Habilita o deshabilita el botón de aceptar edición basándose en la validez del input.
 */
function habilitarAceptarEdicion() {
  const nuevaFechaHoraInput = document.getElementById('nuevaFechaHoraInput');
  const btnAceptarEdicion = document.getElementById('btnAceptarEdicion');
  // Simple validación: el campo no debe estar vacío.
  btnAceptarEdicion.disabled = !nuevaFechaHoraInput.value;
}

/**
 * Guarda los cambios realizados en el modal de edición de registro.
 */
function aceptarEdicion() {
  if (!registroEditando || !campoEditando) {
    sweetAlertError('Error interno: No hay registro o campo para editar.');
    return;
  }

  const nuevaFechaHoraInput = document.getElementById('nuevaFechaHoraInput');
  const newValue = nuevaFechaHoraInput.value; // Formato YYYY-MM-DDTHH:MM

  if (!newValue) {
    sweetAlertError('La fecha y hora no pueden estar vacías.');
    return;
  }

  // Dividir la fecha y la hora
  const [nuevaFecha, nuevaHora] = newValue.split('T');

  // Actualizar el registro
  let registros = obtenerDeLS(LS_REGISTROS) || [];
  registros = registros.map(reg => {
    if (reg.uid === registroEditando.uid) {
      reg.fecha = nuevaFecha;
      reg[campoEditando] = nuevaHora;
      // Si se edita la entrada, y la salida era del mismo día, recalcular o limpiar salida si no tiene sentido
      if (campoEditando === 'entrada' && reg.salida && reg.fecha !== nuevaFecha) {
         // Opcional: Si la fecha de entrada cambia, y la salida estaba en el mismo día original,
         // podrías optar por limpiar la salida o pedir confirmación al usuario.
         // Por simplicidad, aquí solo se actualiza la fecha de entrada.
      }
    }
    return reg;
  });

  guardarEnLS(LS_REGISTROS, registros);
  guardarLog(`Registro ${campoEditando} editado`, `UID: ${registroEditando.uid}`);
  sweetAlertError('Registro actualizado exitosamente.', 'success', 'Actualizado');
  cancelarEdicion(); // Cerrar el modal
  mostrarRegistros(); // Refrescar la tabla
}

/**
 * Cancela la edición y cierra el modal de edición de registro.
 */
function cancelarEdicion() {
  document.getElementById('editarRegistroModal').classList.remove('visible');
  registroEditando = null;
  campoEditando = null;
}

// --- Funciones del Panel de Administración ---

/**
 * Alterna la visibilidad del panel de administración.
 * Solicita un PIN si el panel se va a abrir.
 */
async function toggleAdmin() {
  const adminPanel = document.getElementById('adminPanel');
  if (!adminPanel) return;

  if (adminPanel.style.display === 'block') {
    adminPanel.style.display = 'none';
  } else {
    const { value: pin } = await Swal.fire({
      title: 'Acceso de Administrador',
      input: 'password',
      inputLabel: 'Ingrese el PIN de administrador:',
      inputPlaceholder: 'PIN',
      inputAttributes: {
        maxlength: 10,
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'Acceder',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: false,
      inputValidator: (value) => {
        if (!value) {
          return '¡Necesitas ingresar un PIN!';
        }
      }
    });

    if (pin === ADMIN_PIN) {
      adminPanel.style.display = 'block';
      cargarEmpleadosEnAdmin(); // Cargar la lista de empleados al abrir el panel
      sweetAlertError('Acceso concedido.', 'success', 'Bienvenido');
    } else if (pin !== undefined) { // Si el usuario ingresó algo pero no es el PIN correcto
      sweetAlertError('PIN incorrecto.', 'error', 'Acceso denegado');
    }
  }
}

/**
 * Carga y muestra la lista de empleados en el panel de administración.
 */
function cargarEmpleadosEnAdmin() {
  const listaEmpleados = document.getElementById('listaEmpleados');
  if (!listaEmpleados) return;

  listaEmpleados.innerHTML = '';
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];

  if (empleados.length === 0) {
    listaEmpleados.innerHTML = '<li style="text-align: center; color: #777;">No hay empleados registrados.</li>';
    return;
  }

  empleados.forEach(empleado => {
    const li = document.createElement('li');
    li.textContent = `${empleado.nombre} (${empleado.area || 'N/A'}) - ${empleado.cargo || 'N/A'}`;
    li.dataset.id = empleado.id; // Almacenar el ID en el dataset
    li.addEventListener('click', () => seleccionarEmpleadoAdmin(empleado.id));
    listaEmpleados.appendChild(li);
  });
}

/**
 * Rellena los campos del formulario de administración con los datos de un empleado seleccionado.
 * @param {string} empleadoId - El ID del empleado a seleccionar.
 */
function seleccionarEmpleadoAdmin(empleadoId) {
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  empleadoSeleccionado = empleados.find(emp => emp.id === empleadoId);

  if (empleadoSeleccionado) {
    document.getElementById('adminId').value = empleadoSeleccionado.id;
    document.getElementById('adminNombre').value = empleadoSeleccionado.nombre;
    document.getElementById('adminCargo').value = empleadoSeleccionado.cargo || '';
    document.getElementById('adminArea').value = empleadoSeleccionado.area || '';
  }
}

/**
 * Prepara el formulario de administración para añadir un nuevo empleado.
 */
function nuevoEmpleado() {
  document.getElementById('adminId').value = generarUID(); // Generar un nuevo UID para el nuevo empleado
  document.getElementById('adminNombre').value = '';
  document.getElementById('adminCargo').value = '';
  document.getElementById('adminArea').value = '';
  empleadoSeleccionado = null; // Resetear el empleado seleccionado
}

/**
 * Guarda (crea o actualiza) un empleado en el Local Storage.
 */
function guardarEmpleado() {
  const id = document.getElementById('adminId').value;
  const nombre = document.getElementById('adminNombre').value.trim();
  const cargo = document.getElementById('adminCargo').value.trim();
  const area = document.getElementById('adminArea').value.trim();

  if (!nombre || !id) {
    sweetAlertError('El nombre y el ID del empleado no pueden estar vacíos.');
    return;
  }

  let empleados = obtenerDeLS(LS_EMPLEADOS) || [];

  // Verificar si es un empleado existente o nuevo
  const existeEmpleado = empleados.find(emp => emp.id === id);

  if (existeEmpleado) {
    // Actualizar empleado existente
    existeEmpleado.nombre = nombre;
    existeEmpleado.cargo = cargo;
    existeEmpleado.area = area;
    guardarLog('Empleado actualizado', `${nombre} (${id})`);
    sweetAlertError('Empleado actualizado exitosamente.', 'success', 'Actualizado');
  } else {
    // Crear nuevo empleado
    // Verificar que el ID generado no esté duplicado (aunque generarUID es robusto)
    if (empleados.some(emp => emp.id === id)) {
        sweetAlertError('Error: ID de empleado duplicado. Intente crear uno nuevo.', 'error');
        return;
    }
    const nuevo = { id, nombre, cargo, area };
    empleados.push(nuevo);
    guardarLog('Empleado creado', `${nombre} (${id})`);
    sweetAlertError('Nuevo empleado creado exitosamente.', 'success', 'Creado');
  }

  guardarEnLS(LS_EMPLEADOS, empleados);
  cargarEmpleadosEnAdmin(); // Refrescar la lista de empleados
  popularFiltroArea(); // Actualizar el filtro de áreas
  mostrarRegistros(); // Refrescar la tabla de registros si es necesario
  nuevoEmpleado(); // Limpiar el formulario para otra entrada
}

/**
 * Elimina un empleado del Local Storage.
 */
function eliminarEmpleado() {
  const id = document.getElementById('adminId').value;
  if (!id) {
    sweetAlertError('Seleccione un empleado para eliminar.');
    return;
  }

  Swal.fire({
    title: '¿Estás seguro?',
    text: "¡Eliminará el empleado y todos sus registros! ¡No podrás revertir esto!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      let empleados = obtenerDeLS(LS_EMPLEADOS) || [];
      const empleadoAEliminar = empleados.find(emp => emp.id === id);

      if (empleadoAEliminar) {
        // Eliminar empleado
        empleados = empleados.filter(emp => emp.id !== id);
        guardarEnLS(LS_EMPLEADOS, empleados);

        // Eliminar todos los registros asociados a este empleado
        let registros = obtenerDeLS(LS_REGISTROS) || [];
        const registrosRestantes = registros.filter(reg => reg.empleadoId !== id);
        if (registros.length !== registrosRestantes.length) {
            guardarEnLS(LS_REGISTROS, registrosRestantes);
            console.log(`Eliminados ${registros.length - registrosRestantes.length} registros del empleado ${id}.`);
        }

        guardarLog('Empleado eliminado', `${empleadoAEliminar.nombre} (${empleadoAEliminar.id})`);
        sweetAlertError('Empleado y sus registros eliminados exitosamente.', 'success', 'Eliminado');
        cargarEmpleadosEnAdmin();
        popularFiltroArea();
        mostrarRegistros(); // Refrescar la tabla
        nuevoEmpleado(); // Limpiar el formulario
      } else {
        sweetAlertError('Empleado no encontrado.', 'error');
      }
    }
  });
}

/**
 * Limpia todos los filtros aplicados en la tabla de registros.
 */
function limpiarFiltros() {
  document.getElementById("filtroNombre").value = "";
  document.getElementById("filtroArea").value = "";
  document.getElementById("filtroDesde").value = "";
  document.getElementById("filtroHasta").value = "";
  mostrarRegistros(); // Volver a mostrar todos los registros
}

/**
 * Exporta los datos de la tabla de registros a un archivo CSV.
 */
function exportarCSV() {
  const registros = obtenerDeLS(LS_REGISTROS) || [];
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];

  if (registros.length === 0) {
    sweetAlertError('No hay registros para exportar.', 'info');
    return;
  }

  // Encabezados del CSV
  let csvContent = "Area,Nombre,Cargo,Fecha,Hora Entrada,Hora Salida,Comentario\n";

  registros.forEach(registro => {
    const empleado = empleados.find(emp => emp.id === registro.empleadoId);
    if (empleado) {
      const area = empleado.area || '';
      const nombre = empleado.nombre || '';
      const cargo = empleado.cargo || '';
      const fecha = registro.fecha || '';
      const entrada = registro.entrada || '';
      const salida = registro.salida || '';
      const comentario = registro.comentario ? `"${registro.comentario.replace(/"/g, '""')}"` : ''; // Escapar comillas dobles

      csvContent += `${area},${nombre},${cargo},${fecha},${entrada},${salida},${comentario}\n`;
    }
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'registros_control_horario.csv');
  document.body.appendChild(link); // Necesario para Firefox
  link.click();
  document.body.removeChild(link); // Limpiar
  sweetAlertError('Datos exportados a CSV.', 'success');
}

// --- Event Listeners Globales y Inicialización ---

// Event listener principal para el tbody de la tabla de registros,
// usando delegación de eventos para las acciones de comentario y eliminar.
document.querySelector("#registrosTabla tbody")?.addEventListener('click', (event) => {
  const target = event.target;
  // Solo reaccionar a clics en botones con la clase 'accion-registro'
  if (target.classList.contains('accion-registro')) {
    const action = target.dataset.action;
    const uid = target.dataset.uid;

    if (action === 'comentario') {
      agregarComentarioRegistro(uid);
    } else if (action === 'eliminar') {
      eliminarRegistroPorUID(uid);
    }
  }
});

// Event listener para el doble clic en las celdas editables de la tabla
document.querySelector("#registrosTabla tbody")?.addEventListener('dblclick', (event) => {
  const td = event.target.closest('td.editable');
  // Asegurarse de no activar en los botones dentro de la celda de acciones
  if (td && !td.querySelector('button')) {
    handleDblClickRegistro(td);
  }
});


// Event Listener que se ejecuta cuando el DOM está completamente cargado.
document.addEventListener("DOMContentLoaded", () => {
  // Configurar botones de navegación entre secciones
  const controlHorarioBtn = document.getElementById('controlHorarioBtn');
  const libroNovedadesBtn = document.getElementById('libroNovedadesBtn');

  // Asignar event listeners a los botones de navegación
  libroNovedadesBtn?.addEventListener('click', showLibroNovedades);
  controlHorarioBtn?.addEventListener('click', showControlHorario);

  // Mostrar inicialmente la sección de control de horario
  showControlHorario(); // Llama a la función de utils.js

  // Inicialización de la pantalla del Control de Horario
  mostrarRegistros(); // Carga y muestra los registros existentes al iniciar.
  popularFiltroArea(); // Popula el filtro de área con los datos de los empleados.
  cargarEmpleadosEnAdmin(); // Carga la lista de empleados en el panel de administración.

  // Configurar la actualización de fecha y hora en la cabecera
  const fechaHoraActualDiv = document.getElementById('fechaHoraActual');
  if (fechaHoraActualDiv) {
    function actualizarFechaHora() {
      const ahora = new Date();
      const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const fechaFormateada = ahora.toLocaleDateString('es-ES', opcionesFecha);
      const horaFormateada = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      fechaHoraActualDiv.textContent = `${fechaFormateada}, ${horaFormateada}`;
    }
    actualizarFechaHora(); // Llamar una vez para mostrar al cargar
    setInterval(actualizarFechaHora, 1000); // Actualizar cada segundo
  }

  // Collapsible para los filtros (Mostrar/Ocultar)
  const collapsibleButton = document.querySelector('.collapsible-button');
  const filtersContent = document.querySelector('.filters-content');

  if (collapsibleButton && filtersContent) {
    collapsibleButton.addEventListener('click', function() {
      this.classList.toggle('active');
      filtersContent.classList.toggle('f-content'); // Cambia la clase para expandir/colapsar
    });
  }

  // Configuración del Modo Oscuro
  // Cargar preferencia de modo oscuro desde localStorage al inicio
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }
  // Asignar event listener al botón de alternar modo oscuro
  const darkBtn = document.getElementById('toggleDarkMode');
  darkBtn?.addEventListener('click', toggleDarkMode);

  // Asignar event listeners a otros elementos interactivos
  document.getElementById('adminBtn')?.addEventListener('click', toggleAdmin);
  document.getElementById('entradaBtn')?.addEventListener('click', () => registrar('entrada'));
  document.getElementById('salidaBtn')?.addEventListener('click', () => registrar('salida'));
  // Limpiar búsqueda de empleado si el campo se vacía
  document.getElementById('busquedaEmpleado')?.addEventListener('search', function () {
    if (this.value === '') limpiarBusquedaEmpleado();
  });
  document.getElementById('limpiarFiltrosBtn')?.addEventListener('click', limpiarFiltros);
  document.getElementById('exportarCSVBtn')?.addEventListener('click', exportarCSV);
  
  // Inicializar el modal de edición para que pueda cerrarse haciendo clic fuera
  habilitarCierrePorFondo('editarRegistroModal');

  // Event listener para la búsqueda de empleados
  document.getElementById('busquedaEmpleado')?.addEventListener('input', buscarEmpleado);
  // Event listener para cuando se selecciona un empleado de la datalist (o se pulsa Enter en el campo)
  document.getElementById('busquedaEmpleado')?.addEventListener('change', function() {
    if (this.value) { // Solo si hay un valor seleccionado/introducido
      seleccionarEmpleado(this.value);
    } else {
      limpiarBusquedaEmpleado();
    }
  });

  // Inicializar un nuevo empleado al cargar la página en el panel admin,
  // esto asegura que haya un ID pre-generado si el admin decide crear uno.
  // Solo se genera si el panel de admin está visible, lo cual no ocurre al cargar la página por defecto.
  // La llamada a nuevoEmpleado() se hará cuando el panel se abra.
});
