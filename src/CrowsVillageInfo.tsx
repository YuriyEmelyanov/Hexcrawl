import { CROWS_BUILDINGS, CROWS_BUILDING_TYPES, type BuildingType, type CrowsSettlement } from './crowsSettlements';

type Props = {
  village?: CrowsSettlement;
  language: 'ru' | 'en';
  editing: boolean;
  disabled: boolean;
  onHomeChange: (home: boolean) => void;
  onChange: (village: CrowsSettlement) => void;
};

export function CrowsVillageInfo({ village, language, editing, disabled, onHomeChange, onChange }: Props) {
  const ru = language === 'ru';
  const home = ru ? 'Домашняя деревня' : 'Home village';
  const prosperity = ru ? 'Процветание' : 'Prosperity';
  const buildings = ru ? 'Постройки' : 'Buildings';
  const levelLabel = ru ? 'Уровень' : 'Level';
  if (!village && !editing) return null;

  return <div className="crows-village-info" data-crows-village>
    {editing ? <label>
      <input type="checkbox" checked={village?.home ?? false} disabled={disabled}
        onChange={event => onHomeChange(event.currentTarget.checked)} /> {home}
    </label> : village?.home && <strong>{home}</strong>}
    {village && (editing ? <fieldset disabled={disabled}>
      <label>{prosperity} <select value={village.prosperity}
        onChange={event => onChange({ ...village, prosperity: Number(event.currentTarget.value) })}>
        {Array.from({ length: 21 }, (_, i) => i - 10).map(value => <option key={value}>{value}</option>)}
      </select></label>
      <strong>{buildings}</strong>
      {village.buildings.map(({ type, level }, i) => <div className="crows-building-row" key={i}>
        <select aria-label={`${buildings} ${i + 1}`} value={type} onChange={event => {
          const next = event.currentTarget.value as BuildingType;
          onChange({ ...village, buildings: village.buildings.map((item, j) =>
            i === j ? { type: next, level: Math.min(item.level, CROWS_BUILDINGS[next].max) } : item) });
        }}>
          {CROWS_BUILDING_TYPES.map(value => <option key={value} value={value}>{CROWS_BUILDINGS[value][language]}</option>)}
        </select>
        <select aria-label={`${levelLabel} ${i + 1}`} value={level} onChange={event => {
          const next = Number(event.currentTarget.value);
          onChange({ ...village, buildings: village.buildings.map((item, j) => i === j ? { ...item, level: next } : item) });
        }}>
          {Array.from({ length: CROWS_BUILDINGS[type].max }, (_, index) => index + 1).map(value => <option key={value}>{value}</option>)}
        </select>
        <button type="button" className="secondary" aria-label={ru ? `Удалить постройку ${i + 1}` : `Remove building ${i + 1}`}
          onClick={() => onChange({ ...village, buildings: village.buildings.filter((_, j) => i !== j) })}>×</button>
      </div>)}
      <button type="button" className="secondary" onClick={() =>
        onChange({ ...village, buildings: [...village.buildings, { type: 'smithy', level: 1 }] })}>
        {ru ? 'Добавить постройку' : 'Add building'}
      </button>
    </fieldset> : <>
      <p>{prosperity}: {village.prosperity}</p>
      <strong>{buildings}</strong>
      {village.buildings.length > 0 && <ul>{village.buildings.map(({ type, level }, i) =>
        <li key={i}>{CROWS_BUILDINGS[type][language]} · {levelLabel} {level}</li>)}</ul>}
    </>)}
  </div>;
}
