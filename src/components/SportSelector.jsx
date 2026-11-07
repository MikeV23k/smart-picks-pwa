export default function SportSelector({ sports, active, onChange }) {
  return (
    <div className="sport-selector" role="tablist" aria-label="Deporte">
      {sports.map((s) => (
        <button
          key={s.key}
          role="tab"
          aria-selected={s.key === active}
          className={s.key === active ? "sport-chip active" : "sport-chip"}
          onClick={() => onChange(s.key)}
          title={`${s.group} · ${s.label}`}
        >
          <span className="sport-icon" aria-hidden="true">{s.icon}</span>
          <span>{s.short ?? s.label}</span>
        </button>
      ))}
    </div>
  );
}
