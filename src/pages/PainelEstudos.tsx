import React, { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ComposedChart
} from "recharts";

// ─── PALETA SISTEMA (claro, padrão AgriControl) ──────────────────────────
const C = {
  bg: "#f8fafc", card: "#ffffff", border: "#e2e8f0",
  text: "#0f172a", sub: "#64748b", muted: "#94a3b8",
  green: "#16a34a", blue: "#2563eb", amber: "#d97706",
  red: "#dc2626", purple: "#7c3aed", teal: "#0d9488",
  rose: "#e11d48", indigo: "#6366f1", orange: "#ea580c",
  dark: "#1e293b",
};

// ─── CULTURAS ─────────────────────────────────────────────────────────────
const culturas = [
  { id:"batata",     nome:"Batata",     emoji:"🥔", cor:C.amber,  unidade:"R$/kg",      cat:"hortaliça" },
  { id:"tomate",     nome:"Tomate",     emoji:"🍅", cor:C.red,    unidade:"R$/kg",      cat:"hortaliça" },
  { id:"alho",       nome:"Alho",       emoji:"🧄", cor:C.purple, unidade:"R$/kg",      cat:"hortaliça" },
  { id:"cebola",     nome:"Cebola",     emoji:"🧅", cor:C.teal,   unidade:"R$/kg",      cat:"hortaliça" },
  { id:"arroz",      nome:"Arroz",      emoji:"🌾", cor:C.blue,   unidade:"R$/sc 50kg", cat:"grão" },
  { id:"mirtilo",    nome:"Mirtilo",    emoji:"🫐", cor:C.indigo, unidade:"R$/kg",      cat:"fruta" },
  { id:"repolho",    nome:"Repolho",    emoji:"🥬", cor:C.green,  unidade:"R$/kg",      cat:"hortaliça" },
  { id:"milho",      nome:"Milho",      emoji:"🌽", cor:"#f59e0b",unidade:"R$/sc 60kg", cat:"grão" },
  { id:"crotalaria", nome:"Crotalária", emoji:"🌿", cor:"#059669",unidade:"R$/kg",      cat:"cobertura"},
];

// ─── PREÇOS 2020-2025 + PROJEÇÃO 2026-2027 ────────────────────────────────
const precos = {
  batata:    [{a:"2020",v:1.4},{a:"2021",v:2.1},{a:"2022",v:1.8},{a:"2023",v:2.5},{a:"2024",v:1.9},{a:"2025",v:2.2},{a:"2026p",v:2.0},{a:"2027p",v:2.3}],
  tomate:    [{a:"2020",v:2.2},{a:"2021",v:3.1},{a:"2022",v:2.8},{a:"2023",v:4.2},{a:"2024",v:3.0},{a:"2025",v:3.5},{a:"2026p",v:3.8},{a:"2027p",v:4.1}],
  alho:      [{a:"2020",v:12},{a:"2021",v:18},{a:"2022",v:22},{a:"2023",v:28},{a:"2024",v:32},{a:"2025",v:30},{a:"2026p",v:33},{a:"2027p",v:36}],
  cebola:    [{a:"2020",v:0.9},{a:"2021",v:1.4},{a:"2022",v:1.2},{a:"2023",v:2.1},{a:"2024",v:1.8},{a:"2025",v:2.1},{a:"2026p",v:2.0},{a:"2027p",v:2.2}],
  arroz:     [{a:"2020",v:62},{a:"2021",v:80},{a:"2022",v:75},{a:"2023",v:68},{a:"2024",v:72},{a:"2025",v:65},{a:"2026p",v:68},{a:"2027p",v:72}],
  mirtilo:   [{a:"2020",v:35},{a:"2021",v:40},{a:"2022",v:45},{a:"2023",v:50},{a:"2024",v:48},{a:"2025",v:52},{a:"2026p",v:55},{a:"2027p",v:60}],
  repolho:   [{a:"2020",v:0.6},{a:"2021",v:0.9},{a:"2022",v:0.8},{a:"2023",v:1.1},{a:"2024",v:1.0},{a:"2025",v:1.2},{a:"2026p",v:1.2},{a:"2027p",v:1.3}],
  milho:     [{a:"2020",v:38},{a:"2021",v:70},{a:"2022",v:65},{a:"2023",v:55},{a:"2024",v:48},{a:"2025",v:52},{a:"2026p",v:55},{a:"2027p",v:58}],
  crotalaria:[{a:"2020",v:4.5},{a:"2021",v:5.0},{a:"2022",v:5.5},{a:"2023",v:6.0},{a:"2024",v:6.5},{a:"2025",v:7.0},{a:"2026p",v:7.5},{a:"2027p",v:8.0}],
};

// ─── PRODUTIVIDADE RH POR CULTURA ──
const rhCulturas = [
  { id:"batata",    nome:"Batata",    emoji:"🥔", cor:C.amber,
    haPessoa:8,  diasHa:120, salarioBase:1800, turnover:28, absenteismo:7,
    informalidade:55, mecanizacao:35, dificuldadeContrat:72,
    receita1Pessoa:126000, custoPessoa:2779,
    desc:"Alta intensidade manual. Plantio e colheita exigem picos de 3-4x o headcount normal.",
    vantagensNExploradas:["Programa jovem aprendiz rural","Parceria Senar para treinamento","PRONAMP"]
  },
  { id:"tomate",    nome:"Tomate",    emoji:"🍅", cor:C.red,
    haPessoa:6,  diasHa:150, salarioBase:1850, turnover:35, absenteismo:9,
    informalidade:62, mecanizacao:20, dificuldadeContrat:80,
    receita1Pessoa:210000, custoPessoa:2856,
    desc:"Maior intensidade de mão de obra da cesta. Tutoramento e colheita manual.",
    vantagensNExploradas:["Contrato intermitente (CLT 2017)","Alojamento rural dedutível","Banco de horas"]
  },
  { id:"alho",      nome:"Alho",      emoji:"🧄", cor:C.purple,
    haPessoa:12, diasHa:90,  salarioBase:1750, turnover:18, absenteismo:5,
    informalidade:48, mecanizacao:55, dificuldadeContrat:55,
    receita1Pessoa:384000, custoPessoa:2702,
    desc:"Melhor ROI/pessoa. Mecanização crescente. Colheita intensiva.",
    vantagensNExploradas:["PRONAF Custeio","Insalubridade 10%","Seguro Agrícola"]
  },
  { id:"cebola",    nome:"Cebola",    emoji:"🧅", cor:C.teal,
    haPessoa:10, diasHa:100, salarioBase:1680, turnover:22, absenteismo:6,
    informalidade:58, mecanizacao:30, dificuldadeContrat:60,
    receita1Pessoa:168000, custoPessoa:2595,
    desc:"Colheita manual. Uso de cooperativas para partilha de mão de obra.",
    vantagensNExploradas:["Consórcio de empregadores","Parceria Epagri SC"]
  },
  { id:"arroz",     nome:"Arroz",     emoji:"🌾", cor:C.blue,
    haPessoa:45, diasHa:22,  salarioBase:2059, turnover:12, absenteismo:4,
    informalidade:30, mecanizacao:85, dificuldadeContrat:25,
    receita1Pessoa:140400, custoPessoa:3180,
    desc:"Maior mecanização da cesta. Menor intensidade.",
    vantagensNExploradas:["Operador de pivô central","PLR"]
  },
  { id:"mirtilo",   nome:"Mirtilo",   emoji:"🫐", cor:C.indigo,
    haPessoa:2,  diasHa:480, salarioBase:2200, turnover:15, absenteismo:5,
    informalidade:40, mecanizacao:5,  dificuldadeContrat:85,
    receita1Pessoa:260000, custoPessoa:3399,
    desc:"Maior intensidade/ha e rec./pessoa. Colheita manual.",
    vantagensNExploradas:["Assentamentos rurais","ATER","Produção por tarefa"]
  },
  { id:"repolho",   nome:"Repolho",   emoji:"🥬", cor:C.green,
    haPessoa:7,  diasHa:130, salarioBase:1620, turnover:30, absenteismo:8,
    informalidade:65, mecanizacao:15, dificuldadeContrat:65,
    receita1Pessoa:84000, custoPessoa:2502,
    desc:"Menor rentabilidade/pessoa. Alta informalidade.",
    vantagensNExploradas:["Mecanização de transplante","Trabalho familiar"]
  },
  { id:"milho",     nome:"Milho",     emoji:"🌽", cor:"#f59e0b",
    haPessoa:80, diasHa:12,  salarioBase:2059, turnover:10, absenteismo:4,
    informalidade:28, mecanizacao:92, dificuldadeContrat:20,
    receita1Pessoa:124800, custoPessoa:3180,
    desc:"Altamente mecanizado. Foco em operadores.",
    vantagensNExploradas:["Técnico agrícola","Operador colheitadeira"]
  },
  { id:"crotalaria",nome:"Crotalária",emoji:"🌿", cor:"#059669",
    haPessoa:35, diasHa:28,  salarioBase:1620, turnover:8,  absenteismo:3,
    informalidade:35, mecanizacao:70, dificuldadeContrat:15,
    receita1Pessoa:245000, custoPessoa:2502,
    desc:"Cultivada na entressafra. Menor rotatividade.",
    vantagensNExploradas:["Equipe de entressafra","Semente valorizada"]
  },
];

// ─── RH: DADOS GERAIS SETOR ───────────────────────────────────────────────
const rhSetorData = [
  {ano:"2020", ocupados:10.2, formal:38, salarioMedio:1380, produtividade:100},
  {ano:"2021", ocupados:9.8,  formal:40, salarioMedio:1450, produtividade:108},
  {ano:"2022", ocupados:9.4,  formal:42, salarioMedio:1520, produtividade:118},
  {ano:"2023", ocupados:8.9,  formal:44, salarioMedio:1590, produtividade:130},
  {ano:"2024", ocupados:8.6,  formal:46, salarioMedio:1670, produtividade:142},
  {ano:"2025", ocupados:8.3,  formal:48, salarioMedio:1780, produtividade:155},
];

const turnoverData = rhCulturas.map(c=>({ nome:c.nome, emoji:c.emoji, turnover:c.turnover, absenteismo:c.absenteismo, informalidade:c.informalidade, mecanizacao:c.mecanizacao }));

const impasses = [
  { titulo:"Êxodo Rural Estrutural", gravidade:"Alta", texto:"Brasil perdeu 1,9M de trabalhadores rurais (2012-2023).", fonte:"IPEA 2024" },
  { titulo:"Informalidade Endêmica", gravidade:"Alta", texto:"Média de 46% dos trabalhadores rurais sem carteira.", fonte:"PNAD 2024" },
  { titulo:"Alta Rotatividade Sazonal", gravidade:"Alta", texto:"Tomate (35%) e Batata (28%) lideram rotatividade.", fonte:"CAGED 2024" },
  { titulo:"Déficit de Qualificação Técnica", gravidade:"Média", texto:"Gap de 18.000 vagas de técnico agrícola no Brasil.", fonte:"SENAR 2025" },
  { titulo:"Envelhecimento da Mão de Obra", gravidade:"Média", texto:"Média de idade do trabalhador rural subiu de 38 para 44.", fonte:"IPEA 2024" },
  { titulo:"Mecanização Desigual", gravidade:"Baixa", texto:"Milho/Arroz 90% mecanizados. Hortaliças sub-20%.", fonte:"Embrapa 2024" },
];

const vantagens = [
  { titulo:"Salário Real do Agro", impacto:"Alto", texto:"Agropecuária liderou ganhos salariais em 2024-2025.", fonte:"IBGE" },
  { titulo:"Contrato Intermitente", impacto:"Alto", texto:"CLT 2017 reduz custo em entressafra.", fonte:"CLT art. 443" },
  { titulo:"Consórcio de Empregadores Rurais", impacto:"Alto", texto:"Fazendas compartilham 1 equipe formal.", fonte:"MTE" },
  { titulo:"Programa Jovem Aprendiz", impacto:"Médio", texto:"Subsídio 50% patronal e treinamento Senar.", fonte:"Lei 10.097" },
  { titulo:"Parceria ATER", impacto:"Médio", texto:"Assistência técnica gratuita por 2 anos.", fonte:"Emater" },
  { titulo:"NR-31 e Benefícios", impacto:"Médio", texto:"Moradia e alimentação dedutíveis IR.", fonte:"NR-31" },
  { titulo:"PLR vinculada à produção", impacto:"Médio", texto:"Isenta de encargos, alinha produção e prêmio.", fonte:"Cooperativas RS" },
  { titulo:"Banco de Horas Anual", impacto:"Baixo", texto:"Compensação sem adicional extra na entressafra.", fonte:"CLT art. 59" },
];

// ─── BASE TÉCNICA ─────────────────────────────────────────────────────────
const baseSecoes = [
  { id:"receita", icon:"📈", cor:C.green, titulo:"Motor de Receita", items:[
    { label:"Receita Estimada por Pivô", formula:"Área (ha) × Preço (R$/saca) × Rendimento (sc/ha)", desc:"Venda bruta projetada interpolada pelo slider de Otimismo de Mercado entre MIN e MAX histórico.", ex:"82,2 ha × R$70.000/ha = R$5.750.500 (GR 14, otimismo 50%)", tags:["Área Georreferenciada","Preço Interpolado"] },
    { label:"Interpolação de Mercado", formula:"Receita = MIN + ((MAX − MIN) × (Otimismo / 100))", desc:"Slider executa interpolação linear. 0% = mercado colapsado (MIN). 100% = escassez máxima (MAX).", ex:"MIN R$40k/ha, MAX R$100k/ha, 50% → R$70k/ha", tags:["Slider Otimismo","MIN/MAX histórico"] },
    { label:"Receita Total Global", formula:"Σ Receita Estimada de todos os pivôs ativos", desc:"Soma de todas as receitas. Exibida como Projeção Anual no Laboratório.", ex:"372 pivôs → R$1,595 bilhão", tags:["Soma Global","Projeção Anual"] },
  ]},
  { id:"rh", icon:"👷", cor:C.blue, titulo:"Dimensionamento RH", items:[
    { label:"Necessidade Bruta (Raw)", formula:"NecessidadeRaw = (Área × ICO) / FatorCultural", desc:"Ponto de equilíbrio teórico antes de descontos. ICO multiplica esforço bruto.", ex:"82,2 × 1,0 / 50 d/ha → base para conversão", tags:["ICO","Fator Cultural","Dias-Homem"] },
    { label:"Dias Absolutos", formula:"DiasAbsolutos = Área × FatorCultural × ICO × HorasUteis(8/8) × Mecanização", desc:"Volume total de dias-homem necessários para operar o pivô no ciclo.", ex:"82,2 × 50 × 1,0 × 1,0 × 1 = 4.107,5 dias", tags:["Dias-Homem","Ciclo Anual"] },
    { label:"Conversão para Pessoas", formula:"Pessoas = DiasAbsolutos / (DiasUteis × Eficiência × (1-Absenteísmo%) × (1-Afastamento%))", desc:"Converte dias em número real de pessoas com todos os descontos.", ex:"4.107,5 / (264 × 0,95 × 0,98) ≈ 17 pessoas", tags:["Eficiência","Absenteísmo"] },
    { label:"GAP de RH", formula:"GAP = RH Modelado − RH Atual", desc:"Diferença entre headcount ideal e real. Positivo = Falha (subfuncionamento).", ex:"17 modelado − 4 atual = Falha 13 (+R$392k impacto)", tags:["Falha/Excesso"] },
  ]},
  { id:"custo", icon:"💰", cor:C.amber, titulo:"Estrutura de Custos", items:[
    { label:"Custo por Pessoa", formula:"Custo = Salário × (1 + INSS + FGTS + RAT + Terceiros + Férias + 13°)", desc:"Custo real mensal com todos os encargos configuráveis na aba Configurações.", ex:"R$1.621 × 1,547 ≈ R$2.508,89/pessoa", tags:["INSS","FGTS","RAT","13°"] },
    { label:"Custo Insumos por Pivô", formula:"CustoInsumos = ReceitaEstimada × (Insumos% / 100)", desc:"Custo variável calculado como percentual da receita. Slider Insumos no Laboratório.", ex:"R$5.750.500 × 60% = R$3.450.300 (GR 14)", tags:["Insumos%","Custo Variável"] },
    { label:"Custo Projetado Global", formula:"CustoTotal = Σ CustoInsumos + FolhaPagamento", desc:"Soma dos insumos de todos os pivôs + folha projetada.", ex:"~R$989M insumos + R$120M folha = R$1,109B", tags:["Custo Total"] },
  ]},
  { id:"resultado", icon:"📊", cor:C.purple, titulo:"Resultado & Eficiência", items:[
    { label:"Resultado Líquido", formula:"Resultado = ReceitaTotal − CustoProjetado", desc:"Lucro/prejuízo anual. Verde = lucro, Vermelho = prejuízo.", ex:"R$1,595B − R$1,109B = R$485,5M lucro", tags:["Lucro Anual"] },
    { label:"Eficiência Global", formula:"Eficiência% = (CustoProjetado / ReceitaTotal) × 100", desc:"Percentual da receita consumido por custos. Menor = mais eficiente.", ex:"R$1,109B / R$1,595B = 69,6%", tags:["Custo/Receita"] },
    { label:"ROI do Trabalhador", formula:"ROI = ReceitaGerada/Pessoa ÷ CustoLaboral/Pessoa", desc:"Quantas vezes cada trabalhador paga seu custo em receita gerada.", ex:"R$338.264 / R$30.197 = 11,2x (GR 14)", tags:["ROI","Produtividade"] },
    { label:"Índice Eficiência Estrutural", formula:"IEE = (RH Atual / RH Modelado) × 100", desc:"Compara RH real vs ideal. 100% = perfeito. Abaixo = subfuncionamento.", ex:"997 / 1.503 × 100 = 66,3%", tags:["IEE","Diagnóstico"] },
  ]},
  { id:"absenteismo", icon:"🩹", cor:C.red, titulo:"Absenteísmo & Políticas", items:[
    { label:"Substituição Integral", formula:"CustoExtra = FolhaMensal × (Absenteísmo% / 100)", desc:"Toda falta é coberta. Custo entra direto no budget salarial.", ex:"R$2.508.891 × 5% = +R$125.444/mês", tags:["Substituição","Budget"] },
    { label:"Absorção (sem reposição)", formula:"DescontoReceita = ReceitaPivô × (Absenteísmo% / 100)", desc:"Sem reposição → área decai → desconto na receita operacional.", ex:"R$5.750.500 × 5% = −R$287.525 perdidos", tags:["Absorção","Perda Receita"] },
  ]},
  { id:"ico", icon:"⚙️", cor:C.orange, titulo:"ICO — Complexidade", items:[
    { label:"O que é o ICO", formula:"ICO = multiplicador 0,5x a 2,0x", desc:"Índice de Complexidade Operacional. Multiplica o esforço bruto da cultura. ICO 1,1x = 10% mais pessoal.", ex:"ICO 1,5x → 17 pessoas se tornam 25,5 → 26", tags:["Multiplicador","Esforço Bruto"] },
    { label:"ICO no Diagnóstico", formula:"CapAjustada = CapBase + ICO + (Eficiência/100)", desc:"Na Gestão de Pivôs, ICO compõe a Capacidade Ajustada global.", ex:"40 + 1 + 0,90 = 44,44 ha/p", tags:["Capacidade Ajustada"] },
  ]},
];

// ─── COMPONENTES AUXILIARES ────────────────────────────────────────────────
const CT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.dark, border:"1px solid #334155", borderRadius:8, padding:"10px 14px" }}>
      <div style={{ color:"#94a3b8", fontSize:11, marginBottom:6 }}>{label}</div>
      {payload.map((p:any,i:number)=>(
        <div key={i} style={{ color:p.color, fontSize:13, fontWeight:700 }}>
          {p.name}: {typeof p.value==="number" ? p.value.toLocaleString("pt-BR") : p.value}
        </div>
      ))}
    </div>
  );
};

const Tag = ({ t, cor }: any) => (
  <span style={{ background:`${cor}18`, color:cor, border:`1px solid ${cor}30`, borderRadius:4, padding:"2px 8px", fontSize:10, fontWeight:700 }}>{t}</span>
);

const KPI = ({ label, value, sub, cor=C.green, small=false }: any) => (
  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:small?"10px 14px":"14px 18px", borderLeft:`4px solid ${cor}` }}>
    <div style={{ fontSize:10, color:C.sub, fontWeight:700, marginBottom:3, letterSpacing:0.5 }}>{label}</div>
    <div style={{ fontSize:small?16:22, fontWeight:800, color:cor }}>{value}</div>
    {sub && <div style={{ fontSize:10, color:C.sub, marginTop:2 }}>{sub}</div>}
  </div>
);

const SecTitle = ({ children, icon }: any) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, margin:"24px 0 12px" }}>
    <span style={{ fontSize:18 }}>{icon}</span>
    <span style={{ fontSize:15, fontWeight:800, color:C.text }}>{children}</span>
    <div style={{ flex:1, height:1, background:C.border, marginLeft:8 }} />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
function TabMercado() {
  const [cultAtiva, setCultAtiva] = useState("alho");
  const [subTab, setSubTab] = useState("visao");
  const cult = culturas.find(c=>c.id===cultAtiva);

  const estadosExpansao = [
    { cultura:"Batata",    estado:"Minas Gerais",   ha:"41.200", cresc:"+12%", potencial:"Alto",      detalhe:"Poços de Caldas e Caxambu." },
    { cultura:"Tomate",    estado:"Goiás",           ha:"22.000", cresc:"+15%", potencial:"Muito Alto", detalhe:"Anápolis/Morrinhos." },
    { cultura:"Alho",      estado:"Goiás",           ha:"9.800",  cresc:"+22%", potencial:"Muito Alto", detalhe:"Cristalina e Formosa." },
    { cultura:"Cebola",    estado:"Santa Catarina",  ha:"21.000", cresc:"+7%",  potencial:"Alto",      detalhe:"Ituporanga." },
    { cultura:"Arroz",     estado:"Mato Grosso",     ha:"220.000",cresc:"+33%", potencial:"Muito Alto", detalhe:"Cerrado irrigado." },
    { cultura:"Mirtilo",   estado:"Bahia/Chapada",   ha:"120",    cresc:"+180%",potencial:"Explosivo",  detalhe:"Mucugê/Lençóis." },
    { cultura:"Milho",     estado:"Mato Grosso",     ha:"10.200k",cresc:"+4%",  potencial:"Estável",   detalhe:"Maior produtor." },
    { cultura:"Crotalária",estado:"Mato Grosso",     ha:"850.000",cresc:"+35%", potencial:"Muito Alto", detalhe:"Cobertura obrigatória." },
  ];

  const potCor = (p:string) => ({"Explosivo":C.indigo,"Muito Alto":C.green,"Alto":C.blue,"Médio":C.amber,"Estável":C.sub}[p]||C.sub);

  const subTabs = [
    { id:"visao", label:"📊 Visão Geral" },
    { id:"precos", label:"💰 Preços" },
    { id:"estados", label:"🗺️ Estados" },
    { id:"insights", label:"💡 Insights" },
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:4, borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
        {subTabs.map(t=>(
          <button key={t.id} onClick={()=>setSubTab(t.id)} style={{
            padding:"8px 14px", border:"none", borderBottom:subTab===t.id?`2px solid ${C.green}`:"2px solid transparent",
            background:"transparent", color:subTab===t.id?C.green:C.sub, cursor:"pointer", fontSize:12, fontWeight:600
          }}>{t.label}</button>
        ))}
      </div>

      {subTab==="visao" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
            <KPI label="ÁREA IRRIGADA BRASIL" value="8,2 mi ha" sub="ANA 2021" cor={C.blue} />
            <KPI label="SAFRA 2024/25" value="328 mi t" sub="CONAB" cor={C.green} />
            <KPI label="MIRTILO" value="+49%" sub="Preço" cor={C.indigo} />
            <KPI label="ALHO" value="+167%" sub="Preço" cor={C.purple} />
            <KPI label="PIVÔS" value="3,2 mi ha" sub="Expansão" cor={C.teal} />
          </div>

          <SecTitle icon="📉">Evolução Preços 2020-2025 (base 100)</SecTitle>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:16 }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={["2020","2021","2022","2023","2024","2025"].map(ano=> {
                const row:any={ano};
                culturas.forEach(c=>{
                  const base=(precos as any)[c.id][0].v;
                  const cur=(precos as any)[c.id].find((p:any)=>p.a===ano)?.v||base;
                  row[c.nome]=Math.round((cur/base)*100);
                }); return row; 
              })}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="ano" style={{fontSize:11}} />
                <YAxis style={{fontSize:11}} />
                <Tooltip content={<CT />} />
                <Legend />
                {culturas.map(c=><Line key={c.id} type="monotone" dataKey={c.nome} stroke={c.cor} strokeWidth={2} dot={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <SecTitle icon="🏆">Variação Preços 2020→2025</SecTitle>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[...culturas].map(c=>({
                nome:c.nome, cor:c.cor,
                var:Math.round(((precos as any)[c.id][5].v/(precos as any)[c.id][0].v-1)*100)
              })).sort((a,b)=>b.var-a.var)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="nome" style={{fontSize:10}} />
                <YAxis style={{fontSize:11}} unit="%" />
                <Tooltip content={<CT />} />
                <Bar dataKey="var" name="Var %" radius={[4,4,0,0]}>
                  {[...culturas].map((c,i)=>( <Bar key={i} dataKey="var" fill={c.cor} /> ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {subTab==="precos" && (
        <>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
            {culturas.map(c=>(
              <button key={c.id} onClick={()=>setCultAtiva(c.id)} style={{
                padding:"7px 12px", borderRadius:8, border:`1px solid ${cultAtiva===c.id?c.cor:C.border}`,
                background:cultAtiva===c.id?c.cor+"15":C.card, color:cultAtiva===c.id?c.cor:C.sub,
                cursor:"pointer", fontSize:12, fontWeight:600
              }}>{c.emoji} {c.nome}</button>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
            <KPI small label="PREÇO 2020" value={(precos as any)[cultAtiva][0].v.toLocaleString()} sub={cult?.unidade} cor={C.sub} />
            <KPI small label="PREÇO 2025" value={(precos as any)[cultAtiva][5].v.toLocaleString()} sub={cult?.unidade} cor={cult?.cor} />
            <KPI small label="VARIAÇÃO" value={`+${Math.round(((precos as any)[cultAtiva][5].v/(precos as any)[cultAtiva][0].v-1)*100)}%`} cor={C.green} />
            <KPI small label="PROJEÇÃO 2027" value={(precos as any)[cultAtiva][7].v.toLocaleString()} sub={cult?.unidade} cor={C.blue} />
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={(precos as any)[cultAtiva].map((p:any)=>({...p, ano:p.a}))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="ano" style={{fontSize:11}} />
                <YAxis style={{fontSize:11}} />
                <Tooltip content={<CT />} />
                <Area type="monotone" dataKey="v" stroke={cult?.cor} fill={cult?.cor+"20"} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {subTab==="estados" && (
        <table style={{ width:"100%", background:C.card, border:`1px solid ${C.border}`, borderRadius:12 }}>
          <thead>
            <tr>
              <th style={{padding:12}}>Cultura</th><th style={{padding:12}}>Estado</th>
              <th style={{padding:12}}>Potencial</th>
            </tr>
          </thead>
          <tbody>
            {estadosExpansao.map((e,i)=>(
              <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:12}}>{e.cultura}</td><td style={{padding:12}}>{e.estado}</td>
                <td style={{padding:12}}><Tag t={e.potencial} cor={potCor(e.potencial)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {subTab==="insights" && (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {[{tipo:"Alta", t:"Mirtilo crescendo", txt:"Brasil importa muito.", cor:C.indigo}].map((ins,i)=>(
            <div key={i} style={{background:C.card, borderLeft:`4px solid ${ins.cor}`, padding:16, border:`1px solid ${C.border}`}}>
              <b>{ins.t}</b> <p>{ins.txt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
function TabRH() {
  const [cultAtiva, setCultAtiva] = useState("mirtilo");
  const [subTab, setSubTab] = useState("painel");
  const rh = rhCulturas.find(c=>c.id===cultAtiva);

  const subTabs = [
    { id:"painel", label:"👷 Painel RH" },
    { id:"comparativo", label:"📊 Comparativo" },
    { id:"impasses", label:"⚠️ Impasses" },
    { id:"vantagens", label:"✅ Vantagens" },
  ];

  return (
    <div>
      <div style={{ display:"flex", gap:4, borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
        {subTabs.map(t=>(
          <button key={t.id} onClick={()=>setSubTab(t.id)} style={{
            padding:"8px 14px", border:"none", borderBottom:subTab===t.id?`2px solid ${C.blue}`:"2px solid transparent",
            background:"transparent", color:subTab===t.id?C.blue:C.sub, cursor:"pointer", fontSize:12, fontWeight:600
          }}>{t.label}</button>
        ))}
      </div>

      {subTab==="painel" && rh && (
        <>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
            {rhCulturas.map(c=>(
              <button key={c.id} onClick={()=>setCultAtiva(c.id)} style={{
                padding:"7px 12px", borderRadius:8, border:`1px solid ${cultAtiva===c.id?c.cor:C.border}`,
                background:cultAtiva===c.id?c.cor+"15":C.card, color:cultAtiva===c.id?c.cor:C.sub,
                cursor:"pointer", fontSize:12, fontWeight:600
              }}>{c.emoji} {c.nome}</button>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:16 }}>
            <KPI small label="ha / PESSOA" value={rh.haPessoa} cor={rh.cor} />
            <KPI small label="DIAS / ha" value={rh.diasHa} cor={C.blue} />
            <KPI small label="SALÁRIO" value={`R$${rh.salarioBase}`} cor={C.green} />
            <KPI small label="RECEITA/PESSOA" value={`R$${(rh.receita1Pessoa/1000).toFixed(0)}k`} cor={C.purple} />
            <KPI small label="TURNOVER" value={`${rh.turnover}%`} cor={C.amber} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:16, borderRadius:12 }}>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={[
                  {s:"Mecanização", v:rh.mecanizacao},
                  {s:"Formalidade", v:100-rh.informalidade},
                  {s:"Retenção", v:100-rh.turnover},
                  {s:"ROI/P", v:Math.min(100, Math.round(rh.receita1Pessoa/rh.custoPessoa/12*10))},
                  {s:"Estabilidade", v:100-rh.absenteismo*5}
                ]}>
                  <PolarGrid /> <PolarAngleAxis dataKey="s" style={{fontSize:11}}/>
                  <Radar dataKey="v" stroke={rh.cor} fill={rh.cor} fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:16, borderRadius:12 }}>
              <p>{rh.desc}</p>
              <b>Vantagens:</b>
              {rh.vantagensNExploradas.map((v,i)=><div key={i}>{v}</div>)}
            </div>
          </div>
        </>
      )}

      {subTab==="comparativo" && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:16, borderRadius:12 }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rhCulturas}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="nome" style={{fontSize:10}}/>
              <YAxis yAxisId="left" /> <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CT/>} />
              <Bar yAxisId="left" dataKey="diasHa" fill={C.blue} />
              <Bar yAxisId="right" dataKey="haPessoa" fill={C.green} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {subTab==="impasses" && (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {impasses.map((imp,i)=>(
            <div key={i} style={{background:C.card, borderLeft:`4px solid ${C.red}`, padding:16, border:`1px solid ${C.border}`}}>
              <b>{imp.titulo}</b> <p>{imp.texto}</p>
            </div>
          ))}
        </div>
      )}

      {subTab==="vantagens" && (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {vantagens.map((v,i)=>(
            <div key={i} style={{background:C.card, borderLeft:`4px solid ${C.green}`, padding:16, border:`1px solid ${C.border}`}}>
              <b>{v.titulo}</b> <p>{v.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
const TabBaseTecnica = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <BaseTecnicaCompleta />
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
const TagBadge: React.FC<{ text: string; cor: string }> = ({ text, cor }) => (
    <span style={{ 
        background: `${cor}18`, 
        color: cor, 
        border: `1px solid ${cor}30`, 
        borderRadius: '4px', 
        padding: '2px 8px', 
        fontSize: '10px', 
        fontWeight: 700 
    }}>
        {text}
    </span>
);

const BaseTecnicaCompleta: React.FC = () => {
    const [secAtiva, setSecAtiva] = useState("receita");
    const [search, setSearch] = useState("");
    const [abertos, setAbertos] = useState<Record<string, boolean>>({});

    const C = {
        bg: "#f8fafc", card: "#ffffff", border: "#e2e8f0",
        text: "#0f172a", sub: "#64748b", muted: "#94a3b8",
        green: "#16a34a", blue: "#2563eb", amber: "#d97706",
        red: "#dc2626", purple: "#7c3aed", orange: "#ea580c",
    };

    const baseSecoes = [
        {
            id: "receita", icon: "📈", cor: C.green, titulo: "Motor de Receita",
            items: [
                {
                    label: "Receita Estimada por Pivô",
                    formula: "Área (ha) × Preço (R$/saca) × Rendimento (sc/ha)",
                    desc: "Venda bruta projetada interpolada pelo slider de Otimismo de Mercado entre MIN e MAX histórico.",
                    ex: "82,2 ha × R$70.000/ha = R$5.750.500 (GR 14, otimismo 50%)",
                    tags: ["Área Georreferenciada", "Preço Interpolado", "Rendimento"]
                },
                {
                    label: "Interpolação de Mercado (Otimismo)",
                    formula: "Receita = MIN + ((MAX − MIN) × (Otimismo / 100))",
                    desc: "Slider executa interpolação linear. 0% = mercado colapsado (MIN). 100% = escassez máxima (MAX).",
                    ex: "MIN R$40k/ha, MAX R$100k/ha, Otimismo 50% → R$70k/ha",
                    tags: ["Slider Otimismo", "MIN histórico", "MAX histórico"]
                },
                {
                    label: "Receita Total Global",
                    formula: "Σ Receita Estimada de todos os pivôs ativos",
                    desc: "Soma de todas as receitas individuais. Exibida como Projeção Anual no Laboratório de Cenários.",
                    ex: "372 pivôs × média R$4,3M = ~R$1,595 bilhão",
                    tags: ["Soma Global", "Projeção Anual"]
                },
            ]
        },
        {
            id: "rh", icon: "👷", cor: C.blue, titulo: "Dimensionamento RH",
            items: [
                {
                    label: "Necessidade Bruta de RH (Raw)",
                    formula: "NecessidadeRaw = (Área × ICO) / FatorCultural",
                    desc: "Ponto de equilíbrio teórico de pessoas antes de qualquer desconto. ICO multiplica o esforço bruto.",
                    ex: "82,2 ha × ICO 1,0 / FatorCultural 50 d/ha → base para conversão",
                    tags: ["ICO", "Fator Cultural", "Dias-Homem"]
                },
                {
                    label: "Dias Absolutos de Trabalho",
                    formula: "DiasAbsolutos = Área × FatorCultural × ICO × HorasUteis(8/8) × Mecanização",
                    desc: "Volume total de dias-homem necessários para operar o pivô no ciclo anual.",
                    ex: "82,2 × 50 × 1,0 × 1,0 × 1 = 4.107,5 dias absolutos",
                    tags: ["Dias-Homem", "Ciclo Anual", "Mecanização"]
                },
                {
                    label: "Conversão para Pessoas (RH Modelado)",
                    formula: "Pessoas = DiasAbsolutos / (DiasUteis × Eficiência × (1−Absenteísmo%) × (1−Afastamento%))",
                    desc: "Converte dias em número real de pessoas com todos os descontos de eficiência e ausências.",
                    ex: "4.107,5 / (264 × 0,95 × 0,98) ≈ 16,73 → arredonda para 17 pessoas",
                    tags: ["Eficiência Equipe", "Absenteísmo", "Afastamentos Legais"]
                },
            ]
        },
        {
            id: "custo", icon: "💰", cor: C.amber, titulo: "Estrutura de Custos",
            items: [
                {
                    label: "Custo por Pessoa (com Encargos)",
                    formula: "Custo = Salário × (1 + INSS% + FGTS% + RAT% + Terceiros% + Férias% + 13°% + Adicionais%)",
                    desc: "Custo real mensal with todos os encargos. Percentuais configuráveis na aba Configurações Legais.",
                    ex: "R$1.621 × (1 + 0,20 + 0,08 + 0,02 + 0,058 + 0,1111 + 0,0833) ≈ R$2.508,89/pessoa",
                    tags: ["INSS Empresa", "FGTS", "RAT", "Férias", "13°"]
                },
                {
                    label: "Custo de Insumos por Pivô",
                    formula: "CustoInsumos = ReceitaEstimada × (Insumos% / 100)",
                    desc: "Custo variável calculado como percentual da receita. Controlado pelo slider Custo Insumos.",
                    ex: "R$5.750.500 × 60% = R$3.450.300 (GR 14 com slider em 60%)",
                    tags: ["Insumos%", "Custo Variável", "Slider Insumos"]
                },
                {
                    label: "Custo Projetado Global",
                    formula: "CustoTotal = Σ CustoInsumos (todos os pivôs) + FolhaPagamento",
                    desc: "Soma dos custos de insumos de todos os pivôs acrescido da folha de pagamento projetada.",
                    ex: "~R$989M insumos + R$120M folha ≈ R$1,109 bilhão",
                    tags: ["Custo Total", "Estimativa Anual"]
                },
            ]
        },
        {
            id: "resultado", icon: "📊", cor: C.purple, titulo: "Resultado & Eficiência",
            items: [
                {
                    label: "Resultado Líquido (Lucro/Prejuízo)",
                    formula: "ResultadoLíquido = ReceitaTotal − CustoProjetadoTotal",
                    desc: "Lucro ou prejuízo anual projetado. Verde = lucro. Vermelho = prejuízo.",
                    ex: "R$1,595B − R$1,109B = R$485.526.950,81 (lucro)",
                    tags: ["Receita Total", "Custo Projetado", "Lucro Anual"]
                },
                {
                    label: "Eficiência Global (Custo/Receita)",
                    formula: "Eficiência% = (CustoProjetado / ReceitaTotal) × 100",
                    desc: "Percentual da receita consumido pelos custos. Quanto menor, mais eficiente a operação.",
                    ex: "R$1,109B / R$1,595B × 100 = 69,6%",
                    tags: ["Eficiência Operacional", "Custo/Receita"]
                },
                {
                    label: "ROI do Trabalhador",
                    formula: "ROI = ReceitaGerada/Pessoa ÷ CustoLaboral/Pessoa",
                    desc: "Quantas vezes cada trabalhador paga seu próprio custo em receita gerada.",
                    ex: "R$338.264,71 / R$30.197,28 = 11,2x (GR 14)",
                    tags: ["ROI", "Eficiência Laboral", "Produtividade"]
                },
            ]
        },
        {
            id: "absenteismo", icon: "🩹", cor: C.red, titulo: "Absenteísmo & Políticas",
            items: [
                {
                    label: "Política: Substituição Integral",
                    formula: "CustoExtra = FolhaMensal × (Absenteísmo% / 100)",
                    desc: "Toda falta é coberta por contratação. Custo do absenteísmo entra direto no orçamento salarial.",
                    ex: "R$2.508.891 × 5% = +R$125.444/mês adicionais à folha",
                    tags: ["Substituição", "Custo Adicional", "Budget"]
                },
                {
                    label: "Política: Absorção (Sem Reposição)",
                    formula: "DescontoReceita = ReceitaPivô × (Absenteísmo% / 100)",
                    desc: "Sem reposição, área operacional decai e produtividade atrofia — desconto na receita do pivô.",
                    ex: "R$5.750.500 × 5% = −R$287.525 de receita perdida",
                    tags: ["Absorção", "Perda de Receita", "Produtividade"]
                },
                {
                    label: "Impacto Financeiro por Falta",
                    formula: "Impacto = (SalárioDia + Encargos) + PerdaProdutivida",
                    desc: "Custo direto e indireto de uma ausência não planejada.",
                    ex: "Falta de 1 operador → R$450 de impacto diário",
                    tags: ["Custo Direto", "Perda Operacional"]
                }
            ]
        },
        {
            id: "ico", icon: "⚙️", cor: C.orange, titulo: "ICO — Complexidade",
            items: [
                {
                    label: "O que é o ICO",
                    formula: "ICO = multiplicador entre 0,5x e 2,0x",
                    desc: "Índice de Complexidade Operacional. Age como super-multiplicador no esforço bruto da cultura.",
                    ex: "ICO 1,5x transforma necessidade de 17 pessoas em 25,5 → 26 pessoas",
                    tags: ["Multiplicador", "Esforço Bruto", "Cultura / Clima"]
                },
                {
                    label: "ICO na Capacidade Ajustada",
                    formula: "CapAjustada = CapBase + ICO + (Eficiência / 100)",
                    desc: "Na tela Diagnóstico Estrutural, ICO compõe a Capacidade Ajustada global.",
                    ex: "40 ha/p + ICO 1 + (90/100) = 44,44 ha/p ajustada",
                    tags: ["Capacidade Ajustada", "Diagnóstico Estrutural"]
                },
                {
                    label: "Índice de Eficiência Estrutural (IEE)",
                    formula: "IEE = (RH Atual / RH Modelado Global) × 100",
                    desc: "Compara RH real instalado com dimensionamento ideal. 100% = perfeito.",
                    ex: "997 / 1.503 × 100 ≈ 66,3% (Real vs Recomendado)",
                    tags: ["IEE", "Real vs Recomendado", "Diagnóstico Estrutural"]
                },
            ]
        },
    ];

    const toggle = (key: string) => setAbertos(prev => ({ ...prev, [key]: !prev[key] }));

    const secFiltrada = search.trim()
        ? baseSecoes.map(s => ({
            ...s, items: s.items.filter(it =>
                it.label.toLowerCase().includes(search.toLowerCase()) ||
                it.formula.toLowerCase().includes(search.toLowerCase()) ||
                it.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
            )
        })).filter(s => s.items.length > 0)
        : [baseSecoes.find(s => s.id === secAtiva)!];

    return (
        <div style={{ background: C.bg, borderRadius: '16px', overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            {/* HEADER INTERNO */}
            <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '20px 28px' }}>
                <div style={{ fontSize: '11px', color: C.sub, fontWeight: 700, letterSpacing: '2px', marginBottom: '4px' }}>
                    AGRICONTROL · ESTUDOS INTEGRADOS
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.text, margin: 0 }}>
                    📊 Central de Inteligência Técnica
                </h2>
                <p style={{ fontSize: '12px', color: C.sub, marginTop: '4px' }}>
                    Mercado · RH & Produtividade · Base Técnica — Memória de Cálculo v3
                </p>
            </div>

            <div style={{ padding: '24px' }}>
                {/* BUSCA */}
                <div style={{ marginBottom: '24px' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar fórmula, métrica ou tag..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            maxWidth: '360px',
                            padding: '12px 16px',
                            background: C.card,
                            border: `1px solid ${C.border}`,
                            borderRadius: '10px',
                            fontSize: '14px',
                            color: C.text,
                            outline: 'none',
                            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                        }}
                    />
                </div>

                {/* TABS DE SEÇÃO (Apenas quando não está buscando) */}
                {!search && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', borderBottom: `1px solid ${C.border}`, paddingBottom: '1px' }}>
                        {baseSecoes.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSecAtiva(s.id)}
                                style={{
                                    padding: '10px 16px',
                                    border: 'none',
                                    borderBottom: secAtiva === s.id ? `3px solid ${s.cor}` : '3px solid transparent',
                                    background: 'transparent',
                                    color: secAtiva === s.id ? s.cor : C.sub,
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>{s.icon}</span> {s.titulo}
                            </button>
                        ))}
                    </div>
                )}

                {/* CONTEÚDO FILTRADO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {secFiltrada.map(sec => (
                        <div key={sec.id}>
                            {search && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0 12px', padding: '4px 0' }}>
                                    <span style={{ fontSize: '18px' }}>{sec.icon}</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.text, margin: 0 }}>{sec.titulo}</h3>
                                    <div style={{ flex: 1, height: '1px', background: C.border, marginLeft: '8px' }} />
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {sec.items.map((item, idx) => {
                                    const key = `${sec.id}-${idx}`;
                                    const isOpen = abertos[key];
                                    return (
                                        <div 
                                            key={key} 
                                            style={{ 
                                                background: C.card, 
                                                border: `1px solid ${isOpen ? sec.cor : C.border}`, 
                                                borderRadius: '12px', 
                                                overflow: 'hidden',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div 
                                                onClick={() => toggle(key)}
                                                style={{ 
                                                    padding: '16px 20px', 
                                                    cursor: 'pointer', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sec.cor }} />
                                                    <span style={{ fontWeight: 700, fontSize: '14px', color: C.text }}>{item.label}</span>
                                                </div>
                                                <span style={{ color: C.muted, fontSize: '16px' }}>{isOpen ? '▲' : '▼'}</span>
                                            </div>
                                            
                                            {isOpen && (
                                                <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${C.border}50` }}>
                                                    <div style={{ marginTop: '16px' }}>
                                                        <div style={{ fontSize: '10px', color: C.sub, fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FÓRMULA</div>
                                                        <div style={{ 
                                                            background: `${C.bg}`, 
                                                            borderLeft: `4px solid ${sec.cor}`, 
                                                            padding: '12px 16px', 
                                                            borderRadius: '4px',
                                                            fontFamily: 'monospace',
                                                            fontSize: '13px',
                                                            color: sec.cor,
                                                            wordBreak: 'break-word'
                                                        }}>
                                                            {item.formula}
                                                        </div>
                                                    </div>

                                                    <div style={{ marginTop: '16px' }}>
                                                        <div style={{ fontSize: '10px', color: C.sub, fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DESCRIÇÃO</div>
                                                        <p style={{ fontSize: '13px', color: C.text, lineHeight: '1.6', margin: 0 }}>{item.desc}</p>
                                                    </div>

                                                    <div style={{ marginTop: '16px', background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px' }}>
                                                        <div style={{ fontSize: '10px', color: C.amber, fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EXEMPLO</div>
                                                        <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{item.ex}</div>
                                                    </div>

                                                    <div style={{ marginTop: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {item.tags.map(t => <TagBadge key={t} text={t} cor={sec.cor} />)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* RODAPÉ */}
                <div style={{ marginTop: '32px', padding: '16px 0', borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: C.sub, fontWeight: 500 }}>
                        AgriControl · Base Técnica v3 · 18 fórmulas documentadas · Clique em qualquer item para expandir
                    </span>
                </div>
            </div>
        </div>
    );
};

const PainelEstudos: React.FC = () => {
  const [aba, setAba] = useState("mercado");
  const abas = [
    { id: "mercado", label: "📈 Inteligência de Mercado" },
    { id: "rh", label: "👷 RH & Produtividade" },
    { id: "tecnica", label: "📐 Base Técnica" },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "20px 28px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: C.text }}>📊 Central de Inteligência</h1>
        <p style={{ color: C.sub, fontSize: 12, margin: 0 }}>Mercado · RH & Produtividade · Base Técnica — 3 estudos integrados, 9 culturas</p>
      </div>
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 28px", display: "flex" }}>
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            padding: "14px 20px", border: "none", borderBottom: aba === a.id ? `3px solid ${C.green}` : "3px solid transparent",
            background: "transparent", color: aba === a.id ? C.green : C.sub, cursor: "pointer", fontSize: 13, fontWeight: 700
          }}>{a.label}</button>
        ))}
      </div>
      <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
        {aba === "mercado" && <TabMercado />}
        {aba === "rh" && <TabRH />}
        {aba === "tecnica" && <TabBaseTecnica />}
      </div>
    </div>
  );
};

export default PainelEstudos;
