import { useState } from "react";
import {
  guardarPlanificacion,
} from "../services/planificacionService";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";


const MAX_CONTENEDORES = 18;
const MAX_PESO = 19;
const MAX_CBM = 71;
const MAX_RESULTADOS = 10;

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

const normalizarTexto = (valor) => {
  return String(valor ?? "")
    .trim()
    .toUpperCase();
};

// ------------------------------------------------------------
// CONVERTIR NÚMEROS DE EXCEL
//
// Soporta:
//
// 0.025
// "0.025"
// "0,025"
// " 0,025 "
// ------------------------------------------------------------

const convertirNumero = (valor) => {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return 0;
  }

  if (typeof valor === "number") {
    return Number.isFinite(valor)
      ? valor
      : 0;
  }

  const texto = String(valor)
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  const numero = Number(texto);

  return Number.isFinite(numero)
    ? numero
    : 0;
};

// ============================================================
// CONTENEDOR ARRASTRABLE
// ============================================================

function ContenedorDraggable({
  semana,
  contenedor,
  children,
  disabled = false,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `contenedor-${contenedor.id}`,
    disabled,
    data: {
      tipo: "contenedor",
      contenedor,
      semanaId: semana.id,
    },
  });

  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={
        isDragging
          ? "opacity-40 cursor-grabbing"
          : "cursor-grab"
      }
    >
      {children}
    </div>
  );
}


// ============================================================
// ZONA DONDE SE PUEDE SOLTAR UN CONTENEDOR
// ============================================================

function SemanaDroppable({
  semana,
  children,
}) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: `semana-${semana.id}`,
    data: {
      tipo: "semana",
      semanaId: semana.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={
        isOver
          ? "ring-4 ring-blue-400 ring-opacity-60 rounded-xl"
          : ""
      }
    >
      {children}
    </div>
  );
}


// ============================================================
// COMPONENTE
// ============================================================



function Semanas({
  semanas = [],
  setSemanas,
  disponibilidad = [],
  masterData = [],
  accessToken,
  msalInstance,
}) {

  // ==========================================================
  // MODALES
  // ==========================================================

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [contenedorArrastrado, setContenedorArrastrado] =
    useState(null);


  const [modalSemana, setModalSemana] =
    useState(false);

  const [modalEditar, setModalEditar] =
    useState(false);

  const [modalContenedor, setModalContenedor] =
    useState(false);

  // ==========================================================
  // SELECCIONES
  // ==========================================================

  const [semanaSeleccionada, setSemanaSeleccionada] =
    useState(null);

  const [
    semanaContenedorSeleccionada,
    setSemanaContenedorSeleccionada,
  ] = useState(null);

  const [
    contenedorSeleccionado,
    setContenedorSeleccionado,
  ] = useState(null);

  // ==========================================================
  // DATOS SEMANA
  // ==========================================================

  const [nombreBuque, setNombreBuque] =
    useState("");

  const [fechaInicio, setFechaInicio] =
    useState("");

  const [fechaFin, setFechaFin] =
    useState("");

  const [
    cantidadContenedores,
    setCantidadContenedores,
  ] = useState(1);

  // ==========================================================
  // BUSCADOR
  // ==========================================================

  const [
    busquedaReferencia,
    setBusquedaReferencia,
  ] = useState("");

  // ==========================================================
  // CANTIDADES SELECCIONADAS
  //
  // LA CLAVE ES UNA LÍNEA ESPECÍFICA DE
  // DISPONIBILIDAD.
  //
  // Esto permite tener:
  //
  // MISMA REFERENCIA
  // + PO DIFERENTE
  // + CANTIDAD DIFERENTE
  //
  // sin mezclarlas.
  // ==========================================================

  const [
    referenciasSeleccionadas,
    setReferenciasSeleccionadas,
  ] = useState({});

  // ==========================================================
  // ERROR
  // ==========================================================

  const [error, setError] =
    useState("");

  // ==========================================================
  // CREAR CLAVE ÚNICA
  //
  // NO AGRUPAMOS LAS FILAS DE DISPONIBILIDAD.
  // ==========================================================



  const crearAvailabilityKey = (
    fila,
    index
  ) => {

    return [
      fila?.ReferenceID,
      fila?.PO,
      fila?.Referencia_dis,
      index,
    ]
      .map((valor) =>
        String(valor ?? "")
          .trim()
          .toUpperCase()
      )
      .join("__");
  };

  // ==========================================================
  // PREPARAR DISPONIBILIDAD
  // ==========================================================

  const disponibilidadConClave =
    Array.isArray(disponibilidad)
      ? disponibilidad.map(
        (fila, index) => ({
          ...fila,

          _availabilityKey:
            crearAvailabilityKey(
              fila,
              index
            ),

          _indexDisponibilidad:
            index,
        })
      )
      : [];

  // ==========================================================
  // OBTENER MASTER DATA
  //
  // RELACIÓN:
  //
  // DISPONIBILIDAD.Referencia_dis
  // =
  // MASTER_DATA.Referencia_mas
  //
  // MASTER_DATA SOLO COMPLEMENTA.
  // ==========================================================

  const obtenerMasterDataReferencia = (
    referenciaDis
  ) => {

    if (!referenciaDis) {
      return null;
    }

    const referenciaBuscada =
      normalizarTexto(
        referenciaDis
      );

    return (
      masterData.find(
        (master) =>
          normalizarTexto(
            master?.Referencia_mas
          ) === referenciaBuscada
      ) || null
    );
  };

  // ==========================================================
  // OBTENER CLAVE DE DISPONIBILIDAD
  //
  // IMPORTANTE:
  // Se debe usar la misma clave con la que se
  // guardaron las cantidades.
  // ==========================================================

  const obtenerClaveDisponibilidad = (
    fila
  ) => {

    if (!fila) {
      return "";
    }

    if (
      fila?._availabilityKey
    ) {
      return fila._availabilityKey;
    }

    return crearAvailabilityKey(
      fila,
      fila?._indexDisponibilidad ?? 0
    );
  };

  // ==========================================================
  // OBTENER DISPONIBILIDAD REAL
  //
  // Cajas disponibles de la línea original
  // MENOS las cajas ya asignadas a otros
  // contenedores.
  //
  // Cada línea se identifica por:
  //
  // ReferenceID + PO
  //
  // ==========================================================

  const obtenerDisponibilidadReal = (
    filaDisponibilidad
  ) => {

    if (!filaDisponibilidad) {
      return 0;
    }

    const disponibilidadOriginal =
      convertirNumero(
        filaDisponibilidad?.CajasDisponibles
      );

    const referenceID =
      filaDisponibilidad?.ReferenceID;

    const po =
      filaDisponibilidad?.PO;

    let asignado = 0;

    // --------------------------------------------------------
    // SUMAR LO QUE YA FUE ASIGNADO
    // --------------------------------------------------------

    semanas.forEach(
      (semana) => {

        (
          semana?.contenedores || []
        ).forEach(
          (contenedor) => {

            (
              contenedor?.referencias || []
            ).forEach(
              (ref) => {

                const mismaLinea =
                  String(
                    ref?.availabilityReferenceID ??
                    ""
                  ) ===
                  String(
                    referenceID ??
                    ""
                  ) &&
                  normalizarTexto(
                    ref?.PO
                  ) ===
                  normalizarTexto(
                    po
                  );

                if (mismaLinea) {

                  asignado +=
                    convertirNumero(
                      ref?.cantidadCajas
                    );
                }
              }
            );
          }
        );
      }
    );

    // --------------------------------------------------------
    // SI ESTAMOS EDITANDO ESTE CONTENEDOR
    //
    // DEVOLVEMOS SUS PROPIAS CAJAS.
    // --------------------------------------------------------

    let cantidadActualContenedor = 0;

    if (
      contenedorSeleccionado
    ) {

      const referenciaActual =
        (
          contenedorSeleccionado
            ?.referencias || []
        ).find(
          (ref) => {

            return (
              String(
                ref?.availabilityReferenceID ??
                ""
              ) ===
              String(
                referenceID ??
                ""
              ) &&
              normalizarTexto(
                ref?.PO
              ) ===
              normalizarTexto(
                po
              )
            );
          }
        );

      cantidadActualContenedor =
        convertirNumero(
          referenciaActual?.cantidadCajas
        );
    }

    const disponibleReal =
      disponibilidadOriginal -
      asignado +
      cantidadActualContenedor;

    return Math.max(
      disponibleReal,
      0
    );
  };

  // ==========================================================
  // CALCULAR CARGA
  //
  // AQUÍ ESTÁ UNO DE LOS CAMBIOS IMPORTANTES.
  //
  // Cada referencia debe traer:
  //
  // cantidadCajas
  // pesoCajaKg
  // cbmCaja
  // unidadesCaja
  //
  // ==========================================================

  const calcularCarga = (
    referencias
  ) => {

    let pesoKg = 0;
    let cbm = 0;
    let cajas = 0;
    let unidades = 0;

    (
      referencias || []
    ).forEach(
      (ref) => {

        const cantidad =
          convertirNumero(
            ref?.cantidadCajas
          );

        const pesoCaja =
          convertirNumero(
            ref?.pesoCajaKg
          );

        const cbmCaja =
          convertirNumero(
            ref?.cbmCaja
          );

        const unidadesCaja =
          convertirNumero(
            ref?.unidadesCaja
          );

        pesoKg +=
          cantidad *
          pesoCaja;

        cbm +=
          cantidad *
          cbmCaja;

        cajas +=
          cantidad;

        unidades +=
          cantidad *
          unidadesCaja;
      }
    );

    return {

      pesoKg,

      pesoTon:
        pesoKg / 1000,

      cbm,

      cajas,

      unidades,
    };
  };

  // ==========================================================
  // CONSTRUIR REFERENCIAS ACTUALES PARA CALCULAR
  //
  // IMPORTANTE:
  // Busca nuevamente la fila de DISPONIBILIDAD
  // y luego la relaciona con MASTER_DATA.
  //
  // Esto evita que CBM/PESO queden en 0.
  // ==========================================================

  const obtenerReferenciasParaCalculo = () => {

    return Object.entries(
      referenciasSeleccionadas
    )
      .map(
        ([
          availabilityKey,
          cantidadCajas,
        ]) => {

          const fila =
            disponibilidadConClave.find(
              (item) =>
                item?._availabilityKey ===
                availabilityKey
            );

          if (!fila) {
            return null;
          }

          const master =
            obtenerMasterDataReferencia(
              fila?.Referencia_dis
            );

          return {

            availabilityKey,

            referenciaDis:
              fila?.Referencia_dis,

            PO:
              fila?.PO,

            cantidadCajas,

            pesoCajaKg:
              convertirNumero(
                master?.PesoCajaKg
              ),

            cbmCaja:
              convertirNumero(
                master?.CBM
              ),

            unidadesCaja:
              convertirNumero(
                master?.UnidadesCaja
              ),
          };
        }
      )
      .filter(Boolean);
  };

  // ==========================================================
  // CREAR CONTENEDORES
  // ==========================================================

  const crearContenedores = (
    cantidad
  ) => {

    const numero =
      Math.min(
        Math.max(
          convertirNumero(
            cantidad
          ) || 1,
          1
        ),
        MAX_CONTENEDORES
      );

    return Array.from(
      {
        length: numero,
      },
      (_, index) => ({

        id:
          crypto.randomUUID(),

        codigo:
          `C-${String(
            index + 1
          ).padStart(
            3,
            "0"
          )}`,

        peso: 0,

        cbm: 0,

        referencias: [],
      })
    );
  };

  // ==========================================================
  // CREAR SEMANA
  // ==========================================================

  const abrirCrearSemana = () => {

    setNombreBuque("");

    setFechaInicio("");

    setFechaFin("");

    setCantidadContenedores(1);

    setError("");

    setModalSemana(true);
  };

  // ==========================================================
  // GUARDAR SEMANA
  // ==========================================================

  // ============================================================
  // DRAG & DROP
  // ============================================================

  const manejarDragStart = (event) => {
    const contenedor = event?.active?.data?.current?.contenedor;
    if (contenedor) setContenedorArrastrado(contenedor);
  };

  const manejarDragCancel = () => {
    setContenedorArrastrado(null);
  };

  const manejarDragEnd = async (event) => {
    const { active, over } = event;
    setContenedorArrastrado(null);

    if (!active || !over) return;

    const activeData = active.data?.current;
    const overData = over.data?.current;

    if (
      activeData?.tipo !== "contenedor" ||
      overData?.tipo !== "semana"
    ) {
      return;
    }

    const semanaOrigenId = activeData.semanaId;
    const semanaDestinoId = overData.semanaId;
    const contenedorId = activeData?.contenedor?.id;

    if (
      !semanaOrigenId ||
      !semanaDestinoId ||
      !contenedorId ||
      String(semanaOrigenId) === String(semanaDestinoId)
    ) {
      return;
    }

    const semanaDestino = semanas.find(
      (semana) => String(semana.id) === String(semanaDestinoId)
    );

    if (!semanaDestino) return;

    if ((semanaDestino.contenedores || []).length >= MAX_CONTENEDORES) {
      setError(
        `La semana ${semanaDestino.numero} ya tiene el máximo de ${MAX_CONTENEDORES} contenedores.`
      );
      return;
    }

    const semanaOrigen = semanas.find(
      (semana) => String(semana.id) === String(semanaOrigenId)
    );

    if (!semanaOrigen) return;

    const contenedor = (semanaOrigen.contenedores || []).find(
      (item) => String(item.id) === String(contenedorId)
    );

    if (!contenedor) return;

    const semanasActualizadas = semanas.map((semana) => {
      if (String(semana.id) === String(semanaOrigenId)) {
        return {
          ...semana,
          contenedores: (semana.contenedores || []).filter(
            (item) => String(item.id) !== String(contenedorId)
          ),
        };
      }

      if (String(semana.id) === String(semanaDestinoId)) {
        return {
          ...semana,
          contenedores: [
            ...(semana.contenedores || []),
            contenedor,
          ],
        };
      }

      return semana;
    });

    setSemanas(semanasActualizadas);
    setError("");

    try {
      await guardarPlanificacionExcel(semanasActualizadas);
      console.log("DRAG & DROP GUARDADO EN EXCEL.");
    } catch (error) {
      console.error("Error guardando Drag & Drop:", error);
    }
  };

  // ============================================================
  // GUARDAR SEMANA
  // ============================================================

  const guardarSemana = () => {

    setError("");

    if (!nombreBuque.trim()) {

      setError(
        "Debes ingresar el nombre del buque."
      );

      return;
    }

    if (!fechaInicio) {

      setError(
        "Debes seleccionar la fecha de inicio."
      );

      return;
    }

    if (!fechaFin) {

      setError(
        "Debes seleccionar la fecha de fin."
      );

      return;
    }

    if (
      new Date(fechaFin) <
      new Date(fechaInicio)
    ) {

      setError(
        "La fecha final no puede ser anterior a la fecha inicial."
      );

      return;
    }

    const numeroContenedores =
      Math.min(
        Math.max(
          convertirNumero(
            cantidadContenedores
          ) || 1,
          1
        ),
        MAX_CONTENEDORES
      );

    const nuevaSemana = {

      id:
        crypto.randomUUID(),

      numero:
        semanas.length + 1,

      nombreBuque:
        nombreBuque.trim(),

      fechaInicio,

      fechaFin,

      contenedores:
        crearContenedores(
          numeroContenedores
        ),
    };

    const semanasActualizadas = [
      ...semanas,
      nuevaSemana,
    ];

    setSemanas(semanasActualizadas);

    guardarPlanificacionExcel(semanasActualizadas);

    setModalSemana(false);

    setNombreBuque("");

    setFechaInicio("");

    setFechaFin("");

    setCantidadContenedores(1);

    setError("");
  };

  // ==========================================================
  // EDITAR SEMANA
  // ==========================================================

  const abrirEditarSemana = (
    semana
  ) => {

    setSemanaSeleccionada(
      semana
    );

    setNombreBuque(
      semana?.nombreBuque || ""
    );

    setFechaInicio(
      semana?.fechaInicio || ""
    );

    setFechaFin(
      semana?.fechaFin || ""
    );

    setCantidadContenedores(
      semana?.contenedores?.length || 1
    );

    setError("");

    setModalEditar(true);
  };

  // ==========================================================
  // GUARDAR EDICIÓN
  // ==========================================================

  const guardarEdicion = () => {

    setError("");

    if (!semanaSeleccionada) {

      setError(
        "No hay una semana seleccionada."
      );

      return;
    }

    if (!nombreBuque.trim()) {

      setError(
        "Debes ingresar el nombre del buque."
      );

      return;
    }

    if (
      !fechaInicio ||
      !fechaFin
    ) {

      setError(
        "Debes ingresar las fechas."
      );

      return;
    }

    if (
      new Date(fechaFin) <
      new Date(fechaInicio)
    ) {

      setError(
        "La fecha final no puede ser anterior a la fecha inicial."
      );

      return;
    }

    const cantidadNueva =
      Math.min(
        Math.max(
          convertirNumero(
            cantidadContenedores
          ) || 1,
          1
        ),
        MAX_CONTENEDORES
      );

    const contenedoresActuales =
      semanaSeleccionada
        ?.contenedores || [];

    // --------------------------------------------------------
    // VALIDAR ELIMINACIÓN
    // --------------------------------------------------------

    if (
      cantidadNueva <
      contenedoresActuales.length
    ) {

      const sobrantes =
        contenedoresActuales.slice(
          cantidadNueva
        );

      const tienenCarga =
        sobrantes.some(
          (contenedor) =>
            Array.isArray(
              contenedor?.referencias
            ) &&
            contenedor
              .referencias
              .length > 0
        );

      if (tienenCarga) {

        setError(
          "No puedes reducir los contenedores porque algunos de los que deseas eliminar tienen referencias asignadas."
        );

        return;
      }
    }

    let nuevosContenedores = [
      ...contenedoresActuales,
    ];

    // --------------------------------------------------------
    // AGREGAR
    // --------------------------------------------------------

    if (
      cantidadNueva >
      nuevosContenedores.length
    ) {

      const cantidadAgregar =
        cantidadNueva -
        nuevosContenedores.length;

      const nuevos =
        Array.from(
          {
            length:
              cantidadAgregar,
          },
          (_, index) => ({

            id:
              crypto.randomUUID(),

            codigo:
              `C-${String(
                nuevosContenedores.length +
                index +
                1
              ).padStart(
                3,
                "0"
              )}`,

            peso: 0,

            cbm: 0,

            referencias: [],
          })
        );

      nuevosContenedores = [
        ...nuevosContenedores,
        ...nuevos,
      ];
    }

    // --------------------------------------------------------
    // REDUCIR
    // --------------------------------------------------------

    if (
      cantidadNueva <
      nuevosContenedores.length
    ) {

      nuevosContenedores =
        nuevosContenedores.slice(
          0,
          cantidadNueva
        );
    }

    // --------------------------------------------------------
    // ACTUALIZAR
    // --------------------------------------------------------

    const semanasActualizadas = semanas.map((semana) => {
      if (semana.id !== semanaSeleccionada.id) {
        return semana;
      }

      return {
        ...semana,
        nombreBuque: nombreBuque.trim(),
        fechaInicio,
        fechaFin,
        contenedores: nuevosContenedores,
      };
    });

    setSemanas(semanasActualizadas);

    guardarPlanificacionExcel(semanasActualizadas);

    setModalEditar(false);

    setSemanaSeleccionada(
      null
    );

    setError("");
  };

  // ==========================================================
  // ELIMINAR SEMANA
  // ==========================================================

  const eliminarSemana = (
    semana
  ) => {

    setError("");

    const tieneCarga =
      semana?.contenedores?.some(
        (contenedor) =>
          Array.isArray(
            contenedor?.referencias
          ) &&
          contenedor
            .referencias
            .length > 0
      );

    if (tieneCarga) {

      setError(
        "No puedes eliminar una semana que tiene referencias asignadas."
      );

      return;
    }

    const confirmar =
      window.confirm(
        `¿Deseas eliminar la semana ${semana.numero} y todos sus contenedores?`
      );

    if (!confirmar) {
      return;
    }

    const semanasActualizadas = semanas
      .filter((item) => item.id !== semana.id)
      .map((item, index) => ({
        ...item,
        numero: index + 1,
      }));

    setSemanas(semanasActualizadas);

    guardarPlanificacionExcel(semanasActualizadas);
  };

  // ==========================================================
  // ABRIR CONTENEDOR
  // ==========================================================

  const abrirContenedor = (
    semana,
    contenedor
  ) => {

    setSemanaContenedorSeleccionada(
      semana
    );

    setContenedorSeleccionado(
      contenedor
    );

    const seleccionadas = {};

    (
      contenedor?.referencias || []
    ).forEach(
      (ref) => {

        const disponibilidadEncontrada =
          disponibilidadConClave.find(
            (fila) => {

              return (
                String(
                  fila?.ReferenceID ??
                  ""
                ) ===
                String(
                  ref?.availabilityReferenceID ??
                  ""
                ) &&
                normalizarTexto(
                  fila?.PO
                ) ===
                normalizarTexto(
                  ref?.PO
                )
              );
            }
          );

        if (
          disponibilidadEncontrada
        ) {

          const clave =
            disponibilidadEncontrada
              ._availabilityKey;

          seleccionadas[clave] =
            convertirNumero(
              ref?.cantidadCajas
            );
        }
      }
    );

    setReferenciasSeleccionadas(
      seleccionadas
    );

    setBusquedaReferencia("");

    setError("");

    setModalContenedor(true);
  };

  // ==========================================================
  // CAMBIAR CANTIDAD
  // ==========================================================

  const cambiarCantidadReferencia = (
    filaDisponibilidad,
    cantidad
  ) => {

    if (
      !filaDisponibilidad
    ) {
      return;
    }

    const clave =
      obtenerClaveDisponibilidad(
        filaDisponibilidad
      );

    if (!clave) {
      return;
    }

    const valor =
      Math.max(
        convertirNumero(
          cantidad
        ),
        0
      );

    const disponible =
      obtenerDisponibilidadReal(
        filaDisponibilidad
      );

    const cantidadFinal =
      Math.min(
        valor,
        disponible
      );

    setReferenciasSeleccionadas(
      (actuales) => ({

        ...actuales,

        [clave]:
          cantidadFinal,
      })
    );
  };

  // ==========================================================
  // INCREMENTAR
  // ==========================================================

  const incrementarReferencia = (
    filaDisponibilidad
  ) => {

    if (
      !filaDisponibilidad
    ) {
      return;
    }

    const clave =
      obtenerClaveDisponibilidad(
        filaDisponibilidad
      );

    const actual =
      convertirNumero(
        referenciasSeleccionadas[
        clave
        ]
      );

    const disponible =
      obtenerDisponibilidadReal(
        filaDisponibilidad
      );

    if (
      actual >=
      disponible
    ) {
      return;
    }

    cambiarCantidadReferencia(
      filaDisponibilidad,
      actual + 1
    );
  };

  // ==========================================================
  // DECREMENTAR
  // ==========================================================

  const decrementarReferencia = (
    filaDisponibilidad
  ) => {

    if (
      !filaDisponibilidad
    ) {
      return;
    }

    const clave =
      obtenerClaveDisponibilidad(
        filaDisponibilidad
      );

    const actual =
      convertirNumero(
        referenciasSeleccionadas[
        clave
        ]
      );

    cambiarCantidadReferencia(
      filaDisponibilidad,
      Math.max(
        actual - 1,
        0
      )
    );
  };

  // ============================================================
  // OBTENER TOKEN MICROSOFT VIGENTE
  // ============================================================
  // El accessToken recibido por props puede expirar después de un
  // tiempo. Nunca usamos directamente ese token para guardar en
  // Excel si tenemos MSAL disponible. Primero intentamos obtener
  // uno nuevo de forma silenciosa.

  const obtenerAccessTokenVigente = async () => {
    if (!msalInstance) {
      if (!accessToken) {
        throw new Error(
          "No existe una sesión de Microsoft disponible."
        );
      }

      return accessToken;
    }

    const cuentas =
      msalInstance.getAllAccounts?.() || [];

    const cuenta =
      msalInstance.getActiveAccount?.() ||
      cuentas[0];

    if (!cuenta) {
      throw new Error(
        "No existe una cuenta Microsoft activa. Inicia sesión nuevamente."
      );
    }

    const request = {
      scopes: [
        "User.Read",
        "Files.ReadWrite",
      ],
      account: cuenta,
    };

    try {
      // ----------------------------------------------------------
      // 1. INTENTAR TOKEN SILENCIOSO
      // ----------------------------------------------------------
      const response =
        await msalInstance.acquireTokenSilent(
          request
        );

      if (!response?.accessToken) {
        throw new Error(
          "Microsoft no devolvió un accessToken válido."
        );
      }

      return response.accessToken;
    } catch (silentError) {
      console.warn(
        "No fue posible renovar el token silenciosamente. Se solicitará autenticación interactiva.",
        silentError
      );

      // ----------------------------------------------------------
      // 2. SI EL TOKEN EXPIRÓ Y MSAL NECESITA INTERACCIÓN
      // ----------------------------------------------------------
      const response =
        await msalInstance.acquireTokenPopup(
          request
        );

      if (!response?.accessToken) {
        throw new Error(
          "Microsoft no devolvió un accessToken después de la autenticación."
        );
      }

      return response.accessToken;
    }
  };

  // ============================================================
  // GUARDAR PLANIFICACIÓN EN EXCEL
  // ============================================================

  const guardarPlanificacionExcel = async (semanasActualizadas) => {
    try {
      // ----------------------------------------------------------
      // OBTENER SIEMPRE UN TOKEN VIGENTE
      // ----------------------------------------------------------
      const tokenVigente =
        await obtenerAccessTokenVigente();

      console.log(
        "TOKEN VIGENTE OBTENIDO. GUARDANDO PLANIFICACIÓN..."
      );

      await guardarPlanificacion(
        tokenVigente,
        semanasActualizadas
      );

      console.log(
        "PLANIFICACIÓN GUARDADA CORRECTAMENTE EN EXCEL."
      );
    } catch (error) {
      console.error(
        "Error guardando planificación en Excel:",
        error
      );
    }
  };

  // ==========================================================
  // GUARDAR CONTENEDOR
  // ==========================================================

  const guardarContenedor = () => {

    if (
      !contenedorSeleccionado ||
      !semanaContenedorSeleccionada
    ) {
      return;
    }

    setError("");

    const referencias = [];

    // --------------------------------------------------------
    // RECORRER SELECCIONES
    // --------------------------------------------------------

    Object.entries(
      referenciasSeleccionadas
    ).forEach(
      ([
        availabilityKey,
        cantidadCajas,
      ]) => {

        const cantidad =
          convertirNumero(
            cantidadCajas
          );

        if (
          cantidad <= 0
        ) {
          return;
        }

        // ------------------------------------------------------
        // BUSCAR LÍNEA ORIGINAL
        // ------------------------------------------------------

        const filaDisponibilidad =
          disponibilidadConClave.find(
            (fila) =>
              fila?._availabilityKey ===
              availabilityKey
          );

        if (
          !filaDisponibilidad
        ) {
          return;
        }

        // ------------------------------------------------------
        // DATOS DE DISPONIBILIDAD
        // ------------------------------------------------------

        const referenceID =
          filaDisponibilidad
            ?.ReferenceID;

        const po =
          filaDisponibilidad
            ?.PO;

        const referenciaDis =
          filaDisponibilidad
            ?.Referencia_dis;

        // ------------------------------------------------------
        // MASTER DATA
        // ------------------------------------------------------

        const master =
          obtenerMasterDataReferencia(
            referenciaDis
          );

        if (!master) {

          setError(
            `La referencia ${referenciaDis} no tiene información correspondiente en MASTER_DATA.`
          );

          return;
        }

        // ------------------------------------------------------
        // DISPONIBILIDAD REAL
        // ------------------------------------------------------

        const disponible =
          obtenerDisponibilidadReal(
            filaDisponibilidad
          );

        if (
          cantidad >
          disponible
        ) {

          setError(
            `No puedes asignar ${cantidad} cajas para la PO ${po}. Solo hay ${disponible} cajas disponibles.`
          );

          return;
        }

        // ------------------------------------------------------
        // DATOS MASTER
        // ------------------------------------------------------

        const unidadesCaja =
          convertirNumero(
            master?.UnidadesCaja
          );

        const cbmCaja =
          convertirNumero(
            master?.CBM
          );

        const pesoCajaKg =
          convertirNumero(
            master?.PesoCajaKg
          );

        // ------------------------------------------------------
        // CONSTRUIR REFERENCIA
        // ------------------------------------------------------

        referencias.push({

          // Clave de la línea
          availabilityKey,

          // ID de DISPONIBILIDAD
          availabilityReferenceID:
            referenceID,

          // ReferenceID original
          referenceID,

          // PO de DISPONIBILIDAD
          PO:
            po,

          // Referencia viene de DISPONIBILIDAD
          referencia:
            referenciaDis,

          // También guardamos este nombre
          // para compatibilidad con tooltip
          referenciaDis:
            referenciaDis,

          // Cantidad seleccionada
          cantidadCajas:
            cantidad,

          // MASTER DATA
          descripcion:
            master?.Descripcion ||
            "",

          unidadesCaja,

          cbmCaja,

          pesoCajaKg,

          cantidadUnidades:
            cantidad *
            unidadesCaja,
        });
      }
    );

    // --------------------------------------------------------
    // CALCULAR CARGA
    // --------------------------------------------------------

    const carga =
      calcularCarga(
        referencias
      );

    // --------------------------------------------------------
    // VALIDAR PESO
    // --------------------------------------------------------

    if (
      carga.pesoTon >
      MAX_PESO
    ) {

      setError(
        `El contenedor supera el límite de ${MAX_PESO} toneladas.`
      );

      return;
    }

    // --------------------------------------------------------
    // VALIDAR CBM
    // --------------------------------------------------------

    if (
      carga.cbm >
      MAX_CBM
    ) {

      setError(
        `El contenedor supera el límite de ${MAX_CBM} CBM.`
      );

      return;
    }

    // --------------------------------------------------------
    // GUARDAR EN SEMANAS
    // --------------------------------------------------------

    // IMPORTANTE:
    // Calculamos las semanas actualizadas FUERA de setSemanas.
    // No debemos ejecutar guardarPlanificacionExcel()
    // dentro del updater de React.

    const semanasActualizadas = semanas.map(
      (semana) => {

        if (
          semana.id !==
          semanaContenedorSeleccionada.id
        ) {
          return semana;
        }

        return {

          ...semana,

          contenedores:
            (
              semana.contenedores ||
              []
            ).map(
              (contenedor) => {

                if (
                  contenedor.id !==
                  contenedorSeleccionado.id
                ) {
                  return contenedor;
                }

                return {

                  ...contenedor,

                  peso:
                    carga.pesoTon,

                  cbm:
                    carga.cbm,

                  referencias,
                };
              }
            ),
        };
      }
    );

    // --------------------------------------------------------
    // ACTUALIZAR ESTADO LOCAL
    // --------------------------------------------------------

    setSemanas(
      semanasActualizadas
    );

    // --------------------------------------------------------
    // GUARDAR EN EXCEL
    // --------------------------------------------------------

    // El guardado en Excel ocurre DESPUÉS de construir
    // el nuevo estado y FUERA del updater de React.

    guardarPlanificacionExcel(
      semanasActualizadas
    );

    // --------------------------------------------------------
    // CERRAR
    // --------------------------------------------------------

    setModalContenedor(false);

    setReferenciasSeleccionadas(
      {}
    );

    setBusquedaReferencia("");

    setContenedorSeleccionado(
      null
    );

    setSemanaContenedorSeleccionada(
      null
    );

    setError("");
  };

  // ==========================================================
  // CERRAR MODAL CONTENEDOR
  // ==========================================================

  const cerrarModalContenedor = () => {

    setModalContenedor(false);

    setReferenciasSeleccionadas(
      {}
    );

    setBusquedaReferencia("");

    setContenedorSeleccionado(
      null
    );

    setSemanaContenedorSeleccionada(
      null
    );

    setError("");
  };

  // ==========================================================
  // FILTRAR DISPONIBILIDAD
  //
  // BUSCA POR:
  //
  // PO
  // REFERENCIA_DIS
  //
  // MÁXIMO 10.
  // ==========================================================

  const textoBusqueda =
    normalizarTexto(
      busquedaReferencia
    );

  const disponibilidadFiltrada =
    disponibilidadConClave
      .filter(
        (fila) => {

          if (
            !textoBusqueda
          ) {
            return true;
          }

          const po =
            normalizarTexto(
              fila?.PO
            );

          const referencia =
            normalizarTexto(
              fila?.Referencia_dis
            );

          return (
            po.includes(
              textoBusqueda
            ) ||
            referencia.includes(
              textoBusqueda
            )
          );
        }
      )
      .slice(
        0,
        MAX_RESULTADOS
      );

  // ==========================================================
  // CARGA ACTUAL DEL POP
  //
  // ESTA ES LA PARTE QUE CORREGIMOS.
  // ==========================================================

  const cargaActual =
    calcularCarga(
      obtenerReferenciasParaCalculo()
    );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="mt-10">

      {/* ====================================================
          ENCABEZADO
      ==================================================== */}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">

        <div>

          <h2 className="text-2xl font-bold text-blue-700">
            Semanas de planificación
          </h2>

          <p className="text-gray-500 mt-1">
            Administra los buques, fechas y cantidad de contenedores.
          </p>

        </div>

        <button
          onClick={
            abrirCrearSemana
          }
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-lg"
        >
          + Crear semana
        </button>

      </div>

      {/* ====================================================
          ERROR GENERAL
      ==================================================== */}

      {error &&
        !modalContenedor && (

          <div className="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            {error}
          </div>

        )}

      {/* ====================================================
          SEMANAS EN COLUMNAS
      ==================================================== */}

      <div className="mt-8">

        {semanas.length === 0 ? (

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-10 text-center">

            <p className="text-gray-500">
              Todavía no hay semanas creadas.
            </p>

            <button
              onClick={
                abrirCrearSemana
              }
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
            >
              Crear primera semana
            </button>

          </div>

        ) : (

          <DndContext
            sensors={sensors}
            onDragStart={manejarDragStart}
            onDragCancel={manejarDragCancel}
            onDragEnd={manejarDragEnd}
          >

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start">

              {semanas.map((semana) => (
                <SemanaDroppable
                  key={semana.id}
                  semana={semana}
                >

                  <div className="relative bg-white border border-gray-200 rounded-2xl shadow-sm overflow-visible">

                    {/* =========================================
                      CABECERA SEMANA
                  ========================================= */}

                    <div className="bg-gray-50 border-b border-gray-200 rounded-t-2xl p-5">

                      <div className="flex justify-between items-start gap-3">

                        <div>

                          <div className="flex items-center gap-3">

                            <h3 className="text-xl font-bold">
                              Semana{" "}
                              {
                                semana.numero
                              }
                            </h3>

                            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">

                              {
                                semana
                                  ?.contenedores
                                  ?.length ||
                                0
                              }{" "}
                              contenedores

                            </span>

                          </div>

                          <p className="text-lg font-semibold text-blue-700 mt-1">
                            {
                              semana.nombreBuque
                            }
                          </p>

                          <p className="text-sm text-gray-500 mt-1">

                            {
                              semana.fechaInicio
                            }

                            {" → "}

                            {
                              semana.fechaFin
                            }

                          </p>

                        </div>

                      </div>

                      <div className="flex gap-2 mt-4">

                        <button
                          onClick={() =>
                            abrirEditarSemana(
                              semana
                            )
                          }
                          className="border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-semibold"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() =>
                            eliminarSemana(
                              semana
                            )
                          }
                          className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold"
                        >
                          Eliminar
                        </button>

                      </div>

                    </div>

                    {/* =========================================
                      CONTENEDORES APILADOS
                  ========================================= */}

                    <div className="p-5">

                      <div className="space-y-3">

                        {(
                          semana
                            ?.contenedores ||
                          []
                        ).map(
                          (contenedor) => {

                            const porcentajePeso =
                              Math.min(
                                (
                                  convertirNumero(
                                    contenedor?.peso
                                  ) /
                                  MAX_PESO
                                ) *
                                100,
                                100
                              );

                            const porcentajeCbm =
                              Math.min(
                                (
                                  convertirNumero(
                                    contenedor?.cbm
                                  ) /
                                  MAX_CBM
                                ) *
                                100,
                                100
                              );

                            const cantidadReferencias =
                              Array.isArray(
                                contenedor?.referencias
                              )
                                ? contenedor
                                  .referencias
                                  .length
                                : 0;

                            const cantidadCajas =
                              Array.isArray(
                                contenedor?.referencias
                              )
                                ? contenedor
                                  .referencias
                                  .reduce(
                                    (
                                      total,
                                      ref
                                    ) =>
                                      total +
                                      convertirNumero(
                                        ref?.cantidadCajas
                                      ),
                                    0
                                  )
                                : 0;

                            return (



                              <ContenedorDraggable
                                key={contenedor.id}
                                semana={semana}
                                contenedor={contenedor}
                              >

                                <div
                                  onClick={() =>
                                    abrirContenedor(
                                      semana,
                                      contenedor
                                    )
                                  }
                                  className="group relative bg-gray-50 border rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition cursor-pointer"
                                >

                                  <div className="flex justify-between items-center">

                                    <p className="font-bold text-blue-700">
                                      {
                                        contenedor.codigo
                                      }
                                    </p>

                                    <span className="text-xs text-gray-400">
                                      {
                                        cantidadReferencias
                                      }{" "}
                                      ref.
                                    </span>

                                  </div>

                                  {/* PESO */}

                                  <div className="mt-3">

                                    <div className="flex justify-between text-xs">

                                      <span>
                                        Peso
                                      </span>

                                      <span className="font-semibold">

                                        {
                                          convertirNumero(
                                            contenedor?.peso
                                          ).toFixed(
                                            2
                                          )
                                        }

                                        /19T

                                      </span>

                                    </div>

                                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">

                                      <div
                                        className="bg-blue-500 h-1.5 rounded-full"
                                        style={{
                                          width:
                                            `${porcentajePeso}%`,
                                        }}
                                      />

                                    </div>

                                  </div>

                                  {/* CBM */}

                                  <div className="mt-2">

                                    <div className="flex justify-between text-xs">

                                      <span>
                                        CBM
                                      </span>

                                      <span className="font-semibold">

                                        {
                                          convertirNumero(
                                            contenedor?.cbm
                                          ).toFixed(
                                            2
                                          )
                                        }

                                        /71

                                      </span>

                                    </div>

                                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">

                                      <div
                                        className="bg-green-500 h-1.5 rounded-full"
                                        style={{
                                          width:
                                            `${porcentajeCbm}%`,
                                        }}
                                      />

                                    </div>

                                  </div>

                                  <div className="mt-3 text-xs text-gray-500">

                                    <p>
                                      {
                                        cantidadReferencias
                                      }{" "}
                                      referencias
                                    </p>

                                    <p>
                                      {
                                        cantidadCajas
                                      }{" "}
                                      cajas
                                    </p>

                                  </div>

                                  {/* TOOLTIP */}

                                  {cantidadReferencias >
                                    0 && (

                                      <div className="absolute z-[999] hidden group-hover:block left-1/2 -translate-x-1/2 bottom-full mb-3 w-72">

                                        <div className="bg-gray-900 text-white rounded-xl shadow-2xl p-4">

                                          <p className="font-bold text-sm mb-3">
                                            {
                                              contenedor.codigo
                                            }
                                          </p>

                                          <div className="space-y-2">

                                            {contenedor.referencias.map(
                                              (
                                                ref,
                                                index
                                              ) => (

                                                <div
                                                  key={`${ref?.availabilityKey || "ref"}-${index}`}
                                                  className="border-b border-gray-700 pb-2 last:border-0"
                                                >

                                                  <p className="font-semibold text-xs">

                                                    {
                                                      ref?.referenciaDis ||
                                                      ref?.referencia ||
                                                      "Referencia"
                                                    }

                                                  </p>

                                                  <p className="text-xs text-blue-300">

                                                    PO:{" "}
                                                    {
                                                      ref?.PO ||
                                                      "-"
                                                    }

                                                  </p>

                                                  <p className="text-xs text-gray-300">

                                                    {
                                                      convertirNumero(
                                                        ref?.cantidadCajas
                                                      )
                                                    }{" "}
                                                    cajas

                                                  </p>

                                                  <p className="text-xs text-gray-400">

                                                    {
                                                      convertirNumero(
                                                        ref?.cantidadUnidades
                                                      )
                                                    }{" "}
                                                    unidades

                                                  </p>

                                                </div>

                                              )
                                            )}

                                          </div>

                                        </div>

                                      </div>

                                    )}

                                </div>

                              </ContenedorDraggable>

                            );
                          }
                        )}

                      </div>

                    </div>

                  </div>

                </SemanaDroppable>
              ))}

            </div>

            <DragOverlay>
              {contenedorArrastrado ? (
                <div className="bg-white border-2 border-blue-500 rounded-xl shadow-xl p-4 w-72 opacity-95">
                  <p className="font-bold text-blue-700">
                    {contenedorArrastrado.codigo}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {convertirNumero(contenedorArrastrado.peso).toFixed(2)} T · {convertirNumero(contenedorArrastrado.cbm).toFixed(2)} CBM
                  </p>
                </div>
              ) : null}
            </DragOverlay>

          </DndContext>

        )}

      </div>

      {/* ====================================================
          MODAL CONTENEDOR
      ==================================================== */}

      {modalContenedor &&
        contenedorSeleccionado && (

          <div
            className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
            onClick={
              cerrarModalContenedor
            }
          >

            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto my-auto"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              {/* =============================================
                  CABECERA
              ============================================= */}

              <div className="p-6 border-b">

                <div className="flex justify-between items-center">

                  <div>

                    <h2 className="text-2xl font-bold text-blue-700">

                      {
                        contenedorSeleccionado.codigo
                      }

                    </h2>

                    <p className="text-sm text-gray-500 mt-1">

                      {
                        semanaContenedorSeleccionada?.nombreBuque
                      }

                    </p>

                  </div>

                  <button
                    onClick={
                      cerrarModalContenedor
                    }
                    className="text-gray-400 hover:text-red-500 text-xl"
                  >
                    ✕
                  </button>

                </div>

              </div>

              {/* =============================================
                  CONTENIDO
              ============================================= */}

              <div className="p-6">

                {/* ===========================================
                    CAPACIDAD
                =========================================== */}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                  <div className="bg-gray-50 rounded-xl p-4">

                    <p className="text-sm text-gray-500">
                      Peso
                    </p>

                    <p className="text-xl font-bold">

                      {
                        cargaActual
                          .pesoTon
                          .toFixed(
                            2
                          )
                      }{" "}
                      T

                    </p>

                    <p className="text-xs text-gray-500">
                      máximo{" "}
                      {MAX_PESO} T
                    </p>

                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">

                    <p className="text-sm text-gray-500">
                      CBM
                    </p>

                    <p className="text-xl font-bold">

                      {
                        cargaActual
                          .cbm
                          .toFixed(
                            3
                          )
                      }

                    </p>

                    <p className="text-xs text-gray-500">
                      máximo{" "}
                      {MAX_CBM}
                    </p>

                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">

                    <p className="text-sm text-gray-500">
                      Cajas
                    </p>

                    <p className="text-xl font-bold">

                      {
                        cargaActual.cajas
                      }

                    </p>

                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">

                    <p className="text-sm text-gray-500">
                      Unidades
                    </p>

                    <p className="text-xl font-bold">

                      {
                        cargaActual.unidades
                      }

                    </p>

                  </div>

                </div>

                {/* ===========================================
                    BUSCADOR
                =========================================== */}

                <div className="mt-8">

                  <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">

                    <div>

                      <h3 className="text-xl font-bold">
                        Seleccionar referencias
                      </h3>

                      <p className="text-sm text-gray-500 mt-1">

                        Las referencias provienen de DISPONIBILIDAD.
                        MASTER_DATA solamente complementa peso,
                        CBM, unidades y descripción.

                      </p>

                    </div>

                    <div className="w-full md:w-96">

                      <label className="text-sm font-semibold text-gray-700">

                        Buscar por referencia o PO

                      </label>

                      <div className="relative mt-1">

                        <input
                          type="text"
                          value={
                            busquedaReferencia
                          }
                          onChange={(e) =>
                            setBusquedaReferencia(
                              e.target.value
                            )
                          }
                          placeholder="Ej: 5475AL12HT o 260813-05 DT"
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        {busquedaReferencia && (

                          <button
                            onClick={() =>
                              setBusquedaReferencia(
                                ""
                              )
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                          >
                            ✕
                          </button>

                        )}

                      </div>

                    </div>

                  </div>

                </div>

                <p></p>


                {/* ===========================================
                    CARGA DEL CONTENEDOR
                =========================================== */}

                <div className="mt-8">

                  <h3 className="text-xl font-bold mb-4">
                    Carga del contenedor
                  </h3>

                  {
                    Object.entries(
                      referenciasSeleccionadas
                    ).filter(
                      ([
                        ,
                        cantidad,
                      ]) =>
                        convertirNumero(
                          cantidad
                        ) > 0
                    ).length === 0 ? (

                      <div className="bg-gray-50 border border-dashed rounded-xl p-6 text-center text-gray-500">

                        No has seleccionado referencias.

                      </div>

                    ) : (

                      <div className="space-y-2">

                        {Object.entries(
                          referenciasSeleccionadas
                        )
                          .filter(
                            ([
                              ,
                              cantidad,
                            ]) =>
                              convertirNumero(
                                cantidad
                              ) > 0
                          )
                          .map(
                            ([
                              availabilityKey,
                              cantidad,
                            ]) => {

                              const fila =
                                disponibilidadConClave.find(
                                  (item) =>
                                    item?._availabilityKey ===
                                    availabilityKey
                                );

                              const master =
                                obtenerMasterDataReferencia(
                                  fila?.Referencia_dis
                                );

                              const unidadesCaja =
                                convertirNumero(
                                  master?.UnidadesCaja
                                );

                              return (

                                <div
                                  key={
                                    availabilityKey
                                  }
                                  className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-xl p-4"
                                >

                                  <div>

                                    <p className="font-semibold">

                                      {
                                        fila?.Referencia_dis ||
                                        "-"
                                      }

                                    </p>

                                    <p className="text-sm text-blue-600">

                                      PO:{" "}
                                      {
                                        fila?.PO ||
                                        "-"
                                      }

                                    </p>

                                    <p className="text-sm text-gray-500">

                                      {
                                        cantidad
                                      }{" "}
                                      cajas ×{" "}
                                      {
                                        unidadesCaja
                                      }{" "}
                                      unidades

                                    </p>

                                  </div>

                                  <p className="font-bold text-blue-700">

                                    {
                                      convertirNumero(
                                        cantidad
                                      ) *
                                      unidadesCaja
                                    }{" "}
                                    unidades

                                  </p>

                                </div>

                              );
                            }
                          )}

                      </div>

                    )}

                </div>

                {/* ===========================================
                    TABLA DISPONIBILIDAD
                =========================================== */}

                <div className="mt-5 border border-gray-300 rounded-2xl overflow-hidden">

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[1100px]">

                      <thead className="bg-white">

                        <tr className="border-b border-gray-300">

                          <th className="text-left px-4 py-4 text-sm font-bold">
                            Referencia
                          </th>

                          <th className="text-left px-4 py-4 text-sm font-bold">
                            PO
                          </th>

                          <th className="text-center px-4 py-4 text-sm font-bold">
                            Disponible
                          </th>

                          <th className="text-center px-4 py-4 text-sm font-bold">
                            Cajas
                          </th>

                          <th className="text-center px-4 py-4 text-sm font-bold">
                            Unidades/caja
                          </th>

                          <th className="text-center px-4 py-4 text-sm font-bold">
                            CBM/caja
                          </th>

                          <th className="text-center px-4 py-4 text-sm font-bold">
                            Peso/caja
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {disponibilidadFiltrada.map(
                          (fila) => {

                            const availabilityKey =
                              fila?._availabilityKey;

                            const master =
                              obtenerMasterDataReferencia(
                                fila?.Referencia_dis
                              );

                            const disponible =
                              obtenerDisponibilidadReal(
                                fila
                              );

                            const cantidad =
                              convertirNumero(
                                referenciasSeleccionadas[
                                availabilityKey
                                ]
                              );

                            // --------------------------------
                            // MASTER DATA
                            // --------------------------------

                            const unidadesCaja =
                              convertirNumero(
                                master?.UnidadesCaja
                              );

                            const cbmCaja =
                              convertirNumero(
                                master?.CBM
                              );

                            const pesoCaja =
                              convertirNumero(
                                master?.PesoCajaKg
                              );

                            return (

                              <tr
                                key={
                                  availabilityKey
                                }
                                className="border-b last:border-b-0 hover:bg-gray-50"
                              >

                                {/* REFERENCIA */}

                                <td className="px-4 py-6">

                                  <p className="text-xl font-bold text-blue-700">

                                    {
                                      fila?.Referencia_dis ||
                                      "-"
                                    }

                                  </p>

                                  <p className="text-sm text-gray-400 mt-2">

                                    Ref ID:{" "}
                                    {
                                      fila?.ReferenceID ||
                                      "-"
                                    }

                                  </p>

                                  <p className="text-sm text-gray-600 mt-2 max-w-[320px]">

                                    {
                                      master?.Descripcion ||
                                      "Sin descripción en MASTER_DATA"
                                    }

                                  </p>

                                </td>

                                {/* PO */}

                                <td className="px-4 py-6">

                                  <span className="inline-flex items-center bg-blue-50 border border-blue-100 text-blue-700 rounded-xl px-4 py-3 font-semibold whitespace-nowrap">

                                    {
                                      fila?.PO ||
                                      "-"
                                    }

                                  </span>

                                </td>

                                {/* DISPONIBLE */}

                                <td className="px-4 py-6 text-center">

                                  <span
                                    className={
                                      disponible >
                                        0
                                        ? "text-green-600 font-bold text-xl"
                                        : "text-red-500 font-bold text-xl"
                                    }
                                  >

                                    {
                                      disponible
                                    }

                                  </span>

                                </td>

                                {/* CAJAS */}

                                <td className="px-4 py-6">

                                  <div className="flex items-center justify-center gap-3">

                                    <button
                                      onClick={() =>
                                        decrementarReferencia(
                                          fila
                                        )
                                      }
                                      disabled={
                                        cantidad <=
                                        0
                                      }
                                      className="w-12 h-12 border border-gray-300 rounded-xl hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-300 font-bold text-xl"
                                    >
                                      −
                                    </button>

                                    <input
                                      type="number"
                                      min="0"
                                      max={
                                        disponible
                                      }
                                      value={
                                        cantidad
                                      }
                                      onChange={(e) =>
                                        cambiarCantidadReferencia(
                                          fila,
                                          e.target.value
                                        )
                                      }
                                      className="w-36 h-12 border border-gray-300 rounded-xl px-3 text-center font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />

                                    <button
                                      onClick={() =>
                                        incrementarReferencia(
                                          fila
                                        )
                                      }
                                      disabled={
                                        cantidad >=
                                        disponible
                                      }
                                      className="w-12 h-12 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-xl"
                                    >
                                      +
                                    </button>

                                  </div>

                                </td>

                                {/* UNIDADES */}

                                <td className="px-4 py-6 text-center text-lg">

                                  {
                                    unidadesCaja
                                  }

                                </td>

                                {/* CBM */}

                                <td className="px-4 py-6 text-center text-lg">

                                  {
                                    cbmCaja.toFixed(
                                      3
                                    )
                                  }

                                </td>

                                {/* PESO */}

                                <td className="px-4 py-6 text-center text-lg">

                                  {
                                    pesoCaja.toFixed(
                                      2
                                    )
                                  }{" "}
                                  kg

                                </td>

                              </tr>

                            );
                          }
                        )}

                      </tbody>

                    </table>

                  </div>

                  {disponibilidadFiltrada.length ===
                    0 && (

                      <div className="p-10 text-center text-gray-500">

                        No se encontraron referencias
                        para la búsqueda.

                      </div>

                    )}

                </div>

                {/* CONTADOR */}

                <div className="mt-3 text-sm text-gray-500">

                  Mostrando{" "}
                  {
                    disponibilidadFiltrada.length
                  }{" "}
                  de máximo{" "}
                  {MAX_RESULTADOS}{" "}
                  resultados.

                </div>


              </div>

              {/* =============================================
                  ERROR
              ============================================= */}

              {error && (

                <div className="mx-6 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">

                  {error}

                </div>

              )}

              {/* =============================================
                  PIE
              ============================================= */}

              <div className="p-6 border-t flex justify-end gap-3">

                <button
                  onClick={
                    cerrarModalContenedor
                  }
                  className="px-5 py-2 border rounded-lg"
                >
                  Cancelar
                </button>

                <button
                  onClick={
                    guardarContenedor
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  Guardar carga
                </button>

              </div>

            </div>

          </div>

        )}

      {/* ====================================================
          MODAL CREAR SEMANA
      ==================================================== */}

      {modalSemana && (

        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto">

            <div className="p-6 border-b">

              <div className="flex justify-between items-center">

                <h2 className="text-xl font-bold">
                  Crear semana
                </h2>

                <button
                  onClick={() =>
                    setModalSemana(
                      false
                    )
                  }
                  className="text-gray-400 hover:text-red-500 text-xl"
                >
                  ✕
                </button>

              </div>

            </div>

            <div className="p-6 space-y-4">

              <div>

                <label className="text-sm font-semibold">
                  Buque
                </label>

                <input
                  value={
                    nombreBuque
                  }
                  onChange={(e) =>
                    setNombreBuque(
                      e.target.value
                    )
                  }
                  placeholder="Ej: MSC Aurora"
                  className="mt-1 w-full border rounded-lg px-4 py-3"
                />

              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="text-sm font-semibold">
                    Fecha inicio
                  </label>

                  <input
                    type="date"
                    value={
                      fechaInicio
                    }
                    onChange={(e) =>
                      setFechaInicio(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-3"
                  />

                </div>

                <div>

                  <label className="text-sm font-semibold">
                    Fecha fin
                  </label>

                  <input
                    type="date"
                    value={
                      fechaFin
                    }
                    onChange={(e) =>
                      setFechaFin(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-3"
                  />

                </div>

              </div>

              <div>

                <label className="text-sm font-semibold">
                  Número de contenedores
                </label>

                <input
                  type="number"
                  min="1"
                  max={
                    MAX_CONTENEDORES
                  }
                  value={
                    cantidadContenedores
                  }
                  onChange={(e) =>
                    setCantidadContenedores(
                      Math.min(
                        Math.max(
                          convertirNumero(
                            e.target.value
                          ) || 1,
                          1
                        ),
                        MAX_CONTENEDORES
                      )
                    )
                  }
                  className="mt-1 w-full border rounded-lg px-4 py-3"
                />

                <p className="text-xs text-gray-500 mt-1">

                  Máximo{" "}
                  {
                    MAX_CONTENEDORES
                  }{" "}
                  contenedores por semana.

                </p>

              </div>

              {error && (

                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">

                  {error}

                </div>

              )}

            </div>

            <div className="p-6 border-t flex justify-end gap-3">

              <button
                onClick={() => {

                  setModalSemana(
                    false
                  );

                  setError("");

                }}
                className="px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>

              <button
                onClick={
                  guardarSemana
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold"
              >
                Crear semana
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ====================================================
          MODAL EDITAR SEMANA
      ==================================================== */}

      {modalEditar && (

        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto">

            <div className="p-6 border-b">

              <div className="flex justify-between items-center">

                <h2 className="text-xl font-bold">
                  Editar semana
                </h2>

                <button
                  onClick={() => {

                    setModalEditar(
                      false
                    );

                    setSemanaSeleccionada(
                      null
                    );

                    setError("");

                  }}
                  className="text-gray-400 hover:text-red-500 text-xl"
                >
                  ✕
                </button>

              </div>

            </div>

            <div className="p-6 space-y-4">

              <div>

                <label className="text-sm font-semibold">
                  Buque
                </label>

                <input
                  value={
                    nombreBuque
                  }
                  onChange={(e) =>
                    setNombreBuque(
                      e.target.value
                    )
                  }
                  className="mt-1 w-full border rounded-lg px-4 py-3"
                />

              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="text-sm font-semibold">
                    Fecha inicio
                  </label>

                  <input
                    type="date"
                    value={
                      fechaInicio
                    }
                    onChange={(e) =>
                      setFechaInicio(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-3"
                  />

                </div>

                <div>

                  <label className="text-sm font-semibold">
                    Fecha fin
                  </label>

                  <input
                    type="date"
                    value={
                      fechaFin
                    }
                    onChange={(e) =>
                      setFechaFin(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-3"
                  />

                </div>

              </div>

              <div>

                <label className="text-sm font-semibold">
                  Número de contenedores
                </label>

                <input
                  type="number"
                  min="1"
                  max={
                    MAX_CONTENEDORES
                  }
                  value={
                    cantidadContenedores
                  }
                  onChange={(e) =>
                    setCantidadContenedores(
                      Math.min(
                        Math.max(
                          convertirNumero(
                            e.target.value
                          ) || 1,
                          1
                        ),
                        MAX_CONTENEDORES
                      )
                    )
                  }
                  className="mt-1 w-full border rounded-lg px-4 py-3"
                />

                <p className="text-xs text-gray-500 mt-1">

                  Máximo{" "}
                  {
                    MAX_CONTENEDORES
                  }{" "}
                  contenedores por semana.

                </p>

              </div>

              {error && (

                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">

                  {error}

                </div>

              )}

            </div>

            <div className="p-6 border-t flex justify-end gap-3">

              <button
                onClick={() => {

                  setModalEditar(
                    false
                  );

                  setSemanaSeleccionada(
                    null
                  );

                  setError("");

                }}
                className="px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>

              <button
                onClick={
                  guardarEdicion
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold"
              >
                Guardar cambios
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );
}

export default Semanas;