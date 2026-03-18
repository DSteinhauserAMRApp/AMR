import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

const formatCurrency = (value) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatNumber = (value, digits = 2) =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);

const defaults = {
  weeklyHours: 40,
  weeksPerYear: 52,
  workingDaysPerYear: 250,
  vacationDays: 30,
  sicknessDays: 12,
  baseAnnualSalary: 42000,
  laborOverheadPct: 21,
  lateShiftPct: 10,
  nightShiftPct: 25,
  shareLateShiftPct: 25,
  shareNightShiftPct: 15,
  driversManual: 6,
  forklifts: 4,
  forkliftCostPerYear: 9000,
  damageCostPerYear: 18000,
  manualOtherCostPerYear: 0,
  amrCount: 3,
  capexPerAmr: 95000,
  softwareCapex: 25000,
  integrationCapex: 35000,
  trainingCapex: 8000,
  maintenancePerYear: 18000,
  softwarePerYear: 12000,
  energyPerYear: 4500,
  supportPerYear: 6000,
  residualFte: 1.5,
  tcoHorizonYears: 5,
};

function NumberField({ label, value, onChange, suffix }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <div className="inputWrap">
        <input
          className="input"
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix ? <span className="suffix">{suffix}</span> : null}
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent = 'blue' }) {
  return (
    <div className={`kpiCard accent-${accent}`}>
      <div className="kpiLabel">{label}</div>
      <div className="kpiValue">{value}</div>
    </div>
  );
}

export default function Home() {
  const [inputs, setInputs] = useState(defaults);
  const setValue = (key) => (value) =>
    setInputs((prev) => ({ ...prev, [key]: Number.isFinite(value) ? value : 0 }));

  const calc = useMemo(() => {
    const contractualHoursPerYear = inputs.weeklyHours * inputs.weeksPerYear;
    const absenceRate = Math.min(
      (inputs.vacationDays + inputs.sicknessDays) / Math.max(inputs.workingDaysPerYear, 1),
      0.95
    );
    const absenceFactor = 1 / Math.max(1 - absenceRate, 0.05);

    const weightedShiftPremium =
      (inputs.shareLateShiftPct / 100) * (inputs.lateShiftPct / 100) +
      (inputs.shareNightShiftPct / 100) * (inputs.nightShiftPct / 100);

    const baseHourlyWage = inputs.baseAnnualSalary / Math.max(contractualHoursPerYear, 1);
    const effectiveHourlyWage = baseHourlyWage * (1 + weightedShiftPremium);
    const employerHourlyCost = effectiveHourlyWage * (1 + inputs.laborOverheadPct / 100);

    const manualLaborCostYear =
      inputs.driversManual * contractualHoursPerYear * employerHourlyCost * absenceFactor;

    const manualTotalYear =
      manualLaborCostYear +
      inputs.forklifts * inputs.forkliftCostPerYear +
      inputs.damageCostPerYear +
      inputs.manualOtherCostPerYear;

    const automatedLaborCostYear =
      inputs.residualFte * contractualHoursPerYear * employerHourlyCost * absenceFactor;

    const automatedOpexYear =
      inputs.maintenancePerYear +
      inputs.softwarePerYear +
      inputs.energyPerYear +
      inputs.supportPerYear;

    const automatedTotalYear = automatedLaborCostYear + automatedOpexYear;

    const capex =
      inputs.amrCount * inputs.capexPerAmr +
      inputs.softwareCapex +
      inputs.integrationCapex +
      inputs.trainingCapex;

    const annualSavings = manualTotalYear - automatedTotalYear;
    const paybackYears = annualSavings > 0 ? capex / annualSavings : Infinity;
    const roi3Years = capex > 0 ? (((annualSavings * 3) - capex) / capex) * 100 : 0;
    const tcoManual = manualTotalYear * inputs.tcoHorizonYears;
    const tcoAutomated = capex + automatedTotalYear * inputs.tcoHorizonYears;
    const tcoAdvantage = tcoManual - tcoAutomated;
    const monthlyManual = manualTotalYear / 12;
    const monthlyAutomated = automatedTotalYear / 12;
    const hourlyManual = manualTotalYear / Math.max(inputs.driversManual * contractualHoursPerYear, 1);
    const hourlyAutomated = automatedTotalYear / Math.max(inputs.amrCount * contractualHoursPerYear, 1);

    let status = 'danger';
    let statusLabel = 'Kritisch';
    if (annualSavings > 0 && tcoAdvantage > 0 && paybackYears <= 3) {
      status = 'success';
      statusLabel = 'Wirtschaftlich attraktiv';
    } else if (annualSavings > 0 && tcoAdvantage > 0) {
      status = 'warning';
      statusLabel = 'Prüfenswert';
    }

    const compareData = [
      { name: 'Manuell', Jahr: Math.round(manualTotalYear), Monat: Math.round(monthlyManual) },
      { name: 'Automatisiert', Jahr: Math.round(automatedTotalYear), Monat: Math.round(monthlyAutomated) },
    ];

    const breakEvenData = Array.from(
      { length: Math.max(1, Math.round(inputs.tcoHorizonYears)) + 1 },
      (_, year) => ({
        year,
        manual: Math.round(manualTotalYear * year),
        automated: Math.round(capex + automatedTotalYear * year),
      })
    );

    return {
      contractualHoursPerYear,
      absenceFactor,
      baseHourlyWage,
      employerHourlyCost,
      manualTotalYear,
      automatedTotalYear,
      capex,
      annualSavings,
      paybackYears,
      roi3Years,
      tcoAdvantage,
      monthlyManual,
      monthlyAutomated,
      hourlyManual,
      hourlyAutomated,
      status,
      statusLabel,
      compareData,
      breakEvenData,
    };
  }, [inputs]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const today = new Intl.DateTimeFormat('de-DE').format(new Date());

  return (
    <div className="page">
      <div className="container">
        <header className="header noPrint">
          <div>
            <div className="eyebrow">ROI CALCULATOR</div>
            <h1 className="title">AMR ROI Tool</h1>
            <p className="subtle">Vergleich manueller Intralogistikprozesse mit einer AMR-Lösung</p>
          </div>
          <div className="headerActions">
            <div className={`statusBadge ${calc.status}`}>{calc.statusLabel}</div>
            <div className="softBadge">TCO-Horizont: {inputs.tcoHorizonYears} Jahre</div>
            <button className="primaryButton" onClick={handlePrint}>PDF Export</button>
          </div>
        </header>

        <section className="printReport">
          <div className="printTitle">ROI Analyse – AMR vs. manueller Prozess</div>
          <div className="printMeta">Erstellt am {today}</div>
          <div className="printKpis">
            <div className="printBox"><span>Jährliche Einsparung</span><strong>{formatCurrency(calc.annualSavings)}</strong></div>
            <div className="printBox"><span>Payback</span><strong>{Number.isFinite(calc.paybackYears) ? `${formatNumber(calc.paybackYears, 2)} Jahre` : '—'}</strong></div>
            <div className="printBox"><span>ROI (3 Jahre)</span><strong>{formatNumber(calc.roi3Years, 1)} %</strong></div>
            <div className="printBox"><span>TCO-Vorteil</span><strong>{formatCurrency(calc.tcoAdvantage)}</strong></div>
          </div>
        </section>

        <section className="kpiGrid">
          <KpiCard label="Jährliche Einsparung" value={formatCurrency(calc.annualSavings)} accent="green" />
          <KpiCard label="Payback" value={Number.isFinite(calc.paybackYears) ? `${formatNumber(calc.paybackYears, 2)} Jahre` : '—'} accent="blue" />
          <KpiCard label="ROI (3 Jahre)" value={`${formatNumber(calc.roi3Years, 1)} %`} accent="blue" />
          <KpiCard label="TCO-Vorteil" value={formatCurrency(calc.tcoAdvantage)} accent="slate" />
        </section>

        <section className="mainGrid">
          <div className="card noPrint">
            <div className="cardTitle">Parameter</div>
            <div className="groupGrid">
              <div className="groupCard">
                <div className="groupTitle">1. Personal & Arbeitsmodell</div>
                <NumberField label="Wochenstunden" value={inputs.weeklyHours} onChange={setValue('weeklyHours')} suffix="h" />
                <NumberField label="Wochen pro Jahr" value={inputs.weeksPerYear} onChange={setValue('weeksPerYear')} />
                <NumberField label="Arbeitstage pro Jahr" value={inputs.workingDaysPerYear} onChange={setValue('workingDaysPerYear')} />
                <NumberField label="Urlaubstage" value={inputs.vacationDays} onChange={setValue('vacationDays')} />
                <NumberField label="Krankheitstage" value={inputs.sicknessDays} onChange={setValue('sicknessDays')} />
                <NumberField label="Bruttojahresgehalt" value={inputs.baseAnnualSalary} onChange={setValue('baseAnnualSalary')} suffix="€" />
                <NumberField label="Lohnnebenkosten" value={inputs.laborOverheadPct} onChange={setValue('laborOverheadPct')} suffix="%" />
              </div>

              <div className="groupCard">
                <div className="groupTitle">2. Schicht & manueller Prozess</div>
                <NumberField label="Spätschicht-Zuschlag" value={inputs.lateShiftPct} onChange={setValue('lateShiftPct')} suffix="%" />
                <NumberField label="Nachtschicht-Zuschlag" value={inputs.nightShiftPct} onChange={setValue('nightShiftPct')} suffix="%" />
                <NumberField label="Anteil Spätschicht" value={inputs.shareLateShiftPct} onChange={setValue('shareLateShiftPct')} suffix="%" />
                <NumberField label="Anteil Nachtschicht" value={inputs.shareNightShiftPct} onChange={setValue('shareNightShiftPct')} suffix="%" />
                <NumberField label="Anzahl Fahrer manuell" value={inputs.driversManual} onChange={setValue('driversManual')} />
                <NumberField label="Anzahl Stapler" value={inputs.forklifts} onChange={setValue('forklifts')} />
                <NumberField label="Staplerkosten p.a." value={inputs.forkliftCostPerYear} onChange={setValue('forkliftCostPerYear')} suffix="€" />
                <NumberField label="Schadenskosten p.a." value={inputs.damageCostPerYear} onChange={setValue('damageCostPerYear')} suffix="€" />
                <NumberField label="Sonstige manuelle Kosten p.a." value={inputs.manualOtherCostPerYear} onChange={setValue('manualOtherCostPerYear')} suffix="€" />
              </div>

              <div className="groupCard">
                <div className="groupTitle">3. AMR-Lösung</div>
                <NumberField label="Anzahl AMRs" value={inputs.amrCount} onChange={setValue('amrCount')} />
                <NumberField label="CAPEX pro AMR" value={inputs.capexPerAmr} onChange={setValue('capexPerAmr')} suffix="€" />
                <NumberField label="Software CAPEX" value={inputs.softwareCapex} onChange={setValue('softwareCapex')} suffix="€" />
                <NumberField label="Integration" value={inputs.integrationCapex} onChange={setValue('integrationCapex')} suffix="€" />
                <NumberField label="Training" value={inputs.trainingCapex} onChange={setValue('trainingCapex')} suffix="€" />
                <NumberField label="Restpersonal" value={inputs.residualFte} onChange={setValue('residualFte')} suffix="FTE" />
              </div>

              <div className="groupCard">
                <div className="groupTitle">4. Laufende Kosten & Horizont</div>
                <NumberField label="Wartung p.a." value={inputs.maintenancePerYear} onChange={setValue('maintenancePerYear')} suffix="€" />
                <NumberField label="Software p.a." value={inputs.softwarePerYear} onChange={setValue('softwarePerYear')} suffix="€" />
                <NumberField label="Energie p.a." value={inputs.energyPerYear} onChange={setValue('energyPerYear')} suffix="€" />
                <NumberField label="Support p.a." value={inputs.supportPerYear} onChange={setValue('supportPerYear')} suffix="€" />
                <NumberField label="TCO-Horizont" value={inputs.tcoHorizonYears} onChange={setValue('tcoHorizonYears')} suffix="Jahre" />
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="card">
              <div className="cardTitle">Kostenvergleich</div>
              <div className="miniGrid">
                <div className="miniCard">
                  <span>Manuell / Jahr</span>
                  <strong>{formatCurrency(calc.manualTotalYear)}</strong>
                </div>
                <div className="miniCard">
                  <span>Automatisiert / Jahr</span>
                  <strong>{formatCurrency(calc.automatedTotalYear)}</strong>
                </div>
                <div className="miniCard">
                  <span>CAPEX</span>
                  <strong>{formatCurrency(calc.capex)}</strong>
                </div>
              </div>

              <div className="chartWrap">
                <ResponsiveContainer>
                  <BarChart data={calc.compareData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="Jahr" radius={[10, 10, 0, 0]} fill="#2563eb" />
                    <Bar dataKey="Monat" radius={[10, 10, 0, 0]} fill="#93c5fd" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Kennzahl</th>
                    <th>Manuell</th>
                    <th>Automatisiert</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Kosten / Jahr</td>
                    <td>{formatCurrency(calc.manualTotalYear)}</td>
                    <td>{formatCurrency(calc.automatedTotalYear)}</td>
                  </tr>
                  <tr>
                    <td>Kosten / Monat</td>
                    <td>{formatCurrency(calc.monthlyManual)}</td>
                    <td>{formatCurrency(calc.monthlyAutomated)}</td>
                  </tr>
                  <tr>
                    <td>Kosten / Stunde</td>
                    <td>{formatCurrency(calc.hourlyManual)}</td>
                    <td>{formatCurrency(calc.hourlyAutomated)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bottomGrid">
          <div className="card">
            <div className="cardTitle">Break-even Analyse</div>
            <div className="chartLarge">
              <ResponsiveContainer>
                <LineChart data={calc.breakEvenData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="manual" name="Manueller Prozess" stroke="#64748b" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="automated" name="Automatisierter Prozess" stroke="#2563eb" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="cardTitle">Kernkennzahlen</div>
            <div className="logicGrid">
              <div className="logicCard"><span>Vertragliche Stunden p.a.</span><strong>{formatNumber(calc.contractualHoursPerYear, 0)} h</strong></div>
              <div className="logicCard"><span>Ausfallfaktor</span><strong>{formatNumber(calc.absenceFactor, 2)}x</strong></div>
              <div className="logicCard"><span>Basis-Stundenlohn</span><strong>{formatCurrency(calc.baseHourlyWage)}</strong></div>
              <div className="logicCard"><span>AG-Stundenkostensatz</span><strong>{formatCurrency(calc.employerHourlyCost)}</strong></div>
              <div className="logicCard"><span>Kosten manuell p.a.</span><strong>{formatCurrency(calc.manualTotalYear)}</strong></div>
              <div className="logicCard"><span>Kosten automatisiert p.a.</span><strong>{formatCurrency(calc.automatedTotalYear)}</strong></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
