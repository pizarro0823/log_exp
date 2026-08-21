import { useState } from "react";

// ============================================================
// SERVICIOS MICROSOFT GRAPH
// ============================================================

import {
  buscarArchivoExcel,
  obtenerHojasExcel,
  obtenerInventario,
  obtenerDisponibilidad,
  obtenerSalidas,
  comprobarTablaSalidas,
  obtenerMasterData,
} from "./services/graphService.js";

import {
  obtenerPlanificacion,
} from "./services/planificacionService.js";

// ============================================================
// COMPONENTES
// ============================================================

import Planificador from "./components/Planificador.jsx";
import Semanas from "./components/Semanas.jsx";

// ============================================================
// CONVERTIR FILAS DE EXCEL EN OBJETOS
// ============================================================

function convertirTablaObjetos(datos) {
  if (!Array.isArray(datos) || datos.length === 0) {
    return [];
  }

  // Si ya vienen como objetos
  if (
    typeof datos[0] === "object" &&
    !Array.isArray(datos[0])
  ) {
    return datos;
  }

  const encabezados = datos[0];

  if (!Array.isArray(encabezados)) {
    return [];
  }

  return datos
    .slice(1)
    .filter((fila) => Array.isArray(fila))
    .map((fila) => {
      const objeto = {};

      encabezados.forEach((encabezado, index) => {
        objeto[encabezado] = fila[index];
      });

      return objeto;
    });
}

// ============================================================
// CONVERTIR PLANIFICACION DE EXCEL A SEMANAS
// ============================================================

function convertirPlanificacionASemanas(datos) {

  if (
    !Array.isArray(datos) ||
    datos.length <= 1
  ) {
    return [];
  }

  const encabezados = datos[0];

  if (!Array.isArray(encabezados)) {
    return [];
  }

  const filas =
    datos
      .slice(1)
      .filter(
        (fila) =>
          Array.isArray(fila) &&
          fila.length > 0
      );

  const objetos =
    filas.map((fila) => {

      const objeto = {};

      encabezados.forEach(
        (encabezado, index) => {

          objeto[encabezado] =
            fila[index];
        }
      );

      return objeto;
    });

  const semanasMap =
    new Map();

  objetos.forEach((fila) => {

    const semanaID =
      String(
        fila?.SemanaID ?? ""
      ).trim();

    if (!semanaID) {
      return;
    }

    // --------------------------------------------------------
    // CREAR SEMANA
    // --------------------------------------------------------

    if (
      !semanasMap.has(
        semanaID
      )
    ) {

      semanasMap.set(
        semanaID,
        {
          id:
            semanaID,

          numero:
            Number(
              fila?.NumeroSemana
            ) || 0,

          nombreBuque:
            fila?.NombreBuque ||
            "",

          fechaInicio:
            fila?.FechaInicio ||
            "",

          fechaFin:
            fila?.FechaFin ||
            "",

          contenedores: [],
        }
      );
    }

    const semana =
      semanasMap.get(
        semanaID
      );

    // --------------------------------------------------------
    // CONTENEDOR
    // --------------------------------------------------------

    const contenedorID =
      String(
        fila?.ContenedorID ?? ""
      ).trim();

    if (!contenedorID) {
      return;
    }

    let contenedor =
      semana.contenedores.find(
        (item) =>
          String(item.id) ===
          contenedorID
      );

    if (!contenedor) {

      contenedor = {

        id:
          contenedorID,

        codigo:
          fila?.CodigoContenedor ||
          "",

        peso: 0,

        cbm: 0,

        referencias: [],
      };

      semana.contenedores.push(
        contenedor
      );
    }

    // --------------------------------------------------------
    // REFERENCIA
    // --------------------------------------------------------

    const referenceID =
      fila?.ReferenceID;

    const po =
      fila?.PO;

    const referencia =
      fila?.Referencia;

    // Si la fila no tiene referencia,
    // simplemente representa un contenedor vacío.
    if (
      (
        referenceID ===
        null ||
        referenceID ===
        undefined ||
        String(referenceID).trim() === ""
      ) &&
      (
        po ===
        null ||
        po ===
        undefined ||
        String(po).trim() === ""
      ) &&
      (
        referencia ===
        null ||
        referencia ===
        undefined ||
        String(referencia).trim() === ""
      )
    ) {
      return;
    }

    const cantidadCajas =
      Number(
        fila?.CantidadCajas
      ) || 0;

    const unidadesCaja =
      Number(
        fila?.UnidadesCaja
      ) || 0;

    const cantidadUnidades =
      Number(
        fila?.CantidadUnidades
      ) ||
      (
        cantidadCajas *
        unidadesCaja
      );

    const pesoCajaKg =
      Number(
        fila?.PesoCajaKg
      ) || 0;

    const cbmCaja =
      Number(
        fila?.CBMCaja
      ) || 0;

    const pesoTon =
      Number(
        fila?.PesoTon
      ) ||
      (
        cantidadCajas *
        pesoCajaKg
      ) / 1000;

    const cbmTotal =
      Number(
        fila?.CBMTotal
      ) ||
      (
        cantidadCajas *
        cbmCaja
      );

    contenedor.referencias.push({

      availabilityReferenceID:
        referenceID,

      referenceID,

      PO:
        po,

      referencia:
        referencia,

      referenciaDis:
        referencia,

      descripcion:
        fila?.Descripcion ||
        "",

      cantidadCajas,

      unidadesCaja,

      cantidadUnidades,

      pesoCajaKg,

      cbmCaja,
    });

    // --------------------------------------------------------
    // ACUMULAR PESO Y CBM
    // --------------------------------------------------------

    contenedor.peso +=
      pesoTon;

    contenedor.cbm +=
      cbmTotal;
  });

  // ----------------------------------------------------------
  // ORDENAR SEMANAS
  // ----------------------------------------------------------

  return Array.from(
    semanasMap.values()
  ).sort(
    (a, b) =>
      Number(a.numero) -
      Number(b.numero)
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

function App({ msalInstance }) {

  // ==========================================================
  // MICROSOFT
  // ==========================================================

  const [usuario, setUsuario] = useState(null);

  const [cargando, setCargando] = useState(false);

  const [error, setError] = useState("");

  const [excel, setExcel] = useState(null);

  const [hojas, setHojas] = useState([]);

  const [accessToken, setAccessToken] = useState("");

  // ==========================================================
  // DATOS CRUDOS DE EXCEL
  // ==========================================================

  const [inventario, setInventario] = useState([]);

  const [disponibilidad, setDisponibilidad] = useState([]);

  const [salidas, setSalidas] = useState([]);

  const [tablasSalidas, setTablasSalidas] = useState([]);

  const [masterData, setMasterData] = useState([]);

  // ==========================================================
  // DATOS NORMALIZADOS
  // ==========================================================

  const [inventarioObjetos, setInventarioObjetos] = useState([]);

  const [
    disponibilidadObjetos,
    setDisponibilidadObjetos,
  ] = useState([]);

  const [
    masterDataObjetos,
    setMasterDataObjetos,
  ] = useState([]);

  // ==========================================================
  // ESTADO CENTRAL DE PLANIFICACIÓN
  // ==========================================================

  const [semanas, setSemanas] = useState([]);

  // ==========================================================
  // INICIAR SESIÓN
  // ==========================================================

const cargarDatosAplicacion = async (token, cuenta) => {

  try {

    setCargando(true);
    setError("");

    setUsuario(cuenta);
    setAccessToken(token);

    // ======================================================
    // BUSCAR EXCEL
    // ======================================================

    const excelEncontrado =
      await buscarArchivoExcel(token);

    console.log(
      "EXCEL CORRECTO:",
      excelEncontrado
    );

    setExcel(excelEncontrado);

    // ======================================================
    // OBTENER HOJAS
    // ======================================================

    const hojasExcel =
      await obtenerHojasExcel(
        token,
        excelEncontrado.id
      );

    console.log(
      "HOJAS DEL EXCEL CORRECTO:",
      hojasExcel
    );

    setHojas(hojasExcel || []);

    // ======================================================
    // INVENTARIO
    // ======================================================

    const datosInventario =
      await obtenerInventario(
        token,
        excelEncontrado.id
      );

    const inventarioNormalizado =
      convertirTablaObjetos(
        datosInventario
      );

    setInventario(
      datosInventario || []
    );

    setInventarioObjetos(
      inventarioNormalizado
    );

    // ======================================================
    // DISPONIBILIDAD
    // ======================================================

    const datosDisponibilidad =
      await obtenerDisponibilidad(
        token,
        excelEncontrado.id
      );

    const disponibilidadNormalizada =
      convertirTablaObjetos(
        datosDisponibilidad
      );

    setDisponibilidad(
      datosDisponibilidad || []
    );

    setDisponibilidadObjetos(
      disponibilidadNormalizada
    );

    // ======================================================
    // SALIDAS
    // ======================================================

    const datosSalidas =
      await obtenerSalidas(
        token,
        excelEncontrado.id
      );

    setSalidas(
      datosSalidas || []
    );

    // ======================================================
    // TABLAS DE SALIDAS
    // ======================================================

    const tablas =
      await comprobarTablaSalidas(
        token,
        excelEncontrado.id
      );

    setTablasSalidas(
      tablas || []
    );

    // ======================================================
    // MASTER DATA
    // ======================================================

    const datosMaster =
      await obtenerMasterData(
        token,
        excelEncontrado.id
      );

    const masterNormalizado =
      convertirTablaObjetos(
        datosMaster
      );

    setMasterData(
      datosMaster || []
    );

    setMasterDataObjetos(
      masterNormalizado
    );

    // ======================================================
    // PLANIFICACION
    // ======================================================

    const datosPlanificacion =
      await obtenerPlanificacion(
        token
      );

    const semanasCargadas =
      convertirPlanificacionASemanas(
        datosPlanificacion
      );

    setSemanas(
      semanasCargadas
    );

    console.log(
      "=========================================="
    );

    console.log(
      "CONEXIÓN COMPLETA CON LOGISTICSDB1.XLSM"
    );

    console.log(
      "=========================================="
    );

  } catch (error) {

    console.error(
      "ERROR CARGANDO APLICACIÓN:",
      error
    );

    setError(
      error?.message ||
      "No fue posible cargar la información."
    );

  } finally {

    setCargando(false);

  }
};

const iniciarSesion = async () => {

  try {

    setError("");
    setCargando(true);

    // ======================================================
    // LOGIN MICROSOFT
    // ======================================================

    const response =
      await msalInstance.loginPopup({

        scopes: [
          "User.Read",
          "Files.ReadWrite",
        ],

        prompt: "select_account",

      });

    console.log(
      "LOGIN MICROSOFT EXITOSO:",
      response
    );

    const cuenta =
      response.account;

    const token =
      response.accessToken;

    // ======================================================
    // CARGAR TODA LA APLICACIÓN
    // ======================================================

    await cargarDatosAplicacion(
      token,
      cuenta
    );

  } catch (error) {

    console.error(
      "ERROR INICIANDO SESIÓN:",
      error
    );

    setCargando(false);

    if (
      error?.errorCode ===
      "interaction_in_progress"
    ) {

      setError(
        "Hay una autenticación de Microsoft en proceso. Espera unos segundos y vuelve a intentar."
      );

    } else if (
      error?.errorCode ===
      "timed_out"
    ) {

      setError(
        "Microsoft tardó demasiado en responder. Cierra la ventana de Microsoft y vuelve a intentar."
      );

    } else {

      setError(
        error?.message ||
        "No fue posible iniciar sesión con Microsoft."
      );

    }

  }

};

  // ==========================================================
  // CERRAR SESIÓN
  // ==========================================================

  const cerrarSesion = async () => {

    try {

      await msalInstance.logoutPopup();

      setUsuario(null);

      setExcel(null);

      setHojas([]);

      setInventario([]);

      setDisponibilidad([]);

      setSalidas([]);

      setTablasSalidas([]);

      setMasterData([]);

      setInventarioObjetos([]);

      setDisponibilidadObjetos([]);

      setMasterDataObjetos([]);

      setAccessToken("");

      // ------------------------------------------------------
      // LIMPIAR PLANIFICACIÓN
      // ------------------------------------------------------

      setSemanas([]);

      setError("");

    } catch (error) {

      console.error(
        "Error cerrando sesión:",
        error
      );

      setError(
        error?.message ||
        "No se pudo cerrar la sesión."
      );

    }

  };

  // ==========================================================
  // MOSTRAR TABLAS DE EXCEL
  // ==========================================================

  const mostrarTabla = (
    datos,
    titulo
  ) => {

    if (
      !Array.isArray(datos) ||
      datos.length === 0
    ) {

      return (

        <div className="mt-4 bg-gray-50 rounded-lg p-4">

          <p className="text-gray-500">
            No hay datos en {titulo}.
          </p>

        </div>

      );

    }

    const encabezados = datos[0];

    const filas = datos.slice(1);

    return (

      <div className="mt-4 overflow-x-auto">

        <table className="min-w-full border border-gray-200">

          <thead className="bg-gray-100">

            <tr>

              {Array.isArray(encabezados) &&
                encabezados.map(
                  (
                    encabezado,
                    index
                  ) => (

                    <th
                      key={index}
                      className="border px-4 py-2 text-left text-sm font-semibold"
                    >
                      {encabezado}
                    </th>

                  )
                )}

            </tr>

          </thead>

          <tbody>

            {filas.map(
              (
                fila,
                filaIndex
              ) => (

                <tr
                  key={filaIndex}
                  className="hover:bg-gray-50"
                >

                  {Array.isArray(fila) &&
                    fila.map(
                      (
                        valor,
                        columnaIndex
                      ) => (

                        <td
                          key={columnaIndex}
                          className="border px-4 py-2 text-sm"
                        >
                          {valor}
                        </td>

                      )
                    )}

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>

    );

  };

  // ==========================================================
  // INTERFAZ
  // ==========================================================

  return (

    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-7xl mx-auto">

        <div className="bg-white rounded-2xl shadow-lg p-8">

          {/* ==================================================
              ENCABEZADO
          ================================================== */}

          <div className="flex justify-between items-start">

            <div>

              <h1 className="text-3xl font-bold text-blue-700">
                Logistics Export Planner
              </h1>

              <p className="text-gray-500 mt-2">
                Planificación logística conectada
              </p>

            </div>

            {usuario && (

              <button
                onClick={cerrarSesion}
                className="bg-gray-700 hover:bg-gray-800 text-white py-2 px-5 rounded-lg"
              >
                Cerrar sesión
              </button>

            )}

          </div>

          {/* ==================================================
              LOGIN
          ================================================== */}

          {!usuario ? (

            <div className="mt-8">

              <button
                onClick={iniciarSesion}
                disabled={cargando}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg"
              >

                {cargando
                  ? "Conectando..."
                  : "Iniciar sesión con Microsoft"
                }

              </button>

            </div>

          ) : (

            <div className="mt-8">

              {/* =================================================
                  USUARIO
              ================================================= */}

              <div className="bg-green-50 border border-green-200 rounded-xl p-5">

                <p className="text-green-700 font-semibold">
                  ✓ DB conectado
                </p>

                <p className="mt-1">
                  USUARIO :
                  {usuario.name ||
                    usuario.username}
                </p>

              </div>

              {/* =================================================
                  EXCEL
              ================================================= */}

              {  /* {excel && (

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">

                  <p className="text-blue-700 font-semibold">
                    Archivo conectado
                  </p>

                  <p className="mt-1 font-medium">
                    {excel.name}
                  </p>

                </div>

              )}*/}

              <div className="mt-1 border-t pt-1">

                {/* =================================================
                    SEMANAS
                ================================================= */}

                <div className="mt-6 w-full overflow-x-auto">

                  <div className="min-w-max">

                    <Semanas
                      semanas={semanas}
                      setSemanas={setSemanas}
                      disponibilidad={disponibilidadObjetos}
                      inventario={inventarioObjetos}
                      masterData={masterDataObjetos}
                      accessToken={accessToken}
                    />

                  </div>

                </div>

              </div>

            </div>

          )}

        </div>

      </div>

    </div>

  );

}

// ============================================================
// EXPORT
// ============================================================

export default App;