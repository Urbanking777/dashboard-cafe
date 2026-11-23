export type Venta = {
  id: number;
  created_at: string;
  presentacion: "grano" | "molido";
  tueste: "claro" | "medio" | "oscuro";
  gramos: number;
  cantidad: number;
  total_mxn: number;
};

export type NuevaVenta = Omit<Venta, "id" | "created_at">;
