import Icon from './Icon';

export default function Nothing({ text = 'Nothing waiting.' }: { text?: string }) {
  return (
    <div className="emptybox small">
      <Icon name="check" size={28} />
      <p>{text}</p>
    </div>
  );
}
