// --- Variables Globales ---
let empleadoSeleccionado = null; // Almacena el empleado actualmente seleccionado en la búsqueda principal.
let empleadoActual = null;       // Almacena el empleado cuyo registro se está gestionando (entrada/salida).
let registroEditando = null;     // Almacena el objeto de registro que se está editando en el modal.
let campoEditando = null;        // Almacena el nombre del campo que se está editando ('entrada' o 'salida').

// --- Las constantes (ADMIN_PIN, LS_EMPLEADOS, etc.) ahora están centralizadas en utils.js ---

/**
 * Limpia el campo de búsqueda de empleados y resetea la selección actual.
 */
function limpiarBusquedaEmpleado() {
  document.getElementById("busquedaEmpleado").value = "";
  empleadoActual = null;
}

// --- Funciones de Logs y Exportación ---

/**
 * Guarda un registro de auditoría en Local Storage.
 * @param {string} accion - La acción realizada (e.g., "Empleado creado").
 * @param {string} empleadoInfo - Información relevante sobre el empleado afectado.
 */
function guardarLog(accion, empleadoInfo) {
  let logs = obtenerDeLS(LS_LOGS) || [];
  const timestamp = new Date().toLocaleString('es-CL');
  logs.unshift({ timestamp, accion, empleadoInfo });
  guardarEnLS(LS_LOGS, logs);
}

/**
 * Muestra los logs de auditoría en el visor dedicado.
 */
function verLogs() {
  const logsViewer = document.getElementById('logsViewer');
  const limpiarLogsBtn = document.getElementById('limpiarLogsBtn');
  let logs = obtenerDeLS(LS_LOGS) || [];

  if (logsViewer.style.display === 'block') {
    logsViewer.style.display = 'none';
    limpiarLogsBtn.classList.add('hidden');
  } else {
    logsViewer.style.display = 'block';
    if (logs.length > 0) {
      limpiarLogsBtn.classList.remove('hidden');
      logsViewer.innerHTML = logs.map(log =>
        `<p><strong>${log.timestamp}</strong>: ${log.accion} - ${log.empleadoInfo}</p>`
      ).join('');
    } else {
      logsViewer.textContent = "No hay logs disponibles.";
      limpiarLogsBtn.classList.add('hidden');
    }
  }
}

/**
 * Limpia todos los logs de auditoría.
 */
function limpiarLogs() {
  Swal.fire({
    title: '¿Estás seguro?',
    text: "¡No podrás revertir esto!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, borrar logs',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      eliminarDeLS(LS_LOGS);
      verLogs(); // Para refrescar la vista y ocultar el botón
      sweetAlertError('Logs de auditoría limpiados.', 'success', 'Limpieza completa');
    }
  });
}

/**
 * Muestra los registros de entrada y salida en la tabla principal, aplicando filtros.
 */
function mostrarRegistros() {
  const tablaBody = document.querySelector("#registrosTabla tbody");
  if (!tablaBody) return;

  tablaBody.innerHTML = "";
  let registros = obtenerDeLS(LS_REGISTROS) || [];
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];

  const filtroNombre = (document.getElementById("filtroNombre")?.value || "").toLowerCase();
  const filtroArea = (document.getElementById("filtroArea")?.value || "").toLowerCase();
  const filtroDesde = document.getElementById("filtroDesde")?.value;
  const filtroHasta = document.getElementById("filtroHasta")?.value;

  const registrosFiltrados = registros.filter(registro => {
    const empleado = empleados.find(emp => emp.id === registro.empleadoId);
    if (!empleado) return false;

    const fechaRegistro = new Date(registro.fecha + "T00:00:00");

    const pasaNombre = !filtroNombre || empleado.nombre.toLowerCase().includes(filtroNombre);
    const pasaArea = !filtroArea || empleado.area.toLowerCase().includes(filtroArea);
    const pasaDesde = !filtroDesde || fechaRegistro >= new Date(filtroDesde + "T00:00:00");
    const pasaHasta = !filtroHasta || fechaRegistro <= new Date(filtroHasta + "T00:00:00");
    
    return pasaNombre && pasaArea && pasaDesde && pasaHasta;
  });

  registrosFiltrados.sort((a, b) => new Date(b.fecha + 'T' + b.entrada) - new Date(a.fecha + 'T' + a.entrada));

  registrosFiltrados.forEach(registro => {
    const empleado = empleados.find(emp => emp.id === registro.empleadoId);
    if (!empleado) return;

    const row = tablaBody.insertRow();
    row.dataset.uid = registro.uid;
    
    const entradaDisplay = registro.entrada ? `${registro.fecha} ${registro.entrada}` : 'N/A';
    const salidaDisplay = registro.salida ? `${registro.fecha} ${registro.salida}` : 'Pendiente';

    row.innerHTML = `
      <td>${empleado.area || 'N/A'}</td>
      <td>${empleado.nombre}</td>
      <td>${empleado.cargo || 'N/A'}</td>
      <td class="editable" data-field="entrada">${entradaDisplay}</td>
      <td class="editable" data-field="salida">${salidaDisplay}</td>
      <td>
        <button class="accion-registro" data-action="comentario" aria-label="Agregar comentario" title="Agregar comentario">📝</button>
        <button class="accion-registro" data-action="eliminar" aria-label="Eliminar registro" title="Eliminar registro">🗑️</button>
      </td>
    `;
  });
}

/**
 * Popula el selector de áreas en el filtro con las áreas existentes.
 */
function popularFiltroArea() {
  const filtroAreaSelect = document.getElementById("filtroArea");
  if (!filtroAreaSelect) return;

  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  const areas = [...new Set(empleados.map(emp => emp.area).filter(Boolean))];

  filtroAreaSelect.innerHTML = '<option value="">Todos</option>';
  areas.sort().forEach(area => {
    const option = document.createElement("option");
    option.value = area.toLowerCase();
    option.textContent = area;
    filtroAreaSelect.appendChild(option);
  });
}

/**
 * Selecciona un empleado de la datalist y lo establece como empleadoActual.
 * @param {string} nombreEmpleado - El nombre completo del empleado.
 */
function seleccionarEmpleado(nombreEmpleado) {
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  empleadoActual = empleados.find(emp => emp.nombre.toLowerCase() === nombreEmpleado.toLowerCase());

  if (empleadoActual) {
    sweetAlertError(`Empleado seleccionado: ${empleadoActual.nombre}`, 'info', 'Info');
  } else {
    sweetAlertError('Empleado no encontrado. Por favor, seleccione uno de la lista.', 'error');
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

  listaBusqueda.innerHTML = '';

  if (searchTerm.length > 0) {
    empleados
      .filter(empleado => empleado.nombre.toLowerCase().includes(searchTerm))
      .forEach(empleado => {
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

  let ultimoRegistro = registros
    .filter(reg => reg.empleadoId === empleadoActual.id && reg.fecha === fechaHoy)
    .sort((a, b) => new Date(`1970/01/01 ${b.entrada}`) - new Date(`1970/01/01 ${a.entrada}`))
    [0];

  if (tipo === 'entrada') {
    if (ultimoRegistro && !ultimoRegistro.salida) {
      sweetAlertError(`¡${empleadoActual.nombre} ya tiene una entrada registrada hoy a las ${ultimoRegistro.entrada} sin marcar salida!`);
      return;
    }
    const nuevoRegistro = {
      uid: generarUID(),
      empleadoId: empleadoActual.id,
      fecha: fechaHoy,
      entrada: horaActual,
      salida: null,
      comentario: ''
    };
    registros.push(nuevoRegistro);
    guardarLog('Entrada registrada', `${empleadoActual.nombre} (${empleadoActual.id}) a las ${horaActual}`);
    sweetAlertError(`¡Entrada de ${empleadoActual.nombre} registrada a las ${horaActual}!`, 'success');
  } else if (tipo === 'salida') {
    if (!ultimoRegistro || ultimoRegistro.salida) {
      sweetAlertError(`¡${empleadoActual.nombre} no tiene una entrada pendiente para registrar una salida hoy!`);
      return;
    }
    ultimoRegistro.salida = horaActual;
    guardarLog('Salida registrada', `${empleadoActual.nombre} (${empleadoActual.id}) a las ${horaActual}`);
    sweetAlertError(`¡Salida de ${empleadoActual.nombre} registrada a las ${horaActual}!`, 'success');
  }

  guardarEnLS(LS_REGISTROS, registros);
  mostrarRegistros();
  limpiarBusquedaEmpleado();
}

/**
 * Agrega o edita un comentario en un registro existente.
 * @param {string} uid - El UID del registro a modificar.
 */
async function agregarComentarioRegistro(uid) {
  let registros = obtenerDeLS(LS_REGISTROS) || [];
  let registro = registros.find(reg => reg.uid === uid);
  if (!registro) return sweetAlertError('Registro no encontrado.');

  const { value: comentario } = await Swal.fire({
    title: 'Agregar/Editar Comentario',
    input: 'textarea',
    inputLabel: `Comentario para el registro del ${registro.fecha}:`,
    inputValue: registro.comentario || '',
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar'
  });

  if (comentario !== undefined) {
    registro.comentario = comentario;
    guardarEnLS(LS_REGISTROS, registros);
    guardarLog('Comentario agregado/editado', `Registro ${uid}`);
    sweetAlertError('Comentario guardado.', 'success');
    mostrarRegistros();
  }
}

/**
 * Elimina un registro.
 * @param {string} uid - El UID del registro a eliminar.
 */
function eliminarRegistroPorUID(uid) {
  Swal.fire({
    title: '¿Estás seguro?',
    text: "¡No podrás revertir esto!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      let registros = obtenerDeLS(LS_REGISTROS) || [];
      const registrosActualizados = registros.filter(reg => reg.uid !== uid);
      if (registros.length === registrosActualizados.length) {
        return sweetAlertError('Error: Registro no encontrado.', 'error');
      }
      guardarEnLS(LS_REGISTROS, registrosActualizados);
      guardarLog('Registro eliminado', `UID: ${uid}`);
      sweetAlertError('Registro eliminado.', 'success');
      mostrarRegistros();
    }
  });
}

/**
 * Maneja el doble clic en una celda de la tabla para editar.
 * @param {HTMLElement} tdElement - La celda (<td>) que fue doble-clicada.
 */
function handleDblClickRegistro(tdElement) {
  const uid = tdElement.parentElement.dataset.uid;
  campoEditando = tdElement.dataset.field;

  if (!uid || (campoEditando !== 'entrada' && campoEditando !== 'salida')) return;

  let registros = obtenerDeLS(LS_REGISTROS) || [];
  registroEditando = registros.find(reg => reg.uid === uid);
  if (!registroEditando) return sweetAlertError('Registro no encontrado.');

  const currentValue = registroEditando[campoEditando] 
    ? `${registroEditando.fecha}T${registroEditando[campoEditando]}`
    : `${obtenerFechaHoy()}T${obtenerHoraActual()}`;
  
  document.getElementById('modalTituloEdicion').textContent = `Editar ${campoEditando.charAt(0).toUpperCase() + campoEditando.slice(1)}`;
  document.getElementById('nuevaFechaHoraInput').value = currentValue;
  document.getElementById('btnAceptarEdicion').disabled = false;
  
  mostrarModalConScroll('editarRegistroModal');
}

/**
 * Habilita el botón de aceptar edición si el input es válido.
 */
function habilitarAceptarEdicion() {
  const input = document.getElementById('nuevaFechaHoraInput');
  const button = document.getElementById('btnAceptarEdicion');
  button.disabled = !input.value;
}

/**
 * Guarda los cambios del modal de edición de registro.
 */
function aceptarEdicion() {
  if (!registroEditando || !campoEditando) return;
  
  const newValue = document.getElementById('nuevaFechaHoraInput').value;
  if (!newValue) return sweetAlertError('La fecha y hora no pueden estar vacías.');

  const [nuevaFecha, nuevaHora] = newValue.split('T');
  let registros = obtenerDeLS(LS_REGISTROS) || [];

  const registroIndex = registros.findIndex(reg => reg.uid === registroEditando.uid);
  if (registroIndex !== -1) {
    registros[registroIndex].fecha = nuevaFecha;
    registros[registroIndex][campoEditando] = nuevaHora;
  }

  guardarEnLS(LS_REGISTROS, registros);
  guardarLog(`Registro ${campoEditando} editado`, `UID: ${registroEditando.uid}`);
  sweetAlertError('Registro actualizado.', 'success');
  cancelarEdicion();
  mostrarRegistros();
}

/**
 * Cierra el modal de edición.
 */
function cancelarEdicion() {
  const modal = document.getElementById('editarRegistroModal');
  modal.style.display = 'none';
  modal.classList.remove('visible');
  registroEditando = null;
  campoEditando = null;
}

// --- Funciones del Panel de Administración ---

/**
 * Alterna la visibilidad del panel de administración.
 */
async function toggleAdmin() {
  const adminPanel = document.getElementById('adminPanel');
  if (adminPanel.style.display === 'block') {
    adminPanel.style.display = 'none';
  } else {
    const { value: pin } = await Swal.fire({
      title: 'Acceso de Administrador',
      input: 'password',
      inputLabel: 'Ingrese el PIN:',
      inputPlaceholder: 'PIN',
      showCancelButton: true,
      confirmButtonText: 'Acceder',
      cancelButtonText: 'Cancelar'
    });

    if (pin === ADMIN_PIN) {
      adminPanel.style.display = 'block';
      cargarEmpleadosEnAdmin();
      nuevoEmpleado(); // Preparar para un nuevo empleado
    } else if (pin) {
      sweetAlertError('PIN incorrecto.', 'error');
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
    listaEmpleados.innerHTML = '<li>No hay empleados registrados.</li>';
    return;
  }

  empleados.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(empleado => {
    const li = document.createElement('li');
    li.textContent = `${empleado.nombre} (${empleado.area || 'N/A'})`;
    li.dataset.id = empleado.id;
    li.addEventListener('click', () => seleccionarEmpleadoAdmin(empleado.id));
    listaEmpleados.appendChild(li);
  });
}

/**
 * Rellena los campos del formulario de admin con los datos de un empleado.
 * @param {string} empleadoId - El ID del empleado.
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
 * Prepara el formulario para añadir un nuevo empleado.
 */
function nuevoEmpleado() {
  document.getElementById('adminId').value = generarIDCorrelativoEmpleado();
  document.getElementById('adminNombre').value = '';
  document.getElementById('adminCargo').value = '';
  document.getElementById('adminArea').value = '';
  document.getElementById('adminNombre').focus();
  empleadoSeleccionado = null;
}

/**
 * Guarda (crea o actualiza) un empleado.
 */
function guardarEmpleado() {
  const id = document.getElementById('adminId').value;
  const nombre = document.getElementById('adminNombre').value.trim();
  const cargo = document.getElementById('adminCargo').value.trim();
  const area = document.getElementById('adminArea').value.trim();

  if (!nombre || !id) {
    return sweetAlertError('El nombre y el ID son obligatorios.');
  }

  let empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  const empleadoIndex = empleados.findIndex(emp => emp.id === id);

  if (empleadoIndex !== -1) {
    // Actualizar
    empleados[empleadoIndex] = { ...empleados[empleadoIndex], nombre, cargo, area };
    guardarLog('Empleado actualizado', `${nombre} (${id})`);
    sweetAlertError('Empleado actualizado.', 'success');
  } else {
    // Crear
    if (empleados.some(emp => emp.id === id)) {
        return sweetAlertError('Error: ID de empleado duplicado.', 'error');
    }
    empleados.push({ id, nombre, cargo, area });
    guardarLog('Empleado creado', `${nombre} (${id})`);
    sweetAlertError('Empleado creado.', 'success');
  }

  guardarEnLS(LS_EMPLEADOS, empleados);
  cargarEmpleadosEnAdmin();
  popularFiltroArea();
  nuevoEmpleado();
}

/**
 * Elimina un empleado.
 */
function eliminarEmpleado() {
  const id = document.getElementById('adminId').value;
  if (!id || !empleadoSeleccionado) {
    return sweetAlertError('Seleccione un empleado para eliminar.');
  }

  Swal.fire({
    title: '¿Estás seguro?',
    text: `¡Eliminará a ${empleadoSeleccionado.nombre} y todos sus registros!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      // Eliminar empleado
      let empleados = obtenerDeLS(LS_EMPLEADOS) || [];
      guardarEnLS(LS_EMPLEADOS, empleados.filter(emp => emp.id !== id));
      
      // Eliminar registros asociados
      let registros = obtenerDeLS(LS_REGISTROS) || [];
      guardarEnLS(LS_REGISTROS, registros.filter(reg => reg.empleadoId !== id));

      guardarLog('Empleado eliminado', `${empleadoSeleccionado.nombre} (${id})`);
      sweetAlertError('Empleado y sus registros eliminados.', 'success');
      
      cargarEmpleadosEnAdmin();
      popularFiltroArea();
      mostrarRegistros();
      nuevoEmpleado();
    }
  });
}

/**
 * Limpia todos los filtros aplicados.
 */
function limpiarFiltros() {
  document.getElementById("filtroNombre").value = "";
  document.getElementById("filtroArea").value = "";
  document.getElementById("filtroDesde").value = "";
  document.getElementById("filtroHasta").value = "";
  mostrarRegistros();
}

/**
 * Exporta los datos filtrados a un archivo CSV.
 */
function exportarCSV() {
  const tabla = document.getElementById("registrosTabla");
  if (tabla.rows.length <= 1) return sweetAlertError('No hay datos para exportar.', 'info');

  let csvContent = "Area,Nombre,Cargo,Entrada,Salida\n"; // Encabezados
  
  // Recorrer las filas de la tabla (solo el cuerpo)
  for (let i = 0; i < tabla.tBodies[0].rows.length; i++) {
      let rowData = [];
      let row = tabla.tBodies[0].rows[i];
      // Recorrer las celdas de la fila (excluyendo la última de acciones)
      for (let j = 0; j < row.cells.length - 1; j++) {
          let cellData = row.cells[j].textContent.trim();
          // Para asegurar que las comas dentro del texto no rompan el CSV
          rowData.push(`"${cellData}"`);
      }
      csvContent += rowData.join(",") + "\n";
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `registros_${obtenerFechaHoy()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  sweetAlertError('Datos exportados a CSV.', 'success');
}

// --- Event Listeners Globales (se asignan en index.html) ---

/**
 * Manejador de eventos para acciones en la tabla de registros.
 * @param {Event} event - El objeto de evento.
 */
function manejarAccionRegistro(event) {
  const target = event.target.closest('.accion-registro');
  if (target) {
    const uid = target.closest('tr').dataset.uid;
    const action = target.dataset.action;
    if (action === 'comentario') agregarComentarioRegistro(uid);
    else if (action === 'eliminar') eliminarRegistroPorUID(uid);
  }
}

/**
 * Manejador de eventos para doble clic en celdas editables.
 * @param {Event} event - El objeto de evento.
 */
function manejarDobleClicRegistro(event) {
  const td = event.target.closest('td.editable');
  if (td) handleDblClickRegistro(td);
}
