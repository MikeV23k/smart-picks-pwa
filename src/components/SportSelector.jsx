export default function SportSelector({ sports, active, onChange }) {
  return (
    <div className="sport-selector" role="tablist">
      {sports.map((s) => (
        <button
          key={s.key}
          role="tab"
          aria-selected={s.key === active}
          className={s.key === active ? "sport-tab active" : "sport-tab"}
          onClick={() => onChange(s.key)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
