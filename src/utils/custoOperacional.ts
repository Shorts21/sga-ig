export function calcularCustoPivo({
  headcount,
  salarioBase,
  adicionaisPercentual,
  encargosPercentual,
  areaHa
}: {
  headcount: number;
  salarioBase: number;
  adicionaisPercentual: number;
  encargosPercentual: number;
  areaHa: number;
}) {
  const salarioEfetivo = salarioBase;
  const custoMensal = headcount * salarioEfetivo * (1 + adicionaisPercentual/100) * (1 + encargosPercentual/100);

  return {
    custoTotal: custoMensal,
    custoPorHectare: areaHa > 0 ? custoMensal / areaHa : 0
  };
}
