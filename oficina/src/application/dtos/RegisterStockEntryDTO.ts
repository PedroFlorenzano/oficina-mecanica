export interface RegisterStockEntryDTO {
  quantity: number;
  unitCost: number;
  reason?: string;
  document?: string;
}
