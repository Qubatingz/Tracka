export default function AdminHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
    </div>
  );
}
