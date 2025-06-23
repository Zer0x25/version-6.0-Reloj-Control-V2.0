// --- Variables Globales ---
let empleadoSeleccionado = null;
let empleadoActual = null;
let registroEditando = null;
let campoEditando = null;

const ADMIN_PIN = "1234";
const LS_EMPLEADOS = "empleados";
const LS_REGISTROS = "registros";
const LS_LOGS = "logs";

// --- Funciones de Utilidad ---

function limpiarBusquedaEmpleado() {
  document.getElementById("busquedaEmpleado").value = "";
  empleadoActual = null;
}

function crearFechaLocal(fecha, hora) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [h, m] = hora.split(':').map(Number);
  return new Date(anio, mes - 1, dia, h, m, 0, 0);
}

function generarUID() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// --- Funciones de Logs y Exportación ---

function guardarLog(accion, empleado) {
  let logs = obtenerDeLS(LS_LOGS) || [];
  logs.push({
    fechaHora: new Date().toLocaleString('es-ES'),
    accion,
    empleado,
    usuario: "admin"
  });
  guardarEnLS(LS_LOGS, logs);
}

function verLogs() {
  const logs = obtenerDeLS(LS_LOGS) || [];
  const viewer = document.getElementById("logsViewer");
  viewer.innerHTML = "";

  if (logs.length === 0) {
    viewer.innerHTML = "<p><em>No hay logs registrados.</em></p>";
    return;
  }

  logs.slice().reverse().forEach(log => {
    const div = document.createElement("div");
    div.classList.add('log-entry');
    div.innerHTML = `<strong>${log.fechaHora}</strong> — ${log.accion} — ${log.empleado}`;
    viewer.appendChild(div);
  });
}

async function limpiarLogs() {
  const { value: confirmar } = await Swal.fire({
    title: '¿Estás seguro?',
    text: "¡Esta acción eliminará permanentemente todos los logs de auditoría!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, limpiar',
    cancelButtonText: 'Cancelar'
  });

  if (!confirmar) return;

  eliminarDeLS(LS_LOGS);
  verLogs();
  Swal.fire({
    icon: 'success',
    title: 'Logs Limpiados',
    text: 'Todos los logs han sido eliminados.',
    showConfirmButton: false,
    timer: 1500
  });
}

function exportarCSV() {
  const registros = obtenerDeLS(LS_REGISTROS) || [];

  const nombreFiltro = document.getElementById("filtroNombre").value.toLowerCase();
  const areaFiltro = document.getElementById("filtroArea").value;
  const desde = document.getElementById("filtroDesde").value;
  const hasta = document.getElementById("filtroHasta").value;

  const filtrados = registros.filter(reg => {
    return (!nombreFiltro || reg.nombre.toLowerCase().includes(nombreFiltro))
      && (!areaFiltro || reg.area === areaFiltro)
      && (!desde || reg.entradaCompleta >= `${desde} 00:00`)
      && (!hasta || reg.entradaCompleta <= `${hasta} 23:59`);
  });

  if (filtrados.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'Sin Datos',
      text: 'No hay registros que coincidan con los filtros para exportar.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  const encabezados = ["ID", "Area", "Nombre", "Cargo", "Entrada", "Salida", "Horas Trabajadas"];
  const filas = filtrados.map(r => {
    let horas = "";
    if (r.entradaCompleta && r.salidaCompleta) {
      const entrada = new Date(r.entradaCompleta.replace(" ", "T"));
      const salida = new Date(r.salidaCompleta.replace(" ", "T"));
      horas = ((salida - entrada) / (1000 * 60 * 60)).toFixed(2);
    }
    return [
      r.id,
      r.area,
      r.nombre,
      r.cargo || "",
      r.entradaCompleta || "",
      r.salidaCompleta || "",
      horas
    ].join(",");
  });

  const contenido = [encabezados.join(","), ...filas].join("\n");

  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `registros_asistencia_${obtenerFechaHoy()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  Swal.fire({
    icon: 'success',
    title: 'Exportado',
    text: 'Registros exportados a CSV.',
    showConfirmButton: false,
    timer: 1500
  });
}

function actualizarFechaHora() {
  const contenedor = document.getElementById("fechaHoraActual");
  const ahora = new Date();
  const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const opcionesHora = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const fechaFormateada = ahora.toLocaleDateString('es-ES', opcionesFecha);
  const horaFormateada = ahora.toLocaleTimeString('es-ES', opcionesHora);
  contenedor.textContent = `${fechaFormateada}, ${horaFormateada}`;
}

// --- Funciones de Filtros ---

function limpiarFiltros() {
  document.getElementById("filtroNombre").value = "";
  document.getElementById("filtroArea").value = "";
  document.getElementById("filtroDesde").value = "";
  document.getElementById("filtroHasta").value = "";
  mostrarRegistros();
  Swal.fire({
    icon: 'info',
    title: 'Filtros Limpiados',
    text: 'Se han restablecido todos los filtros.',
    showConfirmButton: false,
    timer: 1000
  });
}

// --- Funciones de Empleados (Admin) ---

function cargarEmpleados() {
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];

  const lista = document.getElementById("listaEmpleados");
  lista.innerHTML = "";
  empleados.forEach(emp => {
    const li = document.createElement("li");
    li.textContent = `${emp.id} - ${emp.nombre} (${emp.cargo || 'Sin Cargo'}, ${emp.area})`; // Mostrar cargo
    li.onclick = () => {
      document.getElementById("adminId").value = emp.id;
      document.getElementById("adminNombre").value = emp.nombre;
      document.getElementById("adminCargo").value = emp.cargo || ''; // Rellenar campo de cargo
      document.getElementById("adminArea").value = emp.area;
      document.querySelectorAll("#listaEmpleados li").forEach(l => l.classList.remove("selected"));
      li.classList.add("selected");
      empleadoSeleccionado = emp.id;
    };
    lista.appendChild(li);
  });

  const selectArea = document.getElementById("filtroArea");
  const areas = [...new Set(empleados.map(e => e.area))];
  selectArea.innerHTML = '<option value="">Todos</option>';
  areas.sort().forEach(area => {
    if (area) selectArea.innerHTML += `<option value="${area}">${area}</option>`;
  });

  // Rellena la datalist para la búsqueda principal
  const datalist = document.getElementById("listaBusqueda");
  datalist.innerHTML = "";
  empleados.forEach(emp => {
    const opt = document.createElement("option");
    opt.value = `${emp.nombre} (${emp.id}) - ${emp.cargo || 'Sin Cargo'}`; // Incluir cargo en la sugerencia de búsqueda
    datalist.appendChild(opt);
  });
}

function limpiarFormularioEmpleado() {
  document.getElementById("adminId").value = "";
  document.getElementById("adminNombre").value = "";
  document.getElementById("adminCargo").value = "";
  document.getElementById("adminArea").value = "";
  empleadoSeleccionado = null;
  document.querySelectorAll("#listaEmpleados li").forEach(li => li.classList.remove("selected"));
}

async function guardarEmpleado() {
  const id = document.getElementById("adminId").value.trim();
  const nombre = document.getElementById("adminNombre").value.trim();
  const cargo = document.getElementById("adminCargo").value.trim();
  const area = document.getElementById("adminArea").value.trim();
  if (!id || !nombre || !cargo || !area) {
    Swal.fire({
      icon: 'warning',
      title: 'Campos Requeridos',
      text: 'Todos los campos (ID, Nombre, Cargo, Area) son requeridos.',
      confirmButtonText: 'Entendido'
    });
    return;
  }

  let empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  const existente = empleados.find(e => e.id === id);

  let mensajeLog = "";
  let accionSwal = "";

  if (existente) {
    // Si existe, actualiza
    existente.nombre = nombre;
    existente.cargo = cargo;
    existente.area = area;
    mensajeLog = "Empleado actualizado";
    accionSwal = "actualizado";
  } else {
    // Si no existe, verifica duplicado antes de agregar
    if (empleados.some(e => e.id === id)) {
      Swal.fire({
        icon: 'error',
        title: 'ID Duplicado',
        text: 'El ID ya existe. No se pueden crear empleados con ID duplicado.',
        confirmButtonText: 'Ok'
      });
      return;
    }
    empleados.push({ id, nombre, cargo, area });
    mensajeLog = "Empleado creado";
    accionSwal = "creado";
  }

  guardarEnLS(LS_EMPLEADOS, empleados);
  cargarEmpleados();
  mostrarRegistros();
  limpiarFormularioEmpleado();
  guardarLog(mensajeLog, `${nombre} (ID ${id})`);
  Swal.fire({
    icon: 'success',
    title: '¡Éxito!',
    text: `Empleado ${accionSwal} correctamente.`,
    showConfirmButton: false,
    timer: 1500
  });
}

async function eliminarEmpleado() {
  const id = document.getElementById("adminId").value.trim();
  if (!id) {
    Swal.fire({
      icon: 'warning',
      title: 'ID Requerido',
      text: 'Por favor, selecciona un empleado o ingresa un ID para eliminar.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  const { value: confirmar } = await Swal.fire({
    title: '¿Estás seguro?',
    text: "¡Esta acción eliminará permanentemente al empleado y sus registros!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (!confirmar) return;

  let empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  const empleadoAEliminar = empleados.find(e => e.id === id);

  if (!empleadoAEliminar) {
    Swal.fire({
      icon: 'error',
      title: 'No Encontrado',
      text: 'Empleado no encontrado.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  let registros = obtenerDeLS(LS_REGISTROS) || [];
  registros = registros.filter(r => r.id !== id);
  guardarEnLS(LS_REGISTROS, registros);

  empleados = empleados.filter(e => e.id !== id);
  guardarEnLS(LS_EMPLEADOS, empleados);

  guardarLog("Empleado eliminado", `${empleadoAEliminar.nombre} (ID ${id})`);
  cargarEmpleados();
  mostrarRegistros();
  limpiarFormularioEmpleado();
  Swal.fire({
    icon: 'success',
    title: '¡Eliminado!',
    text: `El empleado ${empleadoAEliminar.nombre} ha sido eliminado.`,
    showConfirmButton: false,
    timer: 1500
  });
}

function nuevoEmpleado() {
  limpiarFormularioEmpleado();
  // Obtener el siguiente ID progresivo y formatear con ceros a la izquierda
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  let maxId = 0;
  empleados.forEach(e => {
    const num = parseInt(e.id, 10);
    if (!isNaN(num) && num > maxId) maxId = num;
  });
  const siguienteId = (maxId + 1).toString().padStart(3, '0');
  document.getElementById("adminId").value = siguienteId;
  if (window.Swal) {
    Swal.fire({
      icon: 'info',
      title: 'ID Nuevo Creado',
      text: 'Favor ingresa los datos restantes y confirma con Guardar',
      confirmButtonText: 'OK'
    });
  } else {
    alert('ID Nuevo Creado. Favor ingresa los datos restantes y confirma con Guardar');
  }
}
// --- Lógica de Registro de Asistencia ---

function seleccionarEmpleado() {
  const busquedaInput = document.getElementById("busquedaEmpleado");
  const valorBusqueda = busquedaInput.value;

  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];

  // Busca el empleado que coincida con el formato "Nombre (ID)"
  // Modificado para que la búsqueda también considere el cargo en la datalist
  const emp = empleados.find(e => `${e.nombre} (${e.id}) - ${e.cargo}` === valorBusqueda || `${e.nombre} (${e.id})` === valorBusqueda);

  empleadoActual = emp || null;
}

async function registrar(tipo) {
  seleccionarEmpleado(); // Forzar selección según input antes de registrar
  if (!empleadoActual) {
    Swal.fire({ icon: 'warning', title: 'Seleccione un empleado', showConfirmButton: false, timer: 1500 });
    limpiarBusquedaEmpleado();
    return;
  }

  const { id, nombre, cargo, area } = empleadoActual;
  const fecha = obtenerFechaHoy();
  const hora = obtenerHoraActual();
  const fechaHoraCompleta = `${fecha} ${hora}`;

  let registros = obtenerDeLS(LS_REGISTROS) || [];

  // --- Bloqueo de doble registro en menos de 2 minutos ---
  const ahora = new Date();
  const ahoraMs = ahora.getTime();
  const DOS_MINUTOS_MS = 2 * 60 * 1000;

  if (tipo === "entrada") {
    // Busca el último registro de entrada
    const registrosHoy = registros
      .filter(r => r.id === id && r.entradaCompleta)
      .sort((a, b) => new Date(b.entradaCompleta) - new Date(a.entradaCompleta));

    if (registrosHoy.length > 0) {
      const ultimoRegistro = registrosHoy[0];
      const ultimaHora = new Date(ultimoRegistro.entradaCompleta);
      if (ahoraMs - ultimaHora.getTime() < DOS_MINUTOS_MS) {
        Swal.fire({
          icon: 'error',
          title: 'Registro muy reciente',
          text: `Ya existe un registro de entrada para este empleado en los últimos 20 minutos.`,
          showConfirmButton: false,
          timer: 20000
        });
        limpiarBusquedaEmpleado();
        return;
      }
    }

    const { value: confirmar } = await Swal.fire({
      title: `¿Registrar entrada?`,
      text: `¿Deseas registrar entrada para ${nombre} a las ${hora}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmar) return;

    const nuevoRegistro = {
      uid: generarUID(),
      id,
      nombre,
      cargo,
      area,
      entradaCompleta: fechaHoraCompleta,
      salidaCompleta: "",
      comentario: "" // Asegura que todos los registros nuevos tengan campo comentario
    };

    registros.push(nuevoRegistro);

    guardarLog(`Registro de entrada`, `${nombre} (ID ${id})`);
  } else if (tipo === "salida") {
    // Busca el último registro de entrada sin salida
    const registroSinSalida = registros
      .filter(r => r.id === id && r.entradaCompleta && !r.salidaCompleta)
      .sort((a, b) => new Date(b.entradaCompleta) - new Date(a.entradaCompleta))[0];

    if (!registroSinSalida) {
      Swal.fire({
        icon: 'error',
        title: 'Sin entrada previa',
        text: 'No se encontró un registro de entrada sin salida para este empleado.',
        showConfirmButton: false,
        timer: 2000
      });
      limpiarBusquedaEmpleado();
      return;
    }

    // Bloqueo de doble registro de salida en menos de 2 minutos
    if (registroSinSalida.salidaCompleta) {
      const ultimaSalida = new Date(registroSinSalida.salidaCompleta);
      if (ahoraMs - ultimaSalida.getTime() < DOS_MINUTOS_MS) {
        Swal.fire({
          icon: 'error',
          title: 'Registro muy reciente',
          text: `Ya existe un registro de salida para este empleado en los últimos 2 minutos.`,
          showConfirmButton: false,
          timer: 2000
        });
        limpiarBusquedaEmpleado();
        return;
      }
    }

    const { value: confirmar } = await Swal.fire({
      title: `¿Registrar salida?`,
      text: `¿Deseas registrar salida para ${nombre} a las ${hora}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmar) return;

    registroSinSalida.salidaCompleta = fechaHoraCompleta;

    guardarLog(`Registro de salida`, `${nombre} (ID ${id})`);
  }

  guardarEnLS(LS_REGISTROS, registros);
  mostrarRegistros();
  limpiarBusquedaEmpleado();
}

function registrarSalidaDesdeTabla(idEmpleado) {
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  const empleado = empleados.find(e => e.id === idEmpleado);
  if (!empleado) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Empleado no encontrado.',
      confirmButtonText: 'Cerrar'
    });
    return;
  }
  // Coloca el valor en el input de búsqueda para que la selección sea coherente
  const busquedaInput = document.getElementById("busquedaEmpleado");
  if (busquedaInput) {
    busquedaInput.value = `${empleado.nombre} (${empleado.id})${empleado.cargo ? ' - ' + empleado.cargo : ''}`;
  }
  registrar('salida');
}

// --- Lógica de Registros y Filtrado ---

function esRegistroVisible(reg, nombreFiltro, areaFiltro, desde, hasta) {
  if (nombreFiltro && !reg.nombre.toLowerCase().includes(nombreFiltro)) return false;
  if (areaFiltro && reg.area !== areaFiltro) return false;

  if (desde && (!reg.entradaCompleta || reg.entradaCompleta < `${desde} 00:00`)) return false;
  if (hasta && (!reg.entradaCompleta || reg.entradaCompleta > `${hasta} 23:59`)) return false;

  return true;
}

function mostrarRegistros() {
  const tabla = document.querySelector("#registrosTabla tbody");
  tabla.innerHTML = "";
  const registros = obtenerDeLS(LS_REGISTROS) || [];

  let nombreFiltro = document.getElementById("filtroNombre").value.toLowerCase();
  let areaFiltro = document.getElementById("filtroArea").value;
  let desde = document.getElementById("filtroDesde").value;
  let hasta = document.getElementById("filtroHasta").value;

  // Si todos los filtros están vacíos, aplica filtro predeterminado: registros de las últimas 18 horas
  if (!nombreFiltro && !areaFiltro && !desde && !hasta) {
    const ahora = new Date();
    const hace18Horas = new Date(ahora.getTime() - 18 * 60 * 60 * 1000);

    let filtrados = registros.filter(reg => {
      if (!reg.entradaCompleta) return false;
      const entrada = new Date(reg.entradaCompleta.replace(" ", "T"));
      return entrada >= hace18Horas && entrada <= ahora;
    });

    // Ordenar por entradaCompleta descendente
    filtrados.sort((a, b) => new Date(b.entradaCompleta) - new Date(a.entradaCompleta));

    if (filtrados.length === 0) {
      tabla.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#888;">No hay registros para mostrar.</td></tr>`;
      return;
    }

    filtrados.forEach(reg => {
      let salidaContenido = reg.salidaCompleta
        ? reg.salidaCompleta
        : `<button onclick="registrarSalidaDesdeTabla('${reg.id}')" aria-label="Registrar salida" title="Registrar salida">Registrar Salida</button>`;

      tabla.innerHTML += `
        <tr data-uid="${reg.uid}">
          <td>${reg.area}</td>
          <td>${reg.nombre}</td>
          <td>${reg.cargo || '-'}</td>
          <td>${reg.entradaCompleta || '-'}</td>
          <td>${salidaContenido}</td>
          <td>
            <button onclick="agregarComentarioRegistro('${reg.uid}')"
              aria-label="Agregar comentario"
              title="Agregar comentario"
              class="btn-comentario-registro">
              <svg width="28px" height="28px" viewBox="0 0 48 48" version="1" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 48 48">
              <circle fill="#4CAF50" cx="24" cy="24" r="21"/>
              <g fill="#ffffff">
              <rect x="21" y="14" width="6" height="20"/>
              <rect x="14" y="21" width="20" height="6"/>
              </g>
              </svg>
            </button>
            <button onclick="eliminarRegistroPorUID('${reg.uid}')"
              aria-label="Eliminar registro"
              title="Eliminar registro"
              class="btn-eliminar-registro">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#fff" viewBox="0 0 32 32">
                <path class="stone_een" d="M5,7h22c0.552,0,1-0.448,1-1V5c0-1.105-0.895-2-2-2h-7V2c0-0.552-0.448-1-1-1h-4c-0.552,0-1,0.448-1,1v1
                  H6C4.895,3,4,3.895,4,5v1C4,6.552,4.448,7,5,7z M14,2h4v1h-4V2z M5.083,8l1.764,21.166C6.934,30.203,7.8,31,8.84,31H23.16
                  c1.04,0,1.907-0.797,1.993-1.834L26.917,8H5.083z M12,26.5c0,0.276-0.224,0.5-0.5,0.5S11,26.776,11,26.5v-15
                  c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5V26.5z M15,26.5c0,0.276-0.224,0.5-0.5,0.5S14,26.776,14,26.5v-15
                  c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5V26.5z M18,26.5c0,0.276-0.224,0.5-0.5,0.5S17,26.776,17,26.5v-15
                  c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5V26.5z M21,26.5c0,0.276-0.224,0.5-0.5,0.5S20,26.776,20,26.5v-15
                  c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5V26.5z"/>
              </svg>
            </button>
          </td>
        </tr>`;
 // Aquí falta el cierre del botón de comentario y el div de los botones
    });

    aplicarEventosDblClickATabla();
    return; // Salir para no aplicar el filtro general
  }

  // Filtro normal si hay algún filtro activo

  let filtrados = registros.filter(reg => {
    return (!nombreFiltro || reg.nombre.toLowerCase().includes(nombreFiltro))
      && (!areaFiltro || reg.area === areaFiltro)
      && (!desde || reg.entradaCompleta >= `${desde} 00:00`)
      && (!hasta || reg.entradaCompleta <= `${hasta} 23:59`);
  });

  // Ordenar por entradaCompleta descendente

  filtrados.sort((a, b) => new Date(b.entradaCompleta) - new Date(a.entradaCompleta));

  if (filtrados.length === 0) {
    tabla.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#888;">No hay registros para mostrar.</td></tr>`;
    return;
  }

  filtrados.forEach(reg => {
    let salidaContenido = reg.salidaCompleta
      ? reg.salidaCompleta
      : `<button onclick="registrarSalidaDesdeTabla('${reg.id}')" aria-label="Registrar salida" title="Registrar salida">Registrar Salida</button>`;

    tabla.innerHTML += `
      <tr data-uid="${reg.uid}">
        <td>${reg.area}</td>
        <td>${reg.nombre}</td>
        <td>${reg.cargo || '-'}</td>
        <td>${reg.entradaCompleta || '-'}</td>
        <td>${salidaContenido}</td>
        <td>
          <button onclick="agregarComentarioRegistro('${reg.uid}')"
              aria-label="Agregar comentario"
              title="Agregar comentario"
              class="btn-comentario-registro">
              <svg width="28px" height="28px" viewBox="0 0 48 48" version="1" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 48 48">
              <circle fill="#4CAF50" cx="24" cy="24" r="21"/>
              <g fill="#ffffff">
              <rect x="21" y="14" width="6" height="20"/>
              <rect x="14" y="21" width="20" height="6"/>
              </g>
              </svg>
          <button onclick="eliminarRegistroPorUID('${reg.uid}')"
            aria-label="Eliminar registro"
            title="Eliminar registro"
            class="btn-eliminar-registro">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#fff" viewBox="0 0 32 32">
              <path class="stone_een" d="M5,7h22c0.552,0,1-0.448,1-1V5c0-1.105-0.895-2-2-2h-7V2c0-0.552-0.448-1-1-1h-4c-0.552,0-1,0.448-1,1v1
                H6C4.895,3,4,3.895,4,5v1C4,6.552,4.448,7,5,7z M14,2h4v1h-4V2z M5.083,8l1.764,21.166C6.934,30.203,7.8,31,8.84,31H23.16
                c1.04,0,1.907-0.797,1.993-1.834L26.917,8H5.083z M12,26.5c0,0.276-0.224,0.5-0.5,0.5S11,26.776,11,26.5v-15
                c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5V26.5z M15,26.5c0,0.276-0.224,0.5-0.5,0.5S14,26.776,14,26.5v-15
                c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5V26.5z M18,26.5c0,0.276-0.224,0.5-0.5,0.5S17,26.776,17,26.5v-15
                c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5V26.5z M21,26.5c0,0.276-0.224,0.5-0.5,0.5S20,26.776,20,26.5v-15
                c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5V26.5z"/>
          </svg>
        </button>
      </td>
    </tr>`;
  });

  aplicarEventosDblClickATabla();
}

function aplicarEventosDblClickATabla() {
  document.querySelectorAll("#registrosTabla tbody tr").forEach(tr => {
    const tdEntrada = tr.children[3]; // Columna de EntradaCompleta (índice 3)
    const tdSalida = tr.children[4];  // Columna de SalidaCompleta (índice 4)

    // Clonar y reemplazar para eliminar listeners viejos eficazmente
    const newTdEntrada = tdEntrada.cloneNode(true);
    tdEntrada.parentNode.replaceChild(newTdEntrada, tdEntrada);
    newTdEntrada.addEventListener("dblclick", (event) => handleDblClickRegistro(event, 'entradaCompleta'));

    const newTdSalida = tdSalida.cloneNode(true);
    tdSalida.parentNode.replaceChild(newTdSalida, tdSalida);
    newTdSalida.addEventListener("dblclick", (event) => handleDblClickRegistro(event, 'salidaCompleta'));
  });
}

// Modificación de handleDblClickRegistro para recibir el tipo de campo

function handleDblClickRegistro(event, tipoCampo) {
  const td = event.currentTarget;
  const fila = td.closest("tr");
  const uid = fila.getAttribute("data-uid");
  let registros = obtenerDeLS(LS_REGISTROS) || [];
  const registro = registros.find(r => r.uid === uid);
  if (!registro) {
    Swal.fire('Error', 'Registro no encontrado para edición.', 'error');
    return;
  }

  registroEditando = registro;
  campoEditando = tipoCampo; // 'entradaCompleta' o 'salidaCompleta'

  const modal = document.getElementById("editarRegistroModal");
  const modalTitulo = document.getElementById("modalTituloEdicion");
  const campoFechaHoraWrapper = document.getElementById("campoFechaHoraWrapper");
  const nuevaFechaHoraInput = document.getElementById("nuevaFechaHoraInput");
  const btnAceptar = document.getElementById("btnAceptarEdicion");

  // Resetear visibilidad y valores
  campoFechaHoraWrapper.style.display = 'block';
  nuevaFechaHoraInput.value = registro[tipoCampo] ? registro[tipoCampo].replace(" ", "T") : ""; // Pre-llenar con la fecha y hora actual
  btnAceptar.disabled = true;

  modalTitulo.textContent = `Editar ${tipoCampo === 'entradaCompleta' ? 'Entrada' : 'Salida'}`;
  modal.style.display = "flex"; // Mostrar el modal de edición
  // document.getElementById('editarRegistroModal').style.display = 'flex';
}

async function aceptarEdicion() {
  const nuevaFechaHoraInput = document.getElementById("nuevaFechaHoraInput");
  let registros = obtenerDeLS(LS_REGISTROS) || [];

  const nuevaFechaHora = nuevaFechaHoraInput.value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(nuevaFechaHora)) {
    Swal.fire({ icon: 'error', title: 'Formato Inválido', text: 'Debe ingresar fecha y hora en formato YYYY-MM-DDTHH:mm.' });
    return;
  }

  const nuevaFechaHoraStr = nuevaFechaHora.replace("T", " ");
  if (registroEditando[campoEditando] === nuevaFechaHoraStr) {
    Swal.fire({ icon: 'info', title: 'Sin cambios', text: 'La fecha y hora ingresada es la misma que la actual.' });
    cerrarModalEdicion();
    return;
  }

   registroEditando[campoEditando] = nuevaFechaHoraStr;

  const index = registros.findIndex(r => r.uid === registroEditando.uid);
  if (index !== -1) {
    registros[index] = registroEditando;
  } else {
    registros.push(registroEditando);
  }
  guardarEnLS(LS_REGISTROS, registros);
  guardarLog(`Hora de ${campoEditando === 'entradaCompleta' ? 'entrada' : 'salida'} modificada`, `${registroEditando.nombre} (ID ${registroEditando.id}) - Nueva Fecha y Hora: ${nuevaFechaHoraStr}`);

  Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Registro actualizado correctamente.', showConfirmButton: false, timer: 1500 });
  cerrarModalEdicion();
  mostrarRegistros();
}

function cancelarEdicion() {
  document.getElementById("editarRegistroModal").style.display = "none";
}

function cerrarModalEdicion() {
  document.getElementById("editarRegistroModal").style.display = "none";
}

function habilitarAceptarEdicion() {
  const input = document.getElementById("nuevaFechaHoraInput");
  document.getElementById("btnAceptarEdicion").disabled = !input.value;
}

// --- Funciones de Registros (por UID) ---

function eliminarRegistroPorUID(uid) {
  let registros = obtenerDeLS(LS_REGISTROS) || [];
  const registro = registros.find(r => r.uid === uid);
  if (!registro) {
    Swal.fire('Error', 'Registro no encontrado.', 'error');
    return;
  }
  Swal.fire({
    title: '¿Eliminar registro?',
    text: `¿Seguro que deseas eliminar el registro de ${registro.nombre} (${registro.entradaCompleta || ''} ${registro.salidaCompleta || ''})?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      registros = registros.filter(r => r.uid !== uid);
      guardarEnLS(LS_REGISTROS, registros);
      guardarLog('Registro eliminado', `${registro.nombre} (ID ${registro.id})`);
      mostrarRegistros();
      Swal.fire('Eliminado', 'El registro ha sido eliminado.', 'success');
    }
  });
}

function toggleAdmin() {
  const panel = document.getElementById("adminPanel");
  if (panel.style.display === "block") {
    panel.style.display = "none";
  } else {
    panel.style.display = "block";
    cargarEmpleados();
  }
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
  // Cambia el icono del botón según el modo
  const btn = document.getElementById('toggleDarkMode');
  if (document.body.classList.contains('dark-mode')) {
    btn.innerHTML = '<span class="icono-modo">☀️</span>';
  } else {
    btn.innerHTML = '<span class="icono-modo">🌙</span>';
  }
}

// Al cargar registros, asegúrate de que cada uno tenga la propiedad comentario

function agregarComentarioRegistro(uid) {
  let registros = obtenerDeLS(LS_REGISTROS) || [];
  const reg = registros.find(r => r.uid === uid);
  if (!reg) return;

  Swal.fire({
    title: 'Agregar o editar comentario',
    input: 'textarea',
    inputLabel: 'Comentario',
    inputPlaceholder: 'Escribe un comentario para este registro...',
    inputValue: reg.comentario || "",
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      reg.comentario = result.value || "";
      guardarEnLS(LS_REGISTROS, registros);
      Swal.fire('Comentario guardado', '', 'success');
    }
  });
}
// Habilitar scroll horizontal por arrastre en el contenedor de la tabla

function habilitarArrastreScrollHorizontal(idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  let isDown = false;
  let startX;
  let scrollLeft;

  contenedor.addEventListener('mousedown', (e) => {
    isDown = true;
    contenedor.classList.add('arrastrando');
    startX = e.pageX - contenedor.offsetLeft;
    scrollLeft = contenedor.scrollLeft;
  });
  contenedor.addEventListener('mouseleave', () => {
    isDown = false;
    contenedor.classList.remove('arrastrando');
  });
  contenedor.addEventListener('mouseup', () => {
    isDown = false;
    contenedor.classList.remove('arrastrando');
  });
  contenedor.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - contenedor.offsetLeft;
    const walk = (x - startX) * 1.5;
    contenedor.scrollLeft = scrollLeft - walk;
  });
}

// --- Inicialización al cargar el DOM ---

document.addEventListener("DOMContentLoaded", function() {
  const btn = document.querySelector('.collapsible-button');
  const filtros = document.querySelector('.filters-content');
  if (btn && filtros) {
    btn.addEventListener('click', function() {
      filtros.style.display = (filtros.style.display === 'block') ? 'none' : 'block';
    });
  }

    setInterval(actualizarFechaHora, 1000);
    actualizarFechaHora();
    cargarEmpleados();
    mostrarRegistros();

    // Configurar botones de navegación

    const controlHorarioBtn = document.getElementById('controlHorarioBtn');
    const libroNovedadesBtn = document.getElementById('libroNovedadesBtn');
    const controlHorarioSection = document.getElementById('controlHorarioSection');
    const libroNovedadesSection = document.getElementById('libroNovedadesSection');

    if (controlHorarioBtn && libroNovedadesBtn && controlHorarioSection && libroNovedadesSection) {
        // Inicialmente mostrar la sección de Control Horario
        controlHorarioSection.style.display = 'block';
        libroNovedadesSection.style.display = 'none';

        controlHorarioBtn.addEventListener('click', () => {
        controlHorarioSection.style.display = 'block';
        libroNovedadesSection.style.display = 'none';
        });
        libroNovedadesBtn.addEventListener('click', () => {
        controlHorarioSection.style.display = 'none';
        libroNovedadesSection.style.display = 'block';
        });
    }

  habilitarArrastreScrollHorizontal('table-container'); 
});