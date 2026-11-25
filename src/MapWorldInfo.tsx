import { WORLD_FIELD_LIMITS, type MapWorld } from './crowsWorld';

type Props = {
  world?: MapWorld;
  language: 'ru' | 'en';
  editing?: boolean;
  onEditField: (field: keyof MapWorld, value: string) => void;
};

export function MapWorldInfo({ world, language, editing, onEditField }: Props) {
  const ru = language === 'ru';
  const title = ru ? 'Мир' : 'World';
  const nameLabel = ru ? 'Название мира' : 'World name';
  const descriptionLabel = ru ? 'Описание мира' : 'World description';

  if (!editing) return <details className="world-info" data-world-info>
    <summary><strong>{title}</strong>{world?.name ? ' · ' + world.name : ''}</summary>
    {world?.description && <p>{world.description}</p>}
  </details>;

  return <div className="world-info" data-world-info>
    <strong>{title}</strong>
      <label>{nameLabel}
        <input key={world?.name} defaultValue={world?.name ?? ''} maxLength={WORLD_FIELD_LIMITS.name}
          onBlur={event => {
            if (event.currentTarget.value !== (world?.name ?? '')) onEditField('name', event.currentTarget.value);
          }} />
      </label>
      <label>{descriptionLabel}
        <textarea key={world?.description} defaultValue={world?.description ?? ''} maxLength={WORLD_FIELD_LIMITS.description} rows={4}
          onBlur={event => {
            if (event.currentTarget.value !== (world?.description ?? '')) onEditField('description', event.currentTarget.value);
          }} />
      </label>
  </div>;
}
