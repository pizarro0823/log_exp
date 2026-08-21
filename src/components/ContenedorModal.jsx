import React from "react";

const PESO_MAXIMO = 25;
const CBM_MAXIMO = 71;

function ContenedorModal({
  contenedor,
  onClose,
  onEliminarReferencia,
  onEditarReferencia,
}) {
  if (!contenedor) {
    return null;
  }

  const referencias = Array.isArray(
    contenedor.referencias
  )
    ? contenedor.referencias
    : [];

  const peso = Number(
    contenedor.peso || 0
  );

  const cbm = Number(
    contenedor.cbm || 0
  );

  const porcentajePeso = Math.min(
    (peso / PESO_MAXIMO) * 100,
    100
  );

  const porcentajeCbm = Math.min(
    (cbm / CBM_MAXIMO) * 100,
    100
  );

  return (
    <div className="
      fixed
      inset-0
      z-[100]
      bg-black/50
      flex
      items-center
      justify-center
      p-4
    ">

      <div className="
        bg-white
        rounded-2xl
        shadow-2xl
        w-full
        max-w-4xl
        max-h-[90vh]
        flex
        flex-col
      ">

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="
          p-6
          border-b
          flex
          justify-between
          items-start
        ">

          <div>

            <h2 className="
              text-2xl
              font-bold
              text-blue-700
            ">
              {contenedor.id}
            </h2>

            <p className="
              text-sm
              text-gray-500
              mt-1
            ">
              Detalle del contenedor
            </p>

          </div>

          <button
            onClick={onClose}
            className="
              text-gray-400
              hover:text-red-600
              text-2xl
              font-bold
            "
          >
            ×
          </button>

        </div>


        {/* ===================================================
            CAPACIDAD
        =================================================== */}

        <div className="
          p-6
          border-b
          grid
          grid-cols-1
          md:grid-cols-2
          gap-6
        ">

          <div>

            <div className="
              flex
              justify-between
              text-sm
            ">

              <span className="text-gray-500">
                Peso
              </span>

              <strong>
                {peso.toFixed(2)} / {PESO_MAXIMO} Ton
              </strong>

            </div>

            <div className="
              w-full
              h-3
              bg-gray-200
              rounded-full
              mt-2
            ">

              <div
                className="h-3 bg-blue-600 rounded-full"
                style={{
                  width: `${porcentajePeso}%`,
                }}
              />

            </div>

          </div>


          <div>

            <div className="
              flex
              justify-between
              text-sm
            ">

              <span className="text-gray-500">
                CBM
              </span>

              <strong>
                {cbm.toFixed(2)} / {CBM_MAXIMO} m³
              </strong>

            </div>

            <div className="
              w-full
              h-3
              bg-gray-200
              rounded-full
              mt-2
            ">

              <div
                className="h-3 bg-green-500 rounded-full"
                style={{
                  width: `${porcentajeCbm}%`,
                }}
              />

            </div>

          </div>

        </div>


        {/* ===================================================
            REFERENCIAS
        =================================================== */}

        <div className="
          flex-1
          overflow-y-auto
          p-6
        ">

          <div className="
            flex
            justify-between
            items-center
            mb-4
          ">

            <h3 className="text-lg font-bold">
              Referencias
            </h3>

            <span className="
              text-sm
              text-gray-500
            ">
              {referencias.length} referencias
            </span>

          </div>


          {referencias.length === 0 ? (

            <div className="
              text-center
              py-10
              text-gray-400
            ">
              Este contenedor no tiene referencias.
            </div>

          ) : (

            <div className="
              border
              rounded-xl
              overflow-hidden
            ">

              <table className="
                w-full
                text-sm
              ">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="
                      text-left
                      px-4
                      py-3
                    ">
                      Referencia
                    </th>

                    <th className="
                      text-right
                      px-4
                      py-3
                    ">
                      Cajas
                    </th>

                    <th className="
                      text-right
                      px-4
                      py-3
                    ">
                      Unidades
                    </th>

                    <th className="
                      text-right
                      px-4
                      py-3
                    ">
                      Acciones
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {referencias.map(
                    (ref, index) => (

                      <tr
                        key={`${ref.referenceID}-${index}`}
                        className="
                          border-t
                          hover:bg-gray-50
                        "
                      >

                        <td className="px-4 py-3">

                          <p className="
                            font-semibold
                            text-blue-700
                          ">
                            {ref.referencia}
                          </p>

                          <p className="
                            text-xs
                            text-gray-500
                          ">
                            {ref.referenceID}
                          </p>

                        </td>


                        <td className="
                          px-4
                          py-3
                          text-right
                          font-bold
                        ">
                          {ref.cantidadCajas}
                        </td>


                        <td className="
                          px-4
                          py-3
                          text-right
                          font-bold
                        ">
                          {(
                            Number(
                              ref.cantidadCajas
                            ) *
                            Number(
                              ref.unidadesCaja || 0
                            )
                          ).toLocaleString()}
                        </td>


                        <td className="
                          px-4
                          py-3
                          text-right
                        ">

                          <div className="
                            flex
                            justify-end
                            gap-2
                          ">

                            <button
                              onClick={() =>
                                onEditarReferencia?.(
                                  contenedor,
                                  ref,
                                  index
                                )
                              }
                              className="
                                text-xs
                                px-2
                                py-1
                                rounded
                                bg-blue-50
                                text-blue-700
                                hover:bg-blue-100
                              "
                            >
                              Editar
                            </button>

                            <button
                              onClick={() =>
                                onEliminarReferencia?.(
                                  contenedor,
                                  ref,
                                  index
                                )
                              }
                              className="
                                text-xs
                                px-2
                                py-1
                                rounded
                                bg-red-50
                                text-red-600
                                hover:bg-red-100
                              "
                            >
                              Eliminar
                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* ===================================================
            FOOTER
        =================================================== */}

        <div className="
          border-t
          p-4
          flex
          justify-end
        ">

          <button
            onClick={onClose}
            className="
              px-5
              py-2
              bg-gray-700
              text-white
              rounded-lg
              hover:bg-gray-800
            "
          >
            Cerrar
          </button>

        </div>

      </div>

    </div>
  );
}

export default ContenedorModal;