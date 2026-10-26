import { IonItem, IonLabel, IonInput, IonTextarea, IonSelect, IonSelectOption } from '@ionic/react';

export default function FormField({
  label,
  value,
  type = 'text',
  placeholder = '',
  options,
  textarea,
  required,
  disabled,
  onInput,
}) {
  const v = value ?? '';
  const handle = (e) => onInput?.(e.detail.value, e);

  return (
    <IonItem className="form-field" lines="full">
      <IonLabel position="stacked">
        {label}
        {required && <span className="req-star"> *</span>}
      </IonLabel>
      {options ? (
        <IonSelect
          value={v}
          placeholder="Seçin"
          onIonChange={(e) => onInput?.(e.detail.value, e)}
          interface="action-sheet"
          cancelText="İmtina"
          okText="Tamam"
          disabled={disabled}
        >
          {options.map((o) => (
            <IonSelectOption key={String(o.value)} value={o.value}>
              {o.label}
            </IonSelectOption>
          ))}
        </IonSelect>
      ) : textarea ? (
        <IonTextarea value={v} placeholder={placeholder} onIonInput={handle} rows={3} disabled={disabled} />
      ) : (
        <IonInput
          type={type}
          value={v}
          placeholder={placeholder}
          onIonInput={handle}
          inputMode={type === 'number' ? 'numeric' : undefined}
          disabled={disabled}
        />
      )}
    </IonItem>
  );
}
